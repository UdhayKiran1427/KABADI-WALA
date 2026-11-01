"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, IndianRupee, Inbox, MapPin, PackagePlus, ShieldAlert, Truck } from "lucide-react";
import { LotStatusBadge, PageVoice, useTxt, type Txt } from "./ui";

interface CollectorDashboardClientProps {
  lots: Array<{
    id: string;
    approxWeightGrams: number;
    status: string;
    estimatedValuePaise: number | null;
    finalPricePaise: number | null;
    category: { nameEn: string; nameHi: string; nameMr?: string | null };
    /** Number of materials in the lot (0 for lots created before multi-material lots) */
    _count: { items: number };
  }>;
  hasMore: boolean;
}

const MORE: Array<{ href: string; label: Txt; Icon: typeof Truck }> = [
  { href: "/collector/prices", label: { hi: "आज के भाव", en: "Prices", mr: "आजचे भाव" }, Icon: IndianRupee },
  { href: "/collector/safety", label: { hi: "सुरक्षा", en: "Safety", mr: "सुरक्षा" }, Icon: ShieldAlert },
  { href: "/collector/drop-points", label: { hi: "ड्रॉप पॉइंट", en: "Drop points", mr: "ड्रॉप पॉइंट" }, Icon: MapPin },
  { href: "/collector/pickup-requests", label: { hi: "पिकअप", en: "Pickups", mr: "पिकअप" }, Icon: Truck },
];

export function CollectorDashboardClient({ lots, hasMore }: CollectorDashboardClientProps) {
  const tx = useTxt();
  const open = lots.filter((l) => ["DRAFT", "READY", "MATCHED"].includes(l.status)).length;

  return (
    <div className="c-page">
      <PageVoice
        en={`You have ${open} open lots. Tap New lot to sell scrap. Tap a lot to see its status.`}
        hi={`आपके ${open} लॉट चालू हैं। कबाड़ बेचने के लिए नया लॉट दबाएं। लॉट की स्थिति देखने के लिए उस पर दबाएं।`}
        mr={`तुमचे ${open} लॉट चालू आहेत. भंगार विकण्यासाठी नवीन लॉट दाबा. लॉटची स्थिती पाहण्यासाठी त्यावर दाबा.`}
      />

      <Link href="/collector/create-lot" className="c-big-action">
        <PackagePlus size={32} aria-hidden="true" />
        <span>{tx({ hi: "नया लॉट", en: "New lot", mr: "नवीन लॉट" })}</span>
      </Link>

      <section style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <h2 className="c-section-title">{tx({ hi: "मेरे लॉट", en: "My lots", mr: "माझे लॉट" })}</h2>

        {lots.length === 0 ? (
          <div className="card c-empty">
            <Inbox size={36} aria-hidden="true" />
            <div>{tx({ hi: "अभी कोई लॉट नहीं", en: "No lots yet", mr: "अजून लॉट नाही" })}</div>
          </div>
        ) : (
          lots.map((lot) => {
            const amount = (lot.finalPricePaise ?? lot.estimatedValuePaise ?? 0) / 100;
            return (
              <Link key={lot.id} href={`/collector/lots/${lot.id}`} className="card c-lot-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="c-lot-name">
                    {tx({ hi: lot.category.nameHi, en: lot.category.nameEn, mr: lot.category.nameMr })}
                    {lot._count.items > 1 && <span style={{ color: "var(--slate-500)", fontWeight: 600 }}> +{lot._count.items - 1}</span>}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>
                    {(lot.approxWeightGrams / 1000).toFixed(1)} kg &middot; ₹{amount.toLocaleString("en-IN")}
                  </div>
                </div>
                <LotStatusBadge status={lot.status} />
                <ChevronRight size={20} aria-hidden="true" style={{ color: "var(--slate-400)", flexShrink: 0 }} />
              </Link>
            );
          })
        )}

        {hasMore && (
          <Link href="/collector/ledger" className="btn btn-secondary btn-block">
            {tx({ hi: "ऑर्डर इतिहास देखें", en: "See order history", mr: "ऑर्डर इतिहास पहा" })}
          </Link>
        )}
      </section>

      <nav className="c-more-grid" aria-label={tx({ hi: "और", en: "More", mr: "अधिक" })}>
        {MORE.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="c-more-tile">
            <Icon size={22} aria-hidden="true" />
            <span>{tx(label)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
