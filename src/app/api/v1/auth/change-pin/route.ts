import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin, verifyPin } from "@/lib/auth/password";
import { getAuthCollector } from "@/lib/auth/getAuthCollector";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { z } from "zod";

const ChangePinSchema = z.object({
  oldPin: z.string().regex(/^\d{4}$/, "Old PIN must be a 4-digit number"),
  newPin: z.string().regex(/^\d{4}$/, "New PIN must be a 4-digit number"),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthCollector(req);
    if (!auth) {
      return apiError("UNAUTHORIZED", "Missing or invalid bearer authorization", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = ChangePinSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { oldPin, newPin } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
    });

    if (!user) {
      return apiError("USER_NOT_FOUND", "User not found", 404);
    }

    const isMatch = await verifyPin(oldPin, user.pinHash);
    if (!isMatch) {
      return apiError("INVALID_OLD_PIN", "Old PIN is incorrect", 400);
    }

    const newPinHash = await hashPin(newPin);
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: newPinHash, updatedAt: new Date() },
    });

    return apiSuccess({ message: "PIN changed successfully" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

