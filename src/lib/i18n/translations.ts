// UI Translations for English & Hindi Text Language Option

export type SupportedLanguage = "EN" | "HI" | "MR";

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    hi: string;
    mr?: string;
  };
}

export const UI_TRANSLATIONS: TranslationDictionary = {
  // Navigation
  "nav.brand": {
    en: "KABADI WALA",
    hi: "कबाड़ीवाला",
    mr: "कबाडीवाला",
  },
  "nav.home": {
    en: "Home",
    hi: "होम",
    mr: "होम",
  },
  "nav.createLot": {
    en: "+ Create Lot",
    hi: "+ नया लॉट बनाएं",
    mr: "+ नवीन लॉट",
  },
  "nav.prices": {
    en: "Today's Rates",
    hi: "आज के भाव",
    mr: "आजचे भाव",
  },
  "nav.ledger": {
    en: "My Earnings",
    hi: "मेरी कमाई",
    mr: "माझी कमाई",
  },
  "nav.dropPoints": {
    en: "Drop Points",
    hi: "ड्रॉप बॉक्स",
    mr: "ड्रॉप पॉईंट्स",
  },
  "nav.safety": {
    en: "Safety Rules",
    hi: "सुरक्षा नियम",
    mr: "सुरक्षा नियम",
  },
  "nav.logout": {
    en: "Sign Out",
    hi: "लॉगआउट",
    mr: "लॉगआउट",
  },
  "nav.login": {
    en: "Sign In",
    hi: "साइन इन",
    mr: "साइन इन",
  },

  // Language switcher labels
  "lang.textLanguage": {
    en: "Language",
    hi: "भाषा",
    mr: "भाषा",
  },
  "lang.english": {
    en: "English",
    hi: "English",
    mr: "English",
  },
  "lang.hindi": {
    en: "हिन्दी",
    hi: "हिन्दी",
    mr: "हिन्दी",
  },
  "lang.marathi": {
    en: "मराठी",
    hi: "मराठी",
    mr: "मराठी",
  },

  // Common Actions
  "btn.continue": {
    en: "Continue →",
    hi: "आगे बढ़ें →",
    mr: "पुढे जा →",
  },
  "btn.save": {
    en: "Save",
    hi: "सुरक्षित करें",
    mr: "सेव्ह करा",
  },
  "btn.findRecycler": {
    en: "Find Recycler →",
    hi: "रिसाइक्लर खोजें →",
    mr: "रिसायकलर शोधा →",
  },
  "btn.hearAudio": {
    en: "Listen Audio",
    hi: "आवाज़ में सुनें",
    mr: "आवाजात ऐका",
  },
  "btn.stopAudio": {
    en: "Stop Audio",
    hi: "आवाज़ बंद करें",
    mr: "आवाज बंद करा",
  },

  // Collector Home
  "collector.welcome": {
    en: "Welcome",
    hi: "नमस्ते",
    mr: "नमस्कार",
  },
  "collector.activeLots": {
    en: "Active Scrap Lots",
    hi: "सक्रिय लॉट",
    mr: "सक्रिय लॉट",
  },
  "collector.payoutMethod": {
    en: "Instant Payout",
    hi: "भुगतान विधि",
    mr: "पैसे मिळण्याची पद्धत",
  },
  "collector.cashUpi": {
    en: "💵 Cash / UPI",
    hi: "💵 नकद / UPI",
    mr: "💵 रोख / UPI",
  },

  // Price Board
  "prices.title": {
    en: "Daily Scrap Rates",
    hi: "आज के ई-कचरा भाव",
    mr: "आजचे ई-कचरा दर",
  },
  "prices.subtitle": {
    en: "Mumbai Scrap Market & Authorized Recycler Spot Prices",
    hi: "मुम्बई स्क्रैप मार्केट एवं अधिकृत रिसाइक्लर स्पॉट रेट",
    mr: "मुंबई स्क्रॅप मार्केट आणि अधिकृत रिसायकलर थेट दर",
  },
  "prices.tapHint": {
    en: "🔊 Tap any row to hear today's market rate",
    hi: "🔊 किसी भी पंक्ति पर टैप करके आज का भाव सुनें",
    mr: "🔊 आजचा दर ऐकण्यासाठी कोणत्याही ओळीवर टॅप करा",
  },
  "prices.marketRange": {
    en: "Market Band",
    hi: "बाजार सीमा",
    mr: "बाजार मर्यादा",
  },

  // Safety
  "safety.title": {
    en: "Safety & Health Rules",
    hi: "सुरक्षा नियम",
    mr: "सुरक्षा नियम",
  },
  "safety.warning": {
    en: "Warning: Informally burning or acid-leaching e-waste causes permanent damage to lungs, eyes, and groundwater.",
    hi: "चेतावनी: ई-कचरे को अनौपचारिक रूप से जलाने या तोड़ने से फेफड़ों और आंखों को स्थायी नुकसान हो सकता है।",
    mr: "धोका: ई-कचरा जाळल्याने किंवा तोडल्याने फुफ्फुसे आणि डोळ्यांना कायमचे नुकसान होऊ शकते.",
  },

  // Handover / Verification
  "handover.title": {
    en: "Handover Verification",
    hi: "हैंडओवर सत्यापन",
    mr: "हँडओव्हर पडताळणी",
  },
  "handover.tellCode": {
    en: "Tell this 4-digit code to scale operator",
    hi: "तौल ऑपरेटर को यह 4-अंकों का कोड बताएं",
    mr: "तौल ऑपरेटरला हा 4-अंकी कोड सांगा",
  },
  "handover.hearCode": {
    en: "Hear Code Aloud",
    hi: "कोड बोलकर सुनें",
    mr: "कोड ऐका",
  },

  // Field Agent
  "field.onboard": {
    en: "Onboard Informal Collector",
    hi: "कलेक्टर ऑनबोर्डिंग",
    mr: "कलेक्टर नोंदणी",
  },
  "field.prices": {
    en: "Log Scrap Market Price",
    hi: "बाजार भाव दर्ज करें",
    mr: "बाजार दर नोंदवा",
  },
  "field.training": {
    en: "AI Dataset Training Photos",
    hi: "एआई प्रशिक्षण फोटो",
    mr: "एआय ट्रेनिंग फोटो",
  },
  "field.pickups": {
    en: "Doorstep Pickups & Cash Handover",
    hi: "घर से उठाव व नकद भुगतान",
    mr: "घरोघरी पिकअप आणि रोख वाटप",
  },
};

export function getTranslation(
  key: string,
  lang: SupportedLanguage = "HI"
): string {
  const entry = UI_TRANSLATIONS[key];
  if (!entry) return key;
  if (lang === "EN") return entry.en;
  if (lang === "MR") return entry.mr || entry.hi;
  return entry.hi;
}

