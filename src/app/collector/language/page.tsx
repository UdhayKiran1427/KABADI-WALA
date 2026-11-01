import Link from "next/link";
import { ArrowRight, Languages } from "lucide-react";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default function CollectorLanguageSelectPage() {
  return (
    <div className="c-page" style={{ paddingTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Languages size={24} aria-hidden="true" />
          भाषा &middot; Language
        </h1>
        <VoiceSpeaker screenKey="C1_LANGUAGE" size="lg" />
      </div>

      <LanguageSwitcher variant="card" />

      <Link href="/collector" className="btn btn-primary btn-lg btn-block c-btn-xl">
        आगे &middot; Next
        <ArrowRight size={20} aria-hidden="true" />
      </Link>
    </div>
  );
}
