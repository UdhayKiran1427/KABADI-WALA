import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPin, verifyPassword } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiErrorFrom, apiSuccess, parseBody } from "@/lib/apiResponse";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rateLimiter";
import { z } from "zod";

const RoleLoginSchema = z.object({
  role: z.enum(["COLLECTOR", "RECYCLER", "ADMIN", "FIELD_AGENT", "collector", "recycler", "admin", "field_agent"]),
  phone: z.string().regex(/^\d{10}$/, "Phone must be a valid 10-digit number"),
  pin: z.string().min(4, "PIN or password must be at least 4 digits"),
  code: z.string().optional(),
});

/**
 * Unified multi-role sign-in endpoint (ROLE RB2.6).
 * Supports Collector, Recycler Staff (with facility code), Platform Admin (6-digit PIN),
 * and Field Agent (with agent code).
 */
export async function POST(req: NextRequest) {
  try {
    const { body, response: bodyError } = await parseBody(req, RoleLoginSchema);
    if (bodyError) return bodyError;

    const { role: rawRole, phone, pin, code } = body;
    const normalizedRole = rawRole.toUpperCase() as "COLLECTOR" | "RECYCLER" | "ADMIN" | "FIELD_AGENT";

    const rateLimitKey = `auth_role:${normalizedRole}:${phone}`;
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
      include: {
        collector: true,
        recyclerStaff: { include: { recycler: true } },
      },
    });

    if (!user || !user.isActive) {
      recordFailedAttempt(rateLimitKey);
      return apiError("INVALID_CREDENTIALS", "Invalid phone number or PIN", 401);
    }

    // Role check
    if (user.role !== normalizedRole) {
      recordFailedAttempt(rateLimitKey);
      return apiError("FORBIDDEN", `User account does not have ${normalizedRole} role permissions.`, 403);
    }

    // Admin requires 6-digit PIN
    if (normalizedRole === "ADMIN" && pin.length < 6) {
      return apiError("VALIDATION_ERROR", "Admin accounts require a 6-digit PIN", 400);
    }

    // Verify PIN or password
    let isValid = await verifyPin(pin, user.pinHash);
    if (!isValid) {
      isValid = await verifyPassword(pin, user.pinHash);
    }

    if (!isValid) {
      const failed = recordFailedAttempt(rateLimitKey);
      return apiError(
        "INVALID_CREDENTIALS",
        `Invalid PIN. ${failed.remainingAttempts} attempts remaining before lockout.`,
        401
      );
    }

    resetRateLimit(rateLimitKey);

    const token = await signMobileToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      shortCode: user.collector?.shortCode,
    });

    return apiSuccess({
      token,
      profile: {
        userId: user.id,
        phone: user.phone,
        role: user.role,
        shortCode: user.collector?.shortCode ?? null,
        operatingArea: user.collector?.operatingArea ?? null,
        recyclerId: user.recyclerStaff?.recycler.id ?? null,
        facilityName: user.recyclerStaff?.recycler.name ?? null,
        facilityAuthorizationStatus: user.recyclerStaff?.recycler.authorizationStatus ?? null,
        agentCode: code ?? null,
      },
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

