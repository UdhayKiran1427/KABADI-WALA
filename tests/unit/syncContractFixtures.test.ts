import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ENTITY_CONTRACT,
  PUSH_ENTITIES,
  PushRequestSchema,
  authSessionDataSchema,
  bootstrapDataSchema,
  changePinRequestSchema,
  errorEnvelopeSchema,
  isPushEntity,
  loginRequestSchema,
  meDataSchema,
  messageDataSchema,
  pinRecoveryDataSchema,
  pinRecoveryRequestSchema,
  pullResponseDataSchema,
  pushResponseDataSchema,
  registerRequestSchema,
  restoreRequestSchema,
  successEnvelopeSchema,
  type EntityContract,
} from "../../src/lib/contract/syncContract";
import { mapPricePointToClient, toleranceFromBand } from "../../src/lib/contract/referenceMapping";
import { sortMutations, type SyncMutationInput } from "../../src/lib/services/syncEngine";
import { toClientLotState } from "../../src/lib/domain/lotStatusMapping";
import { hashHandoverCode, safeEqualStrings, verifyEnteredHandoverCode } from "../../src/lib/domain/handover";

const FIXTURE_DIR = path.resolve(__dirname, "../fixtures/contract");
const FLUTTER_FIXTURE_DIR = path.resolve(__dirname, "../../../E_waste/test/fixtures/contract");

function load(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8"));
}

function deepKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => deepKeys(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      deepKeys(v, out);
    }
  }
  return out;
}

// ---------- push request ----------

test("push_request.json parses with the exact schema the route uses", () => {
  const body = load("push_request.json");
  const parsed = PushRequestSchema.parse(body);
  assert.ok(parsed.mutations.length <= 20, "the app sends at most 20 mutations per request");
  assert.equal(new Set(parsed.mutations.map((m) => m.clientMutationId)).size, parsed.mutations.length);
});

test("push_request.json: every payload satisfies its entity contract", () => {
  const { mutations } = load("push_request.json");
  for (const m of mutations) {
    assert.ok(isPushEntity(m.entity), `unknown entity ${m.entity}`);
    const contract: EntityContract = ENTITY_CONTRACT[m.entity as keyof typeof ENTITY_CONTRACT];
    assert.ok(contract.ops.includes(m.op), `${m.entity} does not allow ${m.op}`);
    const schema = m.op === "create" ? contract.create : contract.update;
    assert.ok(schema, `${m.entity}.${m.op} has no payload schema`);
    const result = schema.safeParse(m.payload);
    assert.ok(result.success, `${m.entity}.${m.op} (${m.clientMutationId}): ${JSON.stringify(result.error?.issues)}`);
    if (typeof m.payload.id === "string") assert.equal(m.payload.id, m.entityId, "payload.id must equal entityId");
    for (const field of contract.serverOwned) {
      assert.equal(field in m.payload, false, `${m.entity} payload carries server-owned field ${field}`);
    }
  }
});

