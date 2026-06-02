// ============================================================
// GeometryFigure — renders a 2D-geometry figure from structured
// figure_geometry_data as a clean SVG, on the same warm ivory plaque
// the raster FigureFrame uses (SAT figures are black ink on white).
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
        "my-4 rounded-lg border border-[#3B3426] bg-[#F3ECDD] p-4",
        "shadow-[0_1px_0_0_rgba(195,171,106,0.18)_inset,0_4px_16px_-8px_rgba(0,0,0,0.45)]",
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
        <figcaption className="mt-2 text-center text-[11px] italic text-[#6B6453]">
          {data.notes}
        </figcaption>
      ) : null}
    </figure>
  );
}
