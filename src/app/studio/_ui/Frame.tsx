"use client";

// The page under review, at the chosen screen size, scaled to fit. Over it, a clear layer draws
// what the pointer is on, what you picked, and a numbered pin on each element with a note.
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Pin } from "./useFrameBridge";
import { DEVICES, type Box } from "./devices";
import type { Viewport } from "@/lib/page-studio/schemas";
import styles from "./studio.module.css";

interface Props {
  frameRef: RefObject<HTMLIFrameElement>;
  src: string;
  reloadKey: number;
  viewport: Viewport;
  onScale: (scale: number) => void;
  scale: number;
  hover: Box | null;
  selected: Box | null;
  pins: Pin[];
  activePin: string | null;
  onPin: (id: string) => void;
  leftSite: boolean;
  onBack: () => void;
  children?: React.ReactNode;
}

export default function Frame(p: Props) {
  const area = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: 0, h: 0 });
  const device = DEVICES[p.viewport];
  const { onScale } = p;

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setRoom({ w: entry.contentRect.width, h: entry.contentRect.height })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!room.w || !room.h) return;
    const pad = 24;
    onScale(Math.min(1, (room.w - pad) / device.width, (room.h - pad) / device.height));
  }, [room, device.width, device.height, onScale]);

  const w = device.width * p.scale;
  const h = device.height * p.scale;

  return (
    <div ref={area} className={styles.stage}>
      <div className={styles.device} style={{ width: w, height: h }}>
        <iframe
          key={p.reloadKey}
          ref={p.frameRef}
          src={p.src}
          title="Page under review"
          className={styles.frame}
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${p.scale})`,
          }}
        />
        <div className={styles.overlay} aria-hidden={!p.pins.length}>
          {p.hover && <Outline box={p.hover} kind="hover" />}
          {p.selected && <Outline box={p.selected} kind="selected" />}
          {p.pins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              className={`${styles.pin} ${pin.kind === "copy" ? styles.pinCopy : ""} ${
                p.activePin === pin.id ? styles.pinActive : ""
              }`}
              style={{ left: Math.max(0, pin.box.x - 10), top: Math.max(0, pin.box.y - 10) }}
              onClick={() => p.onPin(pin.id)}
              aria-label={`Note ${pin.n}`}
            >
              {pin.n}
            </button>
          ))}
        </div>
        {p.leftSite && (
          <div className={styles.leftSite}>
            <p>
              This step is on another site (sign-in or payment), so the studio can&apos;t note it.
            </p>
            <button type="button" className={styles.primary} onClick={p.onBack}>
              Back to the page
            </button>
          </div>
        )}
        {p.children}
      </div>
    </div>
  );
}

function Outline({ box, kind }: { box: Box; kind: "hover" | "selected" }) {
  return (
    <div
      className={kind === "hover" ? styles.hoverBox : styles.selectedBox}
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    />
  );
}
