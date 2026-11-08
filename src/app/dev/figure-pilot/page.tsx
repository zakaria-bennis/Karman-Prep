import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FigurePilotClient from "./FigurePilotClient";
import { isFigurePilotEnabled, loadFigurePilot } from "./pilot-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Figure pilot", robots: { index: false } };

/** Dev-only: original question images beside the real quiz renderer. 404 in production. */
export default async function FigurePilotPage() {
  if (!isFigurePilotEnabled()) notFound();
  const items = await loadFigurePilot();
  if (!items) {
    return (
      <main className="min-h-screen bg-night p-8 text-ivory">
        <h1 className="text-lg font-semibold">Figure pilot</h1>
        <p className="mt-2 text-sm text-taupe">
          No pilot data found. Put pilot.json and its images in .figure-pilot/ (gitignored) or set
          FIGURE_PILOT_DIR.
        </p>
      </main>
    );
  }
  return <FigurePilotClient items={items} />;
}
