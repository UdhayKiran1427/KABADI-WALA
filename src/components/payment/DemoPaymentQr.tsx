import { headers } from "next/headers";
import QRCode from "qrcode";
import { ScanLine } from "lucide-react";
import { rupeesIN } from "@/lib/format";
import { T } from "@/app/collector/ui";

/**
 * DEMO payment QR. Scanning it (or tapping the link) opens /pay/[token],
 * which records a demo payment and shows the invoice.
 * The URL uses the host the page was opened on, so open the app via your LAN IP to scan from a phone.
 */
export async function DemoPaymentQr({ token, amountPaise, caption }: { token: string; amountPaise: number; caption: React.ReactNode }) {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const payUrl = `${proto}://${host}/pay/${token}`;
  const svg = await QRCode.toString(payUrl, { type: "svg", margin: 1, width: 220 });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--primary-800)", lineHeight: 1.1 }}>
        ₹{rupeesIN(amountPaise)}
      </div>
      <div style={{ fontSize: "0.9rem", color: "var(--slate-600)" }}>{caption}</div>
      <div
        role="img"
        aria-label="Payment QR code"
        style={{ width: 220, maxWidth: "100%", aspectRatio: "1 / 1", padding: 8, background: "#ffffff", border: "1px solid var(--slate-200)", borderRadius: "var(--radius)" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <a href={`/pay/${token}`} className="btn btn-primary">
        <ScanLine size={18} aria-hidden="true" /> <T hi="अभी पेमेंट करें (डेमो)" en="Pay now (demo)" mr="आता पेमेंट करा (डेमो)" />
      </a>
      <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
        <T hi="डेमो – असली पैसे नहीं" en="Demo – no real money" mr="डेमो – खरे पैसे नाहीत" />
      </span>
    </div>
  );
}
