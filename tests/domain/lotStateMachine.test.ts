import test from "node:test";
import assert from "node:assert/strict";
import { validateLotTransition, checkServerOwnedFields } from "../../src/lib/domain/lotStateMachine";

test("validateLotTransition allows forward progress DRAFT -> READY -> MATCHED -> HANDED_OVER", () => {
  assert.equal(validateLotTransition("DRAFT", "READY").valid, true);
  assert.equal(validateLotTransition("READY", "MATCHED").valid, true);
  assert.equal(validateLotTransition("MATCHED", "HANDED_OVER").valid, true);
});

test("validateLotTransition forbids backward transitions", () => {
  const backward = validateLotTransition("HANDED_OVER", "DRAFT");
  assert.equal(backward.valid, false);
  assert.equal(backward.isConflict, true);
});

test("validateLotTransition allows server actor to set COMPLETED but forbids client", () => {
  // Client attempt to set COMPLETED directly
  const clientAttempt = validateLotTransition("HANDED_OVER", "COMPLETED", false);
  assert.equal(clientAttempt.valid, false);
  assert.match(clientAttempt.reason || "", /server-owned/);

  // Server actor setting COMPLETED
  const serverAttempt = validateLotTransition("HANDED_OVER", "COMPLETED", true);
  assert.equal(serverAttempt.valid, true);
});

test("checkServerOwnedFields flags forbidden client mutations", () => {
  assert.equal(checkServerOwnedFields({ finalPricePaise: 5000 }).forbidden, true);
  assert.equal(checkServerOwnedFields({ confirmedWeightGrams: 4800 }).forbidden, true);
  assert.equal(checkServerOwnedFields({ paymentStatus: "PAID" }).forbidden, true);
  assert.equal(checkServerOwnedFields({ approxWeightGrams: 5000, description: "Old PC" }).forbidden, false);
});

