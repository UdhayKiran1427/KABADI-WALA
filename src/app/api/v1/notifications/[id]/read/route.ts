import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    const { id } = await params;

    const notif = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notif || notif.userId !== auth.user.userId) {
      return apiError("NOT_FOUND", "Notification not found", 404);
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return apiSuccess({ message: "Notification marked as read" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

