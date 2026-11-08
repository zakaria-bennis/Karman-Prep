import path from "node:path";
import { PILOT_FILE_NAME, figurePilotDir, isFigurePilotEnabled } from "../../pilot-data";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { png: "image/png", svg: "image/svg+xml" };

/** Serves pilot images from the gitignored local folder. 404 in production builds. */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!isFigurePilotEnabled()) return new Response("Not found", { status: 404 });
  const { name } = await params;
  if (!PILOT_FILE_NAME.test(name)) return new Response("Not found", { status: 404 });
  const { readFile } = await import("node:fs/promises");
  try {
    const bytes = await readFile(path.join(figurePilotDir(), name));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": TYPES[name.split(".").pop()!],
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
