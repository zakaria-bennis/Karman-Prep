/*
 * Builds full-length test panels the way the digital SAT is built: for each section, one Module 1
 * and two Module 2s (easier and harder). Every module follows the measured blueprint: the same
 * Domain counts, skills in their release-exam proportions, a difficulty mix matching the real
 * module kind, and 2 unscored pretest slots hidden inside their Domain.
 *
 * Pure and deterministic: the same pool, options and seed give the same panel. Families never
 * repeat inside a panel, across the panels built in one call, or with `exclude`.
 */
import { stableHash } from "@/lib/catalog-practice/picker";
import {
  MODULE_SHAPE,
  difficultyCounts,
  difficultyMix,
  domainCounts,
  domainOrder,
  skillShares,
  type FormLevel,
  type ModuleKind,
} from "./blueprint";
import { paramsOf, type EngineItem, type Section } from "./params";
import { medianCut, routingRule, type RoutingRule } from "./routing";

export type Slot = { item: EngineItem; pretest: boolean };
export type AssembledModule = { kind: ModuleKind; slots: Slot[]; shortfall: number };
export type SectionPanel = {
  section: Section;
  level: FormLevel;
  module1: AssembledModule;
  easier: AssembledModule;
  harder: AssembledModule;
  routing: RoutingRule;
};

type Picker = { used: Set<string>; seed: string };

const seeded = (seed: string, id: string) => stableHash(`${seed}:${id}`);

/** Whole-number skill quotas inside one Domain, largest remainder, seeded tie-breaks. */
function skillQuotas(
  section: Section,
  domain: string,
  count: number,
  available: Set<string>,
  seed: string
): Map<string, number> {
  const shares = [...skillShares(section)]
    .filter(([id, v]) => v.domain === domain && available.has(id))
    .map(([id, v]) => ({ id, share: v.share }));
  // Skills in the pool but never seen on a release exam get no quota; with no shares at all,
  // spread evenly over what the pool has.
  const list = shares.length
    ? shares
    : [...available].map((id) => ({ id, share: 1 / Math.max(1, available.size) }));
  const total = list.reduce((s, x) => s + x.share, 0);
  const raw = list.map((x) => ({ ...x, x: (x.share * count) / total }));
  const quotas = new Map(raw.map((r) => [r.id, Math.floor(r.x)]));
  let left = count - [...quotas.values()].reduce((s, x) => s + x, 0);
  raw
    .sort((p, q) => (q.x % 1) - (p.x % 1) || seeded(seed, p.id) - seeded(seed, q.id))
    .forEach((r) => {
      if (left-- > 0) quotas.set(r.id, quotas.get(r.id)! + 1);
    });
  return quotas;
}

