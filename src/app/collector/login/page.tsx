import Link from "next/link";
import { LogIn, Recycle, TriangleAlert } from "lucide-react";
import { collectorLoginAction } from "../actions";
import { PageVoice, T, VoiceControls } from "../ui";

export default async function CollectorLoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="c-auth">
      <PageVoice
        en="Sign in. Enter your mobile number and 4 digit PIN, then tap Sign in."
        hi="लॉगिन। अपना मोबाइल नंबर और 4 अंकों का पिन डालें, फिर लॉगिन दबाएं।"
        mr="लॉगिन. आपला मोबाईल नंबर आणि 4 अंकी पिन टाका, मग लॉगिन दाबा."
      />

      <div className="c-auth-top">
        <span className="c-brand-mark">
          <Recycle size={28} aria-hidden="true" />
        </span>
        <VoiceControls />
      </div>

      <h1 className="c-auth-title">
        <T hi="लॉगिन" en="Sign in" mr="लॉगिन" />
      </h1>

      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <TriangleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      <form action={collectorLoginAction} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.1rem", padding: "1.25rem" }}>
        <div>
          <label htmlFor="phone" className="form-label" style={{ fontWeight: 700 }}>
            <T hi="मोबाइल नंबर" en="Mobile number" mr="मोबाईल नंबर" />
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            inputMode="numeric"
            autoComplete="tel"
            required
            placeholder="98XXXXXXXX"
            className="form-control"
            style={{ fontSize: "1.2rem", padding: "0.75rem 0.9rem" }}
          />
        </div>

        <div>
          <label htmlFor="pin" className="form-label" style={{ fontWeight: 700 }}>
            <T hi="4 अंक पिन" en="4-digit PIN" mr="4 अंकी पिन" />
          </label>
          <input
            id="pin"
            type="password"
            name="pin"
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            required
            placeholder="••••"
            className="form-control"
            style={{ fontSize: "1.6rem", letterSpacing: "0.6rem", textAlign: "center", padding: "0.6rem", fontWeight: 800 }}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg c-btn-xl">
          <LogIn size={20} aria-hidden="true" />
          <T hi="लॉगिन" en="Sign in" mr="लॉगिन" />
        </button>
      </form>

      <Link href="/collector/register" className="btn btn-secondary btn-block btn-lg">
        <T hi="नया खाता बनाएं" en="Create account" mr="नवीन खाते" />
      </Link>
    </div>
  );
}
