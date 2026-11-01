import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as estimateHandler } from "../../src/app/api/v1/estimate/route";
import { GET as recyclersMatchHandler } from "../../src/app/api/v1/recyclers/match/route";
import { GET as recyclersNearbyHandler } from "../../src/app/api/v1/recyclers/nearby/route";
import { GET as collectionPointsHandler } from "../../src/app/api/v1/collection-points/route";
import { GET as localUploadGet, PUT as localUploadPut } from "../../src/app/api/v1/uploads/local/route";
import { GET as exportPricesHandler } from "../../src/app/api/v1/admin/prices/export/route";
import { POST as expireAuthHandler } from "../../src/app/api/cron/expire-authorizations/route";
import { POST as expireRequestsHandler } from "../../src/app/api/cron/expire-requests/route";

describe("Integration: Business & Platform API Endpoints", () => {
  it("POST /api/v1/estimate validates input parameters and malformed body", async () => {
    // Malformed JSON
    const badJson = new NextRequest("http://localhost:3000/api/v1/estimate", {
      method: "POST",
      body: "{invalid",
    });
    const badRes = await estimateHandler(badJson);
    assert.equal(badRes.status, 400);

    // Negative weight
    const negWeight = new NextRequest("http://localhost:3000/api/v1/estimate", {
      method: "POST",
      body: JSON.stringify({ categoryId: 1, approxWeightGrams: -100 }),
    });
    const negRes = await estimateHandler(negWeight);
    assert.equal(negRes.status, 400);
  });

  it("GET /api/v1/recyclers/match validates required query parameters", async () => {
    // Missing all params
    const req1 = new NextRequest("http://localhost:3000/api/v1/recyclers/match");
    const res1 = await recyclersMatchHandler(req1);
    assert.equal(res1.status, 400);
    const json1 = await res1.json();
    assert.equal(json1.error.code, "MISSING_PARAMS");

    // Invalid non-numeric params
    const req2 = new NextRequest("http://localhost:3000/api/v1/recyclers/match?categoryId=abc&approxWeightGrams=500&latitude=19.0&longitude=72.0");
    const res2 = await recyclersMatchHandler(req2);
    assert.equal(res2.status, 400);
    const json2 = await res2.json();
    assert.equal(json2.error.code, "INVALID_PARAMS");
  });

  it("GET /api/v1/recyclers/nearby validates latitude/longitude boundaries", async () => {
    // Missing params
    const req1 = new NextRequest("http://localhost:3000/api/v1/recyclers/nearby");
    const res1 = await recyclersNearbyHandler(req1);
    assert.equal(res1.status, 400);

    // Out of range latitude
    const req2 = new NextRequest("http://localhost:3000/api/v1/recyclers/nearby?latitude=150.0&longitude=72.0");
    const res2 = await recyclersNearbyHandler(req2);
    assert.equal(res2.status, 400);
    const json2 = await res2.json();
    assert.equal(json2.error.code, "INVALID_PARAMS");
  });

  it("GET /api/v1/collection-points validates coordinates when provided", async () => {
    // Single coord without pair
    const req1 = new NextRequest("http://localhost:3000/api/v1/collection-points?latitude=19.0");
    const res1 = await collectionPointsHandler(req1);
    assert.equal(res1.status, 400);

    // Invalid numeric coords
    const req2 = new NextRequest("http://localhost:3000/api/v1/collection-points?latitude=abc&longitude=xyz");
    const res2 = await collectionPointsHandler(req2);
    assert.equal(res2.status, 400);
  });

  it("GET & PUT /api/v1/uploads/local strictly block directory traversal", async () => {
    // GET traversal attempt
    const getReq = new NextRequest("http://localhost:3000/api/v1/uploads/local?key=../../package.json");
    const getRes = await localUploadGet(getReq);
    assert.equal(getRes.status, 400);
    const getJson = await getRes.json();
    assert.equal(getJson.error.code, "INVALID_KEY");

    // PUT traversal attempt
    const putReq = new NextRequest("http://localhost:3000/api/v1/uploads/local?key=../../malicious.txt", {
      method: "PUT",
      body: Buffer.from("attack"),
    });
    const putRes = await localUploadPut(putReq);
    assert.equal(putRes.status, 400);
    const putJson = await putRes.json();
    assert.equal(putJson.error.code, "INVALID_KEY");
  });

  it("GET /api/v1/admin/prices/export returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/prices/export");
    const res = await exportPricesHandler(req);
    assert.equal(res.status, 401);
  });

  it("POST /api/cron/expire-authorizations rejects unauthorized callers", async () => {
    const req = new NextRequest("http://localhost:3000/api/cron/expire-authorizations", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await expireAuthHandler(req);
    assert.equal(res.status, 401);
  });

  it("POST /api/cron/expire-requests rejects unauthorized callers", async () => {
    const req = new NextRequest("http://localhost:3000/api/cron/expire-requests", {
      method: "POST",
    });
    const res = await expireRequestsHandler(req);
    assert.equal(res.status, 401);
  });
});

