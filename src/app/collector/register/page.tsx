import Link from "next/link";
import { Recycle, TriangleAlert, UserPlus } from "lucide-react";
import { collectorRegisterAction } from "../actions";
import { PageVoice, PreferredLanguageInput, T, VoiceControls } from "../ui";

const pinStyle = { fontSize: "1.4rem", letterSpacing: "0.4rem", textAlign: "center", padding: "0.6rem", fontWeight: 800 } as const;

export default async function CollectorRegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="c-auth">
      <PageVoice
        en="New account. Enter your name, mobile number, a 4 digit PIN twice, and your area. Then tap Create account."
        hi="नया खाता। अपना नाम, मोबाइल नंबर, 4 अंकों का पिन दो बार, और अपना इलाका डालें। फिर खाता बनाएं दबाएं।"
        mr="नवीन खाते. आपले नाव, मोबाईल नंबर, 4 अंकी पिन दोनदा, आणि आपला परिसर टाका. मग खाते बनवा दाबा."
      />

      <div className="c-auth-top">
        <span className="c-brand-mark">
          <Recycle size={28} aria-hidden="true" />
        </span>
        <VoiceControls />
      </div>

      <h1 className="c-auth-title">
        <T hi="नया खाता" en="New account" mr="नवीन खाते" />
      </h1>

      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <TriangleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      <form action={collectorRegisterAction} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem" }}>
        <div>
          <label htmlFor="name" className="form-label" style={{ fontWeight: 700 }}>
            <T hi="नाम" en="Name" mr="नाव" />
          </label>
          <input id="name" type="text" name="name" minLength={2} required autoComplete="name" className="form-control" style={{ fontSize: "1.1rem", padding: "0.75rem" }} />
        </div>

        <div>
          <label htmlFor="phone" className="form-label" style={{ fontWeight: 700 }}>
            <T hi="मोबाइल नंबर" en="Mobile number" mr="मोबाईल नंबर" />
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            inputMode="numeric"
            pattern="\d{10}"
            required
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            className="form-control"
            style={{ fontSize: "1.1rem", padding: "0.75rem" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "0.75rem" }}>
          <div>
            <label htmlFor="pin" className="form-label" style={{ fontWeight: 700 }}>
              <T hi="पिन" en="PIN" mr="पिन" />
            </label>
            <input id="pin" type="password" name="pin" inputMode="numeric" maxLength={4} pattern="\d{4}" required placeholder="••••" className="form-control" style={pinStyle} />
          </div>
          <div>
            <label htmlFor="confirmPin" className="form-label" style={{ fontWeight: 700 }}>
              <T hi="पिन फिर से" en="PIN again" mr="पिन पुन्हा" />
            </label>
            <input id="confirmPin" type="password" name="confirmPin" inputMode="numeric" maxLength={4} pattern="\d{4}" required placeholder="••••" className="form-control" style={pinStyle} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "0.75rem" }}>
          <div>
            <label htmlFor="operatingArea" className="form-label" style={{ fontWeight: 700 }}>
              <T hi="इलाका" en="Area" mr="परिसर" />
            </label>
            <input id="operatingArea" type="text" name="operatingArea" required defaultValue="Dharavi" className="form-control" style={{ padding: "0.7rem" }} />
          </div>
          <div>
            <label htmlFor="district" className="form-label" style={{ fontWeight: 700 }}>
              <T hi="ज़िला" en="District" mr="जिल्हा" />
            </label>
            <input id="district" type="text" name="district" defaultValue="Mumbai" className="form-control" style={{ padding: "0.7rem" }} />
          </div>
        </div>

        {/* Preferred language = the language picked at the top of the screen */}
        <PreferredLanguageInput name="preferredLanguage" />

        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.95rem", color: "var(--slate-700)", minHeight: "44px" }}>
          <input type="checkbox" name="hasConsent" defaultChecked required style={{ width: "22px", height: "22px", accentColor: "var(--primary)" }} />
          <T hi="मैं सहमत हूँ" en="I agree" mr="मी सहमत आहे" />
        </label>

        <button type="submit" className="btn btn-primary btn-block btn-lg c-btn-xl">
          <UserPlus size={20} aria-hidden="true" />
          <T hi="खाता बनाएं" en="Create account" mr="खाते बनवा" />
        </button>
      </form>

      <Link href="/collector/login" className="btn btn-secondary btn-block btn-lg">
        <T hi="पहले से खाता है? लॉगिन" en="Have an account? Sign in" mr="खाते आहे? लॉगिन" />
      </Link>
    </div>
  );
}
