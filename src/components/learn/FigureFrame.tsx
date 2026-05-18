// ============================================================
// FigureFrame — themed wrapper for raster question figures
// (scatterplots, geometry diagrams, coordinate planes, 3-D solids,
// bar/line graphs — anything that isn't yet a native table or SVG).
//
// Goal: stop figures looking like "pasted-in JPEGs on a dark page".
// The frame puts the figure on a warm ivory plaque with a bronze
// rule + soft inset shadow — reads as "page from your textbook on
// your desk under a lamp" rather than "screenshot somebody dropped
// in."
//
// The figure itself is NOT recolored — SAT figures are black ink on
// white, and our extracted crops preserve that. We just wrap them
// in the observatory-themed frame.
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
        "my-4 rounded-lg border border-[#3B3426] bg-[#F3ECDD] p-3",
        "shadow-[0_1px_0_0_rgba(195,171,106,0.18)_inset,0_4px_16px_-8px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn("mx-auto block w-auto rounded object-contain", maxHeightClass)}
      />
    </figure>
  );
}
