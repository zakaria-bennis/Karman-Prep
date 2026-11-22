"use client";

// The Daily 10's picture of today (DailyStart.tsx): the portal's own live landscape, real sunlight and
// shade, trees, meadows in flower, water (founder, 2026-11-20: "photorealistic light and more intricate
// details in the flora and fauna", no drawn eclipse of a moon). A different land every day, dealt from
// the date, from the greenest ones. The window itself is WorldWindow.tsx.
import { WorldWindow } from "./WorldWindow";

/** The lands with the most life in them: flowers, trees, water. */
const LANDS = [
  "flower-fields",
  "alpine-valley",
  "blossom-grove",
  "green-hills",
  "lavender-fields",
  "autumn-forest",
  "pine-forest",
  "wetlands",
  "rice-terraces",
  "lagoon",
  "savanna",
  "bamboo-forest",
];

export function DailyWorld({ day }: { day: Date }) {
  const seed = day.getFullYear() * 400 + day.getMonth() * 32 + day.getDate();
  return <WorldWindow land={LANDS[seed % LANDS.length]} from={40 + (seed % 89) * 5} />;
}
