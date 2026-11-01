import { prisma } from "../prisma";
import { calculateLotValuePaise } from "../domain/lotBroadcast";

/**
 * Full deal details for a lot whose collector selected a recycler.
 * Only return this to the lot's collector, the selected recycler, or an admin.
 * `origin` (e.g. "https://app.example.com") is used to build the payment and invoice URLs.
 */
export async function getDealView(lotId: string, origin: string) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      category: true,
      collector: { include: { user: { select: { phone: true } } } },
      transaction: { include: { recycler: true } },
      receiptTokens: { orderBy: { createdAt: "desc" }, take: 1 },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
    },
  });
  if (!lot || !lot.transaction) return null;

  const tx = lot.transaction;
  const ratePerKgPaise = tx.agreedRatePaise ?? tx.quotedRatePerKgPaise;
  const token = lot.receiptTokens[0]?.token ?? null;
  const payment = lot.payments[0];

  return {
    lotId: lot.id,
    lotRef: lot.lotRef,
    lotStatus: lot.status,
    material: { categoryId: lot.categoryId, nameEn: lot.category.nameEn, nameHi: lot.category.nameHi, nameMr: lot.category.nameMr },
    approxWeightGrams: lot.approxWeightGrams,
    ratePerKgPaise,
    amountPaise: tx.finalPricePaise ?? calculateLotValuePaise(ratePerKgPaise, lot.approxWeightGrams),
    paymentStatus: tx.paymentStatus,
    paymentToken: token,
    // DEMO: opening payUrl (e.g. by scanning its QR) marks the deal paid and redirects to the invoice page
    payUrl: token ? `${origin}/pay/${token}` : null,
    invoiceUrl: token ? `${origin}/invoice/${token}` : null,
    payment: payment
      ? { id: payment.id, method: payment.method, reference: payment.upiRef, amountPaise: payment.amountPaise, paidAt: payment.paidAt }
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
