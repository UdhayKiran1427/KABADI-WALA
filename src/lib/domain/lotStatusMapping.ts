/**
 * Pure domain logic: the single mapping between the Flutter app's lot vocabulary
 * (`Lots.transactionStatus`, see E_waste `lot_state.dart`) and the server's
 * `LotStatus` + `TransactionStatus`. Canonical table: docs/sync-contract.md §6.
 *
 * Everything that has to translate a lot state (push handler, pull serializer,
 * bootstrap/restore) MUST go through this file. Do not duplicate the table.
 */

import { validateLotTransition, type LotStatus } from "./lotStateMachine";

export const CLIENT_LOT_STATES = [
  "DRAFT",
  "SAVED",
  "QUOTED",
  "HANDOVER_PENDING",
  "CONFIRMED",
  "PAID",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "DISPUTED",
] as const;

export type ClientLotState = (typeof CLIENT_LOT_STATES)[number];

/** Mirrors `enum TransactionStatus` in prisma/schema.prisma. */
export type ServerTransactionStatus =
  | "QUOTED"
  | "ACCEPTED"
  | "HANDED_OVER"
  | "CONFIRMED"
  | "PAID"
  | "CANCELLED"
  | "DISPUTED";

export type LotStateOwner = "CLIENT" | "SERVER";

export interface ServerLotState {
  lotStatus: LotStatus;
  transactionStatus: ServerTransactionStatus;
}

interface LotStateRow extends ServerLotState {
  /** Who may set this state through `POST /sync/push`. SERVER states reach the phone only via pull. */
  owner: LotStateOwner;
}

/**
 * THE table. One row per client state.
 * REJECTED is SERVER-owned (deviation from the first proposal): it records the recycler's refusal,
 * so a phone must not be able to assert it (same reason CONFIRMED/PAID are server-owned).
 * REJECTED and EXPIRED keep transactionStatus QUOTED: TransactionStatus has no value for them and the
 * quote is what was refused / lapsed. The lot status alone identifies them on the way back.
 */
export const LOT_STATE_TABLE: Readonly<Record<ClientLotState, LotStateRow>> = {
  DRAFT: { lotStatus: "DRAFT", transactionStatus: "QUOTED", owner: "CLIENT" },
  SAVED: { lotStatus: "READY", transactionStatus: "QUOTED", owner: "CLIENT" },
  QUOTED: { lotStatus: "MATCHED", transactionStatus: "QUOTED", owner: "CLIENT" },
  HANDOVER_PENDING: { lotStatus: "HANDED_OVER", transactionStatus: "HANDED_OVER", owner: "CLIENT" },
  CONFIRMED: { lotStatus: "HANDED_OVER", transactionStatus: "CONFIRMED", owner: "SERVER" },
  PAID: { lotStatus: "COMPLETED", transactionStatus: "PAID", owner: "SERVER" },
  REJECTED: { lotStatus: "REJECTED", transactionStatus: "QUOTED", owner: "SERVER" },
  CANCELLED: { lotStatus: "CANCELLED", transactionStatus: "CANCELLED", owner: "CLIENT" },
  EXPIRED: { lotStatus: "EXPIRED", transactionStatus: "QUOTED", owner: "CLIENT" },
  DISPUTED: { lotStatus: "DISPUTED", transactionStatus: "DISPUTED", owner: "CLIENT" },
};

export function isClientLotState(value: unknown): value is ClientLotState {
  return typeof value === "string" && (CLIENT_LOT_STATES as readonly string[]).includes(value);
}

/** Client states a phone may send in a `lot` mutation. */
export const CLIENT_PUSHABLE_LOT_STATES: readonly ClientLotState[] = CLIENT_LOT_STATES.filter(
  (s) => LOT_STATE_TABLE[s].owner === "CLIENT"
);

export function isClientPushableLotState(value: unknown): value is ClientLotState {
  return isClientLotState(value) && LOT_STATE_TABLE[value].owner === "CLIENT";
}

