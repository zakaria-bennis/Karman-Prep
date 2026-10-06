"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SUBJECT_COLORS, SUBJECT_LABELS, type Subject } from "@/data/curriculum";
import {
  getCatalogSkills,
  SKILL_DOMAINS,
  type CatalogSkill,
} from "@/data/curriculum/skill-catalog";
import { getCoveredLegacyNodes } from "@/data/curriculum/legacy-skill-crosswalk";
import type { LegacyLearningRecord } from "@/lib/supabase/queries/skill-catalog";
import SkillCatalogSky from "./SkillCatalogSky";

interface Props {
  subject: Subject;
  history: LegacyLearningRecord[];
}

export default function SkillCatalogMap({ subject, history }: Props) {
  const skills = getCatalogSkills(subject);
  const domains = SKILL_DOMAINS.filter((domain) => domain.subject === subject);
  const [selected, setSelected] = useState<CatalogSkill | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const hex = SUBJECT_COLORS[subject].hex;
  const statusById = new Map(history.map((row) => [row.node_id, row]));
  const priorLessons = selected ? getCoveredLegacyNodes(selected.id) : [];

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  function close() {
    dialog.current?.close();
    setSelected(null);
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-night text-ivory">
      <SkillCatalogSky
        subject={subject}
        skills={skills}
        selectedId={selected?.id}
        onSelect={setSelected}
      />
      <header className="absolute inset-x-0 top-16 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-bronze bg-night/90 p-4 backdrop-blur-md">
        <div>
          <h1 className="text-sm font-semibold" style={{ color: hex }}>
            {SUBJECT_LABELS[subject]}
          </h1>
          <p className="text-xs text-taupe">
            {skills.length} skills · {domains.length} domains
          </p>
        </div>
        <nav aria-label="Learning navigation" className="flex items-center gap-3 text-xs">
          <Link
            href={`/learn/${subject === "reading" ? "math" : "reading"}`}
            className="text-taupe hover:text-ivory"
          >
            {subject === "reading" ? "Math" : "Reading & Writing"}
          </Link>
          <button
            type="button"
            aria-expanded={indexOpen}
            aria-controls="catalog-skills-index"
            onClick={() => setIndexOpen(!indexOpen)}
            className="rounded-lg border border-bronze px-3 py-2"
          >
            Skills menu
          </button>
        </nav>
      </header>
      <aside
        id="catalog-skills-index"
        aria-label="Skills index"
        className={`${indexOpen ? "flex" : "hidden md:flex"} absolute bottom-16 left-4 top-36 z-10 w-72 max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-bronze bg-night/95 shadow-2xl backdrop-blur-md`}
      >
        <label className="p-3 text-xs text-taupe">
          Find a skill
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            className="mt-2 w-full rounded-lg border border-bronze bg-surface px-3 py-2 text-ivory"
          />
        </label>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {domains.map((domain) => {
            const matches = skills.filter(
              (skill) =>
                skill.domainId === domain.id &&
                `${skill.label} ${skill.domainLabel}`
                  .toLowerCase()
                  .includes(query.trim().toLowerCase())
            );
            if (!matches.length) return null;
            return (
              <section key={domain.id} className="mb-4">
                <h2 className="mb-2 text-xs font-semibold" style={{ color: hex }}>
                  {domain.label}
                </h2>
                <ul className="space-y-1">
                  {matches.map((skill) => (
                    <li key={skill.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(skill)}
                        className="min-h-11 w-full rounded-lg px-2 py-2 text-left text-xs leading-relaxed text-taupe hover:bg-surface hover:text-ivory"
                      >
                        {skill.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {!skills.some((skill) =>
            `${skill.label} ${skill.domainLabel}`.toLowerCase().includes(query.trim().toLowerCase())
          ) && <p className="text-sm text-taupe">No matching skills.</p>}
        </div>
      </aside>
      <footer className="absolute inset-x-0 bottom-0 flex justify-center border-t border-bronze bg-night/90 p-3 text-xs text-taupe">
        <Link href="/learn/history" className="underline underline-offset-4">
          View earlier learning history
        </Link>
      </footer>
      <dialog
        ref={dialog}
        aria-labelledby="catalog-skill-title"
        onCancel={close}
        onClose={() => setSelected(null)}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-bronze bg-night p-6 text-ivory shadow-2xl backdrop:bg-black/70"
      >
        {selected && (
          <>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs text-taupe">{selected.domainLabel}</p>
                <h2
                  id="catalog-skill-title"
                  className="text-lg font-semibold"
                  style={{ color: hex }}
                >
                  {selected.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-bronze px-3 py-2 text-xs"
              >
                Close
              </button>
            </div>
            {priorLessons.length > 0 ? (
              <>
                <h3 className="mb-2 text-sm font-semibold">Earlier lessons</h3>
                <p className="mb-4 text-xs leading-relaxed text-taupe">
                  Continue your existing lessons below. Their individual results and history are
                  preserved.
                </p>
                <ul className="space-y-2">
                  {priorLessons.map((node) => {
                    const row = statusById.get(node.id);
                    return (
                      <li key={node.id} className="rounded-xl border border-bronze p-3">
                        <Link
                          href={`/learn/${node.subject}/${node.id}`}
                          className="text-sm underline underline-offset-4"
                        >
                          {node.topic}
                        </Link>
                        <p className="mt-1 text-xs text-taupe">
                          {row
                            ? `Earlier lesson: ${row.status.replace(/_/g, " ")}`
                            : "No earlier lesson result"}
                        </p>
                        {row?.score != null && (
                          <p className="mt-1 text-xs text-taupe">
                            Earlier lesson score: {row.score}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-taupe">
                Practice for this skill is being organized. Your existing learning history is
                preserved.
              </p>
            )}
            <Link
              href="/learn/history"
              className="mt-5 block text-xs text-taupe underline underline-offset-4"
            >
              All earlier learning history
            </Link>
          </>
        )}
      </dialog>
    </div>
  );
}
