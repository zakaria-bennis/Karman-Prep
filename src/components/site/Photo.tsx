"use client";

// A people photo (copy section 90 holds its alt text), self-hosted WebP in two sizes. It fades in
// once decoded; if the file is missing the figure hides and the section keeps its drawing (photos.css).
// With `clip`, a short silent loop of the same moment plays over it (public/site/clips), so the person
// moves; reduced motion, a failed load or no autoplay leave the still photo.
import { useEffect, useRef, useState } from "react";
import { section } from "@/lib/marketing/site-copy";

export type PhotoKey =
  | "program"
  | "private"
  | "test"
  | "guarantee"
  | "about"
  | "pricing"
  | "lin"
  | "daily"
  | "start"
  | "call"
  | "bus";

export default function Photo({
  name,
  className = "",
  clip = false,
}: {
  name: PhotoKey;
  className?: string;
  clip?: boolean;
}) {
  const copy = section(90);
  const img = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"" | "ready" | "missing">("");
  useEffect(() => {
    const el = img.current;
    if (el?.complete) setState(el.naturalWidth ? "ready" : "missing");
  }, []);
  const hero = /ph-hero/.test(className) && !/only-wide/.test(className);
  return (
    <figure
      className={`k-photo ${className}`}
      data-photo={name}
      data-ready={state === "ready" ? "1" : undefined}
      data-missing={state === "missing" ? "1" : undefined}
    >
      <div className="fr">
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP pair; the Workers build serves images unoptimized */}
        <img
          ref={img}
          src={`/site/photos/p-${name}.webp`}
          srcSet={`/site/photos/p-${name}-800.webp 800w, /site/photos/p-${name}.webp 1400w`}
          sizes="(max-width: 900px) 100vw, 560px"
          alt={copy[`${name} alt`] ?? ""}
          width={1400}
          height={1750}
          loading={hero ? "eager" : "lazy"}
          fetchPriority={hero ? "high" : undefined}
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("missing")}
        />
        {clip ? (
          <video
            className="clip"
            src={`/site/clips/c-${name}.mp4`}
            poster={`/site/photos/p-${name}-800.webp`}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            onError={(e) => e.currentTarget.remove()}
          />
        ) : null}
      </div>
    </figure>
  );
}
