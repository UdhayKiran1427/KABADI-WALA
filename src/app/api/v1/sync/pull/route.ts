import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSyncActor } from "@/lib/auth/getAuthSyncActor";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import {
  afterCursorWhere,
  encodePullCursor,
  mergePullPage,
  parsePullCursor,
  type PullItem,
} from "@/lib/contract/pullCursor";
import {
  serializeLotUpdate,
  serializePullLot,
  serializePullNotification,
  serializePullPickupRequest,
} from "@/lib/contract/serializers";

/** Items per response across all collections together. `?limit=` may lower or raise it within [1, MAX]. */
const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 500;

export async function GET(req: NextRequest) {
  try {
    // Taken BEFORE any query: a row committed while we read can only have a later timestamp.
    const serverTimestamp = new Date();

    const actor = await getAuthSyncActor(req);
    if (!actor) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    const url = new URL(req.url);
    const parsedCursor = parsePullCursor(url.searchParams.get("since"));
    if (parsedCursor === "invalid") {
      return apiError("VALIDATION_ERROR", "since must be an ISO-8601 time or a nextSince value from a previous pull", 400);
    }
    const cursor = parsedCursor ?? { ts: new Date(0), rank: 3, id: "" };

    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Number.isInteger(limitParam) && limitParam >= 1 ? Math.min(limitParam, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    // Each collection is read in (timestamp, id) order, one past the limit, then merged into one ordered page.
    const [lots, notifications, pickups] = await Promise.all([
      actor.collector
        ? prisma.lot.findMany({
            where: { collectorId: actor.collector.id, ...afterCursorWhere("lot", "updatedAt", cursor) },
            orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
            take: limit + 1,
            include: { handovers: true, payments: true },
          })
        : Promise.resolve([]),
      prisma.notification.findMany({
        where: { userId: actor.userId, ...afterCursorWhere("notification", "createdAt", cursor) },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: limit + 1,
      }),
      // PickupRequest.collectorId stores the owning USER id (the sync handler and the web portal write the same).
      prisma.pickupRequest.findMany({
        where: { collectorId: actor.userId, ...afterCursorWhere("pickup", "updatedAt", cursor) },
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        take: limit + 1,
      }),
    ]);

    type Row = (typeof lots)[number] | (typeof notifications)[number] | (typeof pickups)[number];
    const candidates: PullItem<Row>[] = [
      ...lots.map((row) => ({ kind: "lot" as const, ts: row.updatedAt, id: row.id, row })),
      ...notifications.map((row) => ({ kind: "notification" as const, ts: row.createdAt, id: row.id, row })),
      ...pickups.map((row) => ({ kind: "pickup" as const, ts: row.updatedAt, id: row.id, row })),
    ];
    const { page, hasMore } = mergePullPage(candidates, limit);

    const last = page[page.length - 1];
    const nextSince = last ? encodePullCursor(last) : url.searchParams.get("since")?.trim() || new Date(0).toISOString();

    const pageLots = page.filter((i) => i.kind === "lot").map((i) => i.row as (typeof lots)[number]);
    return apiSuccess({
      serverTimestamp: serverTimestamp.toISOString(),
      nextSince,
      hasMore,
      lots: pageLots.map(serializePullLot),
      lotUpdates: pageLots.map(serializeLotUpdate).filter((u) => u !== null),
      notifications: page.filter((i) => i.kind === "notification").map((i) => serializePullNotification(i.row as (typeof notifications)[number])),
      pickupRequests: page.filter((i) => i.kind === "pickup").map((i) => serializePullPickupRequest(i.row as (typeof pickups)[number])),
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
