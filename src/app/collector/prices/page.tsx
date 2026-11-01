import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateCategoryPriceBoard } from "@/lib/domain/priceBoard";
import { VoiceSpeaker } from "@/components/voice/VoiceSpeaker";
import { VoicePriceRow } from "@/components/voice/VoicePriceRow";
import { CollectorControlToolbar } from "@/components/voice/CollectorControlToolbar";

export default async function CollectorPriceBoardPage() {
  await requireRole(["COLLECTOR", "ADMIN"]);

  const categories = await prisma.materialCategory.findMany({
    orderBy: { id: "asc" },
  });

  const now = new Date();
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const past14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const pricePoints = await prisma.pricePoint.findMany({
    where: {
      recordedAt: { gte: past14Days },
    },
    select: {
      categoryId: true,
      buyingPricePaise: true,
      recordedAt: true,
    },
  });

  const recyclerRates = await prisma.recyclerRate.findMany({
    where: { isCurrent: true },
    select: {
      categoryId: true,
      ratePerKgPaise: true,
    },
  });

  const boardData = categories.map((cat) => {
    const recentPrices = pricePoints
      .filter((p) => p.categoryId === cat.id && p.recordedAt >= past7Days)
      .map((p) => p.buyingPricePaise);

    const priorPrices = pricePoints
      .filter((p) => p.categoryId === cat.id && p.recordedAt < past7Days)
      .map((p) => p.buyingPricePaise);

    const catRecyclerRates = recyclerRates
      .filter((r) => r.categoryId === cat.id)
      .map((r) => r.ratePerKgPaise);

    const board = generateCategoryPriceBoard(cat.id, recentPrices, priorPrices, catRecyclerRates);

    return {
      category: cat,
      board,
    };
  });

  const narration = {
    en: "Today's e-waste market rates. Live buying prices from scrap markets and certified recyclers. Tap any material row to hear the rate per kilogram.",
    hi: "आज के ई-कचरा भाव। मुंबई स्क्रैप मंडी और अधिकृत रिसायकलर के आज के दर। किसी भी श्रेणी का भाव सुनने के लिए उस पर टैप करें।",
    mr: "आजचे ई-कचरा बाजार भाव. स्क्रॅप मार्केट आणि अधिकृत रिसायकलर्सचे थेट दर. भाव ऐकण्यासाठी कोणत्याही ओळीवर टॅप करा.",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Voice & Text Language Toolbar */}
      <CollectorControlToolbar pageNarration={narration} narrationId="prices-page-narration" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href="/collector"
            className="btn btn-secondary btn-sm"
            style={{ width: "36px", height: "36px", padding: 0, borderRadius: "50%" }}
          >
            &larr;
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--slate-900)", margin: 0, letterSpacing: "-0.01em" }}>
                आज के ई-कचरा भाव &bull; Daily Scrap Rates
              </h1>
              <VoiceSpeaker
                screenKey="C6_PRICE_BOARD"
                size="sm"
              />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--slate-500)" }}>
              मुम्बई स्क्रैप मार्केट एवं अधिकृत रिसाइक्लर स्पॉट रेट &bull; Transparent Daily Market Ticker
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/collector/create-lot" className="btn btn-sm btn-primary">
            📦 + नया लॉट बनाएं
          </Link>
        </div>
      </div>

      {/* Voice Instruction Banner */}
      <div
        style={{
          padding: "0.75rem 1rem",
          backgroundColor: "#f0fdf4",
          borderRadius: "var(--radius-md)",
          border: "1px solid #bbf7d0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.825rem",
          color: "#166534",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          🔊 किसी भी पंक्ति पर टैप करके भाव सुनें (Tap any card to hear rate in Hindi or Marathi)
        </span>
        <span className="badge badge-success">✓ Updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
      </div>

      {/* 2-Column Responsive Dashboard Grid (Fills 100% of desktop screens!) */}
      <div className="collector-layout-wrapper">
        {/* LEFT COLUMN: Interactive Voice Price Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 }}>
          <div className="grid-1" style={{ gap: "0.75rem" }}>
            {boardData.map(({ category, board }) => {
              const rateRupees = (board.currentMedianPaise / 100).toFixed(0);
              const lowRupees = (board.marketLowPaise / 100).toFixed(0);
              const highRupees = (board.marketHighPaise / 100).toFixed(0);

              return (
                <VoicePriceRow
                  key={category.id}
                  id={String(category.id)}
                  nameEn={category.nameEn}
                  nameHi={category.nameHi}
                  nameMr={category.nameMr || undefined}
                  code={category.code}
                  rateRupees={rateRupees}
                  lowRupees={lowRupees}
                  highRupees={highRupees}
                  trend={board.trend}
                  isHazardous={category.isHazardous}
                />
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Market Intelligence & Scrap Selling Tips (Fills Desktop Space!) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>
          {/* Best Price Tips */}
          <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid var(--primary)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--slate-900)", marginBottom: "0.6rem" }}>
              💡 ज्यादा कमाई के 3 नियम
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "var(--slate-600)" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>1️⃣</span>
                <span><strong>सर्किट बोर्ड अलग रखें:</strong> मोबाइल व कंप्यूटर PCB का भाव ₹340–₹450/kg है। इसे लोहे या प्लास्टिक में न मिलाएं।</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>2️⃣</span>
                <span><strong>तांबे के तार अलग छीलें:</strong> तांबे का स्क्रैप ₹650+/kg बिकता है। मिक्स तार का भाव आधा मिलता है।</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span>3️⃣</span>
                <span><strong>सीधे रिसाइक्लर को बेचें:</strong> बिचौलिये कबाड़ी से 20%–35% ज्यादा भाव अधिकृत रिसाइक्लर गेट पर मिलता है।</span>
              </div>
            </div>
          </div>

          {/* Hazardous Scrap Warning */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#92400e", marginBottom: "0.4rem" }}>
              ⚠️ बैटरी व स्क्रीन सुरक्षा
            </h3>
            <p style={{ fontSize: "0.775rem", color: "#b45309", lineHeight: 1.5 }}>
              लीथियम बैटरी कभी हथौड़े से न तोड़ें — इसमें आग लगने का खतरा होता है। पुरानी टीवी व सीआरटी स्क्रीन के अंदर जहरीला सीसा (Lead) होता है, इसे सुरक्षित बोरी में रखें।
            </p>
          </div>

          {/* Rate Update Methodology */}
          <div className="card" style={{ padding: "1.25rem", backgroundColor: "var(--slate-50)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--slate-800)", marginBottom: "0.4rem" }}>
              📊 भाव कैसे तय होते हैं?
            </h3>
            <p style={{ fontSize: "0.775rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
              यह भाव धारावी, कुर्ला व मानखुर्द की कबाड़ी दुकानों से फील्ड एजेंटों द्वारा दर्ज किए गए वास्तविक स्पॉट रेट्स और CPCB अधिकृत रिसाइक्लर्स की सीधी खरीद दरों का 7-दिवसीय औसत (Median) हैं।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
