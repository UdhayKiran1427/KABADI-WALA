import Link from "next/link";
import { Camera, ClipboardList, Globe2, Recycle, Tags, TriangleAlert, UserRound } from "lucide-react";
import { fieldLoginAction } from "../actions";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default async function FieldAgentLoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="auth-split-wrapper">
      {/* LEFT PANEL: Field Agent Operations Hero */}
      <div
        className="auth-sidebar-hero"
        style={{
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)",
        }}
      >
        <div>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "1.2rem",
              textDecoration: "none",
            }}
          >
            <Recycle size={22} aria-hidden="true" />
            <span>KABADI WALA &bull; Field Operations</span>
          </Link>

          <div style={{ marginTop: "3.5rem" }}>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.18)",
                padding: "0.35rem 0.8rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              Ground Operations Team &bull; F1–F3
            </span>
            <h1
              style={{
                fontSize: "2.4rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginTop: "1.25rem",
                lineHeight: 1.2,
                color: "#ffffff",
              }}
            >
              Enabling Waste Picker Inclusion in Informal Settlements
            </h1>
            <p
              style={{
                color: "#c7d2fe",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                marginTop: "1.25rem",
                maxWidth: "500px",
              }}
            >
              Field Agents are the trusted physical link: onboarding collectors without documentation hurdles, capturing real-time scrap dealer market prices, and feeding the ML visual valuation dataset.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "3rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                <UserRound size={22} aria-hidden="true" />
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>F1: Rapid Ground Onboarding</strong>
                <div style={{ fontSize: "0.85rem", color: "#c7d2fe", marginTop: "0.2rem" }}>
                  Enroll illiterate waste pickers in under 60 seconds with phone number and optional voice consent.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                <Tags size={22} aria-hidden="true" />
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>F2: Ground Market Price Logging</strong>
                <div style={{ fontSize: "0.85rem", color: "#c7d2fe", marginTop: "0.2rem" }}>
                  Log spot purchase prices offered by local kabadi shops across Mumbai wards to detect predatory margins.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                <Camera size={22} aria-hidden="true" />
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>F3: AI Dataset Photo Collection</strong>
                <div style={{ fontSize: "0.85rem", color: "#c7d2fe", marginTop: "0.2rem" }}>
                  Photograph discarded electronics with calibrated condition tags to train our on-device grading neural nets.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: "2rem", borderTop: "1px solid rgba(255, 255, 255, 0.18)", marginTop: "2.5rem" }}>
          <div style={{ fontSize: "0.85rem", color: "#c7d2fe" }}>
            Field Operations &bull; NGO &amp; Municipal Community Engagement Network
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Sign In Form */}
      <div className="auth-form-pane">
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "18px",
                backgroundColor: "#f5f3ff",
                color: "#7c3aed",
                fontSize: "1.85rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <ClipboardList size={30} aria-hidden="true" />
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              Field Agent Hub
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              फील्ड साथी लॉगिन &bull; Operations F1–F3
            </p>
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "center" }}>
              <span
                style={{
                  backgroundColor: "#e0e7ff",
                  color: "#3730a3",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>Pilot Agent</span>
                <span>&bull;</span>
                <span>Green Saathi Foundation</span>
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <LanguageSwitcher />
              <Link href="/field/language" style={{ fontSize: "0.75rem", color: "var(--primary-700)", fontWeight: 700, textDecoration: "none" }}>
                <Globe2 size={14} aria-hidden="true" /> Select Language
              </Link>
            </div>
          </div>

          {searchParams.error && (
            <div className="alert alert-danger" style={{ marginBottom: "1.5rem" }}>
              <TriangleAlert size={16} aria-hidden="true" /> {searchParams.error}
            </div>
          )}

          <div
            className="card"
            style={{
              padding: "2rem 1.75rem",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--slate-200)",
            }}
          >
            <form action={fieldLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Agent Mobile Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="10-digit mobile number"
                  className="form-control"
                  style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    PIN / Password *
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>4-digit PIN</span>
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="4-digit PIN or password"
                  className="form-control"
                  style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Field Agent Code
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "var(--slate-500)" }}>Optional (e.g. AGT001)</span>
                </div>
                <input
                  type="text"
                  name="agentCode"
                  placeholder="Assigned Agent Code"
                  className="form-control"
                  style={{ fontSize: "1rem", padding: "0.75rem 0.9rem" }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                style={{ marginTop: "0.5rem", padding: "0.85rem", backgroundColor: "#4f46e5" }}
              >
                Sign In as Field Agent &rarr;
              </button>
            </form>

            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--slate-200)",
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--slate-600)",
              }}
            >
              New ground coordinator?{" "}
              <Link href="/field/register" style={{ color: "#4f46e5", fontWeight: 700 }}>
                Register Agent &rarr;
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <Link href="/" style={{ color: "var(--slate-500)", fontSize: "0.85rem", textDecoration: "none" }}>
              &larr; Back to Platform Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
