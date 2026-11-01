"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface HistoryFilterValues {
  q: string;
  status: string;
  material: string;
  period: string;
}

interface HistoryFiltersProps {
  basePath: string;
  values: HistoryFilterValues;
  /** First option should be the "all" option with value "". */
  statusOptions: FilterOption[];
  materialOptions: FilterOption[];
  periodOptions: FilterOption[];
  labels: { search: string; searchButton: string; material: string; period: string; clear: string };
}

function hrefWith(basePath: string, values: HistoryFilterValues, patch: Partial<HistoryFilterValues>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...values, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Search box, status chips and material/period dropdowns for history lists.
 * Filters live in the URL query (q, status, material, period) so they survive refresh and back.
 */
export function HistoryFilters({ basePath, values, statusOptions, materialOptions, periodOptions, labels }: HistoryFiltersProps) {
  const hasFilters = Boolean(values.q || values.status || values.material || values.period);

  return (
    <div className="hf">
      <form action={basePath} method="get" className="hf-form">
        {values.status && <input type="hidden" name="status" value={values.status} />}

        <div className="hf-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={values.q}
            placeholder={labels.search}
            aria-label={labels.search}
            className="hf-search-input"
          />
          <button type="submit" className="btn btn-primary btn-sm">
            {labels.searchButton}
          </button>
        </div>

        <div className="hf-selects">
          <select
            name="material"
            defaultValue={values.material}
            aria-label={labels.material}
            className="form-control hf-select"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {materialOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            name="period"
            defaultValue={values.period}
            aria-label={labels.period}
            className="form-control hf-select"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {periodOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="hf-chips" role="group">
        {statusOptions.map((o) => {
          const active = values.status === o.value;
          return (
            <Link
              key={o.value || "all"}
              href={hrefWith(basePath, values, { status: o.value })}
              className={`hf-chip ${active ? "active" : ""}`}
              aria-current={active ? "true" : undefined}
            >
              {o.label}
            </Link>
          );
        })}
        {hasFilters && (
          <Link href={basePath} className="hf-chip hf-clear">
            <X size={14} aria-hidden="true" /> {labels.clear}
          </Link>
        )}
      </div>
    </div>
  );
}
