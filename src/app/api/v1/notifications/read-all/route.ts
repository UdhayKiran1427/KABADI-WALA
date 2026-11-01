import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { apiError, apiSuccess, apiErrorFrom } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: auth.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return apiSuccess({
      message: `Marked ${result.count} notifications as read`,
      count: result.count,
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
