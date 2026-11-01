/**
 * Sync engine against a REAL MongoDB replica set (Phase 2 guarantees).
 *
 * Runs only when TEST_DATABASE_URL points at a database whose name contains "test", e.g.
 *   TEST_DATABASE_URL="mongodb://127.0.0.1:27117/ewaste_sync_test?replicaSet=rs0&directConnection=true" \
 *   npx tsx --test tests/integration/syncEngine.test.ts
 * The database is created by `prisma db push` beforehand (unique indexes) and dropped at the end.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = !!TEST_URL && /test/i.test(new URL(TEST_URL.replace(/^mongodb(\+srv)?:/, "http:")).pathname);
const STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ewaste-storage-"));
if (enabled) {
  process.env.DATABASE_URL = TEST_URL;
  process.env.STORAGE_DRIVER = "local";
  process.env.STORAGE_LOCAL_DIR = STORAGE_DIR;
}

type Engine = typeof import("../../src/lib/services/syncEngine");
type PrismaMod = typeof import("../../src/lib/prisma");

describe("Integration: sync engine (real MongoDB)", { skip: !enabled && "set TEST_DATABASE_URL to a *test* database" }, () => {
  let engine: Engine;
  let prisma: PrismaMod["prisma"];
  let pushRoute: typeof import("../../src/app/api/v1/sync/push/route");
  let pullRoute: typeof import("../../src/app/api/v1/sync/pull/route");
  let signMobileToken: typeof import("../../src/lib/auth/jwt").signMobileToken;
  let hashHandoverCode: typeof import("../../src/lib/domain/handover").hashHandoverCode;

  const suffix = randomUUID().slice(0, 4).toUpperCase();
  const SHORT = `T${suffix.slice(0, 3)}`;
  let userId: string;
  let collectorId: string;
  let otherUserId: string;
  let otherCollectorId: string;
  let agentUserId: string;
  const recyclerId = `rec-test-${suffix}`;
  const CATEGORY = 9101;
  let ctx: import("../../src/lib/services/syncEngine").SyncActorContext;
  let otherCtx: import("../../src/lib/services/syncEngine").SyncActorContext;
  let agentCtx: import("../../src/lib/services/syncEngine").SyncActorContext;
  let seq = 0;

  const now = () => new Date().toISOString();
  const mut = (entity: string, entityId: string, op: "create" | "update", payload: Record<string, any>, id: string = randomUUID()) => ({
    clientMutationId: id,
    entity,
    entityId,
    op,
    payload,
    clientTimestamp: now(),
  });
  const run = (m: ReturnType<typeof mut>, c = ctx) => engine.processMutation(m, c);
  const nextRef = () => `LOT-${SHORT}-261101-${String(++seq).padStart(3, "0")}`;

  async function newLot(state: "DRAFT" | "SAVED" | "QUOTED" = "SAVED", extra: Record<string, any> = {}) {
    const id = randomUUID();
    const r = await run(
      mut("lot", id, "create", {
        id,
        lotRef: nextRef(),
        categoryId: CATEGORY,
        approxWeightGrams: 5000,
        estimatedValuePaise: 160000,
        transactionStatus: state,
        collectedAt: now(),
        ...extra,
      })
    );
    assert.equal(r.status, "APPLIED", JSON.stringify(r));
    return id;
  }
  const storedCount = (id: string) => prisma.syncMutation.count({ where: { id } });

  before(async () => {
    engine = await import("../../src/lib/services/syncEngine");
    ({ prisma } = await import("../../src/lib/prisma"));
    pushRoute = await import("../../src/app/api/v1/sync/push/route");
    pullRoute = await import("../../src/app/api/v1/sync/pull/route");
    ({ signMobileToken } = await import("../../src/lib/auth/jwt"));
    ({ hashHandoverCode } = await import("../../src/lib/domain/handover"));

    const mkUser = async (role: "COLLECTOR" | "FIELD_AGENT", short?: string) => {
      const user = await prisma.user.create({
        data: { role, phone: `9${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`, pinHash: "x", language: "HI", isActive: true },
      });
      const collector = short
        ? await prisma.collector.create({ data: { userId: user.id, name: "T", shortCode: short, operatingArea: "Pune", preferredLanguage: "HI" } })
        : null;
      return { user, collector };
    };
    const a = await mkUser("COLLECTOR", SHORT);
    const b = await mkUser("COLLECTOR", `U${suffix.slice(0, 3)}`);
    const g = await mkUser("FIELD_AGENT");
    userId = a.user.id;
    collectorId = a.collector!.id;
    otherUserId = b.user.id;
    otherCollectorId = b.collector!.id;
    agentUserId = g.user.id;
    const mkCtx = (u: string, c: { id: string; shortCode: string } | null, role: "COLLECTOR" | "FIELD_AGENT") => ({
      userId: u,
      role,
      collector: c ? { id: c.id, shortCode: c.shortCode, operatingArea: "Pune" } : null,
      deviceId: "test-device",
    });
    ctx = mkCtx(userId, a.collector!, "COLLECTOR");
    otherCtx = mkCtx(otherUserId, b.collector!, "COLLECTOR");
    agentCtx = mkCtx(agentUserId, null, "FIELD_AGENT");

    await prisma.materialCategory.create({
      data: { id: CATEGORY, code: `test_${suffix}`, nameEn: "T", nameHi: "T", nameMr: "T", iconKey: "t", defaultUnit: "KG", isHazardous: false, isActive: true },
    });
    await prisma.recycler.create({
      data: {
        id: recyclerId, name: "Test Recycler", address: "x", area: "Pune", district: "Pune", state: "MH", latitude: 18.5204, longitude: 73.8567,
        authorizationNo: `AUTH-${suffix}`, authorizationStatus: "VERIFIED", authorizationValidTill: new Date(Date.now() + 365 * 86_400_000),
        contactPhone: "9822012345", pickupAvailable: true, serviceRadiusKm: 25, minimumWeightGrams: 1000, pickupChargePaise: 0,
      },
    });
    await prisma.recyclerRate.create({
      data: { recyclerId, categoryId: CATEGORY, ratePerKgPaise: 34000, unit: "KG", effectiveFrom: new Date(), isCurrent: true },
    });
  });

  after(async () => {
    if (!enabled) return;
    await prisma.$runCommandRaw({ dropDatabase: 1 });
    await prisma.$disconnect();
    fs.rmSync(STORAGE_DIR, { recursive: true, force: true });
  });

  // ---------- 1. clientMutationId is set centrally ----------

  it("every result carries the real clientMutationId plus code, message and retryable", async () => {
    const lotId = await newLot();
    const cases = [
      mut("lot", lotId, "update", { transactionStatus: "QUOTED" }), // APPLIED
      mut("nope", randomUUID(), "create", {}), // UNKNOWN_ENTITY
      mut("lot", randomUUID(), "create", { lotRef: "bad" }), // INVALID_PAYLOAD
      mut("payment", randomUUID(), "create", { id: randomUUID(), lotId: randomUUID(), amountPaise: 100, method: "CASH", paidAt: now() }), // retryable parent missing
      mut("lot", randomUUID(), "create", { id: "x", lotRef: "x" }), // payload.id mismatch
    ];
    for (const m of cases) {
      const r = await run(m);
      assert.equal(r.clientMutationId, m.clientMutationId, `${m.entity}: ${JSON.stringify(r)}`);
      assert.ok(r.code && r.message !== undefined && typeof r.retryable === "boolean", JSON.stringify(r));
    }
    const dup = await run(cases[0]);
    assert.equal(dup.clientMutationId, cases[0].clientMutationId);
  });

  // ---------- 2. persistence rules ----------

  it("APPLIED is stored once; the replay is DUPLICATE with the same canonicalId", async () => {
    const id = randomUUID();
    const m = mut("lot", id, "create", { id, lotRef: nextRef(), categoryId: CATEGORY, approxWeightGrams: 1000, transactionStatus: "SAVED", collectedAt: now() });
    const first = await run(m);
    const second = await run(m);
    assert.equal(first.status, "APPLIED");
    assert.equal(second.status, "DUPLICATE");
    assert.equal(second.code, "ALREADY_PROCESSED");
    assert.equal(second.canonicalId, first.canonicalId);
    assert.equal(await prisma.lot.count({ where: { id } }), 1);
    assert.equal(await storedCount(m.clientMutationId), 1);
  });

  it("REJECTED + retryable:true is NOT persisted, so the retry is processed again (no silent data loss)", async () => {
    const lotId = randomUUID();
    const payId = randomUUID();
    const m = mut("payment", payId, "create", { id: payId, lotId, amountPaise: 5000, method: "CASH", paidAt: now() });

    const first = await run(m);
    assert.equal(first.status, "REJECTED");
    assert.equal(first.code, "PARENT_LOT_NOT_FOUND");
    assert.equal(first.retryable, true);
    assert.equal(await storedCount(m.clientMutationId), 0, "retryable outcome must not be remembered");

    // the parent arrives, the very same mutation is retried
    await run(mut("lot", lotId, "create", { id: lotId, lotRef: nextRef(), categoryId: CATEGORY, approxWeightGrams: 1000, transactionStatus: "SAVED", collectedAt: now() }));
    const retry = await run(m);
    assert.equal(retry.status, "APPLIED", JSON.stringify(retry));
    assert.equal(await prisma.payment.count({ where: { id: payId } }), 1);
  });

  it("a stored REJECTED (non-retryable) comes back as REJECTED with the same code, never DUPLICATE", async () => {
    const m = mut("lot", randomUUID(), "create", { id: "ignored", lotRef: "LOT-WRONG-261101-001" });
    const bad = mut("lot", m.entityId, "create", { id: m.entityId, lotRef: "LOT-ZZZZ-261101-001", categoryId: CATEGORY, approxWeightGrams: 1000, transactionStatus: "SAVED", collectedAt: now() });
    const first = await run(bad);
    const second = await run(bad);
    assert.equal(first.status, "REJECTED");
    assert.equal(first.code, "INVALID_LOT_REF");
    assert.equal(first.retryable, false);
    assert.equal(second.status, "REJECTED");
    assert.equal(second.code, "INVALID_LOT_REF");
    assert.equal(second.retryable, false);
    assert.equal(await storedCount(bad.clientMutationId), 1);
    assert.equal(await prisma.lot.count({ where: { id: m.entityId } }), 0);
  });

  it("a stored CONFLICT comes back as CONFLICT (with its serverState) and wrote nothing", async () => {
    const refLot = await newLot();
    const ref = (await prisma.lot.findUniqueOrThrow({ where: { id: refLot } })).lotRef;
    const id = randomUUID();
    const m = mut("lot", id, "create", { id, lotRef: ref, categoryId: CATEGORY, approxWeightGrams: 1000, transactionStatus: "SAVED", collectedAt: now() });
    const first = await run(m);
    const second = await run(m);
    for (const r of [first, second]) {
      assert.equal(r.status, "CONFLICT");
      assert.equal(r.code, "DUPLICATE_LOT_REF");
      assert.equal(r.retryable, false);
      assert.equal((r.serverState as any)?.lotRef, ref);
    }
    assert.equal(await prisma.lot.count({ where: { id } }), 0);
  });

  it("a non-APPLIED outcome rolls back the handler's writes", async () => {
    // Upsert of the transaction happens before STALE_QUOTED_RATE can be raised only if the check order regressed.
    const lotId = await newLot();
    await prisma.recyclerRate.updateMany({ where: { recyclerId, categoryId: CATEGORY }, data: { effectiveFrom: new Date(Date.now() - 30 * 86_400_000) } });
    const r = await run(mut("lot", lotId, "update", { transactionStatus: "QUOTED", chosenRecyclerId: recyclerId, quotedRatePaise: 99999 }));
    await prisma.recyclerRate.updateMany({ where: { recyclerId, categoryId: CATEGORY }, data: { effectiveFrom: new Date() } });
    assert.equal(r.status, "CONFLICT");
    assert.equal(r.code, "STALE_QUOTED_RATE");
    const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    assert.equal(lot.status, "READY");
    assert.equal(await prisma.transaction.count({ where: { lotId } }), 0);
  });

  it("legacy REJECTED rows with a retryable code (persisted by the old engine) are forgotten and reprocessed", async () => {
    const lotId = randomUUID();
    const payId = randomUUID();
    const mid = randomUUID();
    await prisma.syncMutation.create({
      data: { id: mid, deviceId: "d", userId, entity: "payment", entityId: payId, op: "create", payload: {}, clientTimestamp: new Date(), status: "REJECTED", resultCode: "PARENT_LOT_NOT_FOUND", resultMessage: "old" },
    });
    await run(mut("lot", lotId, "create", { id: lotId, lotRef: nextRef(), categoryId: CATEGORY, approxWeightGrams: 1000, transactionStatus: "SAVED", collectedAt: now() }));
    const r = await run(mut("payment", payId, "create", { id: payId, lotId, amountPaise: 100, method: "CASH", paidAt: now() }, mid));
    assert.equal(r.status, "APPLIED", JSON.stringify(r));
  });

  it("another account's clientMutationId is refused and not echoed", async () => {
    const lotId = await newLot();
    const m = mut("lot", lotId, "update", { transactionStatus: "QUOTED" });
    await run(m);
    const r = await run(m, otherCtx);
    assert.equal(r.status, "REJECTED");
    assert.equal(r.code, "MUTATION_ID_IN_USE");
    assert.equal(r.canonicalId, undefined);
  });

  // ---------- 3/4. lot create + update, status mapping ----------

  it("lot: every pushable client state is stored as the mapped (LotStatus, TransactionStatus) pair", async () => {
    const { toServerLotState, CLIENT_PUSHABLE_LOT_STATES } = await import("../../src/lib/domain/lotStatusMapping");
    for (const state of CLIENT_PUSHABLE_LOT_STATES) {
      let lotId: string;
      if (state === "DRAFT" || state === "SAVED" || state === "QUOTED") {
        lotId = await newLot(state);
      } else {
        lotId = await newLot("SAVED");
        const via: Record<string, Record<string, any>> = {
          HANDOVER_PENDING: { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId },
          CANCELLED: { transactionStatus: "CANCELLED", cancelReason: "PRICE_LOW", cancelledAt: now() },
          EXPIRED: { transactionStatus: "EXPIRED" },
          DISPUTED: { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId },
        };
        const r = await run(mut("lot", lotId, "update", via[state]));
        assert.equal(r.status, "APPLIED", `${state}: ${JSON.stringify(r)}`);
        if (state === "DISPUTED") {
          const d = await run(mut("lot", lotId, "update", { transactionStatus: "DISPUTED" }));
          assert.equal(d.status, "APPLIED", JSON.stringify(d));
        }
      }
      const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
      const want = toServerLotState(state);
      assert.equal(lot.status, want.lotStatus, state);
      assert.equal(lot.transactionStatus, want.transactionStatus, state);
    }
  });

  it("lot update: walks SAVED -> QUOTED -> HANDOVER_PENDING, quotes from the server's rate and creates the transaction", async () => {
    const lotId = await newLot("SAVED");
    const r = await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId, quotedRatePaise: 1 }));
    assert.equal(r.status, "APPLIED", JSON.stringify(r));
    const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    assert.equal(lot.status, "HANDED_OVER");
    assert.equal(lot.transactionStatus, "HANDED_OVER");
    assert.equal(lot.quotedRatePaise, 34000, "client's quoted rate is not trusted");
    assert.equal(lot.expectedValuePaise, 170000);
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { lotId } });
    assert.equal(tx.recyclerId, recyclerId);
    assert.equal(tx.quotedPricePaise, 170000);
  });

  it("lot update: server-owned states and fields are FORBIDDEN_FIELD; paymentStatus is ignored with a warning code", async () => {
    const lotId = await newLot("SAVED");
    for (const payload of [
      { transactionStatus: "CONFIRMED" },
      { transactionStatus: "PAID" },
      { transactionStatus: "REJECTED" },
      { finalPricePaise: 100 },
      { confirmedWeightGrams: 100 },
    ]) {
      const r = await run(mut("lot", lotId, "update", payload));
      assert.equal(r.status, "REJECTED", JSON.stringify(payload));
      assert.equal(r.code, "FORBIDDEN_FIELD", JSON.stringify(payload));
      assert.equal(r.retryable, false);
    }
    const warned = await run(mut("lot", lotId, "update", { transactionStatus: "QUOTED", paymentStatus: "PAID" }));
    assert.equal(warned.status, "APPLIED");
    assert.equal(warned.code, "IGNORED_SERVER_OWNED_FIELD");
    const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    assert.equal(lot.paymentStatus, "UNPAID", "paymentStatus stays server-derived");
  });

  it("lot update: illegal moves are CONFLICT, locked lots reject edits, other collectors are FORBIDDEN", async () => {
    const lotId = await newLot("SAVED");
    const back = await run(mut("lot", lotId, "update", { transactionStatus: "DRAFT" }));
    assert.equal(back.status, "CONFLICT");
    assert.equal(back.code, "INVALID_STATE_TRANSITION");

    await run(mut("lot", lotId, "update", { transactionStatus: "CANCELLED" }));
    const edit = await run(mut("lot", lotId, "update", { approxWeightGrams: 1 }));
    assert.equal(edit.status, "REJECTED");
    assert.equal(edit.code, "LOT_LOCKED");

    const foreign = await run(mut("lot", await newLot("SAVED"), "update", { transactionStatus: "QUOTED" }), otherCtx);
    assert.equal(foreign.code, "FORBIDDEN");
  });

  it("lot: a REJECTED (server-set) lot can be re-quoted; an EXPIRED one too", async () => {
    for (const status of ["REJECTED", "EXPIRED"] as const) {
      const lotId = await newLot("SAVED");
      await run(mut("lot", lotId, "update", { transactionStatus: "QUOTED" }));
      await prisma.lot.update({ where: { id: lotId }, data: { status } });
      const r = await run(mut("lot", lotId, "update", { transactionStatus: "QUOTED", chosenRecyclerId: recyclerId }));
      assert.equal(r.status, "APPLIED", `${status}: ${JSON.stringify(r)}`);
      assert.equal((await prisma.lot.findUniqueOrThrow({ where: { id: lotId } })).status, "MATCHED");
    }
  });

  it("lot create: idempotent on the entity id, foreign owner is FORBIDDEN, unknown category rejected", async () => {
    const lotId = await newLot();
    const again = await run(mut("lot", lotId, "create", { id: lotId, lotRef: "LOT-X-1-1", categoryId: CATEGORY, approxWeightGrams: 1, transactionStatus: "SAVED", collectedAt: now() }));
    assert.equal(again.status, "APPLIED");
    assert.equal(again.message, "Lot already exists");
    const stolen = await run(mut("lot", lotId, "create", { id: lotId, lotRef: "LOT-X-1-1", categoryId: CATEGORY, approxWeightGrams: 1, transactionStatus: "SAVED", collectedAt: now() }), otherCtx);
    assert.equal(stolen.code, "FORBIDDEN");
    const id = randomUUID();
    const cat = await run(mut("lot", id, "create", { id, lotRef: nextRef(), categoryId: 987654, approxWeightGrams: 1, transactionStatus: "SAVED", collectedAt: now() }));
    assert.equal(cat.code, "CATEGORY_NOT_FOUND");
  });

  // ---------- 5. handover ----------

  const code = "4821";
  async function newHandover(lotId: string) {
    const id = randomUUID();
    const ref = `HO-${randomUUID().slice(0, 8)}`;
    const r = await run(
      mut("handover", id, "create", {
        id, lotId, handoverRef: ref, declaredWeightGrams: 5000, qrPayload: "qr", codeHash: hashHandoverCode(ref, code), capturedAt: now(),
        latitude: 18.5204, longitude: 73.8567, accuracy: 10, locationSource: "GPS", mockLocationFlag: false,
      })
    );
    return { id, ref, r };
  }

  it("handover create stores the client's codeHash, never a random code, and leaves the lot status alone", async () => {
    const lotId = await newLot("SAVED");
    await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId }));
    const { id, ref, r } = await newHandover(lotId);
    assert.equal(r.status, "APPLIED", JSON.stringify(r));
    const h = await prisma.handover.findUniqueOrThrow({ where: { id } });
    assert.equal(h.codeHash, hashHandoverCode(ref, code));
    assert.equal(h.verificationCode, null);
    assert.equal(h.locationClass, "MATCH");
    assert.equal(h.status, "PENDING");
    const before = (await prisma.lot.findUniqueOrThrow({ where: { id: lotId } })).status;
    assert.equal(before, "HANDED_OVER");

    // idempotent on the entity id (different clientMutationId, same row)
    const again = await run(mut("handover", id, "create", { id, lotId, handoverRef: ref, declaredWeightGrams: 5000, qrPayload: "qr", codeHash: hashHandoverCode(ref, code), capturedAt: now() }));
    assert.equal(again.status, "APPLIED");
    assert.equal(await prisma.handover.count({ where: { id } }), 1);
  });

  it("handover create: two handovers for one lot (re-handover) and legacy coordinate aliases both work", async () => {
    const lotId = await newLot("SAVED");
    await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId }));
    const a = await newHandover(lotId);
    assert.equal(a.r.status, "APPLIED");
    const id = randomUUID();
    const ref = `HO-${randomUUID().slice(0, 8)}-2`;
    const legacy = await run(
      mut("handover", id, "create", {
        id, lotId, handoverRef: ref, declaredWeightGrams: 5000, qrPayload: "qr", codeHash: hashHandoverCode(ref, "0007"), capturedAt: now(),
        handoverLat: 19.5, handoverLng: 74.5, accuracyM: 12, geoFlag: true, spoofingFlags: "[\"MOCK_LOCATION\"]",
      })
    );
    assert.equal(legacy.status, "APPLIED", JSON.stringify(legacy));
    const h = await prisma.handover.findUniqueOrThrow({ where: { id } });
    assert.equal(h.latitude, 19.5);
    assert.equal(h.mockLocationFlag, true);
    assert.equal(h.locationClass, "FAR");
  });

  it("handover update: packedSafely, accepted flag, collector status moves; server-owned fields refused; ownership enforced", async () => {
    const lotId = await newLot("SAVED");
    await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId }));
    const { id } = await newHandover(lotId);

    const packed = await run(mut("handover", id, "update", { packedSafely: true }));
    assert.equal(packed.status, "APPLIED", JSON.stringify(packed));
    assert.equal((await prisma.handover.findUniqueOrThrow({ where: { id } })).packedSafely, true);

    const accepted = await run(mut("handover", id, "update", { acceptedByCollector: true }));
    assert.equal(accepted.status, "APPLIED");
    assert.ok((await prisma.handover.findUniqueOrThrow({ where: { id } })).acceptedByCollectorAt);

    for (const payload of [{ status: "CONFIRMED" }, { status: "WEIGHED" }, { confirmedWeightGrams: 4900 }, { codeVerified: true }]) {
      const r = await run(mut("handover", id, "update", payload));
      assert.equal(r.code, "FORBIDDEN_FIELD", JSON.stringify(payload));
    }
    const foreign = await run(mut("handover", id, "update", { packedSafely: false }), otherCtx);
    assert.equal(foreign.code, "FORBIDDEN");

    const disputed = await run(mut("handover", id, "update", { status: "DISPUTED" }));
    assert.equal(disputed.status, "APPLIED");
    assert.equal((await prisma.handover.findUniqueOrThrow({ where: { id } })).status, "DISPUTED");
    const cancelAfter = await run(mut("handover", id, "update", { status: "CANCELLED" }));
    assert.equal(cancelAfter.status, "CONFLICT");

    const missing = await run(mut("handover", randomUUID(), "update", { packedSafely: true }));
    assert.equal(missing.code, "PARENT_HANDOVER_NOT_FOUND");
    assert.equal(missing.retryable, true);
  });

  it("handover: collector accepting a WEIGHED amount confirms it with a server-computed price", async () => {
    const lotId = await newLot("SAVED");
    await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId }));
    const { id } = await newHandover(lotId);
    await prisma.handover.update({ where: { id }, data: { status: "WEIGHED", confirmedWeightGrams: 4000 } });
    const r = await run(mut("handover", id, "update", { acceptedByCollector: true }));
    assert.equal(r.status, "APPLIED", JSON.stringify(r));
    const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    assert.equal(lot.transactionStatus, "CONFIRMED");
    assert.equal(lot.finalPricePaise, 136000);
    assert.equal((await prisma.handover.findUniqueOrThrow({ where: { id } })).status, "CONFIRMED");
  });

  // ---------- dispute ----------

  it("dispute: create honours the entity id, leaves lot status to the lot mutation; update only touches hasEvidence", async () => {
    const lotId = await newLot("SAVED");
    await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId }));
    const { id: handoverId } = await newHandover(lotId);
    const dId = randomUUID();
    const create = await run(mut("dispute", dId, "create", { id: dId, lotId, handoverId, reason: "WRONG_WEIGHT", hasEvidence: false, createdAt: now() }));
    assert.equal(create.status, "APPLIED", JSON.stringify(create));
    assert.equal((await prisma.dispute.findUniqueOrThrow({ where: { id: dId } })).raisedBy, "COLLECTOR");
    assert.equal((await prisma.lot.findUniqueOrThrow({ where: { id: lotId } })).status, "HANDED_OVER", "dispute create does not write lot status");

    const again = await run(mut("dispute", dId, "create", { id: dId, lotId, handoverId, reason: "WRONG_WEIGHT", hasEvidence: false, createdAt: now() }));
    assert.equal(again.status, "APPLIED");
    assert.equal(await prisma.dispute.count({ where: { id: dId } }), 1);

    const upd = await run(mut("dispute", dId, "update", { hasEvidence: true }));
    assert.equal(upd.status, "APPLIED", JSON.stringify(upd));
    assert.equal((await prisma.dispute.findUniqueOrThrow({ where: { id: dId } })).hasEvidence, true);

    const resolve = await run(mut("dispute", dId, "update", { status: "RESOLVED", resolutionNote: "x" }));
    assert.equal(resolve.status, "REJECTED");
    assert.equal(resolve.retryable, false);
    assert.equal((await prisma.dispute.findUniqueOrThrow({ where: { id: dId } })).resolution, null, "a collector cannot resolve their own dispute");

    const foreign = await run(mut("dispute", dId, "update", { hasEvidence: false }), otherCtx);
    assert.equal(foreign.code, "FORBIDDEN");
    const disputeLot = await run(mut("lot", lotId, "update", { transactionStatus: "DISPUTED" }));
    assert.equal(disputeLot.status, "APPLIED");
  });

  // ---------- payment ----------

  it("payment: paymentStatus is computed from Payment rows and a fully paid CONFIRMED lot completes", async () => {
    const lotId = await newLot("SAVED");
    await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId }));
    await prisma.lot.update({ where: { id: lotId }, data: { transactionStatus: "CONFIRMED", finalPricePaise: 100000 } });

    const p1 = randomUUID();
    const r1 = await run(mut("payment", p1, "create", { id: p1, lotId, amountPaise: 40000, method: "CASH", paidAt: now() }));
    assert.equal(r1.status, "APPLIED");
    let lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    assert.equal(lot.paymentStatus, "PARTIAL");
    assert.equal(lot.status, "HANDED_OVER");

    const p2 = randomUUID();
    await run(mut("payment", p2, "create", { id: p2, lotId, amountPaise: 60000, method: "UPI", upiRef: "UPI-1", paidAt: now() }));
    lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    assert.equal(lot.paymentStatus, "PAID");
    assert.equal(lot.status, "COMPLETED");
    assert.equal(lot.transactionStatus, "PAID");

    const fp = randomUUID();
    const foreign = await run(mut("payment", fp, "create", { id: fp, lotId, amountPaise: 1, method: "CASH", paidAt: now() }), otherCtx);
    assert.equal(foreign.code, "FORBIDDEN");
  });

  it("payment: merges with a matching recycler-recorded payment instead of double counting", async () => {
    const lotId = await newLot("SAVED");
    const recId = `PAY-REC-${randomUUID()}`;
    await prisma.payment.create({ data: { id: recId, lotId, amountPaise: 5000, method: "CASH", paidAt: new Date(), recordedBy: "RECYCLER", confirmedByCollector: false } });
    const pid = randomUUID();
    const r = await run(mut("payment", pid, "create", { id: pid, lotId, amountPaise: 5000, method: "CASH", paidAt: now() }));
    assert.equal(r.status, "APPLIED");
    assert.equal(r.canonicalId, recId);
    assert.equal(await prisma.payment.count({ where: { lotId } }), 1);
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: recId } })).confirmedByCollector, true);
  });

  // ---------- lot_image ----------

  it("lot_image: prefix is enforced, a missing file is a RETRYABLE reject that is not persisted, then it applies after upload", async () => {
    const lotId = await newLot("SAVED");
    const imageId = randomUUID();
    const base = { id: imageId, lotId, kind: "COLLECTION", sha256: "a".repeat(64), imageHash: "0123456789abcdef", takenAt: now() };

    const wrong = await run(mut("lot_image", imageId, "create", { ...base, storageKey: `images/someone-else/${imageId}.jpg` }));
    assert.equal(wrong.code, "INVALID_STORAGE_KEY");
    assert.equal(wrong.retryable, false);

    const storageKey = `images/${userId}/${imageId}.jpg`;
    const m = mut("lot_image", imageId, "create", { ...base, storageKey });
    const early = await run(m);
    assert.equal(early.status, "REJECTED");
    assert.equal(early.code, "OBJECT_NOT_UPLOADED");
    assert.equal(early.retryable, true);
    assert.equal(await storedCount(m.clientMutationId), 0);

    fs.mkdirSync(path.join(STORAGE_DIR, "images", userId), { recursive: true });
    fs.writeFileSync(path.join(STORAGE_DIR, storageKey), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const late = await run(m);
    assert.equal(late.status, "APPLIED", JSON.stringify(late));
    const img = await prisma.lotImage.findUniqueOrThrow({ where: { id: imageId } });
    assert.equal(img.sha256, "a".repeat(64));
    assert.equal(img.imageHash, "0123456789abcdef");
  });

  it("lot_image TRAINING: field agents only, no lot, creates a TrainingSample", async () => {
    const imageId = randomUUID();
    const storageKey = `images/${agentUserId}/${imageId}.jpg`;
    fs.mkdirSync(path.join(STORAGE_DIR, "images", agentUserId), { recursive: true });
    fs.writeFileSync(path.join(STORAGE_DIR, storageKey), Buffer.from([1, 2, 3]));
    const payload = { id: imageId, kind: "TRAINING", categoryId: CATEGORY, angle: "top", storageKey, imageHash: "fedcba9876543210" };
    const asCollector = await run(mut("lot_image", imageId, "create", payload));
    assert.equal(asCollector.code, "FORBIDDEN_ROLE");
    const asAgent = await run(mut("lot_image", imageId, "create", payload), agentCtx);
    assert.equal(asAgent.status, "APPLIED", JSON.stringify(asAgent));
    assert.equal((await prisma.trainingSample.findUniqueOrThrow({ where: { imageId } })).categoryId, CATEGORY);
  });

  // ---------- other entities ----------

  it("price_point: field agents only; profile, dealer_comparison, incident, batch_handover work and are idempotent", async () => {
    const pid = randomUUID();
    const price = { id: pid, categoryId: CATEGORY, buyingPricePaise: 58000, buyerType: "SCRAP_DEALER", area: "Pimpri", recordedAt: now() };
    assert.equal((await run(mut("price_point", pid, "create", price))).code, "FORBIDDEN_ROLE");
    const agentFirst = await run(mut("price_point", pid, "create", price), agentCtx);
    assert.equal(agentFirst.status, "APPLIED", JSON.stringify(agentFirst));
    const agentAgain = await run(mut("price_point", pid, "create", price, randomUUID()), agentCtx);
    assert.equal(agentAgain.status, "APPLIED", JSON.stringify(agentAgain));
    assert.equal(await prisma.pricePoint.count({ where: { id: pid } }), 1);

    const prof = await run(mut("profile", collectorId, "update", { preferredLanguage: "MR" }));
    assert.equal(prof.status, "APPLIED");
    assert.equal((await prisma.collector.findUniqueOrThrow({ where: { id: collectorId } })).preferredLanguage, "MR");
    assert.equal((await run(mut("profile", otherCollectorId, "update", { preferredLanguage: "EN" }))).code, "FORBIDDEN");
    assert.equal((await run(mut("profile", collectorId, "update", { phone: "9999999999" }))).code, "FORBIDDEN_FIELD");

    const lotId = await newLot("SAVED");
    const dId = randomUUID();
    const dc = { id: dId, lotId, categoryId: CATEGORY, dealerRatePaise: 30000, ourRatePaise: 34000, createdAt: now() };
    assert.equal((await run(mut("dealer_comparison", dId, "create", dc))).status, "APPLIED");
    const second = await run(mut("dealer_comparison", dId, "update", { ...dc, dealerRatePaise: 31000 }));
    assert.equal(second.status, "APPLIED");
    assert.equal(await prisma.dealerComparison.count({ where: { lotId } }), 1);
    assert.equal((await prisma.dealerComparison.findUniqueOrThrow({ where: { lotId } })).dealerRatePaise, 31000);

    const iid = randomUUID();
    const inc = await run(mut("incident", iid, "create", { id: iid, type: "battery_leak", occurredAt: now(), latitude: null, longitude: null }));
    assert.equal(inc.status, "APPLIED", JSON.stringify(inc));
    assert.equal((await prisma.incidentReport.findUniqueOrThrow({ where: { id: iid } })).severity, 3);

    const lot2 = await newLot("SAVED");
    const bid = randomUUID();
    const batch = {
      id: bid, batchRef: `BATCH-${suffix}-01`, recyclerId, lotIds: [lotId, lot2], totalWeightGrams: 10000,
      qrPayload: "{}", codeHash: hashHandoverCode(`BATCH-${suffix}-01`, "7305"), capturedAt: now(),
    };
    assert.equal((await run(mut("batch_handover", bid, "create", batch))).status, "APPLIED");
    assert.equal(await prisma.batchHandoverItem.count({ where: { batchHandoverId: bid } }), 2);
    assert.equal((await run(mut("batch_handover", bid, "update", {}))).code, "INVALID_OP");
    assert.equal((await run(mut("safety_incident", randomUUID(), "create", {}))).code, "UNKNOWN_ENTITY");
  });

  // ---------- push route ----------

  const bearer = async (uid: string, role: string) => ({ authorization: `Bearer ${await signMobileToken({ userId: uid, phone: "9", role })}` });

  it("push route: one malformed item becomes a per-item REJECTED, the rest of the batch is processed, results keep request order", async () => {
    const good = (id: string) => mut("lot", id, "create", { id, lotRef: nextRef(), categoryId: CATEGORY, approxWeightGrams: 1000, transactionStatus: "SAVED", collectedAt: now() });
    const l1 = randomUUID();
    const l2 = randomUUID();
    const badId = randomUUID();
    const items = [good(l1), { clientMutationId: badId, entity: "lot" }, good(l2)];
    const res = await pushRoute.POST(
      new NextRequest("http://localhost/api/v1/sync/push", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await bearer(userId, "COLLECTOR")) },
        body: JSON.stringify({ deviceId: "dev-1", mutations: items }),
      })
    );
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.equal(data.results.length, 3);
    assert.deepEqual(data.results.map((r: any) => r.clientMutationId), [items[0].clientMutationId, badId, items[2].clientMutationId]);
    assert.deepEqual(data.results.map((r: any) => r.status), ["APPLIED", "REJECTED", "APPLIED"]);
    assert.equal(data.results[1].code, "INVALID_PAYLOAD");
    assert.equal(data.results[1].retryable, false);
    assert.ok(data.serverTimestamp);

    const noAuth = await pushRoute.POST(new NextRequest("http://localhost/api/v1/sync/push", { method: "POST", body: "{}" }));
    assert.equal(noAuth.status, 401);
    const badBody = await pushRoute.POST(
      new NextRequest("http://localhost/api/v1/sync/push", { method: "POST", headers: { "content-type": "application/json", ...(await bearer(userId, "COLLECTOR")) }, body: JSON.stringify({ mutations: "x" }) })
    );
    assert.equal(badBody.status, 400);
  });

  // ---------- pull ----------

  async function pull(since: string | null, limit?: number, uid = userId) {
    const url = new URL("http://localhost/api/v1/sync/pull");
    if (since) url.searchParams.set("since", since);
    if (limit) url.searchParams.set("limit", String(limit));
    const res = await pullRoute.GET(new NextRequest(url, { headers: await bearer(uid, "COLLECTOR") }));
    return { status: res.status, body: await res.json() };
  }

  it("pull: serverTimestamp, lotUpdates in client vocabulary, no secrets, correct shape", async () => {
    const lotId = await newLot("SAVED");
    await run(mut("lot", lotId, "update", { transactionStatus: "HANDOVER_PENDING", chosenRecyclerId: recyclerId }));
    const { id: hid, ref } = await newHandover(lotId);
    await prisma.handover.update({ where: { id: hid }, data: { status: "CONFIRMED", confirmedWeightGrams: 4900, recyclerConfirmedAt: new Date() } });
    await prisma.lot.update({ where: { id: lotId }, data: { transactionStatus: "CONFIRMED", finalPricePaise: 166600 } });

    const before = Date.now();
    const { status, body } = await pull(new Date(Date.now() - 60_000).toISOString(), 500);
    assert.equal(status, 200);
    const data = body.data;
    assert.ok(Date.parse(data.serverTimestamp) <= Date.now() && Date.parse(data.serverTimestamp) >= before - 1000);
    const { pullResponseDataSchema } = await import("../../src/lib/contract/syncContract");
    pullResponseDataSchema.parse(data);

    const update = data.lotUpdates.find((u: any) => u.lotId === lotId);
    assert.ok(update, "CONFIRMED lot is announced in lotUpdates");
    assert.equal(update.transactionStatus, "CONFIRMED");
    assert.equal(update.finalPricePaise, 166600);
    assert.equal(update.confirmedWeightGrams, 4900);
    assert.ok(update.confirmedAt);
    const lot = data.lots.find((l: any) => l.id === lotId);
    assert.equal(lot.transactionStatus, "CONFIRMED");
    const text = JSON.stringify(data);
    for (const secret of ["verificationCode", "codeHash", "qrPayload", hashHandoverCode(ref, code)]) assert.equal(text.includes(secret), false, secret);

    // lots that are not server-decided are not in lotUpdates
    const plain = await newLot("SAVED");
    const second = await pull(new Date(Date.now() - 60_000).toISOString(), 500);
    assert.equal(second.body.data.lotUpdates.some((u: any) => u.lotId === plain), false);
    assert.equal(second.body.data.lots.some((l: any) => l.id === plain), true);
  });

  it("pull: only my data; invalid cursor is 400; 401 without a token", async () => {
    const mine = await newLot("SAVED");
    const theirs = randomUUID();
    await run(mut("lot", theirs, "create", { id: theirs, lotRef: `LOT-U${suffix.slice(0, 3)}-261101-001`, categoryId: CATEGORY, approxWeightGrams: 1, transactionStatus: "SAVED", collectedAt: now() }), otherCtx);
    const { body } = await pull(new Date(Date.now() - 60_000).toISOString(), 500);
    assert.equal(body.data.lots.some((l: any) => l.id === mine), true);
    assert.equal(body.data.lots.some((l: any) => l.id === theirs), false);
    assert.equal((await pull("not-a-date")).status, 400);
    const none = await pullRoute.GET(new NextRequest("http://localhost/api/v1/sync/pull"));
    assert.equal(none.status, 401);
  });

  it("pull: pages through rows that share one updatedAt (and a notification and pickup at the same instant) without skipping or repeating", async () => {
    const owner = await prisma.user.create({ data: { role: "COLLECTOR", phone: `8${Math.floor(Math.random() * 1e9).toString().padStart(9, "0")}`, pinHash: "x", language: "HI", isActive: true } });
    const col = await prisma.collector.create({ data: { userId: owner.id, name: "P", shortCode: `P${suffix.slice(0, 3)}`, operatingArea: "Pune", preferredLanguage: "HI" } });
    const T = new Date("2030-01-01T00:00:00.000Z");
    const ids = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const lot = await prisma.lot.create({
        data: { id: randomUUID(), lotRef: `LOT-P${suffix.slice(0, 3)}-300101-${i + 1}`, collectorId: col.id, categoryId: CATEGORY, approxWeightGrams: 1, collectedAt: T, updatedAt: T },
      });
      ids.add(lot.id);
    }
    for (let i = 0; i < 3; i++) {
      const n = await prisma.notification.create({ data: { userId: owner.id, title: "t", body: "b", createdAt: T } });
      ids.add(n.id);
    }
    const lotForPickup = [...ids][0];
    for (let i = 0; i < 2; i++) {
      const pr = await prisma.pickupRequest.create({ data: { collectorId: owner.id, recyclerId, lotId: lotForPickup, slot: T, expiresAt: T, updatedAt: T } });
      ids.add(pr.id);
    }
    // a later row, so the final page proves the cursor moves on
    const later = await prisma.lot.create({ data: { id: randomUUID(), lotRef: `LOT-P${suffix.slice(0, 3)}-300102-1`, collectorId: col.id, categoryId: CATEGORY, approxWeightGrams: 1, collectedAt: T, updatedAt: new Date(T.getTime() + 5000) } });
    ids.add(later.id);

    for (const limit of [1, 2, 3, 5, 12, 500]) {
      const seen: string[] = [];
      let since: string | null = "2029-12-31T00:00:00.000Z";
      let pages = 0;
      for (;;) {
        const { status, body } = await pull(since, limit, owner.id);
        assert.equal(status, 200);
        const d = body.data;
        const items = [...d.lots.map((l: any) => l.id), ...d.notifications.map((n: any) => n.id), ...d.pickupRequests.map((p: any) => p.id)];
        assert.ok(items.length <= limit, `page larger than limit ${limit}`);
        seen.push(...items);
        since = d.nextSince;
        pages++;
        assert.ok(pages < 50, "pagination did not terminate");
        if (!d.hasMore) break;
        assert.ok(items.length > 0, "hasMore with an empty page would loop forever");
      }
      assert.equal(seen.length, ids.size, `limit ${limit}: expected ${ids.size} items, got ${seen.length}`);
      assert.equal(new Set(seen).size, seen.length, `limit ${limit}: duplicates`);
      assert.deepEqual(new Set(seen), ids, `limit ${limit}: missing rows`);

      // resuming from the last cursor yields nothing new
      const idle = await pull(since, limit, owner.id);
      assert.equal(idle.body.data.hasMore, false);
      assert.equal(idle.body.data.lots.length + idle.body.data.notifications.length + idle.body.data.pickupRequests.length, 0);
    }
  });
});
