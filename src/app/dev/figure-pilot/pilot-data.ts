import "server-only";

import path from "node:path";
import type { StudentQuizQuestion } from "@/types/quiz";

// Dev-only figure pilot. The data (source PNGs, recreated SVGs, transcribed
// questions) is College Board material, so it lives in a gitignored folder
// that only exists on the founder's machine: never in the repo or a build.

export interface FigurePilotItem {
  occurrence_id: string;
  source_png_sha256: string;
  /** File name of the original question image inside the pilot folder. */
  original: string;
  figure_type: string;
  format: string;
  answer: string;
  notes: string;
  question: StudentQuizQuestion;
}

export const PILOT_FILE_NAME = /^[A-Za-z0-9_-]+\.(png|svg)$/;

export function isFigurePilotEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function figurePilotDir() {
  return process.env.FIGURE_PILOT_DIR ?? path.join(process.cwd(), ".figure-pilot");
}

export async function loadFigurePilot(): Promise<FigurePilotItem[] | null> {
  const { readFile } = await import("node:fs/promises");
  try {
    const raw = await readFile(path.join(figurePilotDir(), "pilot.json"), "utf8");
    const parsed = JSON.parse(raw) as { items?: FigurePilotItem[] };
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}
