import test from "node:test";
import assert from "node:assert/strict";
import {
  afterCursorWhere,
  comparePullItems,
  encodePullCursor,
  mergePullPage,
  parsePullCursor,
  type PullItem,
  type PullKind,
} from "../../src/lib/contract/pullCursor";

const T = new Date("2026-11-01T12:00:00.000Z");
const item = (kind: PullKind, id: string, ts: Date = T): PullItem<string> => ({ kind, ts, id, row: `${kind}:${id}` });

test("cursor round trips and plain ISO is accepted", () => {
  const encoded = encodePullCursor({ ts: T, kind: "notification", id: "n-1" });
  assert.equal(encoded, "2026-11-01T12:00:00.000Z|1|n-1");
  assert.deepEqual(parsePullCursor(encoded), { ts: T, rank: 1, id: "n-1" });
  assert.deepEqual(parsePullCursor("2026-11-01T12:00:00.000Z"), { ts: T, rank: 3, id: "" });
  assert.equal(parsePullCursor(undefined), null);
  assert.equal(parsePullCursor(""), null);
  for (const bad of ["garbage", "2026-11-01T12:00:00.000Z|x|y", "2026-11-01T12:00:00.000Z|9|y", "2026-11-01T12:00:00.000Z|1"]) {
    assert.equal(parsePullCursor(bad), "invalid", bad);
  }
});

test("afterCursorWhere: same kind uses (ts, id) tie-break, later kinds include the instant, earlier kinds exclude it", () => {
  const cursor = parsePullCursor(encodePullCursor({ ts: T, kind: "notification", id: "n-5" })) as Exclude<ReturnType<typeof parsePullCursor>, null | "invalid">;
  assert.deepEqual(afterCursorWhere("pickup", "updatedAt", cursor), { updatedAt: { gte: T } });
  assert.deepEqual(afterCursorWhere("lot", "updatedAt", cursor), { updatedAt: { gt: T } });
  assert.deepEqual(afterCursorWhere("notification", "createdAt", cursor), { OR: [{ createdAt: { gt: T } }, { createdAt: T, id: { gt: "n-5" } }] });
  assert.deepEqual(afterCursorWhere("lot", "updatedAt", null), {});
  const plain = parsePullCursor("2026-11-01T12:00:00.000Z") as Exclude<ReturnType<typeof parsePullCursor>, null | "invalid">;
  for (const kind of ["lot", "notification", "pickup"] as const) {
    assert.deepEqual(afterCursorWhere(kind, "updatedAt", plain), { updatedAt: { gt: T } }, "plain ISO is strictly-after for every kind");
  }
});

test("mergePullPage orders by (ts, kind rank, id) and reports hasMore", () => {
  const later = new Date(T.getTime() + 1);
  const merged = mergePullPage([item("pickup", "p1"), item("lot", "b"), item("notification", "n1"), item("lot", "a"), item("lot", "c", later)], 4);
  assert.deepEqual(merged.page.map((i) => i.row), ["lot:a", "lot:b", "notification:n1", "pickup:p1"]);
  assert.equal(merged.hasMore, true);
  assert.equal(mergePullPage([item("lot", "a")], 1).hasMore, false);
  assert.equal(mergePullPage([], 5).hasMore, false);
});

/** Simulates the route: one table per kind, a cursor, a page size. */
function paginate(all: PullItem<string>[], limit: number) {
  const delivered: string[] = [];
  let cursor: ReturnType<typeof parsePullCursor> = parsePullCursor("2020-01-01T00:00:00.000Z");
  for (let guard = 0; guard < 100; guard++) {
    const c = cursor as Exclude<typeof cursor, "invalid">;
    const matches = (i: PullItem<string>) => {
      if (!c) return true;
      return comparePullItems(i, { kind: (["lot", "notification", "pickup"] as const)[Math.min(c.rank, 2)], ts: c.ts, id: c.id }) > 0 || (c.rank === 3 && i.ts > c.ts);
    };
    // per-collection fetch of limit + 1, like the route
    const candidates = (["lot", "notification", "pickup"] as const).flatMap((kind) =>
      all.filter((i) => i.kind === kind && matches(i)).sort(comparePullItems).slice(0, limit + 1)
    );
    const { page, hasMore } = mergePullPage(candidates, limit);
    delivered.push(...page.map((i) => i.row));
    if (page.length > 0) {
      const last = page[page.length - 1];
      cursor = parsePullCursor(encodePullCursor(last));
    }
    if (!hasMore) return delivered;
  }
  throw new Error("pagination did not terminate");
}

test("paging with many equal timestamps never skips or repeats an item at a page boundary", () => {
  const all: PullItem<string>[] = [];
  for (let i = 0; i < 9; i++) all.push(item("lot", `l${i}`));
  for (let i = 0; i < 4; i++) all.push(item("notification", `n${i}`));
  for (let i = 0; i < 3; i++) all.push(item("pickup", `p${i}`));
  all.push(item("lot", "tail", new Date(T.getTime() + 10)));
  const expected = new Set(all.map((i) => i.row));
  for (const limit of [1, 2, 3, 4, 7, 8, 16, 17, 100]) {
    const got = paginate(all, limit);
    assert.equal(got.length, expected.size, `limit ${limit}`);
    assert.deepEqual(new Set(got), expected, `limit ${limit}`);
  }
});
