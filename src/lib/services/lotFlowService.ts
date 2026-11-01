import { randomBytes, randomUUID } from "crypto";
import { prisma } from "../prisma";
import { selectBroadcastTargets, calculateLotValuePaise, isValidCoordinate } from "../domain/lotBroadcast";
import { generateLotRef } from "../domain/lotRef";
import { sendNotification } from "./notificationService";

/**
 * Expected business-rule failure. Web actions show `message`; the API returns `code` + `status`.
 */
export class FlowError extends Error {
  constructor(public code: string, message: string, public status: number = 400) {
    super(message);
  }
}

export interface TodayRate {
  ratePerKgPaise: number;
  recordedAt: Date;
}

/**
 * Admin-set "today's price" per category (latest ADMIN price point per category).
 */
export async function getTodayRates(): Promise<Map<number, TodayRate>> {
  const latest = await prisma.pricePoint.findMany({
    where: { source: "ADMIN" },
    orderBy: { recordedAt: "desc" },
    distinct: ["categoryId"],
    select: { categoryId: true, buyingPricePaise: true, recordedAt: true },
  });

  return new Map(
    latest.map((p) => [p.categoryId, { ratePerKgPaise: p.buyingPricePaise, recordedAt: p.recordedAt }])
  );
}

export async function getTodayRate(categoryId: number): Promise<TodayRate | null> {
  const latest = await prisma.pricePoint.findFirst({
    where: { categoryId, source: "ADMIN" },
    orderBy: { recordedAt: "desc" },
    select: { buyingPricePaise: true, recordedAt: true },
  });
  return latest ? { ratePerKgPaise: latest.buyingPricePaise, recordedAt: latest.recordedAt } : null;
}

/**
 * Sends the same notification to every staff login of a recycler facility.
 */
export async function notifyRecyclerStaff(
  recyclerId: string,
  title: string,
  body: string,
  dataJson?: Record<string, unknown>
) {
  const staff = await prisma.recyclerStaff.findMany({ where: { recyclerId }, select: { userId: true } });
  await Promise.all(staff.map((s) => sendNotification({ userId: s.userId, title, body, dataJson })));
}

/**
 * Notifies all verified recyclers within 5 km about a READY lot.
 * Recyclers already notified for this lot are skipped, so it is safe to call again.
 * The notification carries material, weight and price but never the collector's identity.
 */
export async function broadcastLot(lotId: string): Promise<{ newlyNotified: number; totalNotified: number }> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { category: true, collector: true, offers: { select: { recyclerId: true } } },
  });
  if (!lot || lot.collectLat == null || lot.collectLng == null) {
    return { newlyNotified: 0, totalNotified: 0 };
  }

  const recyclers = await prisma.recycler.findMany({
    where: { authorizationStatus: "VERIFIED" },
    select: { id: true, latitude: true, longitude: true, authorizationStatus: true, authorizationValidTill: true },
  });

  const alreadyNotified = new Set(lot.offers.map((o) => o.recyclerId));
  const targets = selectBroadcastTargets(recyclers, lot.collectLat, lot.collectLng).filter(
    (t) => !alreadyNotified.has(t.recyclerId)
  );

  if (targets.length > 0) {
    await prisma.lotOffer.createMany({
      data: targets.map((t) => ({ lotId: lot.id, recyclerId: t.recyclerId, distanceKm: t.distanceKm })),
    });

    const kg = (lot.approxWeightGrams / 1000).toFixed(1);
    const rate = lot.listedRatePerKgPaise ?? 0;
    const total = calculateLotValuePaise(rate, lot.approxWeightGrams);

    await Promise.all(
      targets.map((t) =>
        notifyRecyclerStaff(
          t.recyclerId,
          `New lot ${t.distanceKm.toFixed(1)} km away`,
          `${kg} kg ${lot.category.nameEn} @ ₹${(rate / 100).toFixed(0)}/kg = ₹${(total / 100).toFixed(0)} · Area: ${lot.collector.operatingArea}. Tap "Ready to buy" on your dashboard.`,
          { lotId: lot.id, lotRef: lot.lotRef, distanceKm: t.distanceKm }
        )
      )
    );
  }

  return { newlyNotified: targets.length, totalNotified: alreadyNotified.size + targets.length };
}

