import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";

async function handleMarkRead(req: NextRequest, params: Promise<{ id: string }>) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const { id } = await params;

    const notif = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notif) {
      return apiError("NOT_FOUND", "Notification not found", 404);
    }

    if (notif.userId !== auth.userId && auth.role !== "ADMIN") {
      return apiError("FORBIDDEN", "You do not own this notification", 403);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return apiSuccess({
      message: "Notification marked as read",
      notification: updated,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleMarkRead(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleMarkRead(req, params);
}
