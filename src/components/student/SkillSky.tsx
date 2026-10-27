"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BAND_LABEL } from "@/lib/student/mastery";
import { seededRandom } from "@/lib/student/assemble";
import type { SkillView, StudentHome } from "@/lib/student/home-model";
import { BandGlyph, CloseIcon } from "./icons";
import { Layer, useEscape } from "./Layer";
import s from "./student.module.css";

type Domain = StudentHome["domains"][number];

/** Star positions inside each domain's quarter of its row, from a fixed seed. */
function layout(domains: Domain[]) {
  const out = new Map<string, { x: number; y: number }>();
  const labels: { id: string; label: string; x: number; y: number; subject: string }[] = [];
  for (const subject of ["math", "reading"] as const) {
    domains
      .filter((d) => d.subject === subject)
      .forEach((d, col) => {
        const rand = seededRandom(d.id.length * 977 + col * 31 + 5);
        const left = col * 25 + 4;
        const n = d.skills.length;
        const pts: { x: number; y: number }[] = [];
        d.skills.forEach((_, i) => {
          // Walk left to right through the column with a gentle random rise and fall.
          const t = n === 1 ? 0.5 : i / (n - 1);
          const x = left + 2 + t * 17 + (rand() - 0.5) * 2.5;
          const y =
            26 + (Math.sin(t * Math.PI * (1.2 + rand())) * 0.5 + 0.5) * 52 + (rand() - 0.5) * 10;
          pts.push({ x, y: Math.max(18, Math.min(86, y)) });
        });
        d.skills.forEach((k, i) => out.set(k.id, pts[i]));
        labels.push({ id: d.id, label: d.label, x: left + 10.5, y: 6, subject });
      });
  }
  return { pos: out, labels };
}

