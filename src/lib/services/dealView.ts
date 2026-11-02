import { prisma } from "../prisma";
import { LOT_ITEMS_INCLUDE, dealLines, lotItemsOf, lotPhotoUrls } from "./lotItemsView";
import { getLotDispatch } from "./vehicleService";

/**
 * Full deal details for a lot whose collector selected a recycler.
 * Only return this to the lot's collector, the selected recycler, or an admin.
 * `origin` (e.g. "https://app.example.com") is used to build the payment and invoice URLs.
 * `forCollector`: true only for the lot's own collector - adds the vehicle pickup OTP.
 */
export async function getDealView(lotId: string, origin: string, { forCollector = false }: { forCollector?: boolean } = {}) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      category: true,
      collector: { include: { user: { select: { phone: true } } } },
      transaction: { include: { recycler: true } },
      receiptTokens: { orderBy: { createdAt: "desc" }, take: 1 },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
      images: { select: { id: true, storageKey: true } },
      ...LOT_ITEMS_INCLUDE,
    },
  });
  if (!lot || !lot.transaction) return null;

  const tx = lot.transaction;
  const ratePerKgPaise = tx.agreedRatePaise ?? tx.quotedRatePerKgPaise;
  const token = lot.receiptTokens[0]?.token ?? null;
  const payment = lot.payments[0];
  const dispatch = await getLotDispatch(lot.id);

  return {
    lotId: lot.id,
    lotRef: lot.lotRef,
    lotStatus: lot.status,
    // Main (heaviest) material; see items for every material
    material: { categoryId: lot.categoryId, nameEn: lot.category.nameEn, nameHi: lot.category.nameHi, nameMr: lot.category.nameMr },
    items: dealLines(lotItemsOf(lot), tx).map((i) => ({
      categoryId: i.categoryId,
      nameEn: i.category.nameEn,
      nameHi: i.category.nameHi,
      nameMr: i.category.nameMr,
      weightGrams: i.weightGrams,
      ratePerKgPaise: i.ratePerKgPaise,
      amountPaise: i.amountPaise,
    })),
    photos: await lotPhotoUrls(lot.images),
    approxWeightGrams: lot.approxWeightGrams,
    // Average rate over all materials
    ratePerKgPaise,
    amountPaise: tx.finalPricePaise ?? tx.quotedPricePaise,
    paymentStatus: tx.paymentStatus,
    paymentToken: token,
    // DEMO: opening payUrl (e.g. by scanning its QR) marks the deal paid and redirects to the invoice page
    payUrl: token ? `${origin}/pay/${token}` : null,
    invoiceUrl: token ? `${origin}/invoice/${token}` : null,
    invoicePdfUrl: token ? `${origin}/invoice/${token}/pdf` : null,
    payment: payment
      ? { id: payment.id, method: payment.method, reference: payment.upiRef, amountPaise: payment.amountPaise, paidAt: payment.paidAt }
      : null,
    // Buyer's vehicle for the pickup: ON_THE_WAY until the OTP is entered, then PICKED_UP
    pickup: dispatch
      ? {
          status: dispatch.status,
          vehicle: dispatch.vehicle,
          dispatchedAt: dispatch.dispatchedAt,
          pickedUpAt: dispatch.pickedUpAt,
          otp: forCollector && dispatch.status === "ON_THE_WAY" ? dispatch.otp : undefined,
        }
      : null,
    collector: {
      name: lot.collector.name || `Collector ${lot.collector.shortCode}`,
      phone: lot.collector.user.phone,
      shortCode: lot.collector.shortCode,
      area: lot.collector.operatingArea,
      district: lot.collector.district,
      lotLatitude: lot.collectLat,
      lotLongitude: lot.collectLng,
    },
    recycler: {
      id: tx.recycler.id,
      name: tx.recycler.name,
      phone: tx.recycler.contactPhone,
      address: tx.recycler.address,
      area: tx.recycler.area,
      district: tx.recycler.district,
      authorizationNo: tx.recycler.authorizationNo,
      latitude: tx.recycler.latitude,
      longitude: tx.recycler.longitude,
    },
  };
}
