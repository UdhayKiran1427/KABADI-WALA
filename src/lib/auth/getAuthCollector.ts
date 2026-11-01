import { NextRequest } from "next/server";
import { verifyMobileToken, MobileTokenPayload } from "./jwt";
import { prisma } from "../prisma";

export async function getAuthCollector(req: NextRequest): Promise<{
  user: MobileTokenPayload;
  collector: { id: string; shortCode: string; operatingArea: string };
} | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  const payload = await verifyMobileToken(token);
  if (!payload || !payload.userId) {
    return null;
  }

  const collector = await prisma.collector.findUnique({
    where: { userId: payload.userId },
  });

  if (!collector) {
    return null;
  }

  return {
    user: payload,
    collector: {
      id: collector.id,
      shortCode: collector.shortCode,
      operatingArea: collector.operatingArea,
    },
  };
}

