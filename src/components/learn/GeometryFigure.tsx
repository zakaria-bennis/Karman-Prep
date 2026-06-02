// ============================================================
// GeometryFigure — renders a 2D-geometry figure from structured
// figure_geometry_data as a clean SVG on a navy plaque that matches the
// app background, drawn in sky-blue (a "blueprint" look that belongs to
// the cool-navy quiz UI rather than fighting it).
//
// Only used when figure_kind='geometric' — i.e. the Stage-6.6 gate
// already rasterized this exact SVG and a vision model confirmed it
// matches the original screenshot. If the data somehow can't render,
// we return null so the caller falls back to the screenshot.
//
// The SVG comes from buildGeometrySvg — a deterministic function over
// our own structured data with XML-escaped text — so the
// dangerouslySetInnerHTML below never carries user/LLM HTML, only the
// markup we generated.
// ============================================================

import { buildGeometrySvg, type GeometryFigureData } from "@/lib/figures/geometry-svg";
import { cn } from "@/lib/utils";

interface Props {
  data: GeometryFigureData;
  className?: string;
  maxHeightClass?: string;
}

export default function GeometryFigure({
  data,
  className,
  maxHeightClass = "max-h-[28rem]",
}: Props) {
  const { svg, renderable } = buildGeometrySvg(data);
  if (!renderable || !svg) return null;

  return (
    <figure
      className={cn(
        // Navy plaque matching the app background; sky-blue figure inside.
        "my-4 rounded-lg border border-slate-800 bg-[#0a0f1e] p-4",
        "shadow-[0_4px_16px_-8px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto block w-auto [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:w-auto",
          `[&>svg]:${maxHeightClass}`,
          maxHeightClass
        )}
        // Safe: buildGeometrySvg emits deterministic, XML-escaped SVG from
        // our own structured data — never user/LLM HTML.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {data.notes ? (
        <figcaption className="mt-2 text-center text-[11px] italic text-sky-300/80">
          {data.notes}
        </figcaption>
      ) : null}
    </figure>
  );
}
