import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTravelMinutes,
  getTravelEstimates,
  getDirectionsUrl,
  buildLocationShareMessage,
  checkArrivalProximity,
  TRAVEL_SPEEDS_KMH,
} from "../../src/lib/domain/geoDirections";

describe("GEO G4: Domain Travel & Directions Rules", () => {
  it("computes travel time by mode according to speed table", () => {
    // 4.5 km walk at 4.5 km/h = 60 minutes
    assert.equal(calculateTravelMinutes(4.5, "walk"), 60);

    // 12 km bike at 12 km/h = 60 minutes
    assert.equal(calculateTravelMinutes(12, "bike"), 60);

    // 20 km vehicle at 20 km/h = 60 minutes
    assert.equal(calculateTravelMinutes(20, "vehicle"), 60);

    // Speed constants
    assert.equal(TRAVEL_SPEEDS_KMH.walk, 4.5);
    assert.equal(TRAVEL_SPEEDS_KMH.bike, 12.0);
    assert.equal(TRAVEL_SPEEDS_KMH.vehicle, 20.0);
  });

  it("produces localized travel estimates summaries", () => {
    const estimates = getTravelEstimates(3.0);
    assert.equal(estimates.distanceKm, 3.0);
    assert.ok(estimates.walkMinutes > 0);
    assert.ok(estimates.bikeMinutes > 0);
    assert.ok(estimates.vehicleMinutes > 0);
    assert.ok(estimates.summaryEn.includes("walk"));
    assert.ok(estimates.summaryHi.includes("पैदल"));
  });

  it("creates Google Maps directions with correct travel modes", () => {
    const walkUrl = getDirectionsUrl(19.0434, 72.8567, "walk", 19.05, 72.86);
    assert.ok(walkUrl.includes("destination=19.0434%2C72.8567") || walkUrl.includes("destination=19.0434,72.8567"));
    assert.ok(walkUrl.includes("travelmode=walking"));
    assert.ok(walkUrl.includes("origin="));

    const bikeUrl = getDirectionsUrl(19.0434, 72.8567, "bike");
    assert.ok(bikeUrl.includes("travelmode=bicycling"));
  });

  it("creates share message with lotRef and maps link", () => {
    const msg = buildLocationShareMessage({
      recyclerName: "EcoRecycle Hub",
      lotRef: "LOT-KW01-261102-001",
      destLat: 19.0434,
      destLng: 72.8567,
      landmark: "Opposite Metro Gate 2",
      language: "EN",
    });
    assert.ok(msg.includes("LOT-KW01-261102-001"));
    assert.ok(msg.includes("EcoRecycle Hub"));
    assert.ok(msg.includes("Opposite Metro Gate 2"));
    assert.ok(msg.includes("https://maps.google.com/?q=19.0434,72.8567"));
  });

  it("verifies arrival proximity: <= 300m returns arrived=true, > 300m returns arrived=false", () => {
    // Exactly at coordinates -> distance = 0m -> arrived
    const same = checkArrivalProximity(19.0434, 72.8567, 19.0434, 72.8567);
    assert.equal(same.arrived, true);
    assert.equal(same.distanceMeters, 0);

    // Close by (~100m)
    const close = checkArrivalProximity(19.0434, 72.8567, 19.0440, 72.8570);
    assert.equal(close.arrived, true);
    assert.ok(close.distanceMeters <= 300);

    // Far away (~2.5km)
    const far = checkArrivalProximity(19.0434, 72.8567, 19.0600, 72.8700);
    assert.equal(far.arrived, false);
    assert.ok(far.distanceMeters > 300);
  });
});
