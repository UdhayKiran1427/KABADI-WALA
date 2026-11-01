import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { onboardCollectorAction } from "../actions";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";

export default async function OnboardCollectorPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["FIELD_AGENT", "ADMIN"]);
  const searchParams = await props.searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href="/field"
            className="btn btn-secondary btn-sm"
            style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
          >
            &larr;
          </Link>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
              F1: Onboard Informal Collector &bull; Rapid Enrollment
            </h1>
            <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
              कलेक्टर ऑनबोर्डिंग &bull; Zero Identity Documents &bull; Privacy by Design
            </div>
          </div>
        </div>

        {/* F1 Audio Speaker */}
        <VoiceSpeaker screenKey="F1_ONBOARD" size="md" />
      </div>

      {searchParams.error && (
        <div className="alert alert-danger">
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Main Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          <form
            action={onboardCollectorAction}
            className="card"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>
                1. Collector Mobile Phone (10 Digits) *
              </label>
              <input
                type="tel"
                name="phone"
                required
                pattern="\d{10}"
                maxLength={10}
                placeholder="e.g. 9820000002"
                className="form-control"
                style={{ fontSize: "1.1rem", padding: "0.75rem" }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                Only mobile phone number required. No Aadhaar, PAN, voter ID, or biometric info stored.
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>
                2. 4-Digit Numeric Security PIN *
              </label>
              <input
                type="password"
                name="pin"
                defaultValue="1234"
                maxLength={4}
                pattern="\d{4}"
                required
                placeholder="1234"
                className="form-control"
                style={{ fontSize: "1.2rem", padding: "0.75rem", letterSpacing: "0.3rem", width: "180px", fontWeight: 800 }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
                Collector will use this PIN to sign in on their mobile device or web portal.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  3. Preferred Language
                </label>
                <select name="preferredLanguage" className="form-control" defaultValue="HI" style={{ padding: "0.75rem" }}>
                  <option value="HI">हिंदी (Hindi)</option>
                  <option value="MR">मराठी (Marathi)</option>
                  <option value="EN">English</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  4. District / City
                </label>
                <input
                  type="text"
                  name="district"
                  defaultValue="Mumbai"
                  required
                  className="form-control"
                  style={{ padding: "0.75rem" }}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 700 }}>
                5. Primary Operating Settlement / Cluster
              </label>
              <input
                type="text"
                name="operatingArea"
                defaultValue="Dharavi Labour Camp"
                required
                className="form-control"
                style={{ padding: "0.75rem" }}
              />
            </div>

            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--slate-50)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--slate-200)",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input type="checkbox" name="informedConsent" defaultChecked required style={{ marginTop: "0.2rem", width: "16px", height: "16px" }} />
                <span>
                  <strong>Informed Consent Confirmed:</strong> I have verbally read and explained the platform privacy and pricing terms to the collector in their spoken tongue.
                </span>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input type="checkbox" name="locationConsent" defaultChecked style={{ marginTop: "0.2rem", width: "16px", height: "16px" }} />
                <span>
                  <strong>Proximity Location Consent:</strong> Collector consents to saving coarse GPS cluster coordinates (~100m) for anti-spoofing verification at authorized gate.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ padding: "0.85rem", backgroundColor: "#4f46e5" }}
            >
              ✓ Complete Rapid Onboarding &amp; Generate Credentials &rarr;
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Field Operations Guidelines & SOP (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* F1 Ground SOP Card */}
          <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid #4f46e5" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.6rem" }}>
              📋 60-Second Onboarding SOP
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>1️⃣</span>
                <span><strong>Ask for Phone:</strong> Any standard basic phone or smartphone with an active SIM works.</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>2️⃣</span>
                <span><strong>Set Easy PIN:</strong> Suggest a memorable 4-digit PIN (e.g. birth year or last 4 digits of phone).</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>3️⃣</span>
                <span><strong>Verbal Consent:</strong> Explain that this lets them get direct cash from authorized recyclers without middleman cuts.</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>4️⃣</span>
                <span><strong>Give Short Code:</strong> Show the collector their short code (e.g. <code>#KW01</code>) written down.</span>
              </div>
            </div>
          </div>

          {/* Privacy Protection Notice */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#5b21b6", marginBottom: "0.4rem" }}>
              🔒 Zero ID Barriers &bull; Privacy by Design
            </h3>
            <p style={{ fontSize: "0.775rem", color: "#6d28d9", lineHeight: 1.5 }}>
              Under DPDP Act 2023 principles, waste pickers are never compelled to surrender biometric or government ID tokens. Their data is strictly sequestered for fair price dissemination and verifiable recycler gate scale settlements.
            </p>
          </div>

          {/* Hub Coordination */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              📍 Mumbai Ward Clusters
            </h3>
            <div style={{ fontSize: "0.75rem", color: "var(--slate-600)", lineHeight: 1.6 }}>
              <div>&bull; <strong>Zone 1:</strong> Dharavi 60-ft Road, Labour Camp, Koliwada</div>
              <div>&bull; <strong>Zone 2:</strong> Kurla West LBS Marg, Pipe Road Scrap Market</div>
              <div>&bull; <strong>Zone 3:</strong> Govandi Shivaji Nagar, Bainganwadi Hub</div>
              <div>&bull; <strong>Zone 4:</strong> Mankhurd Mandala, Deonar Perimeter</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
