import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { onboardCollectorAction } from "../actions";

export default async function OnboardCollectorPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["FIELD_AGENT", "ADMIN"]);
  const searchParams = await props.searchParams;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Link href="/field" style={{ fontSize: "1.2rem", textDecoration: "none" }}>
          &larr;
        </Link>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
            F1: Onboard Informal Collector
          </h1>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>कलेक्टर ऑनबोर्डिंग (Zero Documents)</div>
        </div>
      </div>

      {searchParams.error && (
        <div
          style={{
            padding: "0.875rem",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "10px",
            fontSize: "0.85rem",
          }}
        >
          ⚠️ {searchParams.error}
        </div>
      )}

      <form
        action={onboardCollectorAction}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "1.5rem",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
            1. Mobile Phone (10 Digits) *
          </label>
          <input
            type="tel"
            name="phone"
            required
            pattern="\d{10}"
            maxLength={10}
            placeholder="e.g. 9820000002"
            className="input"
            style={{ fontSize: "1.1rem", padding: "0.75rem" }}
          />
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Only mobile number is required. No Aadhaar, voter ID, or personal name stored.
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
            2. 4-Digit Numeric PIN *
          </label>
          <input
            type="password"
            name="pin"
            defaultValue="1234"
            maxLength={4}
            pattern="\d{4}"
            required
            placeholder="1234"
            className="input"
            style={{ fontSize: "1.1rem", padding: "0.75rem", letterSpacing: "0.2rem" }}
          />
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
            Collector will use this PIN to sign in on their Android app or Web portal.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              3. Preferred Language
            </label>
            <select name="preferredLanguage" className="input" defaultValue="HI" style={{ padding: "0.75rem" }}>
              <option value="HI">हिंदी (Hindi)</option>
              <option value="MR">मराठी (Marathi)</option>
              <option value="EN">English</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              4. District
            </label>
            <input
              type="text"
              name="district"
              defaultValue="Mumbai"
              required
              className="input"
              style={{ padding: "0.75rem" }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.35rem" }}>
            5. Primary Operating Area
          </label>
          <input
            type="text"
            name="operatingArea"
            defaultValue="Dharavi Labour Camp"
            required
            className="input"
            style={{ padding: "0.75rem" }}
          />
        </div>

        <div
          style={{
            padding: "0.875rem",
            backgroundColor: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" name="informedConsent" defaultChecked required style={{ marginTop: "0.2rem" }} />
            <span>
              <strong>Informed Consent Explained:</strong> I have verbally read and explained the platform terms to the collector in their spoken language.
            </span>
          </label>

          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <input type="checkbox" name="locationConsent" defaultChecked style={{ marginTop: "0.2rem" }} />
            <span>
              <strong>Location Consent:</strong> Collector consents to saving approximate transaction coordinates (~100m) for anti-spoofing verification.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            padding: "0.875rem",
            fontSize: "1.05rem",
            fontWeight: 800,
            borderRadius: "10px",
            backgroundColor: "#2563eb",
          }}
        >
          Create Collector Profile & Generate Credentials &rarr;
        </button>
      </form>
    </div>
  );
}