export type DemoPaymentResult = "PAID" | "ALREADY_PAID" | "NOT_FOUND" | "NOT_PAYABLE";

/**
 * DEMO ONLY: settles a matched lot when its payment QR is scanned.
 * No money moves; it records a UPI payment with a DEMO reference and completes the lot.
 * Safe to call repeatedly - only the first call records a payment.
 */
export async function completeDemoPayment(token: string): Promise<DemoPaymentResult> {
  const share = await prisma.receiptShareToken.findUnique({
    where: { token },
    include: { lot: { include: { transaction: true, category: true } } },
  });
  if (!share || share.expiresAt < new Date()) return "NOT_FOUND";

  const lot = share.lot;
  const tx = lot.transaction;
  if (!tx) return "NOT_PAYABLE";
  if (tx.paymentStatus === "PAID") return "ALREADY_PAID";
  if (lot.status !== "MATCHED") return "NOT_PAYABLE";

  const amountPaise = calculateLotValuePaise(tx.agreedRatePaise ?? tx.quotedRatePerKgPaise, lot.approxWeightGrams);
  const now = new Date();

  const paid = await prisma.$transaction(async (db) => {
    const claimed = await db.transaction.updateMany({
      where: { id: tx.id, paymentStatus: { not: "PAID" } },
      data: { status: "PAID", paymentStatus: "PAID", finalPricePaise: amountPaise, handoverAt: now },
    });
    if (claimed.count === 0) return false;

    await db.payment.create({
      data: {
        id: randomUUID(),
        lotId: lot.id,
        transactionId: tx.id,
        amountPaise,
        method: "UPI",
        upiRef: `DEMO-${randomBytes(4).toString("hex").toUpperCase()}`,
        paidAt: now,
        confirmedByCollector: true,
        recordedBy: "RECYCLER",
      },
    });

    await db.lot.update({
      where: { id: lot.id },
      data: { status: "COMPLETED", finalPricePaise: amountPaise, transactionStatus: "PAID", paymentStatus: "PAID" },
    });
    return true;
  });

  if (!paid) return "ALREADY_PAID";

  const collector = await prisma.collector.findUnique({ where: { id: lot.collectorId }, select: { userId: true } });
  const summary = `₹${(amountPaise / 100).toFixed(0)} for ${(lot.approxWeightGrams / 1000).toFixed(1)} kg ${lot.category.nameEn} (Lot ${lot.lotRef}).`;
  if (collector) {
    await sendNotification({ userId: collector.userId, title: "Payment received", body: summary, dataJson: { lotId: lot.id } });
  }
  await notifyRecyclerStaff(tx.recyclerId, "Payment successful", summary, { lotId: lot.id });

  return "PAID";
}

export interface CreateLotInput {
  collectorId: string;
  categoryId: number;
  approxWeightGrams: number;
  latitude?: number;
  longitude?: number;
  lotId?: string;
}

/**
 * Creates a DRAFT lot valued at the admin's today's price.
 * Location: device GPS when valid, otherwise the centroid of the collector's registered area.
 */
