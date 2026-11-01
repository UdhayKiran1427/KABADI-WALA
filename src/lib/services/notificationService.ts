import { prisma } from "../prisma";

export interface SendNotificationInput {
  userId: string;
  title: string;
  body: string;
  dataJson?: Record<string, unknown>;
}

/**
 * Creates an in-app notification for a user (Collector, Recycler, or Admin).
 */
export async function sendNotification(input: SendNotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        dataJson: input.dataJson ? JSON.stringify(input.dataJson) : null,
      },
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
    return null;
  }
}

/**
 * Gets count of unread notifications for a user.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    });
  } catch {
    return 0;
  }
}

/**
 * Fetches recent notifications for a user.
 */
export async function getUserNotifications(userId: string, limit = 20) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

