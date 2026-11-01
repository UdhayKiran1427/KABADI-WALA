import { type NextRequest } from "next/server";
import { prisma } from "../prisma";
import { verifyMobileToken } from "./jwt";

export type SyncRole = "COLLECTOR" | "FIELD_AGENT";

export interface SyncActor {
  userId: string;
  phone: string;
  role: SyncRole;
  /** Present for collectors; field agents have no collector profile. */
  collector: { id: string; shortCode: string; operatingArea: string } | null;
}

/**
 * Authenticates a mobile sync call: Bearer token only (no web cookie), user must exist and be active,
 * role COLLECTOR (needs a collector profile) or FIELD_AGENT. Returns null for anything else.
 */
export async function getAuthSyncActor(req: NextRequest): Promise<SyncActor | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const payload = await verifyMobileToken(authHeader.substring(7).trim());
  if (!payload || !payload.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { collector: true },
  });
  if (!user || !user.isActive) return null;

  if (user.role === "COLLECTOR") {
    if (!user.collector) return null;
    return {
      userId: user.id,
      phone: user.phone,
      role: "COLLECTOR",
      collector: {
        id: user.collector.id,
        shortCode: user.collector.shortCode,
        operatingArea: user.collector.operatingArea,
      },
    };
  }
  if (user.role === "FIELD_AGENT") {
    return { userId: user.id, phone: user.phone, role: "FIELD_AGENT", collector: null };
  }
  return null;
}
