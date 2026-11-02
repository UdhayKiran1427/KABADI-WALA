import { randomBytes, randomUUID } from "crypto";
import { prisma } from "../prisma";
import { selectBroadcastTargets, calculateLotValuePaise, isValidCoordinate } from "../domain/lotBroadcast";
import {
  averageRatePerKgPaise,
  completeItemRates,
  type ItemRate,
  type LotItemInput,
  lotValuePaise,
  normalizeLotItems,
  parseAskingPricePaise,
  type PricedLotItem,
  primaryItem,
  totalWeightGrams,
} from "../domain/lotItems";
import { generateLotRef } from "../domain/lotRef";
import { sendNotification } from "./notificationService";
import { LOT_ITEMS_INCLUDE, lotItemsLabel, lotItemsOf } from "./lotItemsView";

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

export const MAX_LOT_PHOTOS = 5;

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

const rupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`;

/**
 * Notifies all verified recyclers within 5 km about a READY lot.
 * Recyclers already notified for this lot are skipped, so it is safe to call again.
 * The notification carries materials, weights and price but never the collector's identity.
 */
export async function broadcastLot(lotId: string): Promise<{ newlyNotified: number; totalNotified: number }> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { category: true, collector: true, offers: { select: { recyclerId: true } }, ...LOT_ITEMS_INCLUDE },
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

    const items = lotItemsOf(lot);
    const total = lot.estimatedValuePaise ?? lotValuePaise(items);

    await Promise.all(
      targets.map((t) =>
        notifyRecyclerStaff(
          t.recyclerId,
          `New lot ${t.distanceKm.toFixed(1)} km away`,
          lot.askingPricePaise
            ? `${lotItemsLabel(items)} · Collector asks ${rupees(lot.askingPricePaise)} (today's rate ${rupees(total)}) · Area: ${lot.collector.operatingArea}. Tap "Ready to buy" on your dashboard.`
            : `${lotItemsLabel(items)} = ${rupees(total)} · Area: ${lot.collector.operatingArea}. Tap "Ready to buy" on your dashboard.`,
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
    include: { lot: { include: { transaction: true, category: true, ...LOT_ITEMS_INCLUDE } } },
  });
  if (!share || share.expiresAt < new Date()) return "NOT_FOUND";

  const lot = share.lot;
  const tx = lot.transaction;
  if (!tx) return "NOT_PAYABLE";
  if (tx.paymentStatus === "PAID") return "ALREADY_PAID";
  if (lot.status !== "MATCHED") return "NOT_PAYABLE";

  const amountPaise = tx.quotedPricePaise;
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
  const summary = `${rupees(amountPaise)} for ${lotItemsLabel(lotItemsOf(lot))} (Lot ${lot.lotRef}).`;
  if (collector) {
    await sendNotification({ userId: collector.userId, title: "Payment received", body: summary, dataJson: { lotId: lot.id } });
  }
  await notifyRecyclerStaff(tx.recyclerId, "Payment successful", summary, { lotId: lot.id });

  return "PAID";
}

export interface CreateLotInput {
  collectorId: string;
  /** One row per material, e.g. [{ categoryId: 1, weightGrams: 5000 }, { categoryId: 2, weightGrams: 2000 }] */
  items: LotItemInput[];
  latitude?: number;
  longitude?: number;
  lotId?: string;
  /** Storage keys of already-uploaded photos (max 5) */
  photoKeys?: string[];
  /** Collector's own selling price for the whole lot (paise); omit to sell at today's rate */
  askingPricePaise?: number | null;
}

/**
 * Creates a DRAFT lot with one or more materials, each valued at the admin's today's price.
 * Location: device GPS when valid, otherwise the centroid of the collector's registered area.
 */
