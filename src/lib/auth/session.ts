import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "../prisma";
import { Role } from "@prisma/client";

const SESSION_SECRET_STRING = process.env.SESSION_SECRET || "super-secret-session-cookie-key-for-recycler-and-admin-32-chars";
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET_STRING);
const COOKIE_NAME = "ewaste_session";

import { redirect } from "next/navigation";

export interface SessionPayload {
  userId: string;
  phone: string;
  role: Role;
  recyclerId?: string;
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY);
    return {
      userId: String(payload.userId),
      phone: String(payload.phone),
      role: payload.role as Role,
      recyclerId: payload.recyclerId ? String(payload.recyclerId) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Re-checks user role directly against the database on every server action or page load.
 * Redirects unauthenticated visitors directly to their respective login page.
 */
export async function requireRole(
  allowedRoles: Role[],
  customRedirect?: string
): Promise<{ user: SessionPayload; dbUser: { id: string; phone: string; role: Role; recyclerId?: string } }> {
  const session = await getSession();

  const fallbackLogin =
    customRedirect ||
    (allowedRoles.includes("FIELD_AGENT")
      ? "/field/login"
      : allowedRoles.includes("COLLECTOR")
      ? "/collector/login"
      : allowedRoles.includes("ADMIN")
      ? "/admin/login"
      : "/recycler/login");

  if (!session) {
    redirect(fallbackLogin);
  }

  // Double check directly from DB to prevent privilege escalation or revoked access
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { recyclerStaff: true },
  });

  if (!dbUser || !dbUser.isActive) {
    redirect(fallbackLogin);
  }

  if (!allowedRoles.includes(dbUser.role)) {
    redirect(fallbackLogin);
  }

  return {
    user: session,
    dbUser: {
      id: dbUser.id,
      phone: dbUser.phone,
      role: dbUser.role,
      recyclerId: dbUser.recyclerStaff?.recyclerId,
    },
  };
}