/** Picks the item whose rating is most behind its target; nearest rating when none is left. */
function pickByDifficulty(
  candidates: readonly EngineItem[],
  need: number[],
  picker: Picker
): EngineItem | null {
  let best: EngineItem | null = null;
  let bestScore = -Infinity;
  for (const item of candidates) {
    if (picker.used.has(item.family)) continue;
    const level = Math.max(1, Math.min(7, Math.round(item.difficulty))) - 1;
    // Deficit at this rating first; then closeness to the most-needed rating; seeded tie-break.
    const most = need.indexOf(Math.max(...need));
    const score =
      need[level] * 100 - Math.abs(level - most) * 10 - seeded(picker.seed, item.id) / 2 ** 32;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  if (best) {
    picker.used.add(best.family);
    need[Math.max(1, Math.min(7, Math.round(best.difficulty))) - 1]--;
  }
  return best;
}

function buildModule(
  pool: readonly EngineItem[],
  pretestPool: readonly EngineItem[],
  section: Section,
  kind: ModuleKind,
  level: FormLevel,
  picker: Picker
): AssembledModule {
  const shape = MODULE_SHAPE[section];
  const counts = domainCounts(section, kind, shape.size);
  const need = difficultyCounts(difficultyMix(section, kind, level), shape.size - shape.pretest);
  // Pretest slots go to the Domains with the most questions, so they blend in.
  const pretestDomains = [...counts.entries()]
    .sort((p, q) => q[1] - p[1] || seeded(picker.seed, p[0]) - seeded(picker.seed, q[0]))
    .slice(0, shape.pretest)
    .map(([d]) => d);
  const slots: Slot[] = [];
  let shortfall = 0;
  for (const domain of domainOrder(section)) {
    const inDomain = pool.filter((i) => i.domainId === domain);
    let pretest = pretestDomains.filter((d) => d === domain).length;
    const operational = (counts.get(domain) ?? 0) - pretest;
    const quotas = skillQuotas(
      section,
      domain,
      operational,
      new Set(inDomain.map((i) => i.skillId)),
      `${picker.seed}:${kind}:${domain}`
    );
    // Scarce skills first, so a rare skill is not starved by a common one.
    const order = [...quotas.entries()]
      .filter(([, q]) => q > 0)
      .sort(
        (p, q) =>
          inDomain.filter((i) => i.skillId === p[0]).length -
          inDomain.filter((i) => i.skillId === q[0]).length
      );
    for (const [skill, quota] of order) {
      const candidates = inDomain.filter((i) => i.skillId === skill);
      for (let n = 0; n < quota; n++) {
        const item =
          pickByDifficulty(candidates, need, picker) ?? pickByDifficulty(inDomain, need, picker);
        if (item) slots.push({ item, pretest: false });
        else shortfall++;
      }
    }
    while (pretest-- > 0) {
      const fromDomain = pretestPool.filter((i) => i.domainId === domain);
      const item = pickByDifficulty(fromDomain, [1, 1, 1, 1, 1, 1, 1], picker);
      if (item) slots.push({ item, pretest: true });
    }
  }
  return { kind, slots: orderModule(section, slots, picker.seed), shortfall };
}

/**
 * Question order, as in the Digital SAT Technical Manual: Reading and Writing goes Domain by
 * Domain in a fixed order, easier questions first inside each; Math runs easiest to hardest across
 * the whole module. Pretest questions sit at a seeded place, never in the first or last two.
 */
export function orderModule(section: Section, slots: readonly Slot[], seed: string): Slot[] {
  const rank = new Map(domainOrder(section).map((d, i) => [d, i]));
  const domainRank = (s: Slot) => (section === "reading" ? (rank.get(s.item.domainId) ?? 9) : 0);
  const key = (s: Slot) =>
    s.pretest ? 1 + (seeded(seed, s.item.id) % 6) : Math.round(s.item.difficulty);
  const ordered = [...slots].sort(
    (p, q) =>
      domainRank(p) - domainRank(q) ||
      key(p) - key(q) ||
      seeded(seed, p.item.id) - seeded(seed, q.item.id)
  );
  // Swap any pretest question at the ends with the nearest operational one inside.
  const last = ordered.length - 1;
  for (const edge of [0, 1, last - 1, last]) {
    if (!ordered[edge]?.pretest) continue;
    const step = edge <= 1 ? 1 : -1;
    for (let j = edge <= 1 ? 2 : last - 2; j > 1 && j < last - 1; j += step) {
      if (!ordered[j].pretest) {
        [ordered[edge], ordered[j]] = [ordered[j], ordered[edge]];
        break;
      }
    }
  }
  return ordered;
}

const operationalParams = (m: AssembledModule) =>
  m.slots.filter((s) => !s.pretest).map((s) => paramsOf(s.item));

export function assembleSection(
  pool: readonly EngineItem[],
  options: {
    section: Section;
    level: FormLevel;
    seed: string;
    used?: Set<string>;
    pretestPool?: readonly EngineItem[];
  }
): SectionPanel {
  const picker: Picker = { used: options.used ?? new Set(), seed: options.seed };
  const sectionPool = pool.filter((i) => i.section === options.section);
  const pretestPool = (options.pretestPool ?? []).filter((i) => i.section === options.section);
  const build = (kind: ModuleKind) =>
    buildModule(sectionPool, pretestPool, options.section, kind, options.level, {
      ...picker,
      seed: `${options.seed}:${kind}`,
    });
  const module1 = build("module1");
  const harder = build("harder");
  const easier = build("easier");
  return {
    section: options.section,
    level: options.level,
    module1,
    easier,
    harder,
    routing: routingRule(operationalParams(module1), medianCut(options.section)),
  };
}

export type Panel = { form: number; level: FormLevel; sections: SectionPanel[] };

/**
 * Builds `count` full-length panels from the reserved exam pool, in order, so later forms never
 * reuse an earlier form's families. Levels cycle through `levels`.
 */
export function assemblePanels(
  pool: readonly EngineItem[],
  options: {
    count: number;
    levels?: readonly FormLevel[];
    seed?: string;
    exclude?: Iterable<string>;
    pretestPool?: readonly EngineItem[];
  }
): Panel[] {
  const used = new Set(options.exclude ?? []);
  const levels = options.levels ?? ["standard", "hard"];
  return Array.from({ length: options.count }, (_, i) => {
    const form = i + 1;
    const level = levels[i % levels.length];
    return {
      form,
      level,
      sections: (["reading", "math"] as const).map((section) =>
        assembleSection(pool, {
          section,
          level,
          seed: `${options.seed ?? "karman-sat"}:${form}`,
          used,
          pretestPool: options.pretestPool,
        })
      ),
    };
  });
}
