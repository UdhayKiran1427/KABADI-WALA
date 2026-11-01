import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPin, verifyPin, hashPassword, verifyPassword } from "../../src/lib/auth/password";
import { signMobileToken, verifyMobileToken } from "../../src/lib/auth/jwt";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../../src/lib/auth/rateLimiter";
import { sanitizeStorageKey, validateStorageKey } from "../../src/lib/storage";

describe("Unit: Authentication & Security Helpers", () => {
  it("hashPin & verifyPin correctly hash and verify 4-digit PINs", async () => {
    const pin = "1234";
    const hashed = await hashPin(pin);
    assert.notEqual(hashed, pin);

    const isValid = await verifyPin(pin, hashed);
    assert.equal(isValid, true);

    const isInvalid = await verifyPin("9999", hashed);
    assert.equal(isInvalid, false);
  });

  it("hashPassword & verifyPassword handle complex alphanumeric strings", async () => {
    const pass = "ComplexPassword#2026!";
    const hashed = await hashPassword(pass);
    assert.equal(await verifyPassword(pass, hashed), true);
    assert.equal(await verifyPassword("WrongPassword", hashed), false);
  });

  it("signMobileToken produces valid JWT and verifyMobileToken decodes payload", async () => {
    const payload = {
      userId: "usr-test-123",
      phone: "9820000001",
      role: "COLLECTOR",
      shortCode: "KW01",
    };

    const token = await signMobileToken(payload);
    assert.ok(typeof token === "string" && token.length > 20);

    const decoded = await verifyMobileToken(token);
    assert.ok(decoded);
    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.phone, payload.phone);
    assert.equal(decoded.role, payload.role);
    assert.equal(decoded.shortCode, payload.shortCode);
  });

  it("verifyMobileToken rejects malformed or tampered tokens", async () => {
    const invalid = await verifyMobileToken("invalid.jwt.token");
    assert.equal(invalid, null);

    const empty = await verifyMobileToken("");
    assert.equal(empty, null);
  });

  it("rateLimiter allows up to 5 attempts and locks out on 5th failure", () => {
    const testKey = `test_rate_limit_${Date.now()}`;
    resetRateLimit(testKey);

    // Initial check
    const initial = checkRateLimit(testKey);
    assert.equal(initial.allowed, true);
    assert.equal(initial.remainingAttempts, 5);

    // 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = recordFailedAttempt(testKey);
      assert.equal(res.locked, false);
      assert.equal(res.remainingAttempts, 5 - i);
    }

    // 5th failed attempt locks out
    const lockedRes = recordFailedAttempt(testKey);
    assert.equal(lockedRes.locked, true);
    assert.equal(lockedRes.remainingAttempts, 0);

    // Further checkRateLimit rejects
    const lockedCheck = checkRateLimit(testKey);
    assert.equal(lockedCheck.allowed, false);

    // Reset rate limiter clears lockout
    resetRateLimit(testKey);
    const resetCheck = checkRateLimit(testKey);
    assert.equal(resetCheck.allowed, true);
    assert.equal(resetCheck.remainingAttempts, 5);
  });

  it("sanitizeStorageKey blocks path traversal attacks and allows safe keys", () => {
    // Dangerous attacks
    assert.equal(sanitizeStorageKey("../../etc/passwd"), null);
    assert.equal(sanitizeStorageKey("..\\..\\Windows\\System32"), null);
    assert.equal(sanitizeStorageKey("/absolute/path"), null);
    assert.equal(sanitizeStorageKey("C:\\Windows\\win.ini"), null);
    assert.equal(sanitizeStorageKey("images/user/../../../secret.txt"), null);
    assert.equal(sanitizeStorageKey("images/user/\0evil.jpg"), null);

    // Safe paths
    assert.equal(
      sanitizeStorageKey("images/user123/123456_pcb.jpg"),
      "images/user123/123456_pcb.jpg"
    );
  });

  it("validateStorageKey verifies user namespace prefix strictly", () => {
    const userId = "user-abc-123";
    assert.equal(validateStorageKey(`images/${userId}/photo.jpg`, userId), true);
    assert.equal(validateStorageKey("images/other-user/photo.jpg", userId), false);
    assert.equal(validateStorageKey(`images/${userId}/../../hacked.jpg`, userId), false);
  });
});

