# Geolocation Test Checklist & Scripted Scenarios (Solution GEO G10.3)

This checklist details the scripted test cases and expected runtime behavior for all geolocation, offline, and anti-spoofing conditions across the mobile app and Next.js web application.

---

## 1. Scripted Test Scenarios Matrix

| Scenario ID | Test Case | Simulated Condition | Expected Behavior | Verification Step |
| :--- | :--- | :--- | :--- | :--- |
| **TC-GEO-01** | **GPS Off** | Location services disabled in device system settings. | App detects disabled GPS; displays prompt with "Enable GPS" or "Pick Area Manually" (C20). Fallback uses selected Area Centroid coordinates (`locationSource: "MANUAL"`). | Verify lot creation succeeds with manual coordinates; no crash. |
| **TC-GEO-02** | **Permission Denied** | User taps "Deny" on location dialog. | Friendly vernacular notification explaining why location helps find nearest buyers. App continues with collector's registered `operatingArea` centroid. | Check C7 Recycler Match displays recyclers around area centroid. |
| **TC-GEO-03** | **Permission Denied Forever** | User checks "Don't ask again" / denied forever. | "Grant in Settings" button opens app system permissions. App operates smoothly using Area Centroid fallback. | Verify app does not crash or loop repeatedly requesting permission. |
| **TC-GEO-04** | **Airplane Mode (Offline)** | Airplane mode enabled; no cellular or Wi-Fi data. | Recyclers and Collection Points populate instantly from local `RecyclerCache` and `CollectionPoints` Drift tables. Creating lot and handover queues mutation to `syncOutbox`. | Tested in `E_waste/test/offline_full_flow_integration_test.dart`. Outbox drains when online. |
| **TC-GEO-05** | **Mock Location App Active** | Device mock location provider enabled (`isMocked == true`). | Geolocator flag detected. Handover sets `geoFlag: true` and logs `"MOCK_LOCATION"` in `spoofReasons`. **Does not block handover**, but flags anomaly for admin review (M3). | Receipt displays `Anomaly: Mock Location Flagged` badge; transaction completes. |
| **TC-GEO-06** | **No Recyclers Within 50 km** | Collector location has zero authorized recyclers in 50 km expanding radius. | Expanding radius stops at 50 km. Coverage Gap screen displays friendly notice and "Notify me when available" button. Saves `CoverageRequest` demand signal. | Verify demand record in `/api/v1/coverage-requests` and admin heatmap. |
| **TC-GEO-07** | **Low Location Accuracy (> 500 m)** | GPS fix accuracy is degraded (e.g. `accuracyM: 1200`). | Accuracy > 500 m triggers `classifyLocationProof` warning. Handover sets `geoFlag: true` and adds `"LOW_ACCURACY"` to `spoofReasons`. | Status chip shows yellow `NEAR` or red `FAR` warning on C8 handover. |
| **TC-GEO-08** | **Device in Basement (No Fix Timeout)** | Device indoors/basement; satellite signal unavailable. | Geolocator fix timeout strictly enforced at 8 seconds. If a cached location younger than 2 minutes exists, it is reused. Otherwise falls back to Area Centroid. | Battery and CPU drain prevented; UI does not hang indefinitely. |
| **TC-GEO-09** | **Impossible Travel (> 50 km in 10 min)** | Two consecutive handovers logged within 10 minutes from facilities > 50 km apart. | Anomaly engine triggers `checkTravelVelocitySpoof`. Marks handover with `geoFlag: true` and `"IMPOSSIBLE_TRAVEL"` flag. | Alert appears in `/admin/anomalies` queue. |
| **TC-GEO-10** | **Marathi & Hindi Distance Speech** | TTS readout for recycler distances on C6, C7, C21. | Distances converted to vernacular numbers and fractions: 2 km -> "दो किलोमीटर" (HI) / "दोन किलोमीटर" (MR); 1.5 km -> "डेढ़ किलोमीटर" (HI) / "दीड किलोमीटर" (MR); 500 m -> "पाँच सौ मीटर" (HI) / "पाचशे मीटर" (MR). | Unit tests pass in `tests/domain/distanceVoice.test.ts` & `estimator_and_words_test.dart`. |
| **TC-GEO-11** | **Privacy Obfuscation (~100 m)** | "Don't save my exact location" enabled in Settings. | Coordinates saved to lots are rounded to 3 decimal places (~100 m) or area centroid. Traceability proof shows rounded location with warning notice. | Coordinates in database have at most 3 decimal places. |

---

## 2. Audio Number-to-Words Reference Table

| Distance | Hindi Audio (`hi`) | Marathi Audio (`mr`) | English Audio (`en`) |
| :--- | :--- | :--- | :--- |
| **0 m** | "शून्य मीटर" | "शून्य मीटर" | "0 meters" |
| **300 m** | "तीन सौ मीटर" | "तीनशे मीटर" | "300 meters" |
| **500 m** | "पाँच सौ मीटर" | "पाचशे मीटर" | "500 meters" |
| **1.0 km** | "एक किलोमीटर" | "एक किलोमीटर" | "1 kilometer" |
| **1.5 km** | "डेढ़ किलोमीटर" | "दीड किलोमीटर" | "1.5 kilometers" |
| **2.0 km** | "दो किलोमीटर" | "दोन किलोमीटर" | "2 kilometers" |
| **2.5 km** | "ढाई किलोमीटर" | "अडीच किलोमीटर" | "2.5 kilometers" |
| **3.5 km** | "साढ़े तीन किलोमीटर" | "साडेतीन किलोमीटर" | "3.5 kilometers" |
| **8.0 km** | "आठ किलोमीटर" | "आठ किलोमीटर" | "8 kilometers" |
| **10.0 km** | "दस किलोमीटर" | "दहा किलोमीटर" | "10 kilometers" |

