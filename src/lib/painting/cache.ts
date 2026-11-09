/*
 * Finished paintings, kept so the next page shows the day's painting at once instead of painting
 * it again (founder, 2026-11-08: "loading is slow"). Two layers:
 *   - memory, for moves between portal pages in the same tab (no decode at all);
 *   - the browser's Cache Storage, for a reload or a new tab the same day (one image decode, off
 *     the main thread).
 * A painting is keyed by the day, the scene, the light, the season and the canvas size, so a new
 * day, a new hour band or a resized window paints afresh. Older days are dropped on save.
 */
import type { PaintingColors } from "./colors";
import type { PaintingChoice } from "./schedule";

export interface CachedPainting {
  bitmap: ImageBitmap;
  colors: PaintingColors | null;
  tone: "light" | "dark" | null;
}

const CACHE = "karman-paintings-v1";
const PREFIX = "/__karman-painting/";
const memory = new Map<string, CachedPainting>();

/** The canvas size paintPicture uses for this window (device pixels, capped at 1.5x). */
export function paintSize(): [number, number] {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  return [
    Math.max(1, Math.round((window.innerWidth || 1440) * dpr)),
    Math.max(1, Math.round((window.innerHeight || 900) * dpr)),
  ];
}

/** Draws a cached painting onto the canvas, sized to it. */
export function drawCached(canvas: HTMLCanvasElement, hit: CachedPainting) {
  canvas.width = hit.bitmap.width;
  canvas.height = hit.bitmap.height;
  canvas.getContext("2d")?.drawImage(hit.bitmap, 0, 0);
}

export function paintingKey(choice: PaintingChoice, w: number, h: number, day = new Date()) {
  const d = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
  return `${d}/${choice.scene}-${choice.time}-${choice.season}/${w}x${h}`;
}

function caches_(): CacheStorage | null {
  try {
    return typeof caches === "undefined" ? null : caches;
  } catch {
    return null;
  }
}

/** The painting from memory, at once, or null. */
export function cachedNow(key: string): CachedPainting | null {
  return memory.get(key) ?? null;
}

/** The painting from memory or the browser's cache, or null. Never throws. */
export async function cachedPainting(key: string): Promise<CachedPainting | null> {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const store = await caches_()?.open(CACHE);
    const res = await store?.match(PREFIX + key);
    if (!res) return null;
    const meta = JSON.parse(res.headers.get("x-karman-meta") ?? "{}") as {
      colors?: PaintingColors | null;
      tone?: "light" | "dark" | null;
    };
    const bitmap = await createImageBitmap(await res.blob());
    const found = { bitmap, colors: meta.colors ?? null, tone: meta.tone ?? null };
    memory.set(key, found);
    return found;
  } catch {
    return null;
  }
}

/** Keeps a finished painting. The image encode runs when the browser is idle. */
export function savePainting(
  key: string,
  canvas: HTMLCanvasElement,
  colors: PaintingColors | null,
  tone: "light" | "dark" | null
) {
  if (typeof createImageBitmap !== "function") return;
  void createImageBitmap(canvas)
    .then((bitmap) => {
      for (const [k, v] of memory) if (k !== key) v.bitmap.close?.();
      memory.clear();
      memory.set(key, { bitmap, colors, tone });
    })
    .catch(() => {});
  const store = caches_();
  if (!store) return;
  const later =
    "requestIdleCallback" in window
      ? (f: () => void) => requestIdleCallback(f, { timeout: 1500 })
      : (f: () => void) => setTimeout(f, 1500);
  later(() => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        void (async () => {
          try {
            const c = await store.open(CACHE);
            const day = key.split("/")[0];
            for (const req of await c.keys()) {
              const path = new URL(req.url).pathname.slice(PREFIX.length);
              if (!path.startsWith(day + "/") || path.split("/")[2] === key.split("/")[2])
                await c.delete(req);
            }
            await c.put(
              PREFIX + key,
              new Response(blob, {
                headers: {
                  "content-type": blob.type,
                  "x-karman-meta": JSON.stringify({ colors, tone }),
                },
              })
            );
          } catch {
            /* the next page paints again */
          }
        })();
      },
      "image/webp",
      0.92
    );
  });
}
