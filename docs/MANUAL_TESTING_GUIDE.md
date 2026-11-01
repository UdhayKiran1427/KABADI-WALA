# Complete Manual Testing Guide: E-Waste Collector Platform

This comprehensive guide provides step-by-step instructions to manually test every feature of the platform across all four user roles (**Collector**, **Recycler**, **Field Agent**, and **Platform Admin**), as well as the **Bargaining Protocol**, **Notifications**, and **REST APIs**.

---

## 📋 Table of Contents
1. [Prerequisites & Server Startup](#1-prerequisites--server-startup)
2. [Credentials Cheat Sheet](#2-credentials-cheat-sheet)
3. [Test Journey 1: User Registration (All 3 Roles)](#3-test-journey-1-user-registration-all-3-roles)
4. [Test Journey 2: Informal Collector Workflow (C1–C22)](#4-test-journey-2-informal-collector-workflow-c1c22)
5. [Test Journey 3: Price Bargaining & Counter-Offer Negotiation](#5-test-journey-3-price-bargaining--counter-offer-negotiation)
6. [Test Journey 4: Recycler Facility Operations (R1–R4)](#6-test-journey-4-recycler-facility-operations-r1r4)
7. [Test Journey 5: Field Agent Ground Operations (F1–F3)](#7-test-journey-5-field-agent-ground-operations-f1f3)
8. [Test Journey 6: Admin Governance & AI Auditing (M1–M5)](#8-test-journey-6-admin-governance--ai-auditing-m1m5)
9. [Test Journey 7: REST API Testing (curl / Postman)](#9-test-journey-7-rest-api-testing-curl--postman)
10. [Test Journey 8: Edge Cases & Anomaly Triggers](#10-test-journey-8-edge-cases--anomaly-triggers)

---

## 1. Prerequisites & Server Startup

### A. Environment Check
Ensure your `.env` has the active MongoDB connection string:
```env
DATABASE_URL="mongodb+srv://udhaykiran:udhay123@cluster0.k38eixd.mongodb.net/ewaste?retryWrites=true&w=majority"
JWT_SECRET="super-secret-jwt-key-minimum-32-chars-long-collector-token"
SESSION_SECRET="super-secret-session-cookie-key-for-recycler-and-admin-32-chars"
```

### B. Start the Next.js Server
Open PowerShell / Terminal in the project root:
```powershell
npm run dev
```
The server will start at:
- **Local URL**: `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

### C. Verify Database Health
In your browser, visit:
```
http://localhost:3000/api/v1/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "isReplicaSet": true,
  "timestamp": "..."
}
```

---

## 2. Credentials Cheat Sheet

Pre-seeded demo accounts ready for immediate login:

| Role | Portal URL | Login Identifier | Password / PIN | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Collector** | `/collector/login` | Phone: `9820000001` | PIN: `1234` | ShortCode: `KW01`, Dharavi area |
| **Recycler** | `/recycler/login` | Phone: `9876543210` | Password: `password123` | EcoRecycle Mumbai Hub |
| **Field Agent** | `/field/login` | Phone: `9830000001` | Password: `agent123` | Ground Agent |
| **Super Admin** | `/admin/login` | Phone: `9999999999` | Password: `admin123` | Platform Governance |
| **Platform Hub**| `/` | *Single-click switcher card for all 4 roles* | — | Direct quick links |

---

## 3. Test Journey 1: User Registration (All 3 Roles)

### Test 1.1: Register a New Collector
1. Navigate to: `http://localhost:3000/collector/register`
2. Fill in:
   - **Mobile Phone**: `9820999999` (any 10-digit number not yet registered)
   - **4-Digit PIN**: `5678`
   - **Confirm PIN**: `5678`
   - **Operating Area**: `Kurla West`
   - **District**: `Mumbai`
   - **Preferred Language**: Choose `मराठी (Marathi)` or `हिंदी (Hindi)`
   - **Consent**: Check the consent checkbox.
3. Click **"खाता बनाएं / Register Now →"**.
4. **Expected Result**:
   - Redirects to `/collector?welcome=true`.
   - Displays the Collector Dashboard with a new auto-generated ShortCode badge (e.g. `#KW02`).
   - Zero personal data (no Aadhaar, no PAN) is stored.

### Test 1.2: Register a New Recycler Facility
1. Navigate to: `http://localhost:3000/recycler/register`
2. Fill in:
   - **Facility Name**: `Green Earth Recycling Pvt Ltd`
   - **SPCB Authorization No.**: `MPCB/EWASTE/2026/099`
   - **Contact Phone**: `9876000001`
   - **Password**: `facility123`
   - **Confirm Password**: `facility123`
   - **Facility Address**: `Plot 88, TTC Industrial Area, Mahape`
   - **Area**: `Navi Mumbai`
   - **District**: `Thane`
   - **Latitude / Longitude**: `19.1100` / `73.0100`
   - **Doorstep Pickup**: Checked, Radius: `25 km`, Min Weight: `15 kg`
3. Click **"Complete Facility Registration →"**.
4. **Expected Result**:
   - Redirects to `/recycler?welcome=true`.
   - Facility is provisioned with verified status and baseline rates populated across all 7 material categories.

### Test 1.3: Register a New Field Agent
1. Navigate to: `http://localhost:3000/field/register`
2. Fill in:
   - **Mobile Phone**: `9830999999`
   - **Password**: `agentpass123`
   - **Confirm Password**: `agentpass123`
   - **Assigned Hub / Operating Area**: `Bandra - Dharavi Cluster`
   - **Language**: `हिंदी (Hindi)`
3. Click **"Register as Field Agent →"**.
4. **Expected Result**:
   - Redirects to `/field?welcome=true`.
   - Displays the Field Agent ground operations dashboard with metrics initialized to 0.

---

## 4. Test Journey 2: Informal Collector Workflow (C1–C22)

### Step 2.1: Log in as Collector
1. Go to: `http://localhost:3000/collector/login`
2. Phone: `9820000001`, PIN: `1234`. Click **"लॉगिन करें / Sign In →"**.

### Step 2.2: Check Daily Market Rates Board (C10)
1. In the navigation bar, click **"दैनिक भाव (Daily Rates)"** (`/collector/prices`).
2. Verify:
   - All 7 categories are displayed with Marathi/Hindi/English labels.
   - Shows Market Range vs Recycler Rates per kg.
   - Trend arrows (📈 UP, 📉 DOWN, ➡️ FLAT) indicate 7-day movement.

### Step 2.3: Check Drop Points & Camps C21
1. Click **"ड्रॉप पॉइंट्स (Drop Points)"** (`/collector/drop-points`).
2. Verify:
   - Lists nearby aggregation drop points and e-waste camps (e.g., Dharavi Hub, Sion Drop Box).
   - Shows operating hours, phone numbers, and distance badges.

### Step 2.4: Create an E-Waste Lot (C3–C5)
1. Click **"कचरा जोड़ें (Create Lot)"** (`/collector/create-lot`).
2. Fill in:
   - **Category**: Select `Pure Copper / Wire (शुद्ध तांबा)`
   - **Estimated Weight**: Enter `8.5` kg (stored as `8500` grams)
   - **Condition Notes**: `Stripped clean cable wire`
3. Click **"लॉट सहेजें / Save Lot →"**.
4. **Expected Result**:
   - Redirects to the lot details page (`/collector/lots/[id]`).
   - Shows estimated value (e.g. ₹340.00 at ₹40/kg benchmark rate).
   - Lot status: `DRAFT`.

### Step 2.5: Find Nearest Recycler & Match (C6, C20)
1. On the Lot page, click **"निकटतम रीसाइक्लर खोजें / Find Nearest Recycler"** (`/collector/lots/[id]/match`).
2. Verify:
   - The matching engine calculates distance using Haversine formula and expanding radius.
   - Shows ranked candidates with:
     - Compass direction badge (e.g., `NE`, `SW`)
     - Rate per kg in ₹ and net payout
     - *"Why This Is Best"* ranking badge
3. **Test C20 Manual Area Fallback**:
   - If GPS coordinates are unavailable, pick an area from the manual dropdown (e.g. `Dharavi`, `Kurla West`, `Andheri East`).
   - Click **"क्षेत्र अनुसार खोजें / Search by Area"** to verify area centroids recalculate distances.
4. Click **"रीसाइक्लर चुनें और पुष्टि करें / Select This Recycler"** on the top ranked recycler.
5. **Expected Result**:
   - Lot status changes to `MATCHED`.
   - Transaction initialized with the recycler facility.

---

## 5. Test Journey 3: Price Bargaining & Counter-Offer Negotiation

This tests the price negotiation between the informal collector and authorized recycler.

### Step 3.1: Collector Submits a Price Counter-Offer
1. Open the matched lot at: `http://localhost:3000/collector/lots/[id]`
2. Scroll to the **"💬 भाव तोल-मोल / Price Bargaining"** card.
3. Observe the current quoted rate (e.g. `₹40.00/kg`).
4. In the counter-offer input:
   - Enter your offer: `₹48.00/kg`
   - Note: `High grade stripped copper wire, no insulation`
5. Click **"नया भाव भेजें / Send Offer →"**.
6. **Expected Result**:
   - A success alert appears: *"Price offer of ₹48/kg sent to recycler!"*
   - Status updates to `OFFER_BY_COLLECTOR`.
   - The card shows: *"Waiting for recycler response..."*

### Step 3.2: Recycler Reviews & Counters the Offer
1. Open an incognito window or separate browser tab and log in as Recycler:
   - URL: `http://localhost:3000/recycler/login`
   - Phone: `9876543210`, Password: `password123`
2. Click **"🔔 Notifications"** (`/recycler/notifications`).
   - Verify unread notification: *"💬 New Price Offer from Collector — Collector #KW01 offered ₹48/kg for Lot LOT-..."*.
3. Go to the Dashboard (`/recycler`).
4. Find the incoming lot in the list. Under the **Bargain / Counter** card:
   - Observe Collector's proposed rate: `₹48.00/kg` with their note.
   - You have two options:
     - **Option A (Accept)**: Click *"✓ Accept ₹48/kg"*.
     - **Option B (Counter)**: Enter `₹46.00/kg`, note *"Can meet at ₹46/kg"*, and click *"Counter-Offer"*.
5. Submit Option B (Counter-Offer of ₹46.00/kg).
6. **Expected Result**:
   - Status updates to `OFFER_BY_RECYCLER`.

### Step 3.3: Collector Accepts the Agreed Rate
1. Switch back to the Collector tab (`/collector/lots/[id]`) and refresh.
2. The bargaining card now displays:
   - *"Recycler proposed a counter-rate of ₹46.00/kg with note: 'Can meet at ₹46/kg'"*.
3. Click the green button: **"✓ यह भाव स्वीकार करें / Accept ₹46.00/kg"**.
4. **Expected Result**:
   - Status locks to `AGREED`.
   - Quoted rate is updated to `₹46.00/kg`.
   - Total expected price recalculates to `8.5 kg × ₹46 = ₹391.00`.
   - Both parties receive an in-app confirmation notification.

---

## 6. Test Journey 4: Recycler Facility Operations (R1–R4)

### Step 4.1: View Incoming Lots (R1)
1. On `/recycler`, observe the **Incoming Lots Queue**.
2. Notice the lot reference, material category, declared weight, and agreed rate.

### Step 4.2: Perform Scale Weighing & Handover Verification (R2)
1. In the lot's action card, find the **Handover Verification** section:
   - **4-Digit Code**: Ask collector for their code (shown on collector's screen `/collector/lots/[id]`, e.g., `4921`) or leave empty for auto-match.
   - **Scale Weight (kg)**: Enter `8.6` kg (scale weight confirmed at facility).
   - **Payment Mode**: Select `CASH` (or `UPI`).
2. Click **"Confirm Scale Weight & Record Payout →"**.
3. **Expected Result**:
   - Weight tolerance check runs:
     - Declared: `8.5 kg`, Confirmed: `8.6 kg` (diff = $+1.1\% \le 5\% \rightarrow$ **AUTO ACCEPTED**).
   - Location Proof check runs against facility coordinates $\rightarrow$ `MATCH` ($\le 300\text{m}$).
   - Payout calculated: `8.6 kg × ₹46/kg = ₹395.60` (stored as `39560` paise).
   - Payment record is created with status `PAID`.
   - Transaction status moves to `PAID`, lot moves to `COMPLETED`.
   - Immediate notification sent to Collector: *"💰 ₹396 received via CASH for 8.60kg Pure Copper"*.

### Step 4.3: Manage Rate Cards (R3)
1. Click **"Rates"** in the top navigation (`/recycler/rates`).
2. Modify a category rate (e.g. change *Printed Circuit Boards* to `₹15.00/kg`).
3. Click **"Update Rates"**.
4. **Expected Result**:
   - Rate updates immediately in MongoDB.
   - Future collector searches will reflect this new competitive rate.

### Step 4.4: Facility Profile & Service Area (R4)
1. Click **"Profile"** (`/recycler/profile`).
2. Inspect authorization status (`VERIFIED`), SPCB certificate expiration date, service radius (`20 km`), and minimum weight requirements.

---

## 7. Test Journey 5: Field Agent Ground Operations (F1–F3)

### Step 5.1: Log in as Field Agent
1. Go to: `http://localhost:3000/field/login`
2. Phone: `9830000001`, Password: `agent123`. Click **"Agent Sign In →"**.

### Step 5.2: F1 — Onboard an Illiterate Collector (Zero Identity Documents)
1. Click **"Onboard Collector (F1)"** (`/field/onboard`).
2. Fill in:
   - **Phone**: `9820112233` (collector's phone)
   - **4-Digit PIN**: `9988`
   - **Preferred Language**: `मराठी (Marathi)`
   - **Operating Area**: `Dharavi 90 Feet Road`
   - **District**: `Mumbai`
   - **Consent**: Toggle to *Yes (Mandatory)*.
3. Click **"Onboard Collector →"**.
4. **Expected Result**:
   - Collector profile is created with zero ID paperwork.
   - ShortCode assigned (e.g., `#KW03`).
   - Displays printable/shareable credentials slip for the collector.

### Step 5.3: F2 — Log Scrap Dealer Spot Prices
1. Click **"Log Spot Prices (F2)"** (`/field/prices`).
2. Fill in:
   - **Material Category**: `Batteries (Lead / Lithium)`
   - **Sub-category**: `E-bike battery pack`
   - **Buying Price**: `₹28.50/kg` (paise: `2850`)
   - **Buyer Type**: `SCRAP_DEALER`
   - **Area**: `Kurla Scrap Yard`
   - **District**: `Mumbai`
3. Click **"Save Market Price Point →"**.
4. **Expected Result**:
   - Market price is logged and immediately feeds into the Admin price benchmark dataset.

### Step 5.4: F3 — Upload E-Waste Training Photos for AI
1. Click **"AI Training Photos (F3)"** (`/field/training`).
2. Fill in:
   - **Category**: `Printed Circuit Boards (PCBs)`
   - **Image Key**: `training/agent_1/pcb_server_green.jpg`
   - **Split**: `TRAIN`
3. Click **"Log Training Sample →"**.
4. **Expected Result**:
   - Sample added to training dataset for the automated visual classifier.

---

## 8. Test Journey 6: Admin Governance & AI Auditing (M1–M5)

### Step 8.1: Log in as Admin
1. Go to: `http://localhost:3000/admin/login`
2. Phone: `9999999999`, Password: `admin123`. Click **"Enter Admin Dashboard →"**.

### Step 8.2: M1 — Recycler Verification Queue
1. Click **"Verifications (M1)"** (`/admin/verifications`).
2. View pending recyclers and verify state pollution control licenses.

### Step 8.3: M2 — Price Dataset & Trends
1. Click **"Price Trends (M2)"** (`/admin/prices`).
2. Observe:
   - SVG visual sparkline charts for price movements across categories.
   - Click **"Export CSV"** to download the complete market price dataset.

### Step 8.4: M3 — Anomaly Detection Auditor
1. Click **"Anomalies (M3)"** (`/admin/anomalies`).
2. Observe flagged transactions:
   - Price anomalies ($> 2\times$ or $> 3\times$ market average)
   - Weight discrepancies ($> 25\%$ or $> 40\%$)
   - GPS spoofing / mock location flags.

### Step 8.5: M4 — AI Dataset Health & Confusion Matrix
1. Click **"AI Health (M4)"** (`/admin/ai`).
2. Inspect the ML training sample distributions, dataset split (Train/Val/Test), and accuracy benchmarks.

### Step 8.6: M5 — Impact Analytics & 100m Heatmap
1. Click **"Impact & Geo (M5)"** (`/admin/impact`).
2. Inspect:
   - Total e-waste diverted from informal burning (in metric tons).
   - Total cash distributed to informal collectors (in ₹).
   - Geo-anonymized collection heatmap (coordinates strictly rounded to 3 decimals / ~100m for privacy).

---

## 9. Test Journey 7: REST API Testing (curl / Postman)

You can run these commands directly in your terminal to verify API contracts:

### A. Health Check
```bash
curl -X GET http://localhost:3000/api/v1/health
```

### B. Mobile Collector Login (Generate Bearer Token)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9820000001","pin":"1234"}'
```
*Copy the returned `token` from the JSON response to use in the Bearer header below.*

### C. Find Nearest Recycler Facilities (G1–G2)
```bash
curl -X GET "http://localhost:3000/api/v1/recyclers/match?categoryId=1&approxWeightGrams=5000&latitude=19.0434&longitude=72.8567" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### D. Create a New Lot via API
```bash
curl -X POST http://localhost:3000/api/v1/lots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": 1,
    "approxWeightGrams": 6000,
    "conditionNotes": "Copper wire bundles",
    "deviceLat": 19.0434,
    "deviceLng": 72.8567
  }'
```

### E. Submit Bargaining Offer via API
```bash
curl -X POST http://localhost:3000/api/v1/lots/<LOT_ID>/bargain/offer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "offerRateRupees": 47.5,
    "note": "Clean sorted wire"
  }'
```

### F. Accept Bargain Offer via API
```bash
curl -X POST http://localhost:3000/api/v1/lots/<LOT_ID>/bargain/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### G. Get User Notifications
```bash
curl -X GET http://localhost:3000/api/v1/notifications \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

---

## 10. Test Journey 8: Edge Cases & Anomaly Triggers

| Test Case | Steps | Expected Outcome |
| :--- | :--- | :--- |
| **Weight Discrepancy Anomaly** | On `/recycler`, enter scale weight of `15.0 kg` for a declared `8.0 kg` lot ($> 40\%$ mismatch). | Handover proceeds so collector is paid, but transaction is automatically flagged in Admin Anomaly Queue (`/admin/anomalies`) with severity level 2. |
| **Location Mismatch (`FAR`)** | Submit handover with coordinates $> 1000\text{m}$ away from facility. | Location is classified as `FAR`, flagged for audit, but payout completes without blocking collector. |
| **Brute Force Lockout** | Attempt to log in with an invalid PIN 5 times consecutively. | Account locks for 15 minutes (`lockedUntil` timestamp set in DB). |
| **Duplicate Mobile Prevention** | Try to register a new collector with phone `9820000001` (already exists). | Rejects with message: *"This phone number is already registered. Please log in."* |
| **Negative Price Prevention** | Try to propose a counter-offer of `₹-10/kg` or `₹0/kg`. | Form rejects submission with error: *"Please enter a valid offer rate in rupees/kg"*. |
| **Bargaining Status Lock** | Once a deal is agreed, try to counter-offer again. | Form and API reject mutation: *"Cannot bargain on a transaction in state AGREED"*. |

---

## 11. Automated Test Verification

To run all pure domain and security unit tests:
```powershell
npx tsx --test "tests/unit/**/*.test.ts"
```
**Expected Output**:
```
ℹ tests 11
ℹ suites 2
ℹ pass 11
ℹ fail 0
```

To run TypeScript strict compilation check:
```powershell
npx tsc --noEmit
```
**Expected Output**: `0 errors` (command exits silently with exit code 0).

