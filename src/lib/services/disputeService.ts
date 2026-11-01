import { prisma } from "@/lib/prisma";
import { validateLotTransition } from "@/lib/domain/lotStateMachine";
import { FlowError } from "./lotFlowService";
import { sendNotification } from "./notificationService";
import { notifyRecyclerStaff } from "./lotFlowService";
import { writeAudit } from "./auditService";

export type DisputeOutcome = "CONFIRM" | "CANCEL";

export interface ResolveDisputeInput {
  adminId: string;
  disputeId: string;
  outcome: DisputeOutcome;
  note: string;
}

/**
 * M6 (spec s3, s10): an admin resolves a DISPUTED lot. This is the only lot move an admin may make.
 * CONFIRM keeps the agreed amount and returns the lot to CONFIRMED (awaiting payment);
 * CANCEL cancels the lot. The resolution note is required and every resolution is audit-logged.
 */
export async function resolveDispute(input: ResolveDisputeInput): Promise<void> {
  const note = input.note.trim();
  if (note.length < 5) throw new FlowError("NOTE_REQUIRED", "Write a short resolution note (at least 5 characters)");

  const dispute = await prisma.dispute.findUnique({
    where: { id: input.disputeId },
    include: { lot: { include: { collector: true, transaction: true } } },
  });
  if (!dispute) throw new FlowError("NOT_FOUND", "Dispute not found", 404);
  if (dispute.resolvedAt) throw new FlowError("ALREADY_RESOLVED", "This dispute is already resolved", 409);

  const lot = dispute.lot;
  const targetLotStatus = input.outcome === "CONFIRM" ? "HANDED_OVER" : "CANCELLED";
  const check = validateLotTransition(lot.status, targetLotStatus);
  if (!check.valid) throw new FlowError("ILLEGAL_TRANSITION", check.reason ?? "Lot is not in a disputed state", 409);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: dispute.id },
      data: { resolution: `${input.outcome}: ${note}`, resolvedAt: now },
    });
    await tx.lot.update({ where: { id: lot.id }, data: { status: targetLotStatus } });
    if (lot.transaction) {
      await tx.transaction.update({
        where: { id: lot.transaction.id },
        data: { status: input.outcome === "CONFIRM" ? "CONFIRMED" : "CANCELLED" },
      });
    }
    await tx.handover.updateMany({
      where: { lotId: lot.id, status: "DISPUTED" },
      data: { status: input.outcome === "CONFIRM" ? "CONFIRMED" : "CANCELLED" },
    });
  });

  await writeAudit({
    actorId: input.adminId,
    action: "DISPUTE_RESOLVED",
    entityType: "Dispute",
    entityId: dispute.id,
    details: { lotRef: lot.lotRef, outcome: input.outcome, note },
  });

  const title = input.outcome === "CONFIRM" ? "Dispute resolved: lot confirmed" : "Dispute resolved: lot cancelled";
  const body = `Lot ${lot.lotRef}: ${note}`;
  await sendNotification({ userId: lot.collector.userId, title, body, dataJson: { lotId: lot.id, lotRef: lot.lotRef } });
  if (lot.chosenRecyclerId) await notifyRecyclerStaff(lot.chosenRecyclerId, title, body, { lotId: lot.id, lotRef: lot.lotRef });
}
