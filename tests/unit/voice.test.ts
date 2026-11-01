import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SCREEN_PROMPTS,
  HAZARD_AUDIO_SCRIPTS,
  getMaterialPriceSpeech,
  getVerificationCodeSpeech,
  getEstimateSpeech,
} from "../../src/lib/voice/prompts";
import { getTranslation, UI_TRANSLATIONS } from "../../src/lib/i18n/translations";

describe("Voice Prompts and Engine Contract", () => {
  it("should have complete trilingual scripts (English, Hindi, Marathi) for all collector screens (C1-C12)", () => {
    const requiredCollectorScreens = [
      "C1_LANGUAGE",
      "C2_SIGNIN",
      "C3_HOME",
      "C4_CREATE_LOT",
      "C5_AI_ESTIMATE",
      "C6_PRICE_BOARD",
      "C7_RECYCLER_MATCH",
      "C8_HANDOVER",
      "C9_PAYMENT",
      "C10_LEDGER",
      "C11_SAFETY",
      "C12_MY_LOTS",
    ];

    for (const screenKey of requiredCollectorScreens) {
      const prompt = SCREEN_PROMPTS[screenKey];
      assert.ok(prompt, `Missing prompt for ${screenKey}`);
      assert.ok(prompt.en.length > 5, `English prompt too short for ${screenKey}`);
      assert.ok(prompt.hi.length > 5, `Hindi prompt too short for ${screenKey}`);
      assert.ok(prompt.mr.length > 5, `Marathi prompt too short for ${screenKey}`);
      assert.ok(prompt.shortLabelEn.length > 0, `Missing shortLabelEn for ${screenKey}`);
      assert.ok(prompt.shortLabelHi.length > 0, `Missing shortLabelHi for ${screenKey}`);
      assert.ok(prompt.shortLabelMr.length > 0, `Missing shortLabelMr for ${screenKey}`);
    }
  });

  it("should have complete trilingual scripts for field agent screens (F1-F4)", () => {
    const requiredFieldScreens = [
      "F1_ONBOARD",
      "F2_LOG_PRICE",
      "F3_TRAINING_PHOTOS",
      "F4_PICKUPS",
    ];

    for (const screenKey of requiredFieldScreens) {
      const prompt = SCREEN_PROMPTS[screenKey];
      assert.ok(prompt, `Missing prompt for ${screenKey}`);
      assert.ok(prompt.en.length > 5, `English prompt too short for ${screenKey}`);
      assert.ok(prompt.hi.length > 5, `Hindi prompt too short for ${screenKey}`);
      assert.ok(prompt.mr.length > 5, `Marathi prompt too short for ${screenKey}`);
    }
  });

  it("should have all 4 hazard audio scripts with English and Hindi for C11 safety guide", () => {
    const hazards = ["HAZ_CABLE", "HAZ_ACID", "HAZ_BATTERY", "HAZ_CRT"];

    for (const h of hazards) {
      const script = HAZARD_AUDIO_SCRIPTS[h];
      assert.ok(script, `Missing hazard audio script for ${h}`);
      assert.ok(script.en.length > 20, `English text missing for ${h}`);
      assert.ok(script.hi.length > 20, `Hindi text missing for ${h}`);
      assert.ok(script.mr.length > 20, `Marathi text missing for ${h}`);
      assert.ok(script.titleEn.length > 0);
      assert.ok(script.titleHi.length > 0);
    }
  });

  it("should format material price speech correctly in English, Hindi, and Marathi", () => {
    const enSpeech = getMaterialPriceSpeech("तांबा", "तांबे", 580, "EN", "Copper Wire");
    assert.match(enSpeech, /Copper Wire: ₹580 per kilogram/);

    const hiSpeech = getMaterialPriceSpeech("तांबा", "तांबे", 580, "HI");
    assert.match(hiSpeech, /तांबा: 580 रुपये प्रति किलो/);

    const mrSpeech = getMaterialPriceSpeech("तांबा", "तांबे", 580, "MR");
    assert.match(mrSpeech, /तांबे: 580 रुपये प्रति किलो/);
  });

  it("should spell verification code digit-by-digit for accessibility in English and Hindi", () => {
    const enCode = getVerificationCodeSpeech("4290", "EN");
    assert.match(enCode, /4 2 9 0/);
    assert.match(enCode, /verification code/);

    const hiCode = getVerificationCodeSpeech("4290", "HI");
    assert.match(hiCode, /4 2 9 0/);
    assert.match(hiCode, /सत्यापन कोड/);
  });

  it("should provide English and Hindi UI translations", () => {
    assert.equal(getTranslation("nav.home", "EN"), "Home");
    assert.equal(getTranslation("nav.home", "HI"), "होम");

    assert.equal(getTranslation("prices.title", "EN"), "Daily Scrap Rates");
    assert.equal(getTranslation("prices.title", "HI"), "आज के ई-कचरा भाव");

    assert.equal(getTranslation("safety.title", "EN"), "Safety & Health Rules");
    assert.equal(getTranslation("safety.title", "HI"), "सुरक्षा नियम");
  });
});
