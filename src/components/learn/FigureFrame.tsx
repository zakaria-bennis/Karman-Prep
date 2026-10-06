// =====================================================
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
  // Reviewed SVG assets carry their own dark canvas and crisp labels.
  const isVector = /\.svg(?:[?#].*)?$/i.test(src);
  const heightClass = isVector ? "max-h-[32vh] md:max-h-[28rem]" : maxHeightClass;
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
