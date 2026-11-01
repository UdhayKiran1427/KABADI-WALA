import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "RECYCLER_STATUS_SET"
  | "RECYCLER_CREATED"
  | "TODAY_PRICES_SET"
  | "PRICE_ADDED"
  | "PRICE_DELETED"
  | "ANOMALY_REVIEWED"
  | "TEAM_USER_CREATED"
  | "DISPUTE_RESOLVED";

export interface AuditInput {
  actorId: string;
  actorRole?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  /** Small, non-sensitive facts (no phone numbers, PINs or passwords). */
  details?: Record<string, unknown>;
}

/** Appends one AuditLog row for an admin action (spec s10). Never updates or deletes rows. */
export async function writeAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole ?? "ADMIN",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      detailsJson: input.details ? JSON.stringify(input.details) : undefined,
    },
  });
}
