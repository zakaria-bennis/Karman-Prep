"use client";

// TEMPORARY storyboard for the home page's new background (2026-11-11). Delete with the folder once the
// founder has picked a route.
import { useEffect, useRef } from "react";
import type { TimeOfDay } from "@/lib/painting/light";
import { paintPicture } from "@/lib/painting/painterly";
import { renderLandscape } from "@/lib/painting/scenes";

export interface Stop {
  scene: number;
  time: TimeOfDay;
  name: string;
  sky?: boolean;
}

function Tile({ stop }: { stop: Stop }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const h = paintPicture(canvas, renderLandscape(stop.scene, stop.time), {
      animate: false,
      width: 460,
      height: 288,
      brush: 0.9,
    });
    return () => h.stop();
  }, [stop.scene, stop.time]);
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          width: 300,
          height: 188,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 14px 30px -18px rgba(0,0,0,.6)",
        }}
      >
        <canvas
          ref={ref}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: stop.sky ? "scale(2.3)" : undefined,
            transformOrigin: "50% 0",
          }}
        />
      </div>
      <figcaption style={{ marginTop: 8, fontWeight: 700, fontSize: 15 }}>
        {stop.name}
        <span style={{ display: "block", fontWeight: 400, opacity: 0.7 }}>{stop.time}</span>
      </figcaption>
    </figure>
  );
}

export default function Board({
  routes,
}: {
  routes: { title: string; note: string; dark?: boolean; stops: Stop[] }[];
}) {
  return (
    <div style={{ display: "grid", gap: 56 }}>
      {routes.map((r) => (
        <section
          key={r.title}
          data-route
          style={{
            padding: "28px 30px 34px",
            borderRadius: 28,
            background: r.dark ? "#1d1a2e" : "#fffaf3",
            color: r.dark ? "#fffaf3" : "#1d1a22",
          }}
        >
          <h2 style={{ fontSize: 34, margin: 0 }}>{r.title}</h2>
          <p style={{ margin: "8px 0 22px", maxWidth: 820, fontSize: 17 }}>{r.note}</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
            {r.stops.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Tile stop={s} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
