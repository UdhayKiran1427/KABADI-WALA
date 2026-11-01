import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "../prisma";
import { Role } from "@prisma/client";

const SESSION_SECRET_STRING = process.env.SESSION_SECRET || "super-secret-session-cookie-key-for-recycler-and-admin-32-chars";
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET_STRING);
const COOKIE_NAME = "ewaste_session";

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
    const { payload } = await jwtVerify(SECRET_KEY, sessionCookie.value);
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
 */
export async function requireRole(allowedRoles: Role[]): Promise<{ user: SessionPayload; dbUser: { id: string; phone: string; role: Role; recyclerId?: string } }> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED: Sign-in required");
  }

  // Double check directly from DB to prevent privilege escalation or revoked access
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { recyclerStaff: true },
  });

  if (!dbUser || !dbUser.isActive) {
    throw new Error("UNAUTHORIZED: User account inactive or not found");
  }

  if (!allowedRoles.includes(dbUser.role)) {
    throw new Error(`FORBIDDEN: Required role ${allowedRoles.join(" or ")}, but got ${dbUser.role}`);
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
