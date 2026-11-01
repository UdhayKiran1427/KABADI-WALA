import Link from "next/link";
import { collectorLoginAction } from "../actions";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

export default async function CollectorLoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="auth-split-wrapper">
      {/* LEFT PANEL: High-Impact Hero Section for Scrap Collectors */}
      <div
        className="auth-sidebar-hero"
        style={{
          background: "linear-gradient(145deg, #064e3b 0%, #065f46 45%, #047857 100%)",
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
            <span style={{ fontSize: "1.3rem" }}>♻️</span>
            <span>कबाड़ीवाला &bull; KABADI WALA</span>
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
              कलेक्टर पोर्टल &bull; Scrap Picker Platform
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
              सही तौल, पक्का भाव और हाथों-हाथ नकद भुगतान
            </h1>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: "1.05rem",
                lineHeight: 1.6,
                marginTop: "1.25rem",
                maxWidth: "500px",
              }}
            >
              ई-कचरा सीधे अधिकृत रिसाइक्लर तक पहुँचाएं। बिचौलियों के बिना उच्चतम बाजार मूल्य और 100% सुरक्षित भुगतान प्राप्त करें।
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
                💵
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>हाथों-हाथ नकद व UPI भुगतान</strong>
                <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "0.2rem" }}>
                  गेट पर तौल होते ही तुरंत भुगतान। कोई कमीशन नहीं, कोई रोक नहीं।
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
                🛡️
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>जीरो डॉक्यूमेंटेशन (Zero ID Barrier)</strong>
                <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "0.2rem" }}>
                  आधार या पहचान पत्र की कोई बाध्यता नहीं। केवल 10 अंकों का मोबाइल नंबर और 4 अंकों का पिन।
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
                📊
              </div>
              <div>
                <strong style={{ fontSize: "1rem", color: "#ffffff" }}>पारदर्शी स्क्रैप स्पॉट रेट्स</strong>
                <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "0.2rem" }}>
                  मुंबई की प्रमुख मंडियों और CPCB अधिकृत रिसाइक्लर्स के वास्तविक दैनिक भाव देखें।
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: "2rem", borderTop: "1px solid rgba(255, 255, 255, 0.18)", marginTop: "2.5rem" }}>
          <div style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.75)" }}>
            संबद्ध क्लस्टर्स: धारावी, कुर्ला, मानखुर्द, गोवंडी, मलाड मालवणी
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Focused Authentication Form Pane */}
      <div className="auth-form-pane">
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "18px",
                backgroundColor: "var(--primary-100)",
                color: "var(--primary-800)",
                fontSize: "1.85rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              ♻️
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              कलेक्टर लॉगिन
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
              Sign in with your phone &amp; 4-digit PIN
            </p>

            <div style={{ marginTop: "1rem" }}>
              <CollectorControlToolbar
                compact={true}
                narrationId="login-narration"
                pageNarration={{
                  en: "Collector Sign In. Enter your 10-digit mobile number and 4-digit PIN. Tap Sign In to enter the portal.",
                  hi: "कलेक्टर साइन इन। अपना 10 अंकों का मोबाइल नंबर और 4 अंकों का सुरक्षा पिन दर्ज करें। आगे बढ़ने के लिए लॉगिन बटन दबाएं।",
                  mr: "कलेक्टर साइन इन. आपला 10 अंकी मोबाईल नंबर आणि 4 अंकी पिन टाका. पुढे जाण्यासाठी लॉगिन बटण दाबा.",
                }}
              />
            </div>
          </div>

          {searchParams.error && (
            <div className="alert alert-danger" style={{ marginBottom: "1.5rem" }}>
              ⚠️ {searchParams.error}
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
            <form action={collectorLoginAction} style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  फ़ोन नंबर / Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue="9820000001"
                  required
                  placeholder="10-digit mobile number"
                  className="form-control"
                  style={{ fontSize: "1.05rem", padding: "0.75rem 0.9rem" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.35rem" }}>
                  Demo Account: <code>9820000001</code>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  4-अंकों का पिन / 4-Digit Security PIN *
                </label>
                <input
                  type="password"
                  name="pin"
                  defaultValue="1234"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  placeholder="••••"
                  className="form-control"
                  style={{
                    fontSize: "1.6rem",
                    letterSpacing: "0.6rem",
                    textAlign: "center",
                    padding: "0.65rem",
                    fontWeight: 800,
                  }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--slate-500)", marginTop: "0.35rem", textAlign: "center" }}>
                  Demo Default PIN: <code>1234</code>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                style={{ marginTop: "0.5rem", padding: "0.85rem" }}
              >
                लॉगिन करें / Sign In &rarr;
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
              नया खाता बनाना है?{" "}
              <Link href="/collector/register" style={{ color: "var(--primary-700)", fontWeight: 700 }}>
                पंजीकरण करें &rarr;
              </Link>
            </div>
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "0.9rem 1rem",
              backgroundColor: "var(--primary-50)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--primary-border)",
              fontSize: "0.8rem",
              color: "var(--primary-900)",
              lineHeight: 1.5,
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🔒</span>
            <div>
              <strong>Privacy Protection:</strong> We never ask for Aadhaar or biometric data. Your phone number is strictly used for payment confirmation &amp; handover authentication.
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
