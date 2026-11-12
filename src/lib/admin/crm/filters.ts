// ============================================================
// Admin CRM: the list's filters, read from the address bar so a
// filtered view can be bookmarked. Pure; tested in model.test.ts.
// ============================================================

import { PLAN_IDS, type PlanId } from "@/lib/admin/plans";
import { CONTACT_TYPES, STAGES, type Contact, type ContactType, type Stage } from "./types";

export interface CrmFilters {
  view: "list" | "board";
  type: ContactType | "all";
  stage: Stage | "all";
  source: string;
  plan: PlanId | "none" | "all";
  tag: string;
  q: string;
}

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
const pick = <T extends string>(v: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

const notAll = (v: string) => (v === "all" ? "" : v);

export function parseFilters(sp: Params): CrmFilters {
  return {
    view: one(sp.view) === "board" ? "board" : "list",
    type: pick(one(sp.type), ["all", ...CONTACT_TYPES], "all"),
    stage: pick(one(sp.stage), ["all", ...STAGES], "all"),
    source: notAll(one(sp.source)).slice(0, 40),
    plan: pick(one(sp.plan), ["all", "none", ...PLAN_IDS], "all"),
    tag: notAll(one(sp.tag).toLowerCase()).slice(0, 30),
    q: one(sp.q).slice(0, 100),
  };
}

export function filterContacts(contacts: Contact[], f: CrmFilters): Contact[] {
  const needle = f.q.toLowerCase();
  return contacts.filter(
    (c) =>
      (f.type === "all" || c.type === f.type) &&
      (f.stage === "all" || c.stage === f.stage) &&
      (!f.source || c.sources.includes(f.source)) &&
      (f.plan === "all" || (f.plan === "none" ? c.plan === null : c.plan === f.plan)) &&
      (!f.tag || c.tags.includes(f.tag)) &&
      (!needle ||
        c.name.toLowerCase().includes(needle) ||
        (c.email ?? "").includes(needle) ||
        c.tags.some((t) => t.includes(needle)))
  );
}

/** The address for the same filters with some changed. Empty and "all" values are left out. */
export function filterHref(f: CrmFilters, change: Partial<CrmFilters>): string {
  const next = { ...f, ...change };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v && v !== "all" && !(k === "view" && v === "list")) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/admin/crm?${qs}` : "/admin/crm";
}

/** Route ids are u-, l- or pe- followed by a UUID. */
export function isContactRouteId(id: string): boolean {
  return /^(u|l|pe)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
