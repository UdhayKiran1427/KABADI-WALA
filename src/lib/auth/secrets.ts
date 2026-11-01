const DEV_FALLBACKS = {
  JWT_SECRET: "super-secret-jwt-key-minimum-32-chars-long-collector-token",
  SESSION_SECRET: "super-secret-session-cookie-key-for-recycler-and-admin-32-chars",
  CRON_SECRET: "platform-cron-secret-token-for-maintenance-tasks",
} as const;

type SecretName = keyof typeof DEV_FALLBACKS;

/** Reads a secret from env. Development falls back to the .env.example value; production must set it. */
export function getSecret(name: SecretName): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error(`${name} must be set in production`);
  }
  return DEV_FALLBACKS[name];
}

/** HMAC key for jose, derived lazily so a missing production secret fails on first use, not at import. */
export function getSecretKey(name: "JWT_SECRET" | "SESSION_SECRET"): Uint8Array {
  return new TextEncoder().encode(getSecret(name));
}
