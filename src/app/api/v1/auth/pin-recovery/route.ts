import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess, parseBody, apiErrorFrom } from "@/lib/apiResponse";
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
    const { body, response: bodyError } = await parseBody(req, RecoverySchema);
    if (bodyError) return bodyError;

    const { phone, shortCode, operatingArea, newPin } = body;

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
  } catch (err) {
    return apiErrorFrom(err);
  }
}

