import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sortMutations, type SyncMutationInput } from "../../src/lib/services/syncEngine";
import { apiSuccess, apiError } from "../../src/lib/apiResponse";

describe("Unit: Services & Utilities", () => {
  it("sortMutations orders by entity dependency, then creates before updates, then timestamps", () => {
    const mutations: SyncMutationInput[] = [
      {
        clientMutationId: "m-payment",
        entity: "payment",
        entityId: "p1",
        op: "create",
        payload: { amountPaise: 5000 },
        clientTimestamp: "2026-11-01T10:05:00Z",
      },
      {
        clientMutationId: "m-lot-update",
        entity: "lot",
        entityId: "l1",
        op: "update",
        payload: { status: "MATCHED" },
        clientTimestamp: "2026-11-01T10:02:00Z",
      },
      {
        clientMutationId: "m-lot-create",
        entity: "lot",
        entityId: "l1",
        op: "create",
        payload: { approxWeightGrams: 5000 },
        clientTimestamp: "2026-11-01T10:00:00Z",
      },
      {
        clientMutationId: "m-handover",
        entity: "handover",
        entityId: "h1",
        op: "create",
        payload: { declaredWeightGrams: 5000 },
        clientTimestamp: "2026-11-01T10:04:00Z",
      },
    ];

    const sorted = sortMutations(mutations);

    // Lot (priority 1) comes before Handover (priority 4) before Payment (priority 6)
    // For Lot, create comes before update
    assert.equal(sorted[0].clientMutationId, "m-lot-create");
    assert.equal(sorted[1].clientMutationId, "m-lot-update");
    assert.equal(sorted[2].clientMutationId, "m-handover");
    assert.equal(sorted[3].clientMutationId, "m-payment");
  });

  it("sortMutations gracefully handles missing or invalid clientTimestamp", () => {
    const mutations: SyncMutationInput[] = [
      {
        clientMutationId: "m1",
        entity: "lot",
        entityId: "l1",
        op: "create",
        payload: {},
        clientTimestamp: "invalid-date",
      },
      {
        clientMutationId: "m2",
        entity: "lot",
        entityId: "l2",
        op: "create",
        payload: {},
        clientTimestamp: "2026-11-01T10:00:00Z",
      },
    ];

    const sorted = sortMutations(mutations);
    assert.equal(sorted.length, 2);
  });

  it("apiSuccess returns formatted NextResponse with 200 default status", async () => {
    const res = apiSuccess({ test: "data" }, 201);
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.deepEqual(json, { data: { test: "data" } });
  });

  it("apiError returns formatted error structure with given status code", async () => {
    const res = apiError("BAD_INPUT", "Invalid field", 400, { field: "weight" });
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.deepEqual(json, {
      error: {
        code: "BAD_INPUT",
        message: "Invalid field",
        details: { field: "weight" },
      },
    });
  });
});