export async function createLot(input: CreateLotInput) {
  const collector = await prisma.collector.findUnique({ where: { id: input.collectorId } });
  if (!collector) throw new FlowError("NOT_FOUND", "Collector profile not found", 404);

  const normalized = normalizeLotItems(input.items);
  if ("error" in normalized) throw new FlowError("VALIDATION_ERROR", normalized.error);

  const photoKeys = input.photoKeys ?? [];
  const asking = parseAskingPricePaise(input.askingPricePaise == null ? null : input.askingPricePaise / 100);
  if ("error" in asking) throw new FlowError("VALIDATION_ERROR", asking.error);
  if (photoKeys.length > MAX_LOT_PHOTOS) {
    throw new FlowError("VALIDATION_ERROR", `You can add at most ${MAX_LOT_PHOTOS} photos`);
  }

  const [todayRates, categories] = await Promise.all([
    getTodayRates(),
    prisma.materialCategory.findMany({
      where: { id: { in: normalized.items.map((i) => i.categoryId) }, isActive: true },
      select: { id: true, nameEn: true },
    }),
  ]);

  const items: PricedLotItem[] = [];
  for (const item of normalized.items) {
    const category = categories.find((c) => c.id === item.categoryId);
    if (!category) throw new FlowError("VALIDATION_ERROR", "Unknown material");
    const rate = todayRates.get(item.categoryId);
    if (!rate) {
      throw new FlowError("PRICE_NOT_SET", `Today's price for ${category.nameEn} is not set yet. Please remove it or contact admin.`);
    }
    items.push({ ...item, listedRatePerKgPaise: rate.ratePerKgPaise });
  }

  let collectLat = input.latitude ?? NaN;
  let collectLng = input.longitude ?? NaN;
  if (!isValidCoordinate(collectLat, collectLng)) {
    let centroid = await prisma.areaCentroid.findFirst({
      where: { area: { equals: collector.operatingArea.trim(), mode: "insensitive" } },
    });
    if (!centroid && collector.operatingArea) {
      centroid = await prisma.areaCentroid.findFirst({
        where: {
          OR: [
            { area: { contains: collector.operatingArea.trim().split(" ")[0], mode: "insensitive" as const } },
            ...(collector.district ? [{ district: { equals: collector.district.trim(), mode: "insensitive" as const } }] : []),
          ],
        },
      });
    }
    if (!centroid) {
      centroid = await prisma.areaCentroid.findFirst();
    }
    if (!centroid) {
      collectLat = 19.0434;
      collectLng = 72.8567;
    } else {
      collectLat = centroid.latitude;
      collectLng = centroid.longitude;
    }
  }

  // lotRef sequence is count-based; skip forward if an earlier lot was deleted
  let sequence = (await prisma.lot.count({ where: { collectorId: collector.id } })) + 1;
  let lotRef = generateLotRef(collector.shortCode, new Date(), sequence);
  while (await prisma.lot.findUnique({ where: { lotRef }, select: { id: true } })) {
    sequence += 1;
    lotRef = generateLotRef(collector.shortCode, new Date(), sequence);
  }

  const lotId = input.lotId ?? randomUUID();
  const weight = totalWeightGrams(items);
  const value = lotValuePaise(items);
  const now = new Date();

  await prisma.$transaction(async (db) => {
    await db.lot.create({
      data: {
        id: lotId,
        lotRef,
        collectorId: collector.id,
        categoryId: primaryItem(items).categoryId,
        approxWeightGrams: weight,
        listedRatePerKgPaise: averageRatePerKgPaise(value, weight),
        estimatedValuePaise: value,
        askingPricePaise: asking.paise,
        status: "DRAFT",
        collectedAt: now,
        collectLat,
        collectLng,
      },
    });

    await db.lotItem.createMany({
      data: items.map((i) => ({ lotId, categoryId: i.categoryId, weightGrams: i.weightGrams, listedRatePerKgPaise: i.listedRatePerKgPaise })),
    });

    if (photoKeys.length > 0) {
      await db.lotImage.createMany({
        data: photoKeys.map((storageKey) => ({ id: randomUUID(), lotId, storageKey, takenAt: now })),
      });
    }
  });

  return prisma.lot.findUniqueOrThrow({ where: { id: lotId }, include: { category: true, images: true, ...LOT_ITEMS_INCLUDE } });
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

/** What a recycler offered for a whole lot (handles offers saved before per-material rates). */
export function offerTotalPaise(offer: { totalPaise: number | null; ratePerKgPaise: number | null }, lotWeightGrams: number): number {
  return offer.totalPaise ?? calculateLotValuePaise(offer.ratePerKgPaise ?? 0, lotWeightGrams);
}

/**
 * Collector picks one of the recyclers who said "ready to buy".
 * Creates the transaction and payment token; other recyclers are told the lot is gone.
 * Caller must have checked lot ownership.
 */
export async function selectOffer(lotId: string, offerId: string) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { category: true, collector: { include: { user: { select: { phone: true } } } }, ...LOT_ITEMS_INCLUDE },
  });
  if (!lot) throw new FlowError("NOT_FOUND", "Lot not found", 404);

  const offer = await prisma.lotOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.lotId !== lot.id || offer.status !== "INTERESTED" || offer.ratePerKgPaise == null) {
    throw new FlowError("OFFER_NOT_AVAILABLE", "This recycler is not available for this lot", 409);
  }

  const totalPaise = offerTotalPaise(offer, lot.approxWeightGrams);
  const ratePerKgPaise = averageRatePerKgPaise(totalPaise, lot.approxWeightGrams);
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
        itemRates: offer.itemRates,
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

  const label = lotItemsLabel(lotItemsOf(lot));
  await notifyRecyclerStaff(
    offer.recyclerId,
    "Collector selected you!",
    `Lot ${lot.lotRef}: ${label} for ${rupees(totalPaise)}. Collector: ${lot.collector.name || "Collector " + lot.collector.shortCode}, Phone ${lot.collector.user.phone}. Open the deal to pay.`,
    { lotId: lot.id }
  );
  await Promise.all(
    otherInterested.map((o) =>
      notifyRecyclerStaff(o.recyclerId, "Lot sold to another recycler", `Lot ${lot.lotRef} (${label}) is no longer available.`, {
        lotId: lot.id,
      })
    )
  );

  return { recyclerId: offer.recyclerId, ratePerKgPaise, totalPaise, paymentToken };
}