export async function createLot(input: CreateLotInput) {
  const collector = await prisma.collector.findUnique({ where: { id: input.collectorId } });
  if (!collector) throw new FlowError("NOT_FOUND", "Collector profile not found", 404);

  if (!Number.isInteger(input.approxWeightGrams) || input.approxWeightGrams <= 0) {
    throw new FlowError("VALIDATION_ERROR", "Please enter a valid weight");
  }

  const todayRate = await getTodayRate(input.categoryId);
  if (!todayRate) {
    throw new FlowError("PRICE_NOT_SET", "Today's price for this material is not set yet. Please choose another material or contact admin.");
  }

  let collectLat = input.latitude ?? NaN;
  let collectLng = input.longitude ?? NaN;
  if (!isValidCoordinate(collectLat, collectLng)) {
    const centroid = await prisma.areaCentroid.findFirst({
      where: { area: { equals: collector.operatingArea.trim(), mode: "insensitive" } },
    });
    if (!centroid) {
      throw new FlowError("LOCATION_REQUIRED", "Location is needed to find recyclers within 5 km. Please allow location access and try again.");
    }
    collectLat = centroid.latitude;
    collectLng = centroid.longitude;
  }

  // lotRef sequence is count-based; skip forward if an earlier lot was deleted
  let sequence = (await prisma.lot.count({ where: { collectorId: collector.id } })) + 1;
  let lotRef = generateLotRef(collector.shortCode, new Date(), sequence);
  while (await prisma.lot.findUnique({ where: { lotRef }, select: { id: true } })) {
    sequence += 1;
    lotRef = generateLotRef(collector.shortCode, new Date(), sequence);
  }

  return prisma.lot.create({
    data: {
      id: input.lotId ?? randomUUID(),
      lotRef,
      collectorId: collector.id,
      categoryId: input.categoryId,
      approxWeightGrams: input.approxWeightGrams,
      listedRatePerKgPaise: todayRate.ratePerKgPaise,
      estimatedValuePaise: calculateLotValuePaise(todayRate.ratePerKgPaise, input.approxWeightGrams),
      status: "DRAFT",
      collectedAt: new Date(),
      collectLat,
      collectLng,
    },
    include: { category: true },
  });
}

/**
 * Collector confirms a DRAFT lot; it is then broadcast to recyclers within 5 km.
 * Caller must have checked lot ownership.
 */
export async function confirmLot(lotId: string) {
  const confirmed = await prisma.lot.updateMany({
    where: { id: lotId, status: "DRAFT" },
    data: { status: "READY" },
  });
  if (confirmed.count === 0) {
    throw new FlowError("INVALID_STATE", "Only a lot waiting for confirmation can be confirmed", 409);
  }
  return broadcastLot(lotId);
}

/**
 * "Search again": re-runs the broadcast for a READY lot. Caller must have checked ownership.
 */
export async function rebroadcastLot(lotId: string) {
  const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { status: true } });
  if (!lot || lot.status !== "READY") {
    throw new FlowError("INVALID_STATE", "Only a lot waiting for recyclers can be searched again", 409);
  }
  return broadcastLot(lotId);
}

/**
 * Collector picks one of the recyclers who said "ready to buy".
 * Creates the transaction and payment token; other recyclers are told the lot is gone.
 * Caller must have checked lot ownership.
 */
