import test from "node:test";
import assert from "node:assert/strict";
import { notificationText } from "../../src/lib/i18n/notificationText";

test("new-lot notification is translated, with material names swapped", () => {
  const t = notificationText(
    "New lot 0.0 km away",
    'CRT Monitors / Glass 10.0 kg + Wires & Copper Cables 5.0 kg = ₹1450 · Area: Pune / Pimpri. Tap "Ready to buy" on your dashboard.',
    [
      { nameEn: "Wires & Copper Cables", nameHi: "तार और तांबे के केबल", nameMr: "तारा व तांब्याच्या केबल" },
      { nameEn: "CRT Monitors / Glass", nameHi: "CRT मॉनिटर / कांच", nameMr: null },
    ]
  );
  assert.equal(t.title.hi, "नया लॉट 0.0 km दूर");
  assert.equal(
    t.body.hi,
    'CRT मॉनिटर / कांच 10.0 kg + तार और तांबे के केबल 5.0 kg = ₹1450 · इलाका: Pune / Pimpri। डैशबोर्ड पर "खरीदने को तैयार" दबाएं।'
  );
  assert.ok(t.body.mr.startsWith("CRT मॉनिटर / कांच 10.0 kg + तारा व तांब्याच्या केबल"));
  assert.equal(t.body.en.endsWith("on your dashboard."), true);
});

test("pickup-complete notification", () => {
  const t = notificationText("Pickup complete", "Lot LOT-HVFS-261102-0002 was picked up by ramu kakaka (GJ05TH7767).");
  assert.equal(t.title.mr, "पिकअप पूर्ण");
  assert.equal(t.body.hi, "लॉट LOT-HVFS-261102-0002 का माल ramu kakaka (GJ05TH7767) ने उठा लिया।");
});

test("unknown text stays as it is", () => {
  const t = notificationText("Something new", "Free text.");
  assert.deepEqual(t.title, { en: "Something new", hi: "Something new", mr: "Something new" });
});
