"use client";

// ============================================================
// FigureFrame — themed wrapper for question figures
//
// A question's figure_spec (a FigureSpec, src/lib/figures/engine) wins over
// every older figure field: a drawn type renders as FigureView(buildScene(...)),
// a table as TableView. An invalid spec renders nothing and logs one error,
// never a partial figure. Without a spec, the older path below is unchanged.
//
// Older path: themed wrapper for raster question figures
// (scatterplots, geometry diagrams, coordinate planes, 3-D solids,
// bar/line graphs — anything that isn't yet a native table or SVG).
//
// Goal: stop figures looking like "pasted-in JPEGs on a dark page".
// The frame uses the same dark surface and bronze rule as quiz cards.
//
// Assets are not blindly filtered here. Reviewed monochrome source crops
// can be converted by theme-monochrome-figure.ts without moving any pixel.
// Colored or unreviewed source images retain their original semantics.
//
// Designed to live alongside QuestionTable (Phase 4a) and the
// eventual SVG geometry renderer (Phase 4c). Once those land, the
// raster path only handles scatterplots / function graphs / 3-D
// solids.
// ============================================================

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildScene, defaultBox } from "@/lib/figures/engine/index";
import type { Scene } from "@/lib/figures/engine/scene";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";
import { figureFetchPolicy } from "@/lib/figures/figure-fetch-policy";
import { cn } from "@/lib/utils";
import FigureView from "./figures/FigureView";
import TableView from "./figures/TableView";

// The SVG sanitizer and display fixes load only when a figure is drawn as inline SVG, so
// quiz pages without one never download them (page bundle budget, AR-33).
type SvgDisplay = {
  sanitizeThemedSvg: typeof import("@/lib/figures/inline-svg").sanitizeThemedSvg;
  fitViewBoxToContent: typeof import("@/lib/figures/svg-figure-polish").fitViewBoxToContent;
};
let svgDisplay: SvgDisplay | null = null;
let svgDisplayLoad: Promise<SvgDisplay> | null = null;
function loadSvgDisplay(): Promise<SvgDisplay> {
  svgDisplayLoad ??= Promise.all([
    import("@/lib/figures/inline-svg"),
    import("@/lib/figures/svg-figure-polish"),
  ]).then(([inline, polish]) => {
    svgDisplay = {
      sanitizeThemedSvg: inline.sanitizeThemedSvg,
      fitViewBoxToContent: polish.fitViewBoxToContent,
    };
    return svgDisplay;
  });
  return svgDisplayLoad;
}

interface Props {
  /** The question's figure_spec, unvalidated as stored. When present it is drawn instead of
   *  `src` and `svg`; when invalid nothing is drawn. */
  spec?: unknown;
  /** Raster or .svg figure URL. Empty when the figure is an inline `svg`. */
  src?: string | null;
  /** A hand-drawn figure SVG stored on the question (figure_svg); used only without `src`.
   *  Inlined through the same sanitizer as fetched SVGs, else shown as an inert <img>. */
  svg?: string | null;
  alt: string;
  /** Optional max-height cap. Defaults to the conservative 28rem
   *  used in the quiz engine; tweak for tighter inspector cards. */
  maxHeightClass?: string;
  className?: string;
}

const FRAME = cn(
  "themed-question-figure my-4 rounded-lg border border-bronze bg-surface p-3",
  "shadow-[0_1px_0_0_rgba(195,171,106,0.18)_inset,0_4px_16px_-8px_rgba(0,0,0,0.45)]"
);

type SpecDrawing = { table: FigureSpec } | { scene: Scene } | { error: string };