test("entity payload schemas refuse server-owned fields, server-owned states and old field names", () => {
  const lotUpdate = ENTITY_CONTRACT.lot.update;
  assert.equal(lotUpdate.safeParse({ transactionStatus: "QUOTED" }).success, true);
  assert.equal(lotUpdate.safeParse({ transactionStatus: "CONFIRMED" }).success, false, "CONFIRMED is server-owned");
  assert.equal(lotUpdate.safeParse({ transactionStatus: "PAID" }).success, false, "PAID is server-owned");
  assert.equal(lotUpdate.safeParse({ transactionStatus: "REJECTED" }).success, false, "REJECTED is the recycler's decision");
  assert.equal(lotUpdate.safeParse({ finalPricePaise: 1 }).success, false);
  assert.equal(lotUpdate.safeParse({ paymentStatus: "PAID" }).success, false);
  assert.equal(lotUpdate.safeParse({ confirmedWeightGrams: 4900 }).success, false);

  const handoverUpdate = ENTITY_CONTRACT.handover.update;
  assert.equal(handoverUpdate.safeParse({ status: "CONFIRMED" }).success, false);
  assert.equal(handoverUpdate.safeParse({ confirmedWeightGrams: 4900 }).success, false);
  assert.equal(handoverUpdate.safeParse({ acceptedByCollector: true }).success, true);

  const create = load("push_request.json").mutations.find((m: { entity: string; op: string }) => m.entity === "handover" && m.op === "create");
  assert.equal(ENTITY_CONTRACT.handover.create.safeParse({ ...create.payload, handoverCode: "4821" }).success, false);
  assert.equal(ENTITY_CONTRACT.handover.create.safeParse({ ...create.payload, codeHash: "4821" }).success, false);
  const { latitude, longitude, ...rest } = create.payload;
  assert.equal(ENTITY_CONTRACT.handover.create.safeParse({ ...rest, handoverLat: latitude, handoverLng: longitude }).success, false);

  assert.equal(ENTITY_CONTRACT.lot_image.create.safeParse({ id: "b1000000-0000-4000-8000-000000000001", kind: "TRAINING", categoryId: 1, angle: "top" }).success, true);
  assert.equal(ENTITY_CONTRACT.lot_image.create.safeParse({ id: "b1000000-0000-4000-8000-000000000001", kind: "COLLECTION" }).success, false, "lotId required");
  assert.equal(ENTITY_CONTRACT.payment.create.safeParse({ id: "f1000000-0000-4000-8000-000000000001", lotId: "a1000000-0000-4000-8000-000000000001", amountPaise: 1700.5, method: "CASH", paidAt: "2026-11-01T11:30:00.000Z" }).success, false, "paise are integers");

  for (const retired of ["safety_incident", "batch", "collector", "recycler_rate", "transaction"]) {
    assert.equal(isPushEntity(retired), false, retired);
  }
});

test("push_request.json covers every pushable entity", () => {
  const { mutations } = load("push_request.json");
  const seen = new Set(mutations.map((m: { entity: string }) => m.entity));
  for (const entity of PUSH_ENTITIES) assert.ok(seen.has(entity), `no sample mutation for ${entity}`);
});

test("push_request.json never carries the plain handover code or phone-local paths", () => {
  const keys = deepKeys(load("push_request.json"));
  for (const forbidden of ["handoverCode", "verificationCode", "code", "localPath", "imagePath", "phone"]) {
    assert.equal(keys.has(forbidden), false, `payload key ${forbidden} must not be sent`);
  }
});

test("push_request.json: the server can order it parents-first", () => {
  const { mutations } = load("push_request.json");
  const sorted = sortMutations(mutations as SyncMutationInput[]);
  assert.equal(sorted.length, mutations.length);
  const firstLotCreate = sorted.findIndex((m) => m.entity === "lot" && m.op === "create");
  const firstHandover = sorted.findIndex((m) => m.entity === "handover");
  assert.ok(firstLotCreate >= 0 && firstLotCreate < firstHandover);
});

// ---------- push response ----------

test("push_response.json matches the result contract and answers every request mutation", () => {
  const request = load("push_request.json");
  const response = successEnvelopeSchema(pushResponseDataSchema).parse(load("push_response.json"));
  const sent = request.mutations.map((m: { clientMutationId: string }) => m.clientMutationId).sort();
  const answered = response.data.results.map((r) => r.clientMutationId).sort();
  assert.deepEqual(answered, sent);
  assert.equal(response.data.deviceId, request.deviceId);
});

test("push_response.json: retryable flags follow the status rules", () => {
  const { data } = load("push_response.json");
  const statuses = new Set<string>(data.results.map((r: { status: string }) => r.status));
  assert.deepEqual([...statuses].sort(), ["APPLIED", "CONFLICT", "DUPLICATE", "REJECTED"]);
  for (const r of data.results) {
    if (r.status === "APPLIED" || r.status === "DUPLICATE" || r.status === "CONFLICT") {
      assert.equal(r.retryable, false, `${r.status} must not be retryable`);
    }
    if (r.status === "CONFLICT") assert.ok(r.serverState, "CONFLICT carries serverState");
  }
});

