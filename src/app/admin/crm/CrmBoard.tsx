"use client";

// ============================================================
// The pipeline: one column per stage. Drag a card to another
// column, or use its Stage menu (keyboard and screen readers).
// The card glides to its new column (framer-motion layout) and
// the column counts roll. Dropping a card on the stage worked
// out from purchases clears the hand-set stage. Reduced motion
// and "Reduce motion" move cards without the glide.
// ============================================================

import Link from "next/link";
import { LayoutGroup, MotionConfig, motion } from "framer-motion";
import { useEffect, useState, useTransition } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { STAGES, STAGE_HINT, STAGE_LABEL, type Stage } from "@/lib/admin/crm/types";
import CountUp from "./CountUp";
import { crmSetStage } from "./actions";

export interface BoardCard {
  id: string;
  key: string;
  name: string;
  typeLabel: string;
  planLabel: string | null;
  paid: string | null;
  stage: Stage;
  derivedStage: Stage;
  overdue: number;
  tags: string[];
}

const PER_COLUMN = 60;
const SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 } as const;

export default function CrmBoard({
  cards: initial,
  moreHref,
}: {
  cards: BoardCard[];
  /** The list view for a stage, for columns with more cards than fit. */
  moreHref: Record<Stage, string>;
}) {
  const [cards, setCards] = useState(initial);
  const [still, setStill] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [said, setSaid] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => setCards(initial), [initial]);
  useEffect(() => setStill(prefersStill()), []);

  function move(id: string, to: Stage) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.stage === to) return;
    const before = card.stage;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage: to } : c)));
    setSaid(`Moved ${card.name} to ${STAGE_LABEL[to]}.`);
    startTransition(async () => {
      const res = await crmSetStage({ key: card.key, stage: to === card.derivedStage ? null : to });
      if (!res.ok) {
        setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage: before } : c)));
        setSaid(`Couldn't move ${card.name}: ${res.error}`);
      }
    });
  }

  return (
    <MotionConfig reducedMotion={still ? "always" : "user"}>
      <p className="crm-sr" role="status" aria-live="polite">
        {said}
      </p>
      <LayoutGroup>
        <div className="crm-board">
          {STAGES.map((stage) => {
            const col = cards.filter((c) => c.stage === stage);
            return (
              <section
                key={stage}
                className="crm-col"
                data-stage={stage}
                data-over={over === stage ? "" : undefined}
                aria-labelledby={`crm-col-${stage}`}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (over !== stage) setOver(stage);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragging;
                  setOver(null);
                  setDragging(null);
                  if (id) move(id, stage);
                }}
              >
                <header className="crm-col-h" title={STAGE_HINT[stage]}>
                  <i className="crm-dot" data-stage={stage} aria-hidden="true" />
                  <h3 id={`crm-col-${stage}`}>{STAGE_LABEL[stage]}</h3>
                  <CountUp value={col.length} ms={500} />
                </header>
                <ul className="crm-col-list">
                  {col.slice(0, PER_COLUMN).map((c) => (
                    <motion.li
                      key={c.id}
                      layoutId={c.id}
                      layout="position"
                      transition={SPRING}
                      className="crm-card"
                      data-dragging={dragging === c.id ? "" : undefined}
                      draggable
                      onDragStartCapture={(e: React.DragEvent<HTMLLIElement>) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragging(c.id);
                      }}
                      onDragEndCapture={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                    >
                      <Link className="crm-card-name" href={`/admin/crm/${c.id}`} draggable={false}>
                        {c.name}
                      </Link>
                      <span className="crm-card-meta">
                        {c.typeLabel}
                        {c.planLabel && <> · {c.planLabel}</>}
                        {c.paid && <> · {c.paid}</>}
                      </span>
                      {(c.overdue > 0 || c.tags.length > 0 || c.stage !== c.derivedStage) && (
                        <span className="crm-chips">
                          {c.overdue > 0 && (
                            <span className="crm-chip" data-tone="late">
                              Overdue
                            </span>
                          )}
                          {c.stage !== c.derivedStage && (
                            <span
                              className="crm-chip"
                              title={`Worked out: ${STAGE_LABEL[c.derivedStage]}`}
                            >
                              Set by hand
                            </span>
                          )}
                          {c.tags.slice(0, 3).map((t) => (
                            <span key={t} className="crm-chip">
                              {t}
                            </span>
                          ))}
                        </span>
                      )}
                      <label className="crm-card-move">
                        <span className="crm-sr">Stage for {c.name}</span>
                        <select
                          value={c.stage}
                          onChange={(e) => move(c.id, e.target.value as Stage)}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_LABEL[s]}
                              {s === c.derivedStage ? " (automatic)" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    </motion.li>
                  ))}
                </ul>
                {col.length === 0 && <p className="crm-col-empty">Drop a card here</p>}
                {col.length > PER_COLUMN && (
                  <Link className="kp-link crm-col-more" href={moreHref[stage]}>
                    {col.length - PER_COLUMN} more in the list
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
