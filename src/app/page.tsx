import Link from "next/link";
import { ChevronRight, Factory, Recycle, ShieldCheck, Smartphone } from "lucide-react";
import { LanguageSwitcher } from "@/components/voice/LanguageSwitcher";

const ROLES = [
  { href: "/collector/login", icon: Smartphone, title: "Collector", sub: "कलेक्टर · Sell your scrap" },
  { href: "/recycler/login", icon: Factory, title: "Recycler", sub: "Buy scrap near you" },
  { href: "/admin/login", icon: ShieldCheck, title: "Admin", sub: "Prices and recyclers" },
];

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className="r-role-icon" style={{ width: 64, height: 64, borderRadius: 18 }}>
            <Recycle size={34} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--slate-900)" }}>E-Waste Saathi</h1>
          <p style={{ color: "var(--slate-600)", fontSize: "1.05rem" }}>
            Sell e-waste scrap to nearby recyclers at a fair price.
          </p>
          <LanguageSwitcher />
        </div>

        <nav aria-label="Sign in" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <Link key={role.href} href={role.href} className="r-role-card">
                <span className="r-role-icon">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: "1.1rem" }}>{role.title}</span>
                  <span style={{ display: "block", fontSize: "0.85rem", color: "var(--slate-500)" }}>{role.sub}</span>
                </span>
                <ChevronRight size={20} color="var(--slate-400)" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        <div style={{ textAlign: "center", fontSize: "0.85rem" }}>
          <Link href="/field/login" style={{ color: "var(--slate-500)", textDecoration: "underline" }}>
            Field agent sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