export interface OfferRates {
  /** Rate per material in paise/kg. Materials left out use `ratePerKgPaise` or their listed price. */
  itemRates?: ItemRate[];
  /** One rate for every material (older app builds, single-material lots). */
  ratePerKgPaise?: number;
}

/**
 * Recycler answers a broadcast: INTERESTED (with its rates) or DECLINED.
 * The collector's identity stays hidden until the collector selects a recycler.
 */
export async function respondToOffer(
  offerId: string,
  recyclerId: string,
  response: "INTERESTED" | "DECLINED",
  rates: OfferRates = {}
) {
  const offer = await prisma.lotOffer.findUnique({
    where: { id: offerId },
    include: { lot: { include: { collector: true, category: true, ...LOT_ITEMS_INCLUDE } }, recycler: true },
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

  const items = lotItemsOf(offer.lot);
  const completed = completeItemRates(items, rates.itemRates ?? [], rates.ratePerKgPaise);
  if ("error" in completed) throw new FlowError("VALIDATION_ERROR", completed.error);

  const totalPaise = lotValuePaise(items, completed.rates);
  const ratePerKgPaise = averageRatePerKgPaise(totalPaise, offer.lot.approxWeightGrams);

  const updated = await prisma.lotOffer.updateMany({
    where: { id: offer.id, status: "NOTIFIED" },
    data: { status: "INTERESTED", ratePerKgPaise, totalPaise, itemRates: completed.rates, respondedAt: new Date() },
  });

  if (updated.count > 0) {
    await sendNotification({
      userId: offer.lot.collector.userId,
      title: `${offer.recycler.name} wants to buy`,
      body: `Lot ${offer.lot.lotRef}: ${rupees(totalPaise)} · ${offer.distanceKm.toFixed(1)} km away. Open the lot to choose a buyer.`,
      dataJson: { lotId: offer.lot.id },
    });
  }

  return { status: "INTERESTED" as const, totalPaise, itemRates: completed.rates };
}
