/**
 * Vernacular Distance-to-Words Audio Helper for Hindi, Marathi, and English.
 * Aligned with GEO G10.3 / C6 specifications for speech readouts.
 */

export type VoiceLanguage = "HI" | "MR" | "EN";

const HINDI_UNITS: Record<number, string> = {
  0: "शून्य",
  1: "एक",
  2: "दो",
  3: "तीन",
  4: "चार",
  5: "पाँच",
  6: "छह",
  7: "सात",
  8: "आठ",
  9: "नौ",
  10: "दस",
  11: "ग्यारह",
  12: "बारह",
  13: "तेरह",
  14: "चौदह",
  15: "पंद्रह",
  16: "सोलह",
  17: "सत्रह",
  18: "अठारह",
  19: "उन्नीस",
  20: "बीस",
  25: "पच्चीस",
  30: "तीस",
  40: "चालीस",
  50: "पचास",
};

const MARATHI_UNITS: Record<number, string> = {
  0: "शून्य",
  1: "एक",
  2: "दोन",
  3: "तीन",
  4: "चार",
  5: "पाच",
  6: "सहा",
  7: "सात",
  8: "आठ",
  9: "नऊ",
  10: "दहा",
  11: "अकरा",
  12: "बारा",
  13: "तेरा",
  14: "चौदा",
  15: "पंधरा",
  16: "सोळा",
  17: "सतरा",
  18: "अठरा",
  19: "एकोणीस",
  20: "वीस",
  25: "पंचवीस",
  30: "तीस",
  40: "चाळीस",
  50: "पन्नास",
};

const MARATHI_HUNDREDS: Record<number, string> = {
  100: "शंभर",
  200: "दोनशे",
  300: "तीनशे",
  400: "चारशे",
  500: "पाचशे",
  600: "सहाशे",
  700: "सातशे",
  800: "आठशे",
  900: "नऊशे",
};

/**
 * Converts a distance in kilometers to vernacular spoken speech text.
 * Handles sub-kilometer meters, colloquial fractional distances (1.5, 2.5, 3.5),
 * and whole numbers.
 *
 * @param distanceKm Distance in kilometers (e.g. 0.5, 1.5, 2.0, 8.0)
 * @param lang AppLanguage: "HI" | "MR" | "EN"
 */
export function formatDistanceForVoice(distanceKm: number, lang: VoiceLanguage = "HI"): string {
  if (distanceKm <= 0) {
    if (lang === "HI") return "शून्य मीटर";
    if (lang === "MR") return "शून्य मीटर";
    return "0 meters";
  }

  // Under 1 km: express in meters
  if (distanceKm < 0.95) {
    const meters = Math.round((distanceKm * 1000) / 50) * 50; // round to nearest 50m
    if (meters === 0) {
      if (lang === "HI") return "लगभग पचास मीटर";
      if (lang === "MR") return "सुमारे पन्नास मीटर";
      return "about 50 meters";
    }

    if (lang === "EN") {
      return `${meters} meters`;
    }

    if (lang === "HI") {
      if (meters === 500) return "पाँच सौ मीटर";
      if (meters % 100 === 0) {
        const hundreds = meters / 100;
        const hText = HINDI_UNITS[hundreds] || hundreds.toString();
        return `${hText} सौ मीटर`;
      }
      return `${meters} मीटर`;
    }

    if (lang === "MR") {
      if (MARATHI_HUNDREDS[meters]) {
        return `${MARATHI_HUNDREDS[meters]} मीटर`;
      }
      if (meters % 100 === 0) {
        const hundreds = meters / 100;
        const hText = MARATHI_UNITS[hundreds] || hundreds.toString();
        return `${hText}शे मीटर`;
      }
      return `${meters} मीटर`;
    }
  }

  // Check common Indian fractions (1.5, 2.5, 3.5, 4.5, 5.5, etc.)
  const roundedKm = Math.round(distanceKm * 10) / 10;
  const isPointFive = Math.abs(roundedKm - Math.floor(roundedKm) - 0.5) < 0.05;

  if (isPointFive) {
    const whole = Math.floor(roundedKm);
    if (whole === 1) {
      if (lang === "HI") return "डेढ़ किलोमीटर";
      if (lang === "MR") return "दीड किलोमीटर";
      return "1.5 kilometers";
    }
    if (whole === 2) {
      if (lang === "HI") return "ढाई किलोमीटर";
      if (lang === "MR") return "अडीच किलोमीटर";
      return "2.5 kilometers";
    }
    if (whole >= 3) {
      if (lang === "HI") {
        const wText = HINDI_UNITS[whole] || whole.toString();
        return `साढ़े ${wText} किलोमीटर`;
      }
      if (lang === "MR") {
        const wText = MARATHI_UNITS[whole] || whole.toString();
        return `साडे${wText} किलोमीटर`;
      }
      return `${roundedKm} kilometers`;
    }
  }

  // Exact or near-whole numbers
  const wholeKm = Math.round(roundedKm);
  if (Math.abs(roundedKm - wholeKm) < 0.1) {
    if (lang === "EN") {
      return wholeKm === 1 ? "1 kilometer" : `${wholeKm} kilometers`;
    }
    if (lang === "HI") {
      const wText = HINDI_UNITS[wholeKm] || wholeKm.toString();
      return `${wText} किलोमीटर`;
    }
    if (lang === "MR") {
      const wText = MARATHI_UNITS[wholeKm] || wholeKm.toString();
      return `${wText} किलोमीटर`;
    }
  }

  // Other decimals (e.g. 4.2 km)
  if (lang === "HI") {
    return `${roundedKm} किलोमीटर`;
  }
  if (lang === "MR") {
    return `${roundedKm} किलोमीटर`;
  }
  return `${roundedKm} kilometers`;
}

