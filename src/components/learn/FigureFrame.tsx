"use client";

// ============================================================
// FigureFrame — themed wrapper for raster question figures
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

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { figureFetchPolicy } from "@/lib/figures/figure-fetch-policy";
import { cn } from "@/lib/utils";

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

export default function FigureFrame({
  src,
  svg,
  alt,
  maxHeightClass = "max-h-[28rem]",
  className,
}: Props) {
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
    <figure
      className={cn(
        "themed-question-figure my-4 rounded-lg border border-bronze bg-surface p-3",
        "shadow-[0_1px_0_0_rgba(195,171,106,0.18)_inset,0_4px_16px_-8px_rgba(0,0,0,0.45)]",
        className
      )}
    >
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
