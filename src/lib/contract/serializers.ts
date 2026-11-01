/**
 * Server rows -> wire shapes of docs/sync-contract.md §4 (pull items, CONFLICT `serverState`).
 * Deliberately field-by-field: new database columns must never reach the phone by accident
 * (the old pull returned raw rows including `handovers[].verificationCode`).
 */

import type { Handover, Lot, Notification, Payment, PickupRequest } from "@prisma/client";
import { toClientLotState, type ClientLotState } from "../domain/lotStatusMapping";

export type LotWithChildren = Lot & { handovers: Handover[]; payments: Payment[] };

const iso = (d: Date) => d.toISOString();

/** Handover that carries the lot's confirmed weight: the latest one that has a recycler weight. */
function confirmedHandover(handovers: Handover[]): Handover | undefined {
  return [...handovers]
    .filter((h) => h.confirmedWeightGrams !== null && (h.status === "CONFIRMED" || h.status === "WEIGHED" || h.status === "DISPUTED"))
    .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0];
}

export function lotClientState(lot: Pick<Lot, "status" | "transactionStatus">): ClientLotState {
  return toClientLotState(lot.status, lot.transactionStatus);
}

export function serializePullLot(lot: LotWithChildren) {
  const confirmed = confirmedHandover(lot.handovers);
  return {
    id: lot.id,
    lotRef: lot.lotRef,
    categoryId: lot.categoryId,
    subCategory: lot.subCategory,
    approxWeightGrams: lot.approxWeightGrams,
    estimatedValuePaise: lot.estimatedValuePaise,
    estimatedMinPaise: lot.estimatedMinPaise,
    estimatedMaxPaise: lot.estimatedMaxPaise,
    transactionStatus: lotClientState(lot),
    chosenRecyclerId: lot.chosenRecyclerId,
    quotedRatePaise: lot.quotedRatePaise,
    finalPricePaise: lot.finalPricePaise,
    confirmedWeightGrams: confirmed?.confirmedWeightGrams ?? null,
    paymentStatus: lot.paymentStatus,
    collectedAt: iso(lot.collectedAt),
    createdAt: iso(lot.clientCreatedAt),
    updatedAt: iso(lot.updatedAt),
    handovers: lot.handovers.map((h) => ({
      id: h.id,
      handoverRef: h.handoverRef,
      status: h.status,
      declaredWeightGrams: h.declaredWeightGrams,
      confirmedWeightGrams: h.confirmedWeightGrams,
    })),
    payments: lot.payments.map((p) => ({
      id: p.id,
      amountPaise: p.amountPaise,
      method: p.method,
      upiRef: p.upiRef,
      paidAt: iso(p.paidAt),
      recordedBy: p.recordedBy === "RECYCLER" ? ("RECYCLER" as const) : ("COLLECTOR" as const),
    })),
  };
}

/** Client states that are decided on the server and must be pushed down to the phone. */
export const LOT_UPDATE_STATES: readonly ClientLotState[] = ["CONFIRMED", "PAID", "REJECTED", "DISPUTED"];

export function serializeLotUpdate(lot: LotWithChildren) {
  const state = lotClientState(lot);
  if (!LOT_UPDATE_STATES.includes(state)) return null;
  const confirmed = confirmedHandover(lot.handovers);
  return {
    lotId: lot.id,
    transactionStatus: state,
    finalPricePaise: lot.finalPricePaise,
    confirmedWeightGrams: confirmed?.confirmedWeightGrams ?? null,
    paymentStatus: lot.paymentStatus,
    confirmedAt: confirmed?.recyclerConfirmedAt ? iso(confirmed.recyclerConfirmedAt) : null,
    updatedAt: iso(lot.updatedAt),
  };
}

export function serializePullNotification(n: Notification) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    dataJson: n.dataJson,
    createdAt: iso(n.createdAt),
  };
}

export function serializePullPickupRequest(r: PickupRequest) {
  return {
    id: r.id,
    lotId: r.lotId,
    recyclerId: r.recyclerId,
    slot: iso(r.slot),
    status: r.status,
    expiresAt: iso(r.expiresAt),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}
