import test from "node:test";
import assert from "node:assert/strict";
import { generateLotRef, validateLotRef } from "../../src/lib/domain/lotRef";

test("generateLotRef produces LOT-{shortCode}-{yyMMdd}-{seq}", () => {
  const date = new Date("2026-11-01T12:00:00Z");
  const ref = generateLotRef("AB12", date, 42);
  assert.equal(ref, "LOT-AB12-261101-0042");
});

test("validateLotRef accepts matching collector shortCode and valid format", () => {
  const res = validateLotRef("LOT-AB12-261101-0042", "AB12");
  assert.equal(res.valid, true);
});

test("validateLotRef rejects mismatched shortCode", () => {
  const res = validateLotRef("LOT-ZZ99-261101-0042", "AB12");
  assert.equal(res.valid, false);
  assert.match(res.reason || "", /does not match collector shortCode/);
});

test("validateLotRef rejects malformed lotRef", () => {
  assert.equal(validateLotRef("INVALID", "AB12").valid, false);
  assert.equal(validateLotRef("LOT-AB12-INVALID-001", "AB12").valid, false);
});

