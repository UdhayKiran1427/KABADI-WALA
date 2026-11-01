import test from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_LOT_STATES,
  CLIENT_LOT_TRANSITIONS,
  CLIENT_PUSHABLE_LOT_STATES,
  LOT_STATE_TABLE,
  findServerMachineGaps,
  isClientLotState,
  isClientPushableLotState,
  findClientPath,
  isClientTransitionAllowed,
  toClientLotState,
  toServerLotState,
} from "../../src/lib/domain/lotStatusMapping";

test("proposed rows of the mapping table", () => {
  assert.deepEqual(toServerLotState("DRAFT"), { lotStatus: "DRAFT", transactionStatus: "QUOTED" });
  assert.deepEqual(toServerLotState("SAVED"), { lotStatus: "READY", transactionStatus: "QUOTED" });
  assert.deepEqual(toServerLotState("QUOTED"), { lotStatus: "MATCHED", transactionStatus: "QUOTED" });
  assert.deepEqual(toServerLotState("HANDOVER_PENDING"), { lotStatus: "HANDED_OVER", transactionStatus: "HANDED_OVER" });
  assert.deepEqual(toServerLotState("CONFIRMED"), { lotStatus: "HANDED_OVER", transactionStatus: "CONFIRMED" });
  assert.deepEqual(toServerLotState("PAID"), { lotStatus: "COMPLETED", transactionStatus: "PAID" });
});

test("terminal / side states map onto the same-named server status", () => {
  assert.deepEqual(toServerLotState("CANCELLED"), { lotStatus: "CANCELLED", transactionStatus: "CANCELLED" });
  assert.deepEqual(toServerLotState("DISPUTED"), { lotStatus: "DISPUTED", transactionStatus: "DISPUTED" });
  assert.equal(toServerLotState("REJECTED").lotStatus, "REJECTED");
  assert.equal(toServerLotState("EXPIRED").lotStatus, "EXPIRED");
});

test("every client state survives a round trip through the server pair", () => {
  for (const state of CLIENT_LOT_STATES) {
    const server = toServerLotState(state);
    assert.equal(toClientLotState(server.lotStatus, server.transactionStatus), state, state);
  }
});

test("the mapping is injective (no two client states share a server pair)", () => {
  const seen = new Map<string, string>();
  for (const state of CLIENT_LOT_STATES) {
    const { lotStatus, transactionStatus } = toServerLotState(state);
    // REJECTED/EXPIRED share transactionStatus with QUOTED but differ in lotStatus.
    const key = `${lotStatus}/${transactionStatus}`;
    assert.equal(seen.has(key), false, `${state} collides with ${seen.get(key)}`);
    seen.set(key, state);
  }
});

test("toClientLotState: HANDED_OVER depends on the transaction status", () => {
  assert.equal(toClientLotState("HANDED_OVER", "HANDED_OVER"), "HANDOVER_PENDING");
  assert.equal(toClientLotState("HANDED_OVER", "ACCEPTED"), "HANDOVER_PENDING");
  assert.equal(toClientLotState("HANDED_OVER", null), "HANDOVER_PENDING");
  assert.equal(toClientLotState("HANDED_OVER", "CONFIRMED"), "CONFIRMED");
  // Paid transaction on a lot the server has not completed yet is still CONFIRMED for the phone.
  assert.equal(toClientLotState("HANDED_OVER", "PAID"), "CONFIRMED");
});

test("CONFIRMED, PAID and REJECTED are server-owned; the rest are pushable", () => {
  assert.deepEqual(
    CLIENT_LOT_STATES.filter((s) => LOT_STATE_TABLE[s].owner === "SERVER"),
    ["CONFIRMED", "PAID", "REJECTED"]
  );
  assert.deepEqual(
    [...CLIENT_PUSHABLE_LOT_STATES],
    ["DRAFT", "SAVED", "QUOTED", "HANDOVER_PENDING", "CANCELLED", "EXPIRED", "DISPUTED"]
  );
  assert.equal(isClientPushableLotState("CONFIRMED"), false);
  assert.equal(isClientPushableLotState("PAID"), false);
  assert.equal(isClientPushableLotState("HANDOVER_PENDING"), true);
});

test("isClientLotState rejects server vocabulary and junk", () => {
  assert.equal(isClientLotState("READY"), false);
  assert.equal(isClientLotState("COMPLETED"), false);
  assert.equal(isClientLotState("HANDED_OVER"), false);
  assert.equal(isClientLotState(undefined), false);
  assert.equal(isClientLotState("SAVED"), true);
});

test("client transition table matches the Dart lotTransitions", () => {
  assert.equal(isClientTransitionAllowed("DRAFT", "SAVED"), true);
  assert.equal(isClientTransitionAllowed("SAVED", "HANDOVER_PENDING"), false);
  assert.equal(isClientTransitionAllowed("REJECTED", "QUOTED"), true);
  assert.equal(isClientTransitionAllowed("EXPIRED", "QUOTED"), true);
  assert.equal(isClientTransitionAllowed("DISPUTED", "CONFIRMED"), true);
  assert.equal(isClientTransitionAllowed("PAID", "DISPUTED"), false);
  assert.equal(isClientTransitionAllowed("CANCELLED", "QUOTED"), false);
  assert.deepEqual(CLIENT_LOT_TRANSITIONS.PAID, []);
  assert.deepEqual(CLIENT_LOT_TRANSITIONS.CANCELLED, []);
});

test("findServerMachineGaps lists only legal client moves", () => {
  for (const gap of findServerMachineGaps()) {
    assert.equal(isClientTransitionAllowed(gap.from, gap.to), true);
    assert.notEqual(gap.reason, "");
  }
});

test("the server lot state machine allows every legal client transition", () => {
  assert.deepEqual(findServerMachineGaps(), []);
});

test("findClientPath walks client-owned intermediates only", () => {
  assert.deepEqual(findClientPath("SAVED", "SAVED"), []);
  assert.deepEqual(findClientPath("SAVED", "QUOTED"), ["QUOTED"]);
  assert.deepEqual(findClientPath("SAVED", "HANDOVER_PENDING"), ["QUOTED", "HANDOVER_PENDING"]);
  assert.deepEqual(findClientPath("REJECTED", "HANDOVER_PENDING"), ["QUOTED", "HANDOVER_PENDING"]);
  assert.deepEqual(findClientPath("EXPIRED", "QUOTED"), ["QUOTED"]);
  assert.deepEqual(findClientPath("DRAFT", "CANCELLED"), ["CANCELLED"]);
  // never through a server-owned state, never backwards, never out of a terminal state
  assert.equal(findClientPath("HANDOVER_PENDING", "SAVED"), null);
  assert.equal(findClientPath("CANCELLED", "QUOTED"), null);
  assert.equal(findClientPath("PAID", "DISPUTED"), null);
  assert.equal(findClientPath("HANDOVER_PENDING", "QUOTED"), null, "REJECTED is server-owned, so this chain is not available to a phone");
});
