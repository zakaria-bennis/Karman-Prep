"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCatalogSkills, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import styles from "./landing.module.css";

/** Public navigation uses the approved catalogue; question access stays gated. */
export default function StudyPreview() {
  const [subject, setSubject] = useState<"reading" | "math">("reading");
  const [expanded, setExpanded] = useState<string | null>("info_ideas");
  const id = useId();
  const skills = getCatalogSkills(subject);
  const domains = SKILL_DOMAINS.filter((domain) => domain.subject === subject);
  return (
    <div className="text-ivory">
      <div
        className={`${styles.subjectSwitch} grid grid-cols-2 rounded-2xl border border-bronze bg-surface p-1.5`}
        data-subject={subject}
        role="group"
        aria-label="Explore a SAT subject"
      >
        <span className={styles.subjectIndicator} aria-hidden="true" />
        {(["reading", "math"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={subject === value}
            aria-controls={`${id}-domains`}
            onClick={() => {
              setSubject(value);
              setExpanded(value === "reading" ? "info_ideas" : "algebra");
            }}
            className={`min-h-12 rounded-xl px-2 py-3 text-sm font-semibold sm:text-base ${subject === value ? "text-night" : "text-ivory hover:underline"}`}
          >
            {value === "reading" ? "Reading & Writing" : "Math"}
          </button>
        ))}
      </div>
      <div id={`${id}-domains`} className="mt-6">
        <div key={subject} data-subject={subject} className={styles.subjectContent}>
          <h3 className="sr-only">
            {subject === "reading" ? "Reading & Writing" : "Math"} domains
          </h3>
          <div className="grid gap-x-8 md:grid-cols-2">
            {domains.map((domain, index) => {
              const open = expanded === domain.id;
              return (
                <section key={domain.id} className="border-t border-bronze py-1">
                  <h4>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`${id}-${domain.id}`}
                      onClick={() => setExpanded(open ? null : domain.id)}
                      className="flex min-h-16 w-full items-center gap-4 py-4 text-left font-medium"
                    >
                      <span className="font-plex-mono text-xs text-taupe" aria-hidden="true">
                        0{index + 1}
                      </span>
                      <span className="flex-1">{domain.label}</span>
                      <span className="text-xl" aria-hidden="true">
                        {open ? "−" : "+"}
                      </span>
                    </button>
                  </h4>
                  <ul id={`${id}-${domain.id}`} hidden={!open} className="mb-4 pl-8">
                    {skills
                      .filter((skill) => skill.domainId === domain.id)
                      .map((skill) => (
                        <li key={skill.id}>
                          <Link
                            href={`/learn/practice/${skill.id}`}
                            className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-taupe hover:bg-surface hover:text-ivory hover:underline"
                          >
                            {skill.label}
                            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <Link
            href={`/learn/${subject}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
          >
            Open {subject === "reading" ? "Reading & Writing" : "Math"} practice{" "}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
