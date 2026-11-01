import test from "node:test";
import assert from "node:assert/strict";
import {
  selectBroadcastTargets,
  calculateLotValuePaise,
  isValidCoordinate,
  type BroadcastCandidate,
} from "../../src/lib/domain/lotBroadcast";

const DHARAVI = { lat: 19.0434, lng: 72.8567 };
const now = new Date("2026-11-01T12:00:00Z");

function recycler(id: string, latitude: number, longitude: number, overrides: Partial<BroadcastCandidate> = {}): BroadcastCandidate {
  return { id, latitude, longitude, authorizationStatus: "VERIFIED", authorizationValidTill: null, ...overrides };
}

test("selectBroadcastTargets keeps only verified recyclers within 5 km, nearest first", () => {
  const targets = selectBroadcastTargets(
    [
      recycler("kurla", 19.0657, 72.8794), // ~3.4 km
      recycler("next-door", 19.045, 72.858), // ~0.2 km
      recycler("thane", 19.2183, 72.9781), // ~23 km
      recycler("pending", 19.044, 72.857, { authorizationStatus: "PENDING" }),
      recycler("expired", 19.044, 72.857, { authorizationValidTill: new Date("2026-01-01") }),
    ],
    DHARAVI.lat,
    DHARAVI.lng,
    now
  );

  assert.deepEqual(targets.map((t) => t.recyclerId), ["next-door", "kurla"]);
  assert.ok(targets[1].distanceKm > 3 && targets[1].distanceKm < 5);
});

test("selectBroadcastTargets returns empty list when nobody is in range", () => {
  assert.deepEqual(selectBroadcastTargets([recycler("thane", 19.2183, 72.9781)], DHARAVI.lat, DHARAVI.lng, now), []);
});

test("calculateLotValuePaise: 10 kg at Rs 10/kg is Rs 100", () => {
  assert.equal(calculateLotValuePaise(1000, 10_000), 10_000);
  assert.equal(calculateLotValuePaise(3550, 2_500), 8875);
});

test("isValidCoordinate rejects out-of-range and null-island coordinates", () => {
  assert.equal(isValidCoordinate(19.04, 72.85), true);
  assert.equal(isValidCoordinate(0, 0), false);
  assert.equal(isValidCoordinate(91, 72), false);
  assert.equal(isValidCoordinate(NaN, 72), false);
});
