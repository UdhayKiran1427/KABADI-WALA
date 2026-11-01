import Link from "next/link";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default function CollectorLanguageSelectPage() {
  return (
    <div
      style={{
        minHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "1rem",
        maxWidth: "720px",
        margin: "0 auto",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          padding: "2rem 1.5rem",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          border: "1px solid var(--slate-200)",
          textAlign: "center",
        }}
      >
        {/* Header with Speaker */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ width: "38px" }}></div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>♻️</div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--slate-900)", margin: 0 }}>
              Select Language &bull; भाषा चुनें &bull; भाषा निवडा
            </h1>
            <div style={{ fontSize: "0.85rem", color: "var(--slate-500)", marginTop: "0.25rem" }}>
              Choose English, Hindi, or Marathi for audio and text
            </div>
          </div>
          {/* C1 Speaker Icon */}
          <VoiceSpeaker screenKey="C1_LANGUAGE" size="md" />
        </div>

        {/* Audio helper notice */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "0.6rem 0.85rem",
            fontSize: "0.825rem",
            color: "#166534",
            marginBottom: "1.75rem",
            fontWeight: 600,
          }}
        >
          🔊 Listen with speaker icon, then select your language &bull; स्पीकर दबाकर आवाज सुनें
        </div>

        {/* Trilingual Large Language Cards */}
        <LanguageSwitcher variant="card" />

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            href="/collector"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", fontSize: "1.1rem", fontWeight: 800 }}
          >
            Continue &bull; आगे बढ़ें &bull; पुढे जा &rarr;
          </Link>

          <Link
            href="/collector/login"
            style={{ fontSize: "0.85rem", color: "var(--slate-500)", textDecoration: "none", fontWeight: 600 }}
          >
            लॉगिन पेज पर जाएं (Go to Sign In)
          </Link>
        </div>
      </div>
    </div>
  );
}
