/**
 * Pure mapping from server rows to the field names the Flutter `ReferenceDataSyncer` consumes
 * (docs/sync-contract.md §5). The bootstrap route must build its response with these.
 */

export const DEFAULT_TOLERANCE_PERCENT = 15;

export interface PricePointRow {
  id: string;
  categoryId: number;
  area: string;
  district: string;
  recordedAt: Date;
  buyingPricePaise: number;
  marketLowPaise?: number | null;
  marketHighPaise?: number | null;
  source: "FIELD_AGENT" | "RECYCLER" | "ADMIN";
  buyerType?: string | null;
}

export interface ClientPrice {
  id: string;
  categoryId: number;
  area: string;
  district: string;
  recordedAt: string;
  buyerType: "MARKET" | "SCRAP_DEALER" | "RECYCLER";
  source: "ADMIN" | "FIELD" | "RECYCLER";
  benchmarkPricePaise: number;
  tolerancePercent: number;
}

/**
 * The phone stores `low = benchmark * (100 - t) / 100` and `high = benchmark * (100 + t) / 100`.
 * Pick the smallest whole t that still covers the server's band, so the phone never shows a
 * narrower range than the server computed. Falls back to 15 when the band is unknown.
 */
export function toleranceFromBand(benchmarkPaise: number, lowPaise?: number | null, highPaise?: number | null): number {
  if (benchmarkPaise <= 0 || lowPaise == null || highPaise == null) return DEFAULT_TOLERANCE_PERCENT;
  const widest = Math.max(benchmarkPaise - lowPaise, highPaise - benchmarkPaise, 0);
  return Math.min(100, Math.ceil((widest * 100) / benchmarkPaise));
}

export function toClientSource(source: PricePointRow["source"]): ClientPrice["source"] {
  return source === "FIELD_AGENT" ? "FIELD" : source;
}

/** Server `buyerType` is only set for dealer / recycler quotes; admin "today's price" rows are MARKET. */
export function toClientBuyerType(row: Pick<PricePointRow, "buyerType" | "source">): ClientPrice["buyerType"] {
  if (row.buyerType === "SCRAP_DEALER" || row.buyerType === "RECYCLER" || row.buyerType === "MARKET") return row.buyerType;
  if (row.source === "RECYCLER") return "RECYCLER";
  if (row.source === "FIELD_AGENT") return "SCRAP_DEALER";
  return "MARKET";
}

export function mapPricePointToClient(row: PricePointRow): ClientPrice {
  return {
    id: row.id,
    categoryId: row.categoryId,
    area: row.area,
    district: row.district,
    recordedAt: row.recordedAt.toISOString(),
    buyerType: toClientBuyerType(row),
    source: toClientSource(row.source),
    benchmarkPricePaise: row.buyingPricePaise,
    tolerancePercent: toleranceFromBand(row.buyingPricePaise, row.marketLowPaise, row.marketHighPaise),
  };
}
