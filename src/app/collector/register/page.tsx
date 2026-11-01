import Link from "next/link";
import { collectorRegisterAction } from "../actions";

export default async function CollectorRegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="auth-split-wrapper">
      {/* LEFT PANEL: Collector Value Proposition (Fills Wide Desktop Screen!) */}
      <div
        className="auth-sidebar-hero"
        style={{
          background: "linear-gradient(145deg, #064e3b 0%, #065f46 40%, #047857 100%)",
        }}
      >
        <div>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#ffffff", fontWeight: 800, fontSize: "1.2rem", textDecoration: "none" }}>
            <span>♻️</span>
            <span>KABADI WALA</span>
          </Link>

          <div style={{ marginTop: "3rem" }}>
            <span
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                padding: "0.35rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              कलेक्टर सशक्तिकरण &bull; Informal Waste Pickers
            </span>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "1rem", lineHeight: 1.2 }}>
              कचरे का सही दाम, सीधी नकद कमाई
            </h1>
            <p style={{ color: "#a7f3d0", fontSize: "1rem", lineHeight: 1.6, marginTop: "1rem", maxWidth: "480px" }}>
              मध्यस्थों और दलालों के बिना सीधे अधिकृत ई-कचरा रिसाइक्लर से जुड़ें। बिना किसी आधार या कागजात की अड़चन के सिर्फ मोबाइल नंबर से जुड़ें।
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "2.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                📈
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>आज के ताजा भाव (Daily Spot Rates)</strong>
                <div style={{ fontSize: "0.825rem", color: "#a7f3d0", marginTop: "0.15rem" }}>
                  तांबा, पीसीबी और बैटरियों के बाजार भाव रोज अपनी भाषा में देखें और सही दाम पाएं।
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                🔒
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>सुरक्षित 4-अंकों का पिन (PIN Security)</strong>
                <div style={{ fontSize: "0.825rem", color: "#a7f3d0", marginTop: "0.15rem" }}>
                  जब तक आप अपना पिन नहीं बताएंगे, तब तक कोई भी वजन या भुगतान दर्ज नहीं कर सकता।
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(255, 255, 255, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                💵
              </div>
              <div>
                <strong style={{ fontSize: "0.95rem" }}>हाथों-हाथ नकद भुगतान (Instant Cash)</strong>
                <div style={{ fontSize: "0.825rem", color: "#a7f3d0", marginTop: "0.15rem" }}>
                  फैक्ट्री के कांटे पर सही तौल होते ही पूरा भुगतान नकद या यूपीआई द्वारा तुरंत मिलेगा।
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", paddingTop: "1.5rem", marginTop: "3rem", fontSize: "0.8rem", color: "#6ee7b7" }}>
          पर्यावरण मंत्रालय एवं ई-कचरा नियम 2022 के तहत सुरक्षित व अधिकृत प्रक्रिया
        </div>
      </div>

      {/* RIGHT PANEL: Focused Clean Registration Form */}
      <div className="auth-form-pane">
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "480px",
            padding: "2.25rem 2rem",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--slate-200)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                backgroundColor: "var(--primary-100)",
                color: "var(--primary-800)",
                fontSize: "1.75rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              ♻️
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>
              नया कलेक्टर खाता बनाएं
            </h2>
            <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              कबाड़ीवाला ई-कचरा कलेक्टर पंजीकरण &bull; Sign Up
            </p>
          </div>

          {searchParams.error && (
            <div className="alert alert-danger" style={{ textAlign: "center", justifyContent: "center" }}>
              ⚠️ {searchParams.error}
            </div>
          )}

          <form action={collectorRegisterAction} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                फ़ोन नंबर / Mobile Phone <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="tel"
                name="phone"
                pattern="\d{10}"
                required
                placeholder="10-digit mobile number"
                className="form-control"
                style={{ fontSize: "1rem", padding: "0.75rem" }}
              />
              <div style={{ color: "var(--slate-500)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                केवल भुगतान सूचना और रेट अलर्ट एसएमएस के लिए उपयोग होगा।
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  4-अंकों का पिन <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="password"
                  name="pin"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  placeholder="••••"
                  className="form-control"
                  style={{
                    fontSize: "1.3rem",
                    letterSpacing: "0.3rem",
                    textAlign: "center",
                    padding: "0.6rem",
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  पिन दोहराएं <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="password"
                  name="confirmPin"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  placeholder="••••"
                  className="form-control"
                  style={{
                    fontSize: "1.3rem",
                    letterSpacing: "0.3rem",
                    textAlign: "center",
                    padding: "0.6rem",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  कार्य क्षेत्र / Area <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  name="operatingArea"
                  required
                  placeholder="e.g. Dharavi"
                  defaultValue="Dharavi"
                  className="form-control"
                  style={{ fontSize: "0.95rem", padding: "0.65rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  जिला / District
                </label>
                <input
                  type="text"
                  name="district"
                  defaultValue="Mumbai"
                  className="form-control"
                  style={{ fontSize: "0.95rem", padding: "0.65rem" }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                पसंदीदा भाषा / Preferred Language
              </label>
              <select
                name="preferredLanguage"
                defaultValue="HI"
                className="form-control"
                style={{ padding: "0.65rem", backgroundColor: "white" }}
              >
                <option value="HI">हिंदी (Hindi)</option>
                <option value="MR">मराठी (Marathi)</option>
                <option value="EN">English</option>
              </select>
            </div>

            <div
              style={{
                padding: "0.75rem 0.85rem",
                backgroundColor: "var(--slate-50)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--slate-200)",
                fontSize: "0.8rem",
              }}
            >
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="hasConsent"
                  defaultChecked
                  required
                  style={{ marginTop: "0.2rem", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                />
                <span style={{ color: "var(--slate-700)" }}>
                  <strong>सहमति / Consent:</strong> मैं ई-कचरा कलेक्टर के रूप में भाग लेने की सहमति देता हूँ। किसी आधार या पहचान पत्र की आवश्यकता नहीं है।
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: "0.5rem" }}
            >
              खाता बनाएं &bull; Register Now &rarr;
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.85rem", color: "var(--slate-600)" }}>
            पहले से खाता है?{" "}
            <Link href="/collector/login" style={{ color: "var(--primary-700)", fontWeight: 700 }}>
              लॉगिन करें &rarr;
            </Link>
          </div>

          <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.825rem" }}>
            <Link href="/" style={{ color: "var(--slate-500)", textDecoration: "none" }}>
              &larr; Back to Platform Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
