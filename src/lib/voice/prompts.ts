// Trilingual Audio Narration Scripts for KabadiWala Platform
// Supports English, Hindi, and Marathi aligned with UI wireframes for all user roles

import { type AppLanguage } from "./speech";

export interface ScreenVoicePrompt {
  hi: string;
  mr: string;
  en: string;
  shortLabelHi: string;
  shortLabelMr: string;
  shortLabelEn: string;
}

export const SCREEN_PROMPTS: Record<string, ScreenVoicePrompt> = {
  // C1: Language Select
  C1_LANGUAGE: {
    hi: "कबाड़ीवाला पोर्टल में आपका स्वागत है। अपनी भाषा चुनें। हिंदी या मराठी में आवाज सुनने के लिए स्पीकर बटन दबाएं।",
    mr: "कबाडीवाला पोर्टलवर आपले स्वागत आहे. आपली भाषा निवडा. हिंदी किंवा मराठीत आवाज ऐकण्यासाठी स्पीकर बटण दाबा.",
    en: "Welcome to KabadiWala Portal. Select your language. Press the speaker button to hear audio in English, Hindi, or Marathi.",
    shortLabelHi: "भाषा चुनें",
    shortLabelMr: "भाषा निवडा",
    shortLabelEn: "Select Language",
  },

  // C2: Sign In
  C2_SIGNIN: {
    hi: "साइन इन करें। अपना दस अंकों का मोबाइल नंबर और चार अंकों का सुरक्षा पिन दर्ज करें। आगे बढ़ने के लिए हरा बटन दबाएं।",
    mr: "साइन इन करा. आपला दहा अंकी मोबाईल नंबर आणि चार अंकी सुरक्षा पिन टाका. पुढे जाण्यासाठी हिरवे बटण दाबा.",
    en: "Sign in. Enter your ten-digit mobile number and four-digit security PIN. Press the green button to continue.",
    shortLabelHi: "साइन इन सहायता",
    shortLabelMr: "साइन इन मदत",
    shortLabelEn: "Sign In Help",
  },

  // C3: Home Dashboard
  C3_HOME: {
    hi: "नमस्कार! कबाड़ीवाला ई-कचरा पोर्टल में आपका स्वागत है। नया लॉट बनाएं, आज के भाव देखें, अपनी कुल कमाई जांचें, या सुरक्षा नियम देखें।",
    mr: "नमस्कार! कबाडीवाला ई-कचरा पोर्टलवर आपले स्वागत आहे. नवीन लॉट तयार करा, आजचे भाव पहा, आपली कमाई तपासा, किंवा सुरक्षा नियम पहा.",
    en: "Welcome to KabadiWala E-Waste Portal! Create a new lot, check today's prices, view your total earnings, or review safety rules.",
    shortLabelHi: "होम डैशबोर्ड",
    shortLabelMr: "होम डॅशबोर्ड",
    shortLabelEn: "Home Dashboard",
  },

  // C4: Create Lot
  C4_CREATE_LOT: {
    hi: "नया लॉट बनाएं। कचरे का प्रकार चुनें, जैसे सर्किट बोर्ड, तार या बैटरी। वजन सेट करें और तुरंत अंदाजे कमाई देखें। फिर रिसायकलर खोजें।",
    mr: "नवीन लॉट तयार करा. कचऱ्याचा प्रकार निवडा, जसे सर्किट बोर्ड, केबल किंवा बॅटरी. वजन सेट करा आणि अंदाजे किंमत पहा. नंतर रिसायकलर शोधा.",
    en: "Create a new scrap lot. Select waste category like circuit boards, cables, or batteries. Set weight to see estimated payout instantly, then match a recycler.",
    shortLabelHi: "लॉट निर्माण",
    shortLabelMr: "लॉट तयार करा",
    shortLabelEn: "Create Lot",
  },

  // C5: AI Result & Estimate
  C5_AI_ESTIMATE: {
    hi: "लॉट जांच। एआई द्वारा सुझाई गई श्रेणी और अनुमानित कीमत की सीमा देखें। सही होने पर लॉट सुरक्षित करें।",
    mr: "लॉट तपासणी. एआय ने सुचवलेली वर्गवारी आणि अंदाजे किंमत तपासा. योग्य असल्यास लॉट सेव्ह करा.",
    en: "Lot estimate. Check the category suggested by AI and the estimated price band. Save the lot once verified.",
    shortLabelHi: "एआई जांच",
    shortLabelMr: "एआय तपासणी",
    shortLabelEn: "AI Verification",
  },

  // C6: Price Board
  C6_PRICE_BOARD: {
    hi: "आज का भाव। मुम्बई स्क्रैप मार्केट और अधिकृत रिसायकलर के ताज़ा दर। किसी भी श्रेणी पर टैप करके भाव सुनें।",
    mr: "आजचे बाजार भाव. स्क्रॅप मार्केट आणि अधिकृत रिसायकलर्सचे थेट दर. भाव ऐकण्यासाठी कोणत्याही ओळीवर टॅप करा.",
    en: "Today's market prices. Live rates from scrap markets and authorized recyclers. Tap any row to hear current rates.",
    shortLabelHi: "आज का भाव",
    shortLabelMr: "आजचे भाव",
    shortLabelEn: "Today's Prices",
  },

  // C7: Recycler Match
  C7_RECYCLER_MATCH: {
    hi: "पास के अधिकृत रिसायकलर। दूरी, सबसे अच्छी कीमत और पिकअप सुविधा देखकर अपने मनपसंद रिसायकलर को चुनें।",
    mr: "जवळील अधिकृत रिसायकलर्स. अंतर, सर्वोत्तम दर आणि पिकअप सुविधा पाहून रिसायकलर निवडा.",
    en: "Nearby verified recyclers. Compare distance, highest rates, and pickup service to select your preferred recycler.",
    shortLabelHi: "रिसायकलर मैच",
    shortLabelMr: "रिसायकलर निवड",
    shortLabelEn: "Recycler Match",
  },

  // C8: Handover Record
  C8_HANDOVER: {
    hi: "हैंडओवर रिकॉर्ड। रिसायकलर या फील्ड एजेंट को अपना चार अंकों का सत्यापन कोड बताएं या क्यूआर कोड दिखाएं। वजन जांच के बाद तुरंत भुगतान मिलेगा।",
    mr: "हँडओव्हर रेकॉर्ड. रिसायकलर किंवा एजंटला चार अंकी पडताळणी कोड सांगा किंवा क्यूआर कोड दाखवा. वजन झाल्यावर लगेच पैसे मिळतील.",
    en: "Handover record. Share your four-digit verification code or show the QR code to the recycler. Payment is disbursed immediately after digital scale verification.",
    shortLabelHi: "हैंडओवर कोड",
    shortLabelMr: "हँडओव्हर कोड",
    shortLabelEn: "Handover Code",
  },

  // C9: Payment
  C9_PAYMENT: {
    hi: "भुगतान रसीद। अपनी कुल राशि नकद या यूपीआई द्वारा प्राप्त करें। पैसे मिलने के बाद 'पैसे मिल गए' बटन दबाएं।",
    mr: "पेमेंट पावती. रोख किंवा यूपीआय द्वारे पूर्ण रक्कम मिळवा. पैसे मिळाल्यावर 'पैसे मिळाले' बटण दाबा.",
    en: "Payment receipt. Receive full settlement via cash or UPI. Tap 'Payment Received' once verified.",
    shortLabelHi: "भुगतान पुष्टि",
    shortLabelMr: "पेमेंट खात्री",
    shortLabelEn: "Confirm Payment",
  },

  // C10: Earnings Ledger
  C10_LEDGER: {
    hi: "मेरी कमाई। कुल प्राप्त राशि, नकद और यूपीआई भुगतान, तथा लंबित भुगतान का पूरा हिसाब यहाँ देखें।",
    mr: "माझी कमाई. मिळालेली रोख रक्कम, यूपीआय पेमेंट आणि बाकी पैशांचा संपूर्ण हिशोब येथे पहा.",
    en: "My earnings ledger. View all received payments, cash and UPI settlements, and pending amounts here.",
    shortLabelHi: "कमाई बहीखाता",
    shortLabelMr: "कमाई हिशोब",
    shortLabelEn: "Earnings Ledger",
  },

  // C11: Safety Rules Main
  C11_SAFETY: {
    hi: "सुरक्षा नियम। ई-कचरे का काम करते समय अपने स्वास्थ्य का ध्यान रखें। तार न जलाएं, एसिड का उपयोग न करें, बैटरी न खोलें और स्क्रीन न तोड़ें।",
    mr: "सुरक्षा नियम. ई-कचरा हाताळताना आरोग्याची काळजी घ्या. वायर जाळू नका, अ‍ॅसिड वापरू नका, बॅटरी फोडू नका आणि स्क्रीन तोडू नका.",
    en: "Safety rules. Protect your health while processing e-waste. Do not burn cables, do not use acid, do not dismantle batteries, and do not smash screens.",
    shortLabelHi: "सुरक्षा नियम",
    shortLabelMr: "सुरक्षा नियम",
    shortLabelEn: "Safety Guidelines",
  },

  // C12: My Lots / Drop Points
  C12_MY_LOTS: {
    hi: "मेरे लॉट और पिकअप स्थिति। आपके सभी बनाए गए लॉट, सत्यापन स्थिति और नजदीकी ड्रॉप बॉक्स की जानकारी।",
    mr: "माझे लॉट आणि पिकअप स्थिती. तुमचे सर्व लॉट, पडताळणी आणि ड्रॉप बॉक्सची माहिती.",
    en: "My lots and drop points. Check the status of your created scrap lots, verification progress, and nearby drop-off bins.",
    shortLabelHi: "मेरे लॉट",
    shortLabelMr: "माझे लॉट",
    shortLabelEn: "My Lots",
  },

  // F1: Onboard Collector
  F1_ONBOARD: {
    hi: "नया कलेक्टर प्रोफाइल। कलेक्टर की सहमति से उनका मोबाइल नंबर, भाषा और कार्य क्षेत्र दर्ज करके खाता बनाएं।",
    mr: "नवीन कलेक्टर नोंदणी. संमतीने मोबाईल नंबर, भाषा आणि परिसर निवडून खाते तयार करा.",
    en: "Collector onboarding. Register informal waste collectors with consent using their mobile number, language preference, and operating area.",
    shortLabelHi: "कलेक्टर प्रोफाइल",
    shortLabelMr: "कलेक्टर नोंदणी",
    shortLabelEn: "Onboard Collector",
  },

  // F2: Log Market Price
  F2_LOG_PRICE: {
    hi: "बाजार भाव दर्ज करें। सामग्री श्रेणी चुनें, आज का भाव और डीलर का प्रकार दर्ज करें। जीपीएस और समय स्वतः दर्ज होगा।",
    mr: "बाजार भाव नोंदवा. स्क्रॅप वर्गवारी, आजचा दर आणि डीलरचा प्रकार निवडा. जीपीएस आपोआप नोंदवले जाईल.",
    en: "Log scrap spot price. Select material category, today's buying rate, and buyer type. GPS coordinates and timestamp are captured automatically.",
    shortLabelHi: "भाव दर्ज करें",
    shortLabelMr: "दर नोंदवा",
    shortLabelEn: "Log Spot Price",
  },

  // F3: Training Photos
  F3_TRAINING_PHOTOS: {
    hi: "एआई प्रशिक्षण फोटो। कचरे की साफ फोटो लें, श्रेणी चुनें और कोण दर्ज करें। आज के फोटो सुरक्षित करें।",
    mr: "एआय ट्रेनिंग फोटो. स्क्रॅपचा स्पष्ट फोटो काढा, वर्गवारी निवडा आणि सेव्ह करा.",
    en: "AI training dataset photos. Take clear photographs of e-waste, classify the category, and upload to the central training pipeline.",
    shortLabelHi: "प्रशिक्षण फोटो",
    shortLabelMr: "ट्रेनिंग फोटो",
    shortLabelEn: "Training Photos",
  },

  // F4: Doorstep Pickups
  F4_PICKUPS: {
    hi: "डोरस्टेप पिकअप और नकद भुगतान। डिजिटल कांटे से सटीक वजन तोलें, नकद भुगतान करें और डिजिटल रसीद बनाएं।",
    mr: "घरोघरी पिकअप आणि रोख वाटप. अचूक वजन करा, रोख रक्कम द्या आणि डिजिटल पावती तयार करा.",
    en: "Doorstep pickup and cash settlement. Verify exact weight with digital scale, disburse cash payout, and generate digital receipt.",
    shortLabelHi: "डोरस्टेप पिकअप",
    shortLabelMr: "घरोघरी पिकअप",
    shortLabelEn: "Doorstep Pickups",
  },
};

