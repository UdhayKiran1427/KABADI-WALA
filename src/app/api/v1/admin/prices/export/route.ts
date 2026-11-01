import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN"]);

    const prices = await prisma.pricePoint.findMany({
      orderBy: { recordedAt: "desc" },
      include: { category: true },
    });

    const header = "ID,CategoryCode,CategoryName,BuyingPriceRupees,MarketLowRupees,MarketHighRupees,BuyerType,Source,Area,District,RecordedAt\n";
    const rows = prices
      .map((p) => {
        return [
          p.id,
          p.category.code,
          `"${p.category.nameEn}"`,
          (p.buyingPricePaise / 100).toFixed(2),
          p.marketLowPaise ? (p.marketLowPaise / 100).toFixed(2) : "",
          p.marketHighPaise ? (p.marketHighPaise / 100).toFixed(2) : "",
          p.buyerType || "SCRAP_DEALER",
          p.source,
          `"${p.area}"`,
          `"${p.district}"`,
          p.recordedAt.toISOString(),
        ].join(",");
      })
      .join("\n");

    const csvContent = header + rows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="price-dataset-${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Error: ${errorMsg}`, { status: 500 });
  }
}

