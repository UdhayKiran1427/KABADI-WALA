import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { evaluateWeightTolerance, classifyLocationProof } from "@/lib/domain/handover";
import { sendNotification } from "@/lib/services/notificationService";
import { PaymentMethod, TransactionStatus } from "@prisma/client";
import { z } from "zod";
import { amountPaise } from "@/lib/domain/money";

const SubmitHandoverSchema = z.object({
  verificationCode: z.string().optional(),
  scaleWeightGrams: z.number().int().positive("Scale weight must be positive grams"),
  paymentMode: z.enum(["CASH", "UPI"]).default("CASH"),
  paymentRef: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  gpsAccuracyMeters: z.number().optional(),
  mockLocationFlag: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        category: true,
        collector: true,
        handovers: {
          take: 1,
        },
      },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    const transaction = await prisma.transaction.findUnique({
      where: { lotId: lot.id },
      include: {
        recycler: true,
      },
    });

    // Deterministic 4-digit code based on lot
    const digits = (parseInt(lot.id.replace(/\D/g, "").slice(-4)) || 1234);
    const verificationCode = String(digits).padStart(4, "0");
    const qrPayload = `EWASTE:${lot.id}:${verificationCode}:${lot.approxWeightGrams}`;

    return apiSuccess({
      lotId: lot.id,
      lotRef: lot.lotRef,
      category: lot.category.nameEn,
      declaredWeightGrams: lot.approxWeightGrams,
      declaredWeightKg: (lot.approxWeightGrams / 1000).toFixed(2),
      verificationCode,
      qrPayload,
      status: lot.status,
      transaction: transaction ? {
        id: transaction.id,
        status: transaction.status,
        quotedRatePaise: transaction.quotedRatePerKgPaise,
        quotedRateRupees: transaction.quotedRatePerKgPaise / 100,
        agreedRatePaise: transaction.agreedRatePaise,
        bargainStatus: transaction.bargainStatus,
        recycler: transaction.recycler ? {
          id: transaction.recycler.id,
          name: transaction.recycler.name,
          phone: transaction.recycler.contactPhone,
          address: transaction.recycler.address,
        } : null,
      } : null,
      latestHandover: lot.handovers[0] || null,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = SubmitHandoverSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const {
      verificationCode,
      scaleWeightGrams,
      paymentMode,
      paymentRef,
      latitude,
      longitude,
      gpsAccuracyMeters,
      mockLocationFlag,
    } = parsed.data;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        category: true,
        collector: { include: { user: true } },
      },
    });

    if (!lot) {
      return apiError("NOT_FOUND", "Lot not found", 404);
    }

    const tx = await prisma.transaction.findUnique({
      where: { lotId: lot.id },
      include: {
        recycler: true,
      },
    });

    if (!tx) {
      return apiError("NO_TRANSACTION", "Lot does not have an active transaction", 400);
    }

    const recycler = tx.recycler;

    // Optional verification code check
    const expectedCode = String(parseInt(lot.id.replace(/\D/g, "").slice(-4)) || 1234).padStart(4, "0");
    if (verificationCode && verificationCode.trim() !== expectedCode) {
      return apiError("INVALID_CODE", `Invalid verification code. Expected ${expectedCode}`, 400);
    }

    // Weight tolerance check
    const tolerance = evaluateWeightTolerance(lot.approxWeightGrams, scaleWeightGrams);

    // Location proof check
    const locationProof = classifyLocationProof(
      latitude,
      longitude,
      recycler?.latitude,
      recycler?.longitude,
      gpsAccuracyMeters,
      mockLocationFlag
    );

    // Calculate final payout: use agreed rate if negotiated, otherwise transaction rate
    const effectiveRatePaise = tx.agreedRatePaise || tx.quotedRatePerKgPaise || 4000;
    const finalAmountPaise = amountPaise(scaleWeightGrams, effectiveRatePaise);

    const handoverId = `HO-${lot.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`;
    const paymentId = `PAY-${lot.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`;
    const handoverRef = `HO-REF-${Date.now().toString().slice(-6)}`;
    const qrPayload = `EWASTE:${lot.id}:${expectedCode}:${scaleWeightGrams}`;

    const result = await prisma.$transaction(async (db) => {
      // Upsert handover record
      const existingHandover = await db.handover.findFirst({
        where: {
          OR: [{ transactionId: tx.id }, { lotId: lot.id }],
        },
      });

      let handover;
      if (existingHandover) {
        handover = await db.handover.update({
          where: { id: existingHandover.id },
          data: {
            confirmedWeightGrams: scaleWeightGrams,
            status: "CONFIRMED",
            recyclerConfirmedAt: new Date(),
            locationClass: locationProof.locationClass,
            disputeReason: locationProof.spoofFlags.join("; ") || (tolerance.requiresReview ? `WEIGHT_MISMATCH_${tolerance.percentageDiff}%` : null),
          },
        });
      } else {
        handover = await db.handover.create({
          data: {
            id: handoverId,
            lotId: lot.id,
            transactionId: tx.id,
            handoverRef,
            qrPayload,
            verificationCode: expectedCode,
            declaredWeightGrams: lot.approxWeightGrams,
            confirmedWeightGrams: scaleWeightGrams,
            capturedAt: new Date(),
            latitude: latitude || null,
            longitude: longitude || null,
            accuracy: gpsAccuracyMeters || null,
            locationClass: locationProof.locationClass,
            mockLocationFlag: mockLocationFlag || false,
            status: "CONFIRMED",
            recyclerConfirmedAt: new Date(),
            disputeReason: locationProof.spoofFlags.join("; ") || (tolerance.requiresReview ? `WEIGHT_MISMATCH_${tolerance.percentageDiff}%` : null),
          },
        });
      }

      // Upsert payment record
      const existingPayment = await db.payment.findFirst({
        where: { lotId: lot.id },
      });

      let payment;
      if (existingPayment) {
        payment = await db.payment.update({
          where: { id: existingPayment.id },
          data: {
            amountPaise: finalAmountPaise,
            method: paymentMode as PaymentMethod,
            paidAt: new Date(),
            recordedBy: "RECYCLER",
            upiRef: paymentMode === "UPI" ? (paymentRef || `UPI-${Date.now().toString().slice(-6)}`) : null,
          },
        });
      } else {
        payment = await db.payment.create({
          data: {
            id: paymentId,
            lotId: lot.id,
            transactionId: tx.id,
            amountPaise: finalAmountPaise,
            method: paymentMode as PaymentMethod,
            paidAt: new Date(),
            recordedBy: "RECYCLER",
            upiRef: paymentMode === "UPI" ? (paymentRef || `UPI-${Date.now().toString().slice(-6)}`) : null,
          },
        });
      }

      // Update transaction
      await db.transaction.update({
        where: { id: tx.id },
        data: {
          status: "PAID" as TransactionStatus,
          paymentStatus: "PAID",
          handoverAt: new Date(),
          finalPricePaise: finalAmountPaise,
        },
      });

      // Update lot status
      await db.lot.update({
        where: { id: lot.id },
        data: {
          status: "COMPLETED",
          finalPricePaise: finalAmountPaise,
        },
      });

      return { handover, payment };
    });

    // Notify collector with payout details
    await sendNotification({
      userId: lot.collector.userId,
      title: "💰 Payment Confirmed!",
      body: `₹${(finalAmountPaise / 100).toFixed(0)} received via ${paymentMode} for ${(scaleWeightGrams / 1000).toFixed(2)}kg ${lot.category.nameEn}.`,
      dataJson: {
        lotId: lot.id,
        handoverId: result.handover.id,
        paymentId: result.payment.id,
        finalAmountPaise,
        confirmedWeightGrams: scaleWeightGrams,
      },
    });

    return apiSuccess({
      message: "Handover completed and payment recorded successfully",
      lotId: lot.id,
      lotRef: lot.lotRef,
      confirmedWeightGrams: scaleWeightGrams,
      confirmedWeightKg: (scaleWeightGrams / 1000).toFixed(2),
      tolerance,
      locationProof,
      payment: {
        id: result.payment.id,
        amountPaise: finalAmountPaise,
        amountRupees: finalAmountPaise / 100,
        method: paymentMode,
        status: "PAID",
      },
      handoverId: result.handover.id,
    }, 201);
  } catch (err) {
    return apiErrorFrom(err);
  }
}
