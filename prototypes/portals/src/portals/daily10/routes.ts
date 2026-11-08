import type { ScreenRoute } from "../../gallery/types.ts";

/**
 * The Daily 10 end screen, "Box first": one ending, started at each of its
 * moments so every state can be opened and photographed, plus the companion
 * engine on a question frame. The gallery's state switch picks the student
 * (long-time Maya, first-day Noah) and loading, error, empty or locked.
 * Erasable TypeScript only (no enums): scripts/shots.mjs imports this file.
 */
export const daily10Routes: ScreenRoute[] = [
  {
    id: "end",
    portal: "daily10",
    title: "End screen, box first",
    roles: ["student"],
    module: "daily10/screens/End.tsx",
  },
  {
    id: "companion",
    portal: "daily10",
    title: "New companion moment",
    roles: ["student"],
    module: "daily10/screens/NewCompanion.tsx",
  },
  {
    id: "end-no-companion",
    portal: "daily10",
    title: "End screen, no new companion",
    roles: ["student"],
    module: "daily10/screens/EndNoCompanion.tsx",
  },
  {
    id: "box",
    portal: "daily10",
    title: "Mystery box, open or save",
    roles: ["student"],
    module: "daily10/screens/Box.tsx",
  },
  {
    id: "prize",
    portal: "daily10",
    title: "Prize on the fox, wear or keep",
    roles: ["student"],
    module: "daily10/screens/Prize.tsx",
  },
  {
    id: "results",
    portal: "daily10",
    title: "Results",
    roles: ["student"],
    module: "daily10/screens/ResultsOnly.tsx",
  },
  {
    id: "results-no-box",
    portal: "daily10",
    title: "Results, no box yet",
    roles: ["student"],
    module: "daily10/screens/ResultsNoBox.tsx",
  },
  {
    id: "peek",
    portal: "daily10",
    title: "A question, with the companion",
    roles: ["student"],
    module: "daily10/screens/Peek.tsx",
  },
];
