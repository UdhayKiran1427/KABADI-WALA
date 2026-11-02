import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVehicleNumber, normalizeVehicleName, vehicleState, otpMatches } from "../../src/lib/domain/vehicles";

test("normalizeVehicleNumber upper-cases and tidies spaces, rejects junk", () => {
  assert.equal(normalizeVehicleNumber("  mh 01-ab   1234 "), "MH 01-AB 1234");
  assert.equal(normalizeVehicleNumber("MH01AB1234"), "MH01AB1234");
  assert.equal(normalizeVehicleNumber("abc"), null);
  assert.equal(normalizeVehicleNumber("TRUCK-ONE"), null); // no digits
  assert.equal(normalizeVehicleNumber("MH01AB1234XYZ789"), null); // too long
});

test("normalizeVehicleName keeps 2-40 characters", () => {
  assert.equal(normalizeVehicleName("  Ramesh   Tata Ace "), "Ramesh Tata Ace");
  assert.equal(normalizeVehicleName("R"), null);
});

test("vehicleState: on the way beats loaded; unloaded and cancelled trips free the vehicle", () => {
  assert.equal(vehicleState([]).state, "EMPTY");
  assert.equal(vehicleState([{ status: "PICKED_UP", unloadedAt: null }]).state, "LOADED");
  assert.equal(vehicleState([{ status: "PICKED_UP", unloadedAt: new Date() }]).state, "EMPTY");
  assert.equal(vehicleState([{ status: "CANCELLED", unloadedAt: null }]).state, "EMPTY");
  const mixed = vehicleState([
    { status: "PICKED_UP", unloadedAt: null },
    { status: "ON_THE_WAY", unloadedAt: null },
  ]);
  assert.deepEqual(mixed, { state: "ON_THE_WAY", onTheWay: 1, loaded: 1 });
});

test("otpMatches needs exactly the same 4 digits", () => {
  assert.equal(otpMatches("4821", "4821"), true);
  assert.equal(otpMatches("4821", " 4821 "), true);
  assert.equal(otpMatches("4821", "4822"), false);
  assert.equal(otpMatches("4821", "482"), false);
  assert.equal(otpMatches("4821", "abcd"), false);
});
