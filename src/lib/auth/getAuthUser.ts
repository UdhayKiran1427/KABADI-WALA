import { getSecretKey } from "./secrets";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../prisma";
import { Role } from "@prisma/client";
import { verifyMobileToken } from "./jwt";
import { apiError } from "../apiResponse";

const getKey = () => getSecretKey("SESSION_SECRET");
const COOKIE_NAME = "ewaste_session";

export interface AuthenticatedUser {
  userId: string;
  phone: string;
  role: Role;
  collectorId?: string;
  recyclerId?: string;
  shortCode?: string;
}

/**
 * Universally authenticates an incoming NextRequest.
 * Supports:
 * 1. Mobile JWT in 'Authorization: Bearer <token>'
 * 2. Web session JWT in 'ewaste_session' cookie
 */
export async function getAuthUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  let userId: string | null = null;
  let role: Role | null = null;

  // 1. Check Bearer token in header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const payload = await verifyMobileToken(token);
    if (payload && payload.userId) {
      userId = payload.userId;
      role = payload.role as Role;
    }
  }

  // 2. Check cookie if no Bearer token
  if (!userId) {
    const cookie = req.cookies.get(COOKIE_NAME);
    if (cookie && cookie.value) {
      try {
        const { payload } = await jwtVerify(cookie.value, getKey());
        if (payload && payload.userId) {
          userId = String(payload.userId);
          role = payload.role as Role;
        }
      } catch {
        // invalid cookie
      }
    }
  }

  if (!userId) {
    return null;
  }

  // Fetch from DB to ensure user is active and get collector/recycler relations
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      collector: { select: { id: true, shortCode: true } },
      recyclerStaff: { select: { recyclerId: true } },
    },
  });

  if (!dbUser || !dbUser.isActive) {
    return null;
  }

  return {
    userId: dbUser.id,
    phone: dbUser.phone,
    role: dbUser.role,
    collectorId: dbUser.collector?.id,
    shortCode: dbUser.collector?.shortCode,
    recyclerId: dbUser.recyclerStaff?.recyclerId,
  };
}

/**
 * Authenticates the request and checks its role (verified against the database).
 * Returns the user, or the 401/403 response to send back.
 */
export async function requireApiUser(
  req: NextRequest,
  roles: Role[]
): Promise<{ user: AuthenticatedUser; response?: undefined } | { user?: undefined; response: Response }> {
  const user = await getAuthUser(req);
  if (!user) {
    return { response: apiError("UNAUTHORIZED", "Missing or invalid authorization", 401) };
  }
  if (!roles.includes(user.role)) {
    return { response: apiError("FORBIDDEN", "Your role cannot use this endpoint", 403) };
  }
  return { user };
}
