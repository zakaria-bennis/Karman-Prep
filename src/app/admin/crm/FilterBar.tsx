"use client";

// The CRM's filters: a plain GET form (bookmarkable, works without JavaScript) that applies itself
// when a menu changes. Search applies on Enter.
import { useRef } from "react";
import type { CrmFilters } from "@/lib/admin/crm/filters";

export interface FilterOption {
  value: string;
  label: string;
}

export default function FilterBar({
  filters,
  types,
  stages,
  sources,
  plans,
  tags,
}: {
  filters: CrmFilters;
  types: FilterOption[];
  stages: FilterOption[];
  sources: FilterOption[];
  plans: FilterOption[];
  tags: FilterOption[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const apply = () => form.current?.requestSubmit();
  const menu = (name: keyof CrmFilters, label: string, all: string, options: FilterOption[]) => (
    <label className="crm-filter">
      <span>{label}</span>
      <select name={name} defaultValue={String(filters[name] || "all")} onChange={apply}>
        <option value="all">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form ref={form} className="crm-filters" action="/admin/crm" method="get" role="search">
      {filters.view === "board" && <input type="hidden" name="view" value="board" />}
      <label className="crm-filter crm-search">
        <span>Search</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Name, email or tag"
          maxLength={100}
        />
      </label>
      {menu("type", "Type", "Everyone", types)}
      {menu("stage", "Stage", "Every stage", stages)}
      {menu("source", "Source", "Any source", sources)}
      {menu("plan", "Plan", "Any plan", plans)}
      {tags.length > 0 && menu("tag", "Tag", "Any tag", tags)}
      <noscript>
        <button type="submit" className="kp-link">
          Filter
        </button>
      </noscript>
    </form>
  );
}