/** Client vocabulary -> the (LotStatus, TransactionStatus) pair to store. */
export function toServerLotState(state: ClientLotState): ServerLotState {
  const { lotStatus, transactionStatus } = LOT_STATE_TABLE[state];
  return { lotStatus, transactionStatus };
}

/**
 * Server pair -> client vocabulary (used when serialising pull/restore).
 * Only HANDED_OVER needs the transaction status: CONFIRMED (or a paid transaction on a lot the
 * server has not completed yet) is CONFIRMED, anything else is HANDOVER_PENDING.
 */
export function toClientLotState(lotStatus: LotStatus, transactionStatus?: ServerTransactionStatus | null): ClientLotState {
  switch (lotStatus) {
    case "DRAFT":
      return "DRAFT";
    case "READY":
      return "SAVED";
    case "MATCHED":
      return "QUOTED";
    case "HANDED_OVER":
      return transactionStatus === "CONFIRMED" || transactionStatus === "PAID" ? "CONFIRMED" : "HANDOVER_PENDING";
    case "COMPLETED":
      return "PAID";
    case "CANCELLED":
    case "REJECTED":
    case "EXPIRED":
    case "DISPUTED":
      return lotStatus;
  }
}

/** Mirror of `lotTransitions` in E_waste/lib/core/utils/lot_state.dart. Keep both in step. */
export const CLIENT_LOT_TRANSITIONS: Readonly<Record<ClientLotState, readonly ClientLotState[]>> = {
  DRAFT: ["SAVED", "CANCELLED"],
  SAVED: ["QUOTED", "CANCELLED", "EXPIRED"],
  QUOTED: ["HANDOVER_PENDING", "SAVED", "REJECTED", "CANCELLED", "EXPIRED"], // SAVED = change recycler (spec s3)
  HANDOVER_PENDING: ["CONFIRMED", "REJECTED", "DISPUTED", "CANCELLED"],
  CONFIRMED: ["PAID", "DISPUTED"],
  PAID: [],
  REJECTED: ["QUOTED", "CANCELLED"],
  CANCELLED: [],
  EXPIRED: ["QUOTED", "CANCELLED"],
  DISPUTED: ["CONFIRMED", "CANCELLED"],
};

export function isClientTransitionAllowed(from: ClientLotState, to: ClientLotState): boolean {
  return from === to || CLIENT_LOT_TRANSITIONS[from].includes(to);
}

/**
 * Shortest chain of client moves from [from] to [to], passing only through client-owned states
 * (a phone cannot skip over a state the recycler/server owns). `[]` when from === to, `null` when unreachable.
 * The phone's `transitionLot(..., via: [quoted])` sends only the final state, so the server walks the chain.
 */
export function findClientPath(from: ClientLotState, to: ClientLotState): ClientLotState[] | null {
  if (from === to) return [];
  const queue: ClientLotState[][] = [[from]];
  const seen = new Set<ClientLotState>([from]);
  while (queue.length > 0) {
    const path = queue.shift() as ClientLotState[];
    const last = path[path.length - 1];
    for (const next of CLIENT_LOT_TRANSITIONS[last]) {
      if (seen.has(next)) continue;
      if (next === to) return [...path.slice(1), next];
      if (LOT_STATE_TABLE[next].owner !== "CLIENT") continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
}

/**
 * Client transitions whose server image `lotStateMachine.validateLotTransition` refuses.
 * The contract needs these to be allowed (docs/sync-contract.md §6.3); empty once the machine is extended.
 */
export function findServerMachineGaps(): Array<{ from: ClientLotState; to: ClientLotState; reason: string }> {
  const gaps: Array<{ from: ClientLotState; to: ClientLotState; reason: string }> = [];
  for (const from of CLIENT_LOT_STATES) {
    for (const to of CLIENT_LOT_TRANSITIONS[from]) {
      const check = validateLotTransition(
        LOT_STATE_TABLE[from].lotStatus,
        LOT_STATE_TABLE[to].lotStatus,
        LOT_STATE_TABLE[to].owner === "SERVER"
      );
      if (!check.valid) gaps.push({ from, to, reason: check.reason ?? "refused" });
    }
  }
  return gaps;
}
