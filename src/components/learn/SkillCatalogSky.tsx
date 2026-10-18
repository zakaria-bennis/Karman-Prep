"use client";

import { SUBJECT_COLORS, type Subject } from "@/data/curriculum";
import { getCatalogPositions, type CatalogSkill } from "@/data/curriculum/skill-catalog";
import { BG_STARS, H, NEBULAE, W } from "./ConstellationMapHelpers";

interface Props {
  subject: Subject;
  skills: CatalogSkill[];
  selectedId?: string;
  onSelect: (skill: CatalogSkill) => void;
}

/** Same warm sky, equal left pink/right blue lobes. Stars indicate skills, not inferred mastery. */
export default function SkillCatalogSky({ subject, skills, selectedId, onSelect }: Props) {
  const positions = getCatalogPositions(subject);
  const hex = SUBJECT_COLORS[subject].hex;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      aria-label="Skill constellation"
    >
      <defs>
        <linearGradient id="catalog-space" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040302" />
          <stop offset="40%" stopColor="#070605" />
          <stop offset="75%" stopColor="#0d0a08" />
          <stop offset="100%" stopColor="#1a1610" />
        </linearGradient>
        {(["reading", "math"] as const).map((s) => (
          <radialGradient key={s} id={`catalog-nebula-${s}`}>
            <stop offset="0%" stopColor={SUBJECT_COLORS[s].hex} stopOpacity="0.14" />
            <stop offset="100%" stopColor={SUBJECT_COLORS[s].hex} stopOpacity="0" />
          </radialGradient>
        ))}
        <radialGradient id="catalog-halo">
          <stop offset="0%" stopColor={hex} stopOpacity="0.8" />
          <stop offset="40%" stopColor={hex} stopOpacity="0.3" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#catalog-space)" />
      {NEBULAE.map((lobe, i) => (
        <ellipse
          key={i}
          cx={lobe.cx}
          cy={lobe.cy}
          rx={lobe.rx}
          ry={lobe.ry}
          fill={`url(#catalog-nebula-${i === 0 ? "reading" : "math"})`}
        />
      ))}
      <g aria-hidden="true">
        {BG_STARS.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#f3ecdd" opacity={star.o} />
        ))}
      </g>
      {skills.map((skill) => {
        const position = positions.get(skill.id)!;
        return (
          <g
            key={skill.id}
            transform={`translate(${position.x * W}, ${position.y * H})`}
            role="button"
            tabIndex={0}
            aria-label={skill.label}
            aria-pressed={selectedId === skill.id}
            onClick={() => onSelect(skill)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(skill);
              }
            }}
            className="cursor-pointer outline-none focus:opacity-60"
          >
            <title>{skill.label}</title>
            <circle r="22" fill="transparent" />
            <circle r="13.5" fill="url(#catalog-halo)" opacity="0.4" />
            <path d="M0 -10.8V10.8M-10.8 0H10.8" stroke={hex} strokeWidth="0.7" opacity="0.7" />
            <circle r="2.475" fill="#f3ecdd" opacity="0.95" />
            {selectedId === skill.id && <circle r="18" fill="none" stroke={hex} strokeWidth="1" />}
          </g>
        );
      })}
    </svg>
  );
}
