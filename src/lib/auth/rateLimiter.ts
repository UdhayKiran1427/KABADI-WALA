interface AttemptRecord {
  attempts: number;
  lockedUntil: number | null;
}

const memoryStore = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; lockedUntilMs?: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntilMs: record.lockedUntil,
    };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    memoryStore.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  return {
    allowed: record.attempts < MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts),
  };
}

export function recordFailedAttempt(key: string): { locked: boolean; remainingAttempts: number } {
  const now = Date.now();
  const record = memoryStore.get(key) || { attempts: 0, lockedUntil: null };

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    memoryStore.set(key, record);
    return { locked: true, remainingAttempts: 0 };
  }

  memoryStore.set(key, record);
  return { locked: false, remainingAttempts: MAX_ATTEMPTS - record.attempts };
}

export function resetRateLimit(key: string): void {
  memoryStore.delete(key);
}

