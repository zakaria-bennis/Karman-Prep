"use client";

// ============================================================
// ConstellationBackground — animated canvas node-graph backdrop.
// Dots drift slowly, each fading independently (breathing pattern).
// Nearby nodes connect with faint lines. Deep navy + purple tones.
// Lives behind hero content via absolute positioning.
// ============================================================

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  // Independent opacity oscillation per node
  baseOpacity: number;
  opacityPhase: number; // radians offset
  opacitySpeed: number; // radians per ms
  opacityAmp: number; // amplitude of oscillation
}

// Tuned to a supporting role under CloudAurora — fewer, dimmer, smaller.
// The aurora is the star now; the constellation adds texture and motion
// without competing for attention.
const NODE_COUNT = 38;
const MAX_LINK_DIST = 140;
const NODE_COLOR = "180, 200, 255"; // cool pale blue
const LINK_COLOR = "140, 170, 255"; // pale blue link

function createNode(w: number, h: number): Node {
  const speed = 0.05 + Math.random() * 0.09;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 1.0 + Math.random() * 1.4,
    baseOpacity: 0.3 + Math.random() * 0.2,
    opacityPhase: Math.random() * Math.PI * 2,
    opacitySpeed: 0.0003 + Math.random() * 0.0005,
    opacityAmp: 0.12 + Math.random() * 0.14,
  };
}

export default function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced-motion — draw a single static frame and stop.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animId: number;
    let nodes: Node[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      nodes = Array.from({ length: NODE_COUNT }, () => createNode(canvas.width, canvas.height));
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw(ts: number) {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Move nodes, wrap at edges
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -10) n.x = w + 10;
        if (n.x > w + 10) n.x = -10;
        if (n.y < -10) n.y = h + 10;
        if (n.y > h + 10) n.y = -10;

        // Individual breathing opacity
        n.opacityPhase += n.opacitySpeed * 16; // ~60fps tick
      }

      // Draw links first (under nodes)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > MAX_LINK_DIST) continue;

          const proximity = 1 - dist / MAX_LINK_DIST;
          const opA = a.baseOpacity + Math.sin(a.opacityPhase) * a.opacityAmp;
          const opB = b.baseOpacity + Math.sin(b.opacityPhase) * b.opacityAmp;
          const lineOp = proximity * Math.min(opA, opB) * 0.35;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${LINK_COLOR}, ${lineOp.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // Draw nodes — with a soft glow halo for presence
      for (const n of nodes) {
        const op = Math.max(
          0.15,
          Math.min(1.0, n.baseOpacity + Math.sin(n.opacityPhase) * n.opacityAmp)
        );

        // Outer glow
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2.8);
        glow.addColorStop(0, `rgba(${NODE_COLOR}, ${(op * 0.35).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${NODE_COLOR}, 0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${NODE_COLOR}, ${op.toFixed(3)})`;
        ctx.fill();
      }

      if (!reduceMotion) {
        animId = requestAnimationFrame(draw);
      }
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
