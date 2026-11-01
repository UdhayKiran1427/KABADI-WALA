import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth/getAuthUser";
import { canSeeDeal } from "@/lib/auth/lotAccess";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { evaluateWeightTolerance, classifyLocationProof, verifyEnteredHandoverCode } from "@/lib/domain/handover";
import { checkLocationAnomalies, checkWeightAnomalies, checkPriceAnomalies } from "@/lib/domain/anomalies";
import { validateLotTransition, type LotStatus } from "@/lib/domain/lotStateMachine";
import { amountPaise, firstPositiveRate } from "@/lib/domain/money";
import { sendNotification } from "@/lib/services/notificationService";
import { z } from "zod";

const SubmitHandoverSchema = z.object({
  verificationCode: z.string().regex(/^\d{4}$/, "The collector's 4-digit code is required"),
  scaleWeightGrams: z.number().int().positive("Scale weight must be positive grams"),
  /** Send to mark the lot paid in the same call. Ignored while the weight is outside tolerance. */
  paymentMode: z.enum(["CASH", "UPI"]).optional(),
  paymentRef: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  gpsAccuracyMeters: z.number().optional(),
  mockLocationFlag: z.boolean().optional().default(false),
});

/**
 * Handover status for the lot's collector, recycler or an admin. Never returns the plain
 * verification code or its hash: the code lives only on the collector's phone (spec s4).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["COLLECTOR", "RECYCLER", "ADMIN"]);
    if (response) return response;

    const { id } = await params;
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { category: true, handovers: { orderBy: { capturedAt: "desc" }, take: 1 } },
    });
    if (!lot || !canSeeDeal(user, lot)) return apiError("NOT_FOUND", "Lot not found", 404);

    const transaction = await prisma.transaction.findUnique({ where: { lotId: lot.id }, include: { recycler: true } });
    const h = lot.handovers[0];

    return apiSuccess({
      lotId: lot.id,
      lotRef: lot.lotRef,
      category: lot.category.nameEn,
      declaredWeightGrams: lot.approxWeightGrams,
      declaredWeightKg: (lot.approxWeightGrams / 1000).toFixed(2),
      status: lot.status,
      transaction: transaction
        ? {
            id: transaction.id,
            status: transaction.status,
            quotedRatePaise: transaction.quotedRatePerKgPaise,
            quotedRateRupees: transaction.quotedRatePerKgPaise / 100,
            agreedRatePaise: transaction.agreedRatePaise,
            bargainStatus: transaction.bargainStatus,
            recycler: transaction.recycler
              ? {
                  id: transaction.recycler.id,
                  name: transaction.recycler.name,
                  phone: transaction.recycler.contactPhone,
                  address: transaction.recycler.address,
                }
              : null,
          }
        : null,
      latestHandover: h
        ? {
            id: h.id,
            handoverRef: h.handoverRef,
            status: h.status,
            declaredWeightGrams: h.declaredWeightGrams,
            confirmedWeightGrams: h.confirmedWeightGrams,
            capturedAt: h.capturedAt,
            locationClass: h.locationClass,
          }
        : null,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

/**
 * Recycler verifies a handover (spec s4): collector's code, then the actual weight.
 * - Code must match the stored hash (constant time). Nothing about the expected code is ever returned.
 * - Amount = actual weight x the rate locked at selection. No locked rate -> 409, never a made-up rate.
 * - Weight within tolerance -> CONFIRMED (and PAID when `paymentMode` is sent).
 * - Weight outside tolerance -> WEIGHED: the collector accepts or disputes in the app; nothing is paid yet.
 * Only the recycler chosen for the lot may call it.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireApiUser(req, ["RECYCLER"]);
    if (response) return response;

    const { id } = await params;
    const parsed = SubmitHandoverSchema.safeParse(await req.json());
    if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    const { verificationCode, scaleWeightGrams, paymentMode, paymentRef, latitude, longitude, gpsAccuracyMeters, mockLocationFlag } =
      parsed.data;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { category: true, collector: { include: { user: true } }, transaction: { include: { recycler: true } } },
    });
    if (!lot || !user.recyclerId || lot.chosenRecyclerId !== user.recyclerId) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }
    const tx = lot.transaction;
    if (!tx) return apiError("NO_TRANSACTION", "Lot does not have an active transaction", 409);
    if (lot.status !== "MATCHED" && lot.status !== "HANDED_OVER") {
      return apiError("ILLEGAL_TRANSITION", `Lot is ${lot.status} and cannot be verified`, 409);
    }

    const handover = await prisma.handover.findFirst({ where: { lotId: lot.id }, orderBy: { capturedAt: "desc" } });
    if (!handover) return apiError("NO_HANDOVER", "The collector has not created the handover for this lot yet", 409);
    if (!verifyEnteredHandoverCode(handover, verificationCode)) {
      return apiError("INVALID_CODE", "That code does not match this handover", 400);
    }

    const ratePerKgPaise = firstPositiveRate(tx.agreedRatePaise, tx.quotedRatePerKgPaise, lot.quotedRatePaise);
    if (ratePerKgPaise === null) {
      return apiError("RATE_NOT_AVAILABLE", "No rate was locked for this lot, so the amount cannot be calculated", 409);
    }
    const finalAmountPaise = amountPaise(scaleWeightGrams, ratePerKgPaise);

    const tolerance = evaluateWeightTolerance(lot.approxWeightGrams, scaleWeightGrams);
    const awaitingCollector = !tolerance.autoAccepted;
    const markPaid = paymentMode !== undefined && !awaitingCollector;

    const recycler = tx.recycler;
    const locationProof = classifyLocationProof(
      latitude ?? handover.latitude ?? lot.collectLat,
      longitude ?? handover.longitude ?? lot.collectLng,
      recycler?.latitude,
      recycler?.longitude,
      gpsAccuracyMeters ?? handover.accuracy,
      mockLocationFlag || handover.mockLocationFlag
    );
    const anomalies = [
      ...checkLocationAnomalies(locationProof.locationClass, locationProof.distanceToRecyclerMeters, locationProof.spoofFlags),
      ...[checkWeightAnomalies(lot.approxWeightGrams, scaleWeightGrams), checkPriceAnomalies(finalAmountPaise, lot.estimatedValuePaise)].filter(
        (a): a is NonNullable<typeof a> => a != null
      ),
    ];

    // Every step goes through the server state machine (MATCHED passes through HANDED_OVER on its way to COMPLETED).
    const targetStatus: LotStatus = markPaid ? "COMPLETED" : "HANDED_OVER";
    const steps: LotStatus[] = lot.status === "MATCHED" && targetStatus !== "HANDED_OVER" ? ["HANDED_OVER", targetStatus] : [targetStatus];
    let from = lot.status as LotStatus;
    for (const step of steps) {
      const check = validateLotTransition(from, step, true);
      if (!check.valid) return apiError("ILLEGAL_TRANSITION", check.reason ?? `Lot cannot move from ${lot.status} to ${targetStatus}`, 409);
      from = step;
    }

    const txStatus = markPaid ? "PAID" : awaitingCollector ? "HANDED_OVER" : "CONFIRMED";
    const now = new Date();
    const result = await prisma.$transaction(async (db) => {
      const updatedHandover = await db.handover.update({
        where: { id: handover.id },
        data: {
          confirmedWeightGrams: scaleWeightGrams,
          status: awaitingCollector ? "WEIGHED" : "CONFIRMED",
          recyclerConfirmedAt: now,
          confirmedById: user.userId,
          locationClass: locationProof.locationClass,
          distanceToRecyclerMeters: locationProof.distanceToRecyclerMeters,
          disputeReason: locationProof.spoofFlags.join("; ") || null,
        },
      });

      for (const a of anomalies) {
        const exists = await db.anomalyFlag.findFirst({ where: { lotId: lot.id, ruleCode: a.ruleCode } });
        if (!exists) {
          await db.anomalyFlag.create({
            data: { lotId: lot.id, ruleCode: a.ruleCode, type: a.type, severity: a.severity, reason: a.reason, status: "OPEN" },
          });
        }
      }

      let payment = null;
      if (markPaid) {
        payment = await db.payment.create({
          data: {
            id: `PAY-REC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            lotId: lot.id,
            transactionId: tx.id,
            amountPaise: finalAmountPaise,
            method: paymentMode,
            upiRef: paymentMode === "UPI" ? paymentRef ?? null : null,
            paidAt: now,
            recordedBy: "RECYCLER",
            confirmedByCollector: false, // the collector confirms "Money received" in the app
            confirmedByRecyclerId: user.userId,
          },
        });
      }

      await db.transaction.update({
        where: { id: tx.id },
        data: {
          status: txStatus,
          paymentStatus: markPaid ? "PAID" : "UNPAID",
          handoverAt: now,
          finalPricePaise: awaitingCollector ? null : finalAmountPaise,
        },
      });
      await db.lot.update({
        where: { id: lot.id },
        data: {
          status: targetStatus,
          transactionStatus: txStatus,
          paymentStatus: markPaid ? "PAID" : "UNPAID",
          finalPricePaise: awaitingCollector ? null : finalAmountPaise,
        },
      });
      return { handover: updatedHandover, payment };
    });

    await sendNotification({
      userId: lot.collector.userId,
      title: awaitingCollector ? "Weight differs: please review" : markPaid ? "Payment recorded" : "Handover confirmed",
      body: awaitingCollector
        ? `The recycler weighed ${(scaleWeightGrams / 1000).toFixed(2)} kg of ${lot.category.nameEn} (you said ${(lot.approxWeightGrams / 1000).toFixed(2)} kg). Open the lot to accept or dispute.`
        : `₹${(finalAmountPaise / 100).toFixed(0)} for ${(scaleWeightGrams / 1000).toFixed(2)} kg ${lot.category.nameEn}${markPaid ? ` paid by ${paymentMode}` : " confirmed"}.`,
      dataJson: { lotId: lot.id, handoverId: result.handover.id, finalAmountPaise, confirmedWeightGrams: scaleWeightGrams },
    });

    return apiSuccess(
      {
        message: awaitingCollector
          ? "Weight is outside tolerance: waiting for the collector to accept or dispute"
          : markPaid
            ? "Handover confirmed and payment recorded"
            : "Handover confirmed",
        lotId: lot.id,
        lotRef: lot.lotRef,
        handoverStatus: result.handover.status,
        awaitingCollector,
        confirmedWeightGrams: scaleWeightGrams,
        confirmedWeightKg: (scaleWeightGrams / 1000).toFixed(2),
        finalAmountPaise,
        tolerance,
        locationProof,
        payment: result.payment
          ? { id: result.payment.id, amountPaise: finalAmountPaise, amountRupees: finalAmountPaise / 100, method: paymentMode, status: "PAID" }
          : null,
        handoverId: result.handover.id,
      },
      201
    );
  } catch (err) {
    return apiErrorFrom(err);
  }
}
