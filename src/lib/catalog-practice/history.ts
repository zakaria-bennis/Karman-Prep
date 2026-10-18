export interface CatalogPracticeHistoryEntry {
  id: string;
  skillId: string;
  title: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  href: string;
}

export type CatalogPracticeHistory =
  | { status: "ready"; sessions: CatalogPracticeHistoryEntry[] }
  | { status: "unavailable" | "preview"; sessions: [] };
