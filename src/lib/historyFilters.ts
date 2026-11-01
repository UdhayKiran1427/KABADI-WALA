export interface HistoryQuery {
  q: string;
  status: string;
  material: string;
  period: string;
}

const PERIOD_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

/**
 * Reads history filters from page search params, dropping values that are not allowed.
 */
export function parseHistoryQuery(
  params: { q?: string; status?: string; material?: string; period?: string },
  allowedStatuses: string[]
): HistoryQuery {
  const q = (params.q || "").trim().slice(0, 60);
  const status = allowedStatuses.includes(params.status || "") ? (params.status as string) : "";
  const material = /^\d+$/.test(params.material || "") ? (params.material as string) : "";
  const period = params.period && PERIOD_DAYS[params.period] ? params.period : "";
  return { q, status, material, period };
}

/** Start date for a period filter ("7d", "30d", "90d"), or undefined for all time. */
export function periodStart(period: string, now: Date = new Date()): Date | undefined {
  const days = PERIOD_DAYS[period];
  return days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : undefined;
}

export const PERIOD_VALUES = ["", "7d", "30d", "90d"] as const;
