import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: auth.user.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return apiSuccess({
      unreadCount: notifications.filter((n) => !n.isRead).length,
      notifications,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

