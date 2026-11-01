import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

export default function AdminLanguagePage() {
  return (
    <div className="r-stack" style={{ maxWidth: "760px", margin: "0 auto", width: "100%" }}>
      <h1 className="r-page-title">Language</h1>
      <LanguageSwitcher variant="card" />
      <Link href="/admin" className="btn btn-primary btn-lg" style={{ alignSelf: "center" }}>
        <ArrowLeft size={18} aria-hidden="true" /> Back to overview
      </Link>
    </div>
  );
}