// ---------- pull ----------

test("pull_response.json matches the pull contract", () => {
  const { data } = successEnvelopeSchema(pullResponseDataSchema).parse(load("pull_response.json"));
  assert.equal(data.hasMore, false);
  assert.ok(new Date(data.nextSince.split("|")[0]) <= new Date(data.serverTimestamp), "cursor never runs ahead of the server clock");
});

test("pull_response.json never leaks handover codes or hashes", () => {
  const keys = deepKeys(load("pull_response.json"));
  for (const forbidden of ["verificationCode", "codeHash", "qrPayload", "handoverCode"]) {
    assert.equal(keys.has(forbidden), false, forbidden);
  }
});

test("pull_response.json lot states use the client vocabulary and agree with the mapping", () => {
  const { data } = load("pull_response.json");
  assert.equal(toClientLotState("HANDED_OVER", "CONFIRMED"), data.lots[0].transactionStatus);
  assert.deepEqual(
    data.lotUpdates.map((u: { transactionStatus: string }) => u.transactionStatus),
    ["CONFIRMED", "PAID"]
  );
});

// ---------- bootstrap ----------

test("bootstrap_response.json matches the bootstrap contract", () => {
  const { data } = successEnvelopeSchema(bootstrapDataSchema).parse(load("bootstrap_response.json"));
  for (const rate of data.recyclerRates) {
    assert.ok(data.recyclers.some((r) => r.id === rate.recyclerId), `rate for unknown recycler ${rate.recyclerId}`);
    assert.ok(data.categories.some((c) => c.id === rate.categoryId), `rate for unknown category ${rate.categoryId}`);
  }
  for (const price of data.prices) {
    assert.ok(data.categories.some((c) => c.id === price.categoryId), `price for unknown category ${price.categoryId}`);
  }
});

test("mapPricePointToClient produces the fields ReferenceDataSyncer reads", () => {
  const [market, dealer] = load("bootstrap_response.json").data.prices;
  assert.deepEqual(
    mapPricePointToClient({
      id: market.id,
      categoryId: 1,
      area: "Pune / Pimpri",
      district: "Pune",
      recordedAt: new Date("2026-11-01T06:00:00.000Z"),
      buyingPricePaise: 34000,
      marketLowPaise: 28900,
      marketHighPaise: 39100,
      source: "ADMIN",
      buyerType: null,
    }),
    market
  );
  assert.deepEqual(
    mapPricePointToClient({
      id: dealer.id,
      categoryId: 2,
      area: "Pune / Pimpri",
      district: "Pune",
      recordedAt: new Date("2026-11-01T06:00:00.000Z"),
      buyingPricePaise: 60000,
      marketLowPaise: 54000,
      marketHighPaise: 66000,
      source: "FIELD_AGENT",
      buyerType: "SCRAP_DEALER",
    }),
    dealer
  );
});

test("toleranceFromBand covers the server band and defaults to 15", () => {
  assert.equal(toleranceFromBand(34000, 28900, 39100), 15);
  assert.equal(toleranceFromBand(10000, 9000, 11000), 10);
  assert.equal(toleranceFromBand(10000, 9000, 11050), 11, "rounds up so the phone range is never narrower");
  assert.equal(toleranceFromBand(10000, null, null), 15);
  assert.equal(toleranceFromBand(0, 0, 0), 15);
  assert.equal(toleranceFromBand(100, 0, 500), 100, "capped at 100");
});

// ---------- auth + envelope ----------

test("auth fixtures match the auth contract", () => {
  const register = load("auth_register.json");
  registerRequestSchema.parse(register.request);
  successEnvelopeSchema(authSessionDataSchema).parse(register.response);
  assert.equal(register.httpStatus, 201);

  const login = load("auth_login.json");
  loginRequestSchema.parse(login.request);
  successEnvelopeSchema(authSessionDataSchema).parse(login.response);

  const restore = load("auth_restore.json");
  restoreRequestSchema.parse(restore.request);
  const restored = successEnvelopeSchema(authSessionDataSchema).parse(restore.response);
  assert.equal(typeof restored.data.profile?.lotCounter, "number");

  const recovery = load("auth_pin_recovery.json");
  pinRecoveryRequestSchema.parse(recovery.request);
  successEnvelopeSchema(pinRecoveryDataSchema).parse(recovery.response);

  const change = load("auth_change_pin.json");
  changePinRequestSchema.parse(change.request);
  successEnvelopeSchema(messageDataSchema).parse(change.response);

  successEnvelopeSchema(meDataSchema).parse(load("auth_me.json").response);
});

