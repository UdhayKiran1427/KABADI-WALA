/** Pure helpers for the admin impact page (M5), kept out of the page so they can be tested. */

export interface MonthlyKg {
  /** Short month label, e.g. "Nov". */
  label: string;
  /** First instant of the month (UTC). */
  start: Date;
  kg: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** First instant (UTC) of the month that is `months - 1` months before `now`'s month. */
export function impactWindowStart(now: Date, months = 6): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

/** Buckets confirmed handover weights (grams) into the last `months` calendar months, oldest first. */
export function monthlyKg(rows: ReadonlyArray<{ capturedAt: Date; grams: number | null }>, now: Date, months = 6): MonthlyKg[] {
  const buckets: MonthlyKg[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ label: MONTH_LABELS[start.getUTCMonth()], start, kg: 0 });
  }
  const grams = buckets.map(() => 0);
  for (const r of rows) {
    const idx = buckets.findIndex((b, i) => {
      const next = i + 1 < buckets.length ? buckets[i + 1].start : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      return r.capturedAt >= b.start && r.capturedAt < next;
    });
    if (idx >= 0) grams[idx] += r.grams ?? 0;
  }
  return buckets.map((b, i) => ({ ...b, kg: Math.round(grams[i] / 1000) }));
}