function drawSpec(input: unknown): SpecDrawing {
  const parsed = parseFigureSpec(input);
  if (!parsed.ok) return { error: parsed.errors.join("; ") };
  if (parsed.spec.type === "table") return { table: parsed.spec };
  try {
    return { scene: buildScene(parsed.spec, defaultBox(parsed.spec)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function SpecFigure({ spec, alt, maxHeightClass, className }: Props & { maxHeightClass: string }) {
  const drawing = useMemo(() => drawSpec(spec), [spec]);
  const error = "error" in drawing ? drawing.error : null;
  useEffect(() => {
    if (error) console.error(`FigureFrame: invalid figure_spec, nothing drawn: ${error}`);
  }, [error]);
  if ("error" in drawing) return null;
  if ("table" in drawing) return <TableView spec={drawing.table} className={className} />;
  const { scene } = drawing;
  // The description generated from the spec's named parts names what is actually drawn.
  const description = scene.description || alt;
  return (
    <figure className={cn(FRAME, className)}>
      <FigureView
        scene={{ ...scene, description }}
        className={cn("mx-auto block h-auto w-full max-w-full", maxHeightClass)}
      />
    </figure>
  );
}

export default function FigureFrame({ spec, maxHeightClass = "max-h-[28rem]", ...rest }: Props) {
  if (spec !== null && spec !== undefined)
    return <SpecFigure spec={spec} maxHeightClass={maxHeightClass} {...rest} />;
  return <StoredFigure maxHeightClass={maxHeightClass} {...rest} />;
}

/** The older figure fields: a raster or .svg `src`, or a stored `svg`. */
function StoredFigure({
  src,
  svg,
  alt,
  maxHeightClass,
  className,
}: Omit<Props, "spec"> & { maxHeightClass: string }) {
  const [inline, setInline] = useState<{ src: string; alt: string; svg: string } | null>(null);
  const markup = src ? null : (svg ?? null);
  const url =
    src || (markup ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}` : "");
  useEffect(() => {
    if (markup) {
      let live = true;
      void loadSvgDisplay()
        .then(({ sanitizeThemedSvg }) => {
          const themedSvg = live ? sanitizeThemedSvg(markup, alt) : null;
          if (themedSvg) setInline({ src: url, alt, svg: themedSvg });
        })
        .catch(() => {
          /* Image fallback keeps the figure visible when the sanitizer cannot load. */
        });
      return () => {
        live = false;
      };
    }
    if (!src) return;
    const controller = new AbortController();
    const policy = figureFetchPolicy(src, window.location.origin);
    if (!policy.inlineSvg) return;
    void fetch(src, { signal: controller.signal, credentials: policy.credentials })
      .then(async (response) => {
        if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 400_000) return;
        const source = await response.text();
        const { sanitizeThemedSvg } = await loadSvgDisplay();
        const svg = sanitizeThemedSvg(source, alt);
        if (svg && !controller.signal.aborted) setInline({ src, alt, svg });
      })
      .catch(() => {
        /* Image fallback keeps the figure accessible when inline fetch is unavailable. */
      });
    return () => controller.abort();
  }, [src, alt, markup, url]);
  const themed = inline?.src === url && inline.alt === alt ? inline.svg : null;
  // A label drawn past the authored viewBox (an axis title on the bottom edge) would be
  // cut off; once the SVG is on the page, grow its box to everything drawn.
  const holder = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const svg = holder.current?.querySelector("svg");
    // `themed` only exists once the display module has loaded, so it is always set here.
    const fitViewBoxToContent = svgDisplay?.fitViewBoxToContent;
    if (!themed || !svg || !fitViewBoxToContent) return;
    let live = true;
    fitViewBoxToContent(svg);
    // The figure serif can arrive after first paint and change text extents.
    document.fonts?.ready.then(() => live && fitViewBoxToContent(svg));
    return () => {
      live = false;
    };
  }, [themed]);
  return (
    <figure className={cn(FRAME, className)}>
      {themed ? (
        <div
          ref={holder}
          className={cn(
            "mx-auto max-w-full [&>svg]:mx-auto [&>svg]:block [&>svg]:max-h-[32dvh] [&>svg]:w-auto sm:[&>svg]:max-h-[28rem]",
            maxHeightClass
          )}
          dangerouslySetInnerHTML={{ __html: themed }}
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className={cn("mx-auto block h-auto max-w-full rounded object-contain", maxHeightClass)}
          />
        </>
      )}
    </figure>
  );
}
