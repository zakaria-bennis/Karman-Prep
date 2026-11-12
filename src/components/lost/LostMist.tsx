"use client";

/*
 * The picture behind the in-app "page isn't here" screen (src/app/not-found.tsx). That file is loaded
 * by every route, so this component stays tiny and imports nothing heavy: the painting engine and the
 * portal's typefaces arrive through import() only when the screen is actually shown.
 */
import { useEffect, useRef } from "react";

export default function LostMist() {
  const picture = useRef<HTMLCanvasElement>(null);
  const drift = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = picture.current?.parentElement;
    if (!root || !picture.current || !drift.current) return;
    const back = root.querySelector<HTMLAnchorElement>("[data-lost-back]");
    const goBack = (event: MouseEvent) => {
      if (window.history.length < 2) return;
      event.preventDefault();
      window.history.back();
    };
    back?.addEventListener("click", goBack);
    let stop: (() => void) | undefined;
    let gone = false;
    void import("./paint-mist").then((m) => {
      if (gone || !picture.current || !drift.current) return;
      stop = m.paintMist(root, picture.current, drift.current);
    });
    return () => {
      gone = true;
      stop?.();
      back?.removeEventListener("click", goBack);
    };
  }, []);

  return (
    <>
      <canvas ref={picture} className="lost-picture" aria-hidden="true" />
      <div className="lost-veil" />
      <canvas ref={drift} className="lost-drift" aria-hidden="true" />
    </>
  );
}