export function SkillSky({ home, base }: { home: StudentHome; base: string }) {
  const [open, setOpen] = useState<SkillView | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const { pos, labels } = useMemo(() => layout(home.domains), [home.domains]);
  const all = home.domains.flatMap((d) => d.skills);
  const hovered = all.find((k) => k.id === hover);
  return (
    <>
      <div className={`${s.sky} ${s.onlyWide}`}>
        {(["math", "reading"] as const).map((subject) => (
          <div
            key={subject}
            className={`${s.skyRow} ${subject === "math" ? s.skyMath : s.skyReading}`}
          >
            <svg
              className={s.skyLines}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {home.domains
                .filter((d) => d.subject === subject)
                .map((d) => (
                  <polyline
                    key={d.id}
                    className={s.skyLine}
                    points={d.skills
                      .map((k) => `${pos.get(k.id)!.x},${pos.get(k.id)!.y}`)
                      .join(" ")}
                  />
                ))}
            </svg>
            {labels
              .filter((l) => l.subject === subject)
              .map((l) => (
                <span
                  key={l.id}
                  className={s.domainLabel}
                  style={{ left: `${l.x}%`, top: `${l.y}%` }}
                >
                  {l.label}
                </span>
              ))}
            {home.domains
              .filter((d) => d.subject === subject)
              .flatMap((d) => d.skills)
              .map((k) => {
                const p = pos.get(k.id)!;
                return (
                  <button
                    key={k.id}
                    type="button"
                    className={s.star}
                    data-band={k.band ?? "none"}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    aria-label={`${k.label}, ${BAND_LABEL[k.band ?? "none"]}`}
                    onPointerEnter={() => setHover(k.id)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(k.id)}
                    onBlur={() => setHover(null)}
                    onClick={() => setOpen(k)}
                  >
                    <BandGlyph band={k.band} size={k.band === "mastered" ? 22 : 18} />
                  </button>
                );
              })}
            {hovered &&
              pos.get(hovered.id) &&
              home.domains.some((d) => d.subject === subject && d.skills.includes(hovered)) && (
                <span
                  className={`${s.tip} ${s.glass}`}
                  style={{ left: `${pos.get(hovered.id)!.x}%`, top: `${pos.get(hovered.id)!.y}%` }}
                >
                  {hovered.label} · {BAND_LABEL[hovered.band ?? "none"]}
                </span>
              )}
          </div>
        ))}
      </div>
      <div className={s.onlyPhone}>
        {home.domains.map((d) => (
          <Link key={d.id} href={`${base}/skills#${d.id}`} className={s.strip}>
            <span className={s.stripLabel}>{d.label}</span>
            <span className={`${s.stripStars} ${d.subject === "math" ? s.mathRow : s.readingRow}`}>
              {d.skills.map((k) => (
                <BandGlyph key={k.id} band={k.band} size={14} />
              ))}
            </span>
          </Link>
        ))}
      </div>
      <Legend />
      <AnimatePresence>
        {open && (
          <SkillSheet
            skill={open}
            base={base}
            subject={open.id.startsWith("ma-") ? "math" : "reading"}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export function Legend() {
  return (
    <div className={s.legend} aria-hidden="true">
      {(["struggling", "developing", "proficient", "mastered", null] as const).map((b) => (
        <span key={b ?? "none"}>
          <BandGlyph band={b} size={14} />
          {BAND_LABEL[b ?? "none"]}
        </span>
      ))}
    </div>
  );
}

export function SkillList({ home, onOpen }: { home: StudentHome; onOpen(k: SkillView): void }) {
  return (
    <>
      {home.domains.map((d) => (
        <section key={d.id} className={s.domain}>
          <h3 className={s.domainName}>{d.label}</h3>
          {d.skills.map((k) => (
            <button key={k.id} type="button" className={s.row} onClick={() => onOpen(k)}>
              <span className={d.subject === "math" ? s.mathRow : s.readingRow}>
                <BandGlyph band={k.band} />
              </span>
              <span className={s.rowLabel}>{k.label}</span>
              <span className={s.rowMeta}>{k.band ? `${k.mastery}%` : BAND_LABEL.none}</span>
            </button>
          ))}
        </section>
      ))}
    </>
  );
}

const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};

export function SkillSheet({
  skill,
  subject,
  base,
  onClose,
}: {
  skill: SkillView;
  base: string;
  subject: "math" | "reading";
  onClose(): void;
}) {
  const reduce = useReducedMotion();
  useEscape(onClose);
  return (
    <Layer>
      <motion.div
        className={s.scrim}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={skill.label}
        className={`${s.sheet} ${s.panel}`}
        initial={reduce ? { opacity: 0 } : { y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { y: 60, opacity: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.42 }}
        drag={reduce ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.9 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose();
        }}
      >
        <div className={s.grabber} />
        <div className={s.sheetHead}>
          <h2 className={s.h2}>{skill.label}</h2>
          <button type="button" className={s.iconButton} aria-label="Close" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </div>
        <p
          className={`${s.fact} ${subject === "math" ? s.mathRow : s.readingRow}`}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <BandGlyph band={skill.band} />
          <strong style={{ color: "inherit" }}>{BAND_LABEL[skill.band ?? "none"]}</strong>
        </p>
        <dl className={s.stats}>
          <div className={s.stat}>
            <dt>Mastery</dt>
            <dd>{skill.band ? `${skill.mastery}%` : "Not yet"}</dd>
          </div>
          <div className={s.stat}>
            <dt>Points</dt>
            <dd>{skill.points.toLocaleString()}</dd>
          </div>
          <div className={s.stat}>
            <dt>Answered</dt>
            <dd>{skill.answered}</dd>
          </div>
          <div className={s.stat}>
            <dt>Last practised</dt>
            <dd style={{ fontSize: "1rem", paddingTop: 6 }}>{ago(skill.lastPractised)}</dd>
          </div>
        </dl>
        {skill.band && (
          <div
            className={`${s.meter} ${subject === "math" ? s.mathRow : s.readingRow}`}
            style={{ marginBottom: 20 }}
          >
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: skill.mastery / 100 }}
              transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.1 }}
            />
          </div>
        )}
        <Link href={`${base}/practice/${skill.id}`} className={s.primary}>
          Practise this skill
        </Link>
      </motion.div>
    </Layer>
  );
}