// 4 Specific Hazard Audio Scripts for C11 Safety Guide
export const HAZARD_AUDIO_SCRIPTS: Record<
  string,
  { hi: string; mr: string; en: string; titleHi: string; titleMr: string; titleEn: string }
> = {
  HAZ_CABLE: {
    titleHi: "तार न जलाएं",
    titleMr: "केबल किंवा वायर जाळू नका",
    titleEn: "Do Not Burn Cables",
    hi: "तार कभी न जलाएं! तार जलाने से जहरीला धुआं और कैंसर पैदा करने वाली गैसें निकलती हैं जो फेफड़ों को खराब करती हैं। बिना जली केबल बेचने पर बाजार में अधिक कीमत मिलती है।",
    mr: "वायर कधीही जाळू नका! वायर जाळल्याने अत्यंत विषारी वायू आणि धूर पसरतो ज्यामुळे फुफ्फुसांचे आजार होतात. न जाळलेली वायर विकल्यास बाजारात जास्त भाव मिळतो.",
    en: "Never burn cables! Burning copper cables releases toxic carcinogenic dioxins and poisonous smoke that damage lungs. Unburnt cables command higher prices from verified recyclers.",
  },
  HAZ_ACID: {
    titleHi: "एसिड से बोर्ड न धोएं",
    titleMr: "अ‍ॅसिडने बोर्ड धुवू नका",
    titleEn: "No Acid Leaching",
    hi: "एसिड से बोर्ड कभी न धोएं! एसिड त्वचा और आंखों को जला देता है, जहरीली सायनाइड गैस बनाता है और पीने के भूजल को हमेशा के लिए बर्बाद कर देता है।",
    mr: "अ‍ॅसिडने बोर्ड धुवू नका! अ‍ॅसिडमुळे त्वचा आणि डोळे भाजतात, विषारी सायनाइड वायू तयार होतो आणि पिण्याचे पाणी कायमचे दूषित होते.",
    en: "Never wash circuit boards with acid! Acid causes permanent chemical burns, generates lethal cyanide fumes, and irreversibly poisons local groundwater.",
  },
  HAZ_BATTERY: {
    titleHi: "बैटरी न खोलें",
    titleMr: "बॅटरी कधीही फोडू नका",
    titleEn: "Do Not Puncture Batteries",
    hi: "बैटरी कभी न खोलें और न तोड़ें! लिथियम या लेड एसिड बैटरी को चोट लगने से अचानक भीषण आग और जोरदार रासायनिक विस्फोट होता है।",
    mr: "बॅटरी कधीही फोडू किंवा उघडू नका! लिथियम किंवा लेड बॅटरीला धक्का लागल्यास अचानक भयानक आग आणि मोठा रासायनिक स्फोट होतो.",
    en: "Never puncture or crush batteries! Damaging lithium or lead-acid cells triggers thermal runaway, explosive fires, and corrosive chemical splatters.",
  },
  HAZ_CRT: {
    titleHi: "सीआरटी स्क्रीन न तोड़ें",
    titleMr: "सीआरटी स्क्रीन तोडू नका",
    titleEn: "Do Not Smash CRT Monitors",
    hi: "सीआरटी स्क्रीन कभी न तोड़ें! स्क्रीन का शीशा टूटने से जहरीला सीसा और फॉस्फोर पाउडर हवा में उड़ता है जो फेफड़ों और आंखों को स्थायी नुकसान पहुंचाता है।",
    mr: "सीआरटी स्क्रीन कधीही तोडू नका! काच फुटल्यास विषारी शिसे आणि पावडर हवेत पसरते, ज्यामुळे डोळे आणि फुफ्फुसांना कायमचा धोका होतो.",
    en: "Never smash CRT monitors! Breaking cathode ray tubes causes glass implosions and disperses poisonous lead and phosphor dust into eyes and lungs.",
  },
};

