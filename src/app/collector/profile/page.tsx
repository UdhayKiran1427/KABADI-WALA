import { redirect } from "next/navigation";
import { CircleAlert, CircleCheck, LogOut, Save } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { collectorLogoutAction, updateCollectorProfileAction } from "../actions";
import { PageTitle, PageVoice, T } from "../ui";

export default async function CollectorProfilePage(props: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const { user } = await requireRole(["COLLECTOR"]);
  const searchParams = await props.searchParams;

  const collector = await prisma.collector.findUnique({
    where: { userId: user.userId },
    include: { user: { select: { phone: true, createdAt: true } } },
  });
  if (!collector) {
    redirect("/collector");
  }

  const [lotCount, earned] = await Promise.all([
    prisma.lot.count({ where: { collectorId: collector.id } }),
    prisma.lot.aggregate({ where: { collectorId: collector.id, status: "COMPLETED" }, _sum: { finalPricePaise: true } }),
  ]);
  const earnedRupees = ((earned._sum.finalPricePaise ?? 0) / 100).toLocaleString("en-IN");
  const displayName = collector.name || `Collector ${collector.shortCode}`;

  return (
    <div className="c-page">
      <PageVoice
        en={`My profile. ${displayName}. Phone ${collector.user.phone}. Area ${collector.operatingArea}.`}
        hi={`मेरी प्रोफ़ाइल। ${displayName}। फ़ोन ${collector.user.phone}। क्षेत्र ${collector.operatingArea}।`}
        mr={`माझी प्रोफाइल. ${displayName}. फोन ${collector.user.phone}. क्षेत्र ${collector.operatingArea}.`}
      />
      <PageTitle title={{ hi: "मेरी प्रोफ़ाइल", en: "My profile", mr: "माझी प्रोफाइल" }} back="/collector" />

      {searchParams.success && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <CircleCheck size={18} aria-hidden="true" /> {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <CircleAlert size={18} aria-hidden="true" /> {searchParams.error}
        </div>
      )}

      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="c-profile-head">
          <span className="c-avatar" style={{ width: 64, height: 64, fontSize: "1.75rem" }} aria-hidden="true">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--slate-900)", overflowWrap: "anywhere" }}>{displayName}</div>
            <div style={{ color: "var(--slate-600)" }}>{collector.user.phone}</div>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <div className="c-kv">
            <span><T hi="मेरा कोड" en="My code" mr="माझा कोड" /></span>
            <span>{collector.shortCode}</span>
          </div>
          <div className="c-kv">
            <span><T hi="कुल लॉट" en="Total lots" mr="एकूण लॉट" /></span>
            <span>{lotCount}</span>
          </div>
          <div className="c-kv">
            <span><T hi="कुल कमाई" en="Total earned" mr="एकूण कमाई" /></span>
            <span>₹{earnedRupees}</span>
          </div>
          <div className="c-kv" style={{ borderBottom: 0 }}>
            <span><T hi="सदस्य बने" en="Member since" mr="सदस्य झाले" /></span>
            <span>{collector.user.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      <form action={updateCollectorProfileAction} className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <h2 className="c-section-title" style={{ margin: 0 }}>
          <T hi="जानकारी बदलें" en="Edit details" mr="माहिती बदला" />
        </h2>
        <label className="form-group" style={{ marginBottom: 0 }}>
          <span className="form-label"><T hi="नाम" en="Name" mr="नाव" /></span>
          <input name="name" defaultValue={collector.name ?? ""} required minLength={2} maxLength={60} className="form-control" />
        </label>
        <label className="form-group" style={{ marginBottom: 0 }}>
          <span className="form-label"><T hi="क्षेत्र" en="Area" mr="क्षेत्र" /></span>
          <input name="operatingArea" defaultValue={collector.operatingArea} required minLength={2} maxLength={80} className="form-control" />
          <span className="c-hint">
            <T
              hi="GPS न मिलने पर इसी क्षेत्र के पास के रिसाइक्लर खोजे जाते हैं।"
              en="Used to find nearby recyclers when GPS is off."
              mr="GPS नसताना याच क्षेत्राजवळ रिसायकलर शोधले जातात."
            />
          </span>
        </label>
        <label className="form-group" style={{ marginBottom: 0 }}>
          <span className="form-label"><T hi="ज़िला" en="District" mr="जिल्हा" /></span>
          <input name="district" defaultValue={collector.district ?? ""} maxLength={60} className="form-control" />
        </label>
        <button type="submit" className="btn btn-primary btn-lg btn-block">
          <Save size={18} aria-hidden="true" /> <T hi="सेव करें" en="Save" mr="सेव्ह करा" />
        </button>
      </form>

      <form action={collectorLogoutAction}>
        <button type="submit" className="btn btn-secondary btn-block" style={{ color: "var(--danger)" }}>
          <LogOut size={18} aria-hidden="true" /> <T hi="लॉगआउट" en="Sign out" mr="लॉगआउट" />
        </button>
      </form>
    </div>
  );
}
