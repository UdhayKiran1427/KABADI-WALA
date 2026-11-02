/**
 * Notifications are stored in English. This turns the known flow messages into Hindi and Marathi
 * when they are shown, so old notifications switch language too. Unknown text stays English.
 */

export type NotificationTxt = { en: string; hi: string; mr: string };

type Rule = { re: RegExp; hi: string; mr: string };

// `$1`, `$2`… are the regex groups (lot refs, amounts, names), copied as they are.
const TITLES: Rule[] = [
  { re: /^New lot ([\d.]+) km away$/, hi: "नया लॉट $1 km दूर", mr: "नवीन लॉट $1 km दूर" },
  { re: /^Collector selected you!$/, hi: "कलेक्टर ने आपको चुना!", mr: "कलेक्टरने तुम्हाला निवडले!" },
  { re: /^Lot sold to another recycler$/, hi: "लॉट दूसरे रीसाइक्लर को बिक गया", mr: "लॉट दुसऱ्या रीसायकलरला विकला गेला" },
  { re: /^Payment successful$/, hi: "पेमेंट सफल", mr: "पेमेंट यशस्वी" },
  { re: /^Payment received$/, hi: "पैसे मिल गए", mr: "पैसे मिळाले" },
  { re: /^(.+) wants to buy$/, hi: "$1 खरीदना चाहते हैं", mr: "$1 खरेदी करू इच्छितात" },
  { re: /^Vehicle on the way$/, hi: "गाड़ी आ रही है", mr: "गाडी येत आहे" },
  { re: /^Vehicle cancelled$/, hi: "गाड़ी वापस बुलाई गई", mr: "गाडी परत बोलावली" },
  { re: /^Pickup complete$/, hi: "पिकअप पूरा", mr: "पिकअप पूर्ण" },
  { re: /^Dispute resolved: lot confirmed$/, hi: "विवाद सुलझा: लॉट पक्का", mr: "वाद मिटला: लॉट निश्चित" },
  { re: /^Dispute resolved: lot cancelled$/, hi: "विवाद सुलझा: लॉट रद्द", mr: "वाद मिटला: लॉट रद्द" },
];

const BODIES: Rule[] = [
  {
    re: /^(.+) · Collector asks (₹?[\d,.]+) \(today's rate (₹?[\d,.]+)\) · Area: (.*)\. Tap "Ready to buy" on your dashboard\.$/,
    hi: '$1 · कलेक्टर का भाव $2 (आज के भाव से $3) · इलाका: $4। डैशबोर्ड पर "खरीदने को तैयार" दबाएं।',
    mr: '$1 · कलेक्टरचा भाव $2 (आजच्या भावाने $3) · परिसर: $4. डॅशबोर्डवर "खरेदीस तयार" दाबा.',
  },
  {
    re: /^(.+) = (₹?[\d,.]+) · Area: (.*)\. Tap "Ready to buy" on your dashboard\.$/,
    hi: '$1 = $2 · इलाका: $3। डैशबोर्ड पर "खरीदने को तैयार" दबाएं।',
    mr: '$1 = $2 · परिसर: $3. डॅशबोर्डवर "खरेदीस तयार" दाबा.',
  },
  {
    re: /^Lot (\S+): (.+) for (₹?[\d,.]+)\. Collector: (.+), Phone (\S+)\. Open the deal to pay\.$/,
    hi: "लॉट $1: $2, $3 में। कलेक्टर: $4, फ़ोन $5। पेमेंट के लिए डील खोलें।",
    mr: "लॉट $1: $2, $3 ला. कलेक्टर: $4, फोन $5. पेमेंटसाठी डील उघडा.",
  },
  {
    re: /^Lot (\S+) \((.+)\) is no longer available\.$/,
    hi: "लॉट $1 ($2) अब उपलब्ध नहीं है।",
    mr: "लॉट $1 ($2) आता उपलब्ध नाही.",
  },
  { re: /^(₹?[\d,.]+) for (.+) \(Lot (\S+)\)\.$/, hi: "$1 — $2 (लॉट $3)।", mr: "$1 — $2 (लॉट $3)." },
  {
    re: /^Lot (\S+): (₹?[\d,.]+) · ([\d.]+) km away\. Open the lot to choose a buyer\.$/,
    hi: "लॉट $1: $2 · $3 km दूर। खरीदार चुनने के लिए लॉट खोलें।",
    mr: "लॉट $1: $2 · $3 km दूर. खरेदीदार निवडण्यासाठी लॉट उघडा.",
  },
  {
    re: /^(.+) \((.+)\) is coming to pick up lot (\S+)\. Give the driver the pickup code shown on the lot page\.$/,
    hi: "$1 ($2) लॉट $3 उठाने आ रही है। लॉट पेज पर दिखा पिकअप कोड ड्राइवर को बताएं।",
    mr: "$1 ($2) लॉट $3 उचलायला येत आहे. लॉट पेजवरील पिकअप कोड ड्रायव्हरला सांगा.",
  },
  {
    re: /^The vehicle for lot (\S+) was called back\. The buyer will send another one\.$/,
    hi: "लॉट $1 की गाड़ी वापस बुला ली गई। खरीदार दूसरी गाड़ी भेजेगा।",
    mr: "लॉट $1 ची गाडी परत बोलावली. खरेदीदार दुसरी गाडी पाठवेल.",
  },
  {
    re: /^Lot (\S+) was picked up by (.+) \((.+)\)\.$/,
    hi: "लॉट $1 का माल $2 ($3) ने उठा लिया।",
    mr: "लॉट $1 चा माल $2 ($3) ने उचलला.",
  },
];

function translate(text: string, rules: Rule[]): NotificationTxt {
  for (const rule of rules) {
    if (rule.re.test(text)) {
      return { en: text, hi: text.replace(rule.re, rule.hi), mr: text.replace(rule.re, rule.mr) };
    }
  }
  return { en: text, hi: text, mr: text };
}

export type MaterialName = { nameEn: string; nameHi: string; nameMr?: string | null };

/** Swaps English material names (e.g. "Wires & Copper Cables") for the Hindi/Marathi ones. */
function withMaterialNames(txt: NotificationTxt, materials: MaterialName[]): NotificationTxt {
  const sorted = [...materials].sort((a, b) => b.nameEn.length - a.nameEn.length);
  let { hi, mr } = txt;
  for (const m of sorted) {
    if (!m.nameEn) continue;
    hi = hi.split(m.nameEn).join(m.nameHi || m.nameEn);
    mr = mr.split(m.nameEn).join(m.nameMr || m.nameHi || m.nameEn);
  }
  return { en: txt.en, hi, mr };
}

export function notificationText(
  title: string,
  body: string,
  materials: MaterialName[] = []
): { title: NotificationTxt; body: NotificationTxt } {
  return { title: translate(title, TITLES), body: withMaterialNames(translate(body, BODIES), materials) };
}
