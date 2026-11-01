import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { resetRateLimit } from "@/lib/auth/rateLimiter";
import { z } from "zod";

/**
 * OTP-Free PIN Recovery Scheme:
 * Designed specifically for low-literacy informal collectors operating without active SMS balance.
 * Requires:
 *  1. phone (10-digit number)
 *  2. shortCode (the collector's unique 4-character ID, e.g. "AB12", printed on their offline physical lot QR labels)
 *  3. operatingArea (fuzzy/case-insensitive match to registered locality)
 *  4. newPin (new 4-digit PIN)
 */
const RecoverySchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  shortCode: z.string().min(3).max(6),
  operatingArea: z.string().min(2),
  newPin: z.string().regex(/^\d{4}$/, "New PIN must be a 4-digit number"),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = RecoverySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { phone, shortCode, operatingArea, newPin } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { collector: true },
    });

    if (!user || !user.collector) {
      return apiError("RECOVERY_FAILED", "Verification failed. Details do not match our records.", 403);
    }

    // Match shortCode exactly
    if (user.collector.shortCode.toUpperCase().trim() !== shortCode.toUpperCase().trim()) {
      return apiError("RECOVERY_FAILED", "Verification failed. Details do not match our records.", 403);
    }

    // Match operating area case-insensitively
    const cleanStoredArea = user.collector.operatingArea.toLowerCase().trim();
    const cleanProvidedArea = operatingArea.toLowerCase().trim();
    if (!cleanStoredArea.includes(cleanProvidedArea) && !cleanProvidedArea.includes(cleanStoredArea)) {
      return apiError("RECOVERY_FAILED", "Verification failed. Details do not match our records.", 403);
    }

    // Success: Reset PIN
    const pinHash = await hashPin(newPin);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
    });

    // Reset rate limiter lockout
    resetRateLimit(`auth_mobile:${phone}`);

    const token = await signMobileToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      shortCode: user.collector.shortCode,
    });

    return apiSuccess({
      message: "PIN recovered and updated successfully",
      token,
      profile: {
        collectorId: user.collector.id,
        userId: user.id,
        shortCode: user.collector.shortCode,
        preferredLanguage: user.collector.preferredLanguage,
        operatingArea: user.collector.operatingArea,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

