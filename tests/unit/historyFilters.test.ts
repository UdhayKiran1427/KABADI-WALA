import test from "node:test";
import assert from "node:assert/strict";
import { parseHistoryQuery, periodStart } from "../../src/lib/historyFilters";

test("parseHistoryQuery keeps valid filters and drops unknown ones", () => {
  assert.deepEqual(parseHistoryQuery({ q: "  ramesh ", status: "paid", material: "3", period: "30d" }, ["paid", "topay"]), {
    q: "ramesh",
    status: "paid",
    material: "3",
    period: "30d",
  });
  assert.deepEqual(parseHistoryQuery({ status: "HACKED", material: "abc", period: "5y" }, ["paid"]), {
    q: "",
    status: "",
    material: "",
    period: "",
  });
});

test("parseHistoryQuery caps search length", () => {
  assert.equal(parseHistoryQuery({ q: "x".repeat(200) }, []).q.length, 60);
});

test("periodStart returns the window start, or undefined for all time", () => {
  const now = new Date("2026-11-02T00:00:00Z");
  assert.equal(periodStart("7d", now)?.toISOString(), "2026-10-26T00:00:00.000Z");
  assert.equal(periodStart("", now), undefined);
});
