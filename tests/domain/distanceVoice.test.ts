import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDistanceForVoice } from "../../src/lib/voice/distanceVoice";

describe("formatDistanceForVoice", () => {
  it("formats 2 km correctly in Hindi, Marathi, and English per GEO G10.3", () => {
    assert.equal(formatDistanceForVoice(2.0, "HI"), "दो किलोमीटर");
    assert.equal(formatDistanceForVoice(2.0, "MR"), "दोन किलोमीटर");
    assert.equal(formatDistanceForVoice(2.0, "EN"), "2 kilometers");
  });

  it("formats 1 km singular in English, Hindi, and Marathi", () => {
    assert.equal(formatDistanceForVoice(1.0, "HI"), "एक किलोमीटर");
    assert.equal(formatDistanceForVoice(1.0, "MR"), "एक किलोमीटर");
    assert.equal(formatDistanceForVoice(1.0, "EN"), "1 kilometer");
  });

  it("formats colloquial 1.5 km (derh / deed) correctly", () => {
    assert.equal(formatDistanceForVoice(1.5, "HI"), "डेढ़ किलोमीटर");
    assert.equal(formatDistanceForVoice(1.5, "MR"), "दीड किलोमीटर");
    assert.equal(formatDistanceForVoice(1.5, "EN"), "1.5 kilometers");
  });

  it("formats colloquial 2.5 km (dhai / adeech) correctly", () => {
    assert.equal(formatDistanceForVoice(2.5, "HI"), "ढाई किलोमीटर");
    assert.equal(formatDistanceForVoice(2.5, "MR"), "अडीच किलोमीटर");
    assert.equal(formatDistanceForVoice(2.5, "EN"), "2.5 kilometers");
  });

  it("formats 3.5 km with 'saadhe' prefix", () => {
    assert.equal(formatDistanceForVoice(3.5, "HI"), "साढ़े तीन किलोमीटर");
    assert.equal(formatDistanceForVoice(3.5, "MR"), "साडेतीन किलोमीटर");
  });

  it("formats sub-kilometer distances in meters", () => {
    assert.equal(formatDistanceForVoice(0.5, "HI"), "पाँच सौ मीटर");
    assert.equal(formatDistanceForVoice(0.5, "MR"), "पाचशे मीटर");
    assert.equal(formatDistanceForVoice(0.5, "EN"), "500 meters");

    assert.equal(formatDistanceForVoice(0.3, "HI"), "तीन सौ मीटर");
    assert.equal(formatDistanceForVoice(0.3, "MR"), "तीनशे मीटर");
  });

  it("handles 0 distance gracefully", () => {
    assert.equal(formatDistanceForVoice(0, "HI"), "शून्य मीटर");
    assert.equal(formatDistanceForVoice(0, "MR"), "शून्य मीटर");
    assert.equal(formatDistanceForVoice(0, "EN"), "0 meters");
  });
});