export async function selectOffer(lotId: string, offerId: string) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { category: true, collector: { include: { user: { select: { phone: true } } } } },
  });
  if (!lot) throw new FlowError("NOT_FOUND", "Lot not found", 404);

  const offer = await prisma.lotOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.lotId !== lot.id || offer.status !== "INTERESTED" || offer.ratePerKgPaise == null) {
    throw new FlowError("OFFER_NOT_AVAILABLE", "This recycler is not available for this lot", 409);
  }

  const ratePerKgPaise = offer.ratePerKgPaise;
  const totalPaise = calculateLotValuePaise(ratePerKgPaise, lot.approxWeightGrams);
  const paymentToken = randomBytes(16).toString("hex");
  const otherInterested = await prisma.lotOffer.findMany({
    where: { lotId: lot.id, status: "INTERESTED", id: { not: offer.id } },
    select: { recyclerId: true },
  });

  const selected = await prisma.$transaction(async (db) => {
    const claimed = await db.lot.updateMany({
      where: { id: lot.id, status: "READY" },
      data: { status: "MATCHED", chosenRecyclerId: offer.recyclerId, quotedRatePaise: ratePerKgPaise, transactionStatus: "ACCEPTED" },
    });
    if (claimed.count === 0) return false;

    await db.lotOffer.update({ where: { id: offer.id }, data: { status: "SELECTED" } });
    await db.lotOffer.updateMany({
      where: { lotId: lot.id, id: { not: offer.id }, status: { in: ["NOTIFIED", "INTERESTED"] } },
      data: { status: "NOT_SELECTED" },
    });

    await db.transaction.create({
      data: {
        id: randomUUID(),
        lotId: lot.id,
        collectorId: lot.collectorId,
        recyclerId: offer.recyclerId,
        status: "ACCEPTED",
        quotedRatePerKgPaise: ratePerKgPaise,
        quotedPricePaise: totalPaise,
        agreedRatePaise: ratePerKgPaise,
        bargainStatus: "AGREED",
      },
    });

    await db.receiptShareToken.create({
      data: { lotId: lot.id, token: paymentToken, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    });
    return true;
  });

  if (!selected) {
    throw new FlowError("ALREADY_SELECTED", "A recycler has already been selected for this lot", 409);
  }

  const kg = (lot.approxWeightGrams / 1000).toFixed(1);
  await notifyRecyclerStaff(
    offer.recyclerId,
    "Collector selected you!",
    `Lot ${lot.lotRef}: ${kg} kg ${lot.category.nameEn} for ₹${(totalPaise / 100).toFixed(0)}. Collector: ${lot.collector.name || "Collector " + lot.collector.shortCode}, Phone ${lot.collector.user.phone}. Open the deal to pay.`,
    { lotId: lot.id }
  );
  await Promise.all(
    otherInterested.map((o) =>
      notifyRecyclerStaff(o.recyclerId, "Lot sold to another recycler", `Lot ${lot.lotRef} (${kg} kg ${lot.category.nameEn}) is no longer available.`, {
        lotId: lot.id,
      })
    )
  );

  return { recyclerId: offer.recyclerId, ratePerKgPaise, totalPaise, paymentToken };
}

/**
 * Recycler answers a broadcast: INTERESTED (with its rate in paise/kg) or DECLINED.
 * The collector's identity stays hidden until the collector selects a recycler.
 */
export async function respondToOffer(
  offerId: string,
  recyclerId: string,
  response: "INTERESTED" | "DECLINED",
  ratePerKgPaise?: number
) {
  const offer = await prisma.lotOffer.findUnique({
    where: { id: offerId },
    include: { lot: { include: { collector: true } }, recycler: true },
  });
  if (!offer || offer.recyclerId !== recyclerId) {
    throw new FlowError("NOT_FOUND", "Lot request not found", 404);
  }
  if (offer.lot.status !== "READY" || offer.status !== "NOTIFIED") {
    throw new FlowError("NOT_OPEN", "This lot is no longer open", 409);
  }

  if (response === "DECLINED") {
    await prisma.lotOffer.updateMany({
      where: { id: offer.id, status: "NOTIFIED" },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return { status: "DECLINED" as const };
  }

  if (ratePerKgPaise == null || !Number.isInteger(ratePerKgPaise) || ratePerKgPaise <= 0 || ratePerKgPaise > 10_000_000) {
    throw new FlowError("VALIDATION_ERROR", "Please enter a valid buying rate in ₹/kg");
  }

  const updated = await prisma.lotOffer.updateMany({
    where: { id: offer.id, status: "NOTIFIED" },
    data: { status: "INTERESTED", ratePerKgPaise, respondedAt: new Date() },
  });

  if (updated.count > 0) {
    const totalPaise = calculateLotValuePaise(ratePerKgPaise, offer.lot.approxWeightGrams);
    await sendNotification({
      userId: offer.lot.collector.userId,
      title: `${offer.recycler.name} wants to buy`,
      body: `Lot ${offer.lot.lotRef}: ₹${(ratePerKgPaise / 100).toFixed(0)}/kg = ₹${(totalPaise / 100).toFixed(0)} · ${offer.distanceKm.toFixed(1)} km away. Open the lot to choose a buyer.`,
      dataJson: { lotId: offer.lot.id },
    });
  }

  return { status: "INTERESTED" as const, ratePerKgPaise };
}
