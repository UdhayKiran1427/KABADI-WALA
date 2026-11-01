import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signMobileToken } from "@/lib/auth/jwt";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rateLimiter";
import { z } from "zod";

const StaffLoginSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be a valid 10-digit number"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Sign-in for recycler staff and admins (phone + password). Collectors use /auth/login with a PIN.
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", "Malformed JSON request body", 400);
    }
    const parsed = StaffLoginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, 400);
    }

    const { phone, password } = parsed.data;
    const rateLimitKey = `auth_staff:${phone}`;
    if (!checkRateLimit(rateLimitKey).allowed) {
      return apiError("ACCOUNT_LOCKED", "Too many failed attempts. Try again in 15 minutes.", 429);
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      include: { recyclerStaff: { include: { recycler: { select: { id: true, name: true } } } } },
    });

    const isStaff = user && user.isActive && (user.role === "RECYCLER" || user.role === "ADMIN");
    if (!isStaff || !(await verifyPassword(password, user.pinHash))) {
      recordFailedAttempt(rateLimitKey);
      return apiError("INVALID_CREDENTIALS", "Invalid phone number or password", 401);
    }

    resetRateLimit(rateLimitKey);
    const token = await signMobileToken({ userId: user.id, phone: user.phone, role: user.role });

    return apiSuccess({
      token,
      profile: {
        userId: user.id,
        phone: user.phone,
        role: user.role,
        recyclerId: user.recyclerStaff?.recycler.id ?? null,
        recyclerName: user.recyclerStaff?.recycler.name ?? null,
      },
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}
