import { cn } from "@/design-system/cn";

/*
 * Photo: an approved generated still from public/photos (assets/manifest.json
 * says where each belongs), shown whole at its natural ratio, never cropped
 * and never under text. The 800 wide file serves phones and most columns;
 * the full file serves wide or dense screens. Made for Karman.
 */
const STILLS = {
  "p-school-class": { w: 1600, h: 900 },
  "p-teacher": { w: 1400, h: 1750 },
} as const;

export function Photo({
  id,
  alt,
  sizes,
  lazy = false,
  className,
}: {
  id: keyof typeof STILLS;
  /** What the picture shows. */
  alt: string;
  /** The rendered width, for the browser to pick a file. */
  sizes: string;
  /** Only below the fold. */
  lazy?: boolean;
  className?: string;
}) {
  const { w, h } = STILLS[id];
  const src = `${import.meta.env.BASE_URL}photos/${id}`;
  return (
    <img
      src={`${src}-800.webp`}
      srcSet={`${src}-800.webp 800w, ${src}.webp ${w}w`}
      sizes={sizes}
      width={w}
      height={h}
      alt={alt}
      loading={lazy ? "lazy" : undefined}
      decoding="async"
      className={cn("block h-auto w-full rounded-panel border border-line bg-raised", className)}
      style={{ aspectRatio: `${w} / ${h}` }}
    />
  );
}
