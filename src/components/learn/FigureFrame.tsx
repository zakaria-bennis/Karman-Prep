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

import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  /** Optional max-height cap. Defaults to the conservative 28rem
   *  used in the quiz engine; tweak for tighter inspector cards. */
  maxHeightClass?: string;
  className?: string;
}

export default function FigureFrame({
  src,
  alt,
  maxHeightClass = "max-h-[28rem]",
  className,
}: Props) {
  return (
    <figure
      className={cn(
        "my-4 rounded-lg border border-bronze bg-surface p-3",
        "shadow-[0_1px_0_0_rgba(195,171,106,0.18)_inset,0_4px_16px_-8px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn("mx-auto block h-auto max-w-full rounded object-contain", maxHeightClass)}
      />
    </figure>
  );
}
