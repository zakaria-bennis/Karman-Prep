// ============================================================
// Curriculum types — shared between the per-subject raw data
// (reading-writing.ts, math.ts) and the assembly logic in index.ts.
// ============================================================

import type { SATDomain } from "@/lib/question-bank/taxonomy";

export type Subject = "reading" | "math";
export type Tier = 1 | 2 | 3;

/** Status values stored in `learn_node_status.status`. */
export type NodeStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "partially_complete" // First quiz pass (≥80 %). Star brightens.
  | "mastered"; // Second consecutive pass. Full brightness.

export interface CurriculumNode {
  id: string; // e.g. "rw-00", "ma-15"
  subject: Subject;
  tier: Tier;
  topic: string;
  /** Kebab-case slug derived from `topic`. 1:1 with the question-bank
   *  taxonomy; the routine emits this value in `concept_slug` and the
   *  importer matches questions back to the node by it. */
  concept_slug: string;
  /** SAT domain. 1:1 with `SAT_DOMAINS` in lib/question-bank/taxonomy.ts. */
  domain: SATDomain;
  description: string;
  difficulty: 1 | 2 | 3;
  x: number; // normalized 0–1 for constellation map
  y: number; // normalized 0–1 for constellation map
  prereqIds: string[]; // IDs of nodes that must be mastered first
  topic_cluster: string; // admin grouping inside a tier (used to sort quiz questions + tutor filters)
  textbook_content?: string; // Markdown + KaTeX for lesson overlay
  desmos_strategy?: string; // Math nodes only
  video_url?: string | null; // placeholder — null until Mux/video pipeline exists
  estimated_video_length_seconds?: number; // shown in lesson header, default 6 min
}

/** Internal shape used by the per-subject raw arrays before positions
 *  and content overrides are baked in. `subject` is set by the
 *  assembly step in index.ts, not by the raw data. */
export interface RawNode {
  id: string;
  subject: Subject;
  tier: Tier;
  difficulty: 1 | 2 | 3;
  topic: string;
  concept_slug: string;
  domain: SATDomain;
  description: string;
  prereqIds: string[];
  topic_cluster?: string;
  textbook_content?: string;
  desmos_strategy?: string;
  video_url?: string | null;
  estimated_video_length_seconds?: number;
}

export type AtmosphereTier = "Troposphere" | "Mesosphere" | "Stratosphere" | "Kármán Line";
