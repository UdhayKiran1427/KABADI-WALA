"use client";

import { HistoryFilters, type HistoryFilterValues } from "@/components/HistoryFilters";
import { useTxt } from "@/app/collector/ui";

interface Material {
  id: number;
  nameHi: string;
  nameEn: string;
  nameMr: string | null;
}

/** Recycler history filters with labels in the selected language. */
export function RecyclerHistoryFilters({ values, materials }: { values: HistoryFilterValues; materials: Material[] }) {
  const tx = useTxt();

  return (
    <HistoryFilters
      basePath="/recycler/history"
      values={values}
      statusOptions={[
        { value: "", label: tx({ hi: "सभी", en: "All", mr: "सर्व" }) },
        { value: "topay", label: tx({ hi: "पेमेंट बाकी", en: "To pay", mr: "पेमेंट बाकी" }) },
        { value: "paid", label: tx({ hi: "पेमेंट हो गया", en: "Paid", mr: "पेमेंट झाले" }) },
      ]}
      materialOptions={[
        { value: "", label: tx({ hi: "सभी सामान", en: "All materials", mr: "सर्व माल" }) },
        ...materials.map((m) => ({ value: String(m.id), label: tx({ hi: m.nameHi, en: m.nameEn, mr: m.nameMr }) })),
      ]}
      periodOptions={[
        { value: "", label: tx({ hi: "पूरा समय", en: "All time", mr: "सर्व काळ" }) },
        { value: "7d", label: tx({ hi: "पिछले 7 दिन", en: "Last 7 days", mr: "मागील 7 दिवस" }) },
        { value: "30d", label: tx({ hi: "पिछले 30 दिन", en: "Last 30 days", mr: "मागील 30 दिवस" }) },
        { value: "90d", label: tx({ hi: "पिछले 3 महीने", en: "Last 3 months", mr: "मागील 3 महिने" }) },
      ]}
      labels={{
        search: tx({
          hi: "कलेक्टर का नाम, फ़ोन या लॉट खोजें",
          en: "Search collector name, phone or lot",
          mr: "कलेक्टरचे नाव, फोन किंवा लॉट शोधा",
        }),
        searchButton: tx({ hi: "खोजें", en: "Search", mr: "शोधा" }),
        material: tx({ hi: "सामान", en: "Material", mr: "माल" }),
        period: tx({ hi: "समय", en: "Period", mr: "काळ" }),
        clear: tx({ hi: "हटाएं", en: "Clear", mr: "काढा" }),
      }}
    />
  );
}
