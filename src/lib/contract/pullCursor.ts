/**
 * Pure cursor logic for GET /api/v1/sync/pull (docs/sync-contract.md §4).
 *
 * The three collections (lots, notifications, pickup requests) are paged as ONE stream ordered by
 * (timestamp, kind rank, id). A cursor names the last delivered item, so rows that share a timestamp
 * are never skipped or repeated at a page boundary.
 *
 * Wire format of `since` / `nextSince`:
 *   - `2026-11-01T12:25:10.000Z`            plain ISO: everything strictly after that instant (first call, epoch, old clients)
 *   - `2026-11-01T12:25:10.000Z|1|<id>`      compound: everything after item (<id> of kind rank 1) at that instant
 * Clients treat `nextSince` as an opaque string and send it back unchanged.
 */

export const PULL_KINDS = ["lot", "notification", "pickup"] as const;
export type PullKind = (typeof PULL_KINDS)[number];

export const KIND_RANK: Readonly<Record<PullKind, number>> = { lot: 0, notification: 1, pickup: 2 };

/** Rank used for a plain-ISO cursor: sorts after every kind, so only strictly-later rows match. */
const PLAIN_ISO_RANK = PULL_KINDS.length;

export interface PullCursor {
  ts: Date;
  rank: number;
  id: string;
}

export function encodePullCursor(c: { ts: Date; kind: PullKind; id: string }): string {
  return `${c.ts.toISOString()}|${KIND_RANK[c.kind]}|${c.id}`;
}

/** Returns `null` for "no cursor" (undefined/empty) and `"invalid"` for garbage. */
export function parsePullCursor(raw: string | null | undefined): PullCursor | null | "invalid" {
  if (raw === null || raw === undefined || raw.trim() === "") return null;
  const parts = raw.trim().split("|");
  const ts = new Date(parts[0]);
  if (Number.isNaN(ts.getTime())) return "invalid";
  if (parts.length === 1) return { ts, rank: PLAIN_ISO_RANK, id: "" };
  if (parts.length < 3) return "invalid";
  const rank = Number(parts[1]);
  if (!Number.isInteger(rank) || rank < 0 || rank >= PLAIN_ISO_RANK) return "invalid";
  // ids never contain "|" (uuid / rec-…), but re-join defensively.
  return { ts, rank, id: parts.slice(2).join("|") };
}

/** Prisma-style `where` fragment: rows of [kind] positioned after [cursor] on timestamp field [field]. */
export function afterCursorWhere(kind: PullKind, field: "updatedAt" | "createdAt", cursor: PullCursor | null): Record<string, unknown> {
  if (!cursor) return {};
  const rank = KIND_RANK[kind];
  if (rank > cursor.rank) return { [field]: { gte: cursor.ts } };
  if (rank < cursor.rank) return { [field]: { gt: cursor.ts } };
  return { OR: [{ [field]: { gt: cursor.ts } }, { [field]: cursor.ts, id: { gt: cursor.id } }] };
}

export interface PullItem<T> {
  kind: PullKind;
  ts: Date;
  id: string;
  row: T;
}

export function comparePullItems(a: { kind: PullKind; ts: Date; id: string }, b: { kind: PullKind; ts: Date; id: string }): number {
  const dt = a.ts.getTime() - b.ts.getTime();
  if (dt !== 0) return dt;
  const dr = KIND_RANK[a.kind] - KIND_RANK[b.kind];
  if (dr !== 0) return dr;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Merge per-collection candidates (each fetched with `limit + 1`, ordered by (ts, id)) into one page.
 * `hasMore` is true when anything beyond `limit` exists.
 */
export function mergePullPage<T>(candidates: PullItem<T>[], limit: number): { page: PullItem<T>[]; hasMore: boolean } {
  const sorted = [...candidates].sort(comparePullItems);
  return { page: sorted.slice(0, limit), hasMore: sorted.length > limit };
}
