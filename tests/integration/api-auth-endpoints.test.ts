import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as loginHandler } from "../../src/app/api/v1/auth/login/route";
import { POST as registerHandler } from "../../src/app/api/v1/auth/register/route";
import { POST as recoveryHandler } from "../../src/app/api/v1/auth/pin-recovery/route";

describe("Integration: Auth API Endpoints", () => {
  it("POST /api/v1/auth/login rejects malformed JSON with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: "not a json string",
      headers: { "Content-Type": "application/json" },
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "INVALID_JSON");
  });

  it("POST /api/v1/auth/login validates required phone and 4-digit PIN", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone: "123", pin: "abc" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/v1/auth/register validates phone and PIN format", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone: "invalid", pin: "12" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await registerHandler(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });

  it("POST /api/v1/auth/pin-recovery validates payload schema", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/auth/pin-recovery", {
      method: "POST",
      body: JSON.stringify({ phone: "9820000001" }), // missing shortCode & operatingArea
      headers: { "Content-Type": "application/json" },
    });

    const res = await recoveryHandler(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.error.code, "VALIDATION_ERROR");
  });
});

