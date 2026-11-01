import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "super-secret-jwt-key-minimum-32-chars-long-collector-token";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export interface MobileTokenPayload {
  userId: string;
  phone: string;
  role: string;
  shortCode?: string;
}

export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30 days
    .sign(SECRET_KEY);
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(SECRET_KEY, token);
    return {
      userId: String(payload.userId),
      phone: String(payload.phone),
      role: String(payload.role),
      shortCode: payload.shortCode ? String(payload.shortCode) : undefined,
    };
  } catch {
    return null;
  }
}
