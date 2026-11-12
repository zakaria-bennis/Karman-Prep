"use client";

// One star (curriculum node) on the constellation map. Split out of
// ConstellationMap.tsx.

import type { Subject } from "@/data/curriculum";
import type { MappedNode } from "./ConstellationMap";
import { W, H, DIFF_R, starConfig } from "./ConstellationMapHelpers";

interface Props {
  node: MappedNode;
  activeSubject: Subject;
  activeHex: string;
  otherHex: string;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  handleNodeClick: (node: MappedNode) => void;
}

export default function ConstellationStar({
  node,
  activeSubject,
  activeHex,
  otherHex,
  hovered,
  setHovered,
  handleNodeClick,
}: Props) {
  const cx = node.x * W;
  const cy = node.y * H;
  const active = node.subject === activeSubject;
  const subjectHex = active ? activeHex : otherHex;
  // Mastery is the earned moment — it trades the subject halo
  // for gold (docs/archive/brand.md "Prestige — gold").
  const haloId =
    node.status === "mastered"
      ? "halo-mastered"
      : node.subject === "reading"
        ? "halo-reading"
        : "halo-math";
  const r = DIFF_R[node.difficulty];
  const cfg = starConfig(node.status);
  const isHovered = hovered === node.id;
  const isLocked = node.status === "locked";

  // Non-active lobe gets muted
  const dimFactor = active ? 1 : 0.25;
  const coreO = cfg.coreOpacity * dimFactor;
  const haloO = cfg.haloOpacity * dimFactor;
  const rayO = cfg.rayOpacity * dimFactor;

  return (
    <g
      key={node.id}
      transform={`translate(${cx}, ${cy})`}
      style={{ cursor: !active || isLocked ? "default" : "pointer" }}
      onClick={() => handleNodeClick(node)}
      onMouseEnter={() => setHovered(node.id)}
      onMouseLeave={() => setHovered(null)}
      // role="img" on locked/inactive nodes so the
      // aria-label is announced (locked stars are still
      // informative — screen readers should read the
      // topic name + status). aria-label on a `<g>`
      // without a role fails axe-core's a11y check.
      role={active && !isLocked ? "button" : "img"}
      aria-label={`${node.topic} — ${node.status}`}
      tabIndex={active && !isLocked ? 0 : -1}
      onKeyDown={(e) => e.key === "Enter" && handleNodeClick(node)}
    >
      {/* Outer halo */}
      {cfg.haloOpacity > 0 && (
        <circle
          r={r * cfg.glow}
          fill={`url(#${haloId})`}
          opacity={isHovered ? Math.min(1, haloO * 1.5) : haloO}
          className={cfg.pulse && active ? "animate-pulse" : undefined}
        />
      )}

      {/* Hover ring (only on active lobe) */}
      {isHovered && active && !isLocked && (
        <circle
          r={r * cfg.glow + 4}
          fill="none"
          stroke={subjectHex}
          strokeWidth={0.8}
          strokeOpacity={0.55}
          strokeDasharray="2 3"
        />
      )}

      {/* Diffraction rays (the cross + diagonals) */}
      {cfg.rayLen > 0 && (
        <g opacity={rayO}>
          {/* Vertical + horizontal rays */}
          <line
            x1={0}
            y1={-r * cfg.rayLen}
            x2={0}
            y2={r * cfg.rayLen}
            stroke={subjectHex}
            strokeWidth={0.7}
            strokeLinecap="round"
          />
          <line
            x1={-r * cfg.rayLen}
            y1={0}
            x2={r * cfg.rayLen}
            y2={0}
            stroke={subjectHex}
            strokeWidth={0.7}
            strokeLinecap="round"
          />
          {/* Shorter diagonals — white for sparkle */}
          <line
            x1={-r * cfg.rayLen * 0.55}
            y1={-r * cfg.rayLen * 0.55}
            x2={r * cfg.rayLen * 0.55}
            y2={r * cfg.rayLen * 0.55}
            stroke="#f3ecdd"
            strokeWidth={0.35}
            strokeOpacity={0.55}
            strokeLinecap="round"
          />
          <line
            x1={-r * cfg.rayLen * 0.55}
            y1={r * cfg.rayLen * 0.55}
            x2={r * cfg.rayLen * 0.55}
            y2={-r * cfg.rayLen * 0.55}
            stroke="#f3ecdd"
            strokeWidth={0.35}
            strokeOpacity={0.55}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Bright ivory core */}
      <circle
        r={r * 0.55}
        fill="#f3ecdd"
        opacity={coreO}
        filter={node.status === "mastered" && active ? "url(#star-glow)" : undefined}
      />

      {/* Gold heart on mastered stars — the earned mark */}
      {node.status === "mastered" && active && (
        <circle r={r * 0.28} fill="#e4c86a" opacity={0.95} />
      )}
    </g>
  );
}
