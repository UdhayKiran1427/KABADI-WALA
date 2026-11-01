import { getSecretKey } from "./secrets";
import { SignJWT, jwtVerify } from "jose";

const getKey = () => getSecretKey("JWT_SECRET");

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
    .sign(getKey());
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey());
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