test("auth requests reject +91 phones, lowercase languages and 6-digit PINs", () => {
  assert.equal(loginRequestSchema.safeParse({ phone: "+919876543210", pin: "1234" }).success, false);
  assert.equal(loginRequestSchema.safeParse({ phone: "9876543210", pin: "123456" }).success, false);
  const reg = load("auth_register.json").request;
  assert.equal(registerRequestSchema.safeParse({ ...reg, preferredLanguage: "hi" }).success, false);
});

test("error fixture uses the { error: { code, message } } envelope", () => {
  const fx = load("error_login_invalid.json");
  errorEnvelopeSchema.parse(fx.response);
  assert.equal(fx.httpStatus, 401);
  assert.equal("data" in fx.response, false);
  assert.equal(errorEnvelopeSchema.safeParse({ error: "INVALID_PIN", message: "x" }).success, false, "old string-error shape is not valid");
});

// ---------- keeping the Flutter copy in sync ----------

test("E_waste/test/fixtures/contract is a byte-for-byte copy of these fixtures", { skip: !fs.existsSync(FLUTTER_FIXTURE_DIR) && "E_waste checkout not next to KABADI-WALA" }, () => {
  const ours = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json")).sort();
  const theirs = fs.readdirSync(FLUTTER_FIXTURE_DIR).filter((f) => f.endsWith(".json")).sort();
  assert.deepEqual(theirs, ours, "fixture file lists differ");
  for (const f of ours) {
    assert.equal(
      fs.readFileSync(path.join(FLUTTER_FIXTURE_DIR, f), "utf8"),
      fs.readFileSync(path.join(FIXTURE_DIR, f), "utf8"),
      `${f} differs between KABADI-WALA and E_waste`
    );
  }
});

// ---------- handover code hash: the Dart implementation is asserted against the same vectors ----------

test("hashHandoverCode matches the shared cross-language vectors", () => {
  const { vectors } = load("handover_code_vectors.json");
  assert.ok(vectors.length >= 5);
  for (const v of vectors) {
    assert.equal(hashHandoverCode(v.ref, v.code), v.hash, `${v.ref}:${v.code}`);
    assert.match(v.hash, /^[0-9a-f]{64}$/);
  }
  // salted with the ref: same code, different ref => different hash
  assert.notEqual(hashHandoverCode("A", "1234"), hashHandoverCode("B", "1234"));
});

test("verifyEnteredHandoverCode: hash first, legacy plain code only as fallback, junk refused", () => {
  const { ref, code, hash } = load("handover_code_vectors.json").vectors[0];
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, codeHash: hash }, code), true);
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, codeHash: hash.toUpperCase() }, code), true, "hash case-insensitive");
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, codeHash: hash }, ` ${code} `), true, "whitespace trimmed");
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, codeHash: hash }, "0000"), false);
  assert.equal(verifyEnteredHandoverCode({ handoverRef: "HO-OTHER", codeHash: hash }, code), false, "bound to the ref");
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, codeHash: hash }, "48210"), false);
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, codeHash: hash }, "abcd"), false);
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, codeHash: hash, verificationCode: "0000" }, "0000"), false, "plain code ignored when a hash exists");
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref, verificationCode: "4821" }, "4821"), true, "legacy fallback");
  assert.equal(verifyEnteredHandoverCode({ handoverRef: ref }, "4821"), false);
  assert.equal(safeEqualStrings("abc", "abc"), true);
  assert.equal(safeEqualStrings("abc", "abd"), false);
  assert.equal(safeEqualStrings("abc", "abcd"), false);
});