// Material price speech generator for C6 Price Board: "Tap a row to hear the price"
export function getMaterialPriceSpeech(
  materialNameHi: string,
  materialNameMr: string,
  rateRupees: number | string,
  lang: AppLanguage = "HI",
  materialNameEn: string = ""
): string {
  if (lang === "EN") {
    return `${materialNameEn || materialNameHi}: ₹${rateRupees} per kilogram.`;
  }
  if (lang === "MR") {
    return `${materialNameMr}: ${rateRupees} रुपये प्रति किलो.`;
  }
  return `${materialNameHi}: ${rateRupees} रुपये प्रति किलो।`;
}

// Speaks out 4-digit verification code digit by digit for low-literacy collectors
export function getVerificationCodeSpeech(
  code: string,
  lang: AppLanguage = "HI"
): string {
  const digits = code.split("").join(" ");
  if (lang === "EN") {
    return `Handover code. Your four digit verification code is: ${digits}. Tell this code to the recycler.`;
  }
  if (lang === "MR") {
    return `हँडओव्हर कोड. तुमचा चार अंकी पडताळणी कोड आहे: ${digits}. रिसायकलरला हा कोड सांगा.`;
  }
  return `हैंडओवर कोड। आपका चार अंकों का सत्यापन कोड है: ${digits}। रिसायकलर को यह कोड बताएं।`;
}

// Speaks estimated earnings for C4 / C5
export function getEstimateSpeech(
  weightKg: number | string,
  categoryName: string,
  rupees: number | string,
  lang: AppLanguage = "HI"
): string {
  if (lang === "EN") {
    return `${weightKg} kilograms of ${categoryName}. Estimated value ₹${rupees}.`;
  }
  if (lang === "MR") {
    return `${weightKg} किलो ${categoryName}. अंदाजे किंमत ${rupees} रुपये.`;
  }
  return `${weightKg} किलो ${categoryName}। अंदाजे कमाई ${rupees} रुपये।`;
}
