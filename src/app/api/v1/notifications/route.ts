import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";
import { z } from "zod";

const CreateNotificationSchema = z.object({
  recipientUserId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  dataJson: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return apiSuccess({
      unreadCount: notifications.filter((n) => !n.isRead).length,
      notifications,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }
    if (auth.role !== "ADMIN") {
      return apiError("FORBIDDEN", "Only admins can send notifications", 403);
    }

    const body = await req.json();
    const parsed = CreateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { recipientUserId, title, body: notifBody, dataJson } = parsed.data;

    const notif = await prisma.notification.create({
      data: {
        userId: recipientUserId,
        title,
        body: notifBody,
        dataJson: dataJson ? JSON.stringify(dataJson) : null,
      },
    });

    return apiSuccess({
      message: "Notification sent successfully",
      notification: notif,
    }, 201);
  } catch (err) {
    return apiErrorFrom(err);
  }
}
