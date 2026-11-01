import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareAreaPrice } from "../../src/lib/domain/nearbyPrices";

describe("GEO G7.3: Nearby Price & Travel Cost Comparison", () => {
  it("suggests nearby area when price difference outweighs travel cost", () => {
    // 20 kg lot, nearby is ₹25/kg higher (2500 paise), 5 km away
    // Gross extra = 20 * 25 = ₹500 (50,000 paise)
    // Travel cost = 5 km * ₹15/km = ₹75 (7,500 paise)
    // Net gain = ₹425 (42,500 paise) > 0 => Recommended!
    const result = compareAreaPrice(
      "Kothrud",
      5.0,
      30000, // local: ₹300/kg
      32500, // nearby: ₹325/kg (+₹25/kg)
      20000  // 20 kg
    );

    assert.equal(result.isRecommended, true);
    assert.equal(result.rateDiffRupees, 25);
    assert.equal(result.netGainPaise, 42500);
    assert.ok(result.gainRupees.includes("425"));
  });

  it("does not recommend farther area when travel cost exceeds price gain", () => {
    // Small weight: 2 kg lot, nearby is ₹10/kg higher (1000 paise), 10 km away
    // Gross extra = 2 * 10 = ₹20 (2,000 paise)
    // Travel cost = 10 km * ₹15 = ₹150 (15,000 paise)
    // Net gain = -₹130 (-13,000 paise) < 0 => NOT Recommended!
    const result = compareAreaPrice(
      "Dadar",
      10.0,
      30000,
      31000,
      2000
    );

    assert.equal(result.isRecommended, false);
    assert.ok(result.netGainPaise < 0);
  });
});
