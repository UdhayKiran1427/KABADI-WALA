/**
 * Pure domain logic: Lot State Machine.
 * Valid transitions:
 *   DRAFT -> READY -> MATCHED -> HANDED_OVER -> COMPLETED
 * Terminal/divergent states:
 *   - Any non-final state -> CANCELLED (collector gives up; also while handed over / disputed)
 *   - HANDED_OVER -> DISPUTED (recycler or collector disputes weight/price)
 *   - DISPUTED -> HANDED_OVER (dispute resolved), COMPLETED, REJECTED or CANCELLED
 *   - READY / MATCHED -> EXPIRED (time-to-live exceeded)
 *   - MATCHED / HANDED_OVER -> REJECTED (material or quote refused by the recycler)
 *   - REJECTED / EXPIRED -> MATCHED (the lot is still the collector's: quote another recycler) or CANCELLED
 * Only COMPLETED and CANCELLED are terminal. See docs/sync-contract.md §6.3.
 * Rules:
 *   - Status never moves backward.
 *   - COMPLETED is server-owned.
 *   - Client cannot set server-owned fields: finalPricePaise, confirmedWeightGrams, paymentStatus.
 */

export type LotStatus =
  | "DRAFT"
  | "READY"
  | "MATCHED"
  | "HANDED_OVER"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | "DISPUTED";

const ALLOWED_TRANSITIONS: Record<LotStatus, LotStatus[]> = {
  DRAFT: ["READY", "CANCELLED"],
  READY: ["MATCHED", "CANCELLED", "EXPIRED"],
  MATCHED: ["HANDED_OVER", "READY", "CANCELLED", "EXPIRED", "REJECTED"],
  HANDED_OVER: ["COMPLETED", "DISPUTED", "REJECTED", "CANCELLED"],
  DISPUTED: ["HANDED_OVER", "COMPLETED", "REJECTED", "CANCELLED"],
  COMPLETED: [], // Terminal
  CANCELLED: [], // Terminal
  REJECTED: ["MATCHED", "CANCELLED"], // re-quote another recycler
  EXPIRED: ["MATCHED", "CANCELLED"], // re-quote
};

export interface StateTransitionValidation {
  valid: boolean;
  reason?: string;
  isConflict?: boolean;
}

export function validateLotTransition(
  currentStatus: LotStatus,
  targetStatus: LotStatus,
  isServerActor: boolean = false
): StateTransitionValidation {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  // Terminal states cannot be changed
  if (["COMPLETED", "CANCELLED"].includes(currentStatus)) {
    return {
      valid: false,
      isConflict: true,
      reason: `Lot is locked in terminal status '${currentStatus}' and cannot be transitioned to '${targetStatus}'.`,
    };
  }

  // COMPLETED is server-owned
  if (targetStatus === "COMPLETED" && !isServerActor) {
    return {
      valid: false,
      reason: "Status 'COMPLETED' is server-owned and can only be finalized by the server after handover and payment.",
    };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      isConflict: true,
      reason: `Illegal state transition from '${currentStatus}' to '${targetStatus}'. Status cannot move backward or jump steps.`,
    };
  }

  return { valid: true };
}

/**
 * Checks if a client payload contains protected server-owned fields.
 */
export function checkServerOwnedFields(payload: Record<string, unknown>): { forbidden: boolean; field?: string } {
  const serverOwnedKeys = ["finalPricePaise", "confirmedWeightGrams", "paymentStatus"];
  for (const key of serverOwnedKeys) {
    if (key in payload && payload[key] !== null && payload[key] !== undefined) {
      return { forbidden: true, field: key };
    }
  }
  return { forbidden: false };
}

