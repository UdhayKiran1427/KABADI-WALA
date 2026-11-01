import { prisma } from "../prisma";
import { LOT_ITEMS_INCLUDE, dealLines, lotItemsOf } from "./lotItemsView";

/**
 * Everything shown on an invoice (web page and PDF), loaded by its share token.
 * Returns null when the token is unknown, expired, or the lot has no deal yet.
 */
export async function getInvoice(token: string) {
  const share = await prisma.receiptShareToken.findUnique({
    where: { token },
    include: {
      lot: {
        include: {
          category: true,
          collector: { include: { user: { select: { phone: true } } } },
          transaction: { include: { recycler: true } },
          payments: { orderBy: { paidAt: "desc" }, take: 1 },
          ...LOT_ITEMS_INCLUDE,
        },
      },
    },
  });
  if (!share || share.expiresAt < new Date() || !share.lot.transaction) return null;

  const lot = share.lot;
  const tx = lot.transaction!;
  const payment = lot.payments[0];

  return {
    lotRef: lot.lotRef,
    issuedAt: payment?.paidAt ?? tx.createdAt,
    isPaid: tx.paymentStatus === "PAID",
    payment: payment ? { method: payment.method, reference: payment.upiRef, paidAt: payment.paidAt } : null,
    lines: dealLines(lotItemsOf(lot), tx).map((l) => ({
      categoryId: l.categoryId,
      nameEn: l.category.nameEn,
      nameHi: l.category.nameHi,
      weightGrams: l.weightGrams,
      ratePerKgPaise: l.ratePerKgPaise,
      amountPaise: l.amountPaise,
    })),
    totalWeightGrams: lot.approxWeightGrams,
    amountPaise: tx.finalPricePaise ?? tx.quotedPricePaise,
    seller: {
      name: lot.collector.name || `Collector ${lot.collector.shortCode}`,
      code: lot.collector.shortCode,
      phone: lot.collector.user.phone,
      area: [lot.collector.operatingArea, lot.collector.district].filter(Boolean).join(", "),
    },
    buyer: {
      name: tx.recycler.name,
      address: [tx.recycler.address, tx.recycler.area, tx.recycler.district].filter(Boolean).join(", "),
      phone: tx.recycler.contactPhone,
      authorizationNo: tx.recycler.authorizationNo,
    },
  };
}

export type Invoice = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;
