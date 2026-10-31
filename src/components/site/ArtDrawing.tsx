"use client";

// One of the page drawings (live/art.ts): drawn on the server, and on desktop its layers drift a few
// pixels toward the pointer.
import { useEffect, useRef, type CSSProperties } from "react";
import { artSvg, attachArtDrift, type ArtName } from "./live/art";

export default function ArtDrawing({
  name,
  date = "",
  className = "i-art rv",
  style,
}: {
  name: ArtName;
  /** The program drawing's last step, e.g. "MAR 6". */
  date?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => (host.current ? attachArtDrift(host.current) : undefined), []);
  return (
    <div
      ref={host}
      className={className}
      style={style}
      data-art={name}
      dangerouslySetInnerHTML={{ __html: artSvg(name, date) }}
    />
  );
}
