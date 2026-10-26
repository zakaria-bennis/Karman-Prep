"use client";

// The Daily 10 drawing (live/ten.ts): the tile under your finger lifts, its neighbours follow.
import { useEffect, useRef } from "react";
import { mountTen } from "./live/ten";

export default function TenFigure() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => (host.current ? mountTen(host.current) : undefined), []);
  return (
    <div className="fig" data-fig="ten" ref={host}>
      <div className="hl" />
      <span className="read" aria-live="polite" />
    </div>
  );
}
