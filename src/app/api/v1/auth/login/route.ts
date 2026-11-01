import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rateLimiter";
import { z } from "zod";

const LoginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be a valid 10-digit number"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be a 4-digit number"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { phone, pin } = parsed.data;
    const rateLimitKey = `auth_mobile:${phone}`;

    // Rate limit check
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil(((rateCheck.lockedUntilMs || 0) - Date.now()) / (60 * 1000));
      return apiError(
        "ACCOUNT_LOCKED",
        `Too many failed attempts. Account is temporarily locked. Try again in ${waitMinutes} minutes.`,
        429
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { collector: true },
    });

    if (!user || !user.isActive) {
      recordFailedAttempt(rateLimitKey);
      return apiError("INVALID_CREDENTIALS", "Invalid phone number or PIN", 401);
    }

    // Verify PIN
    const isValid = await verifyPin(pin, user.pinHash);
    if (!isValid) {
      const failed = recordFailedAttempt(rateLimitKey);
      if (failed.locked) {
        return apiError(
          "ACCOUNT_LOCKED",
          "Account locked after 5 failed attempts. Please use PIN recovery or wait 15 minutes.",
          429
        );
      }
      return apiError(
        "INVALID_CREDENTIALS",
        `Invalid PIN. ${failed.remainingAttempts} attempts remaining before lockout.`,
        401
      );
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(rateLimitKey);

    const token = await signMobileToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      shortCode: user.collector?.shortCode,
    });

    return apiSuccess({
      token,
      profile: user.collector
        ? {
            collectorId: user.collector.id,
            userId: user.id,
            shortCode: user.collector.shortCode,
            preferredLanguage: user.collector.preferredLanguage,
            operatingArea: user.collector.operatingArea,
            phone: user.phone,
          }
        : null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return apiError("INTERNAL_ERROR", errorMsg, 500);
  }
}

