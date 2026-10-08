"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Calculator, Compass } from "lucide-react";
import { getCatalogSkills } from "@/data/curriculum/skill-catalog";

/** A real catalogue explorer, not a fabricated student's progress or question. */
export default function StudyPreview() {
  const [subject, setSubject] = useState<"reading" | "math">("reading");
  const skills = getCatalogSkills(subject).slice(0, 3);
  return (
    <div className="study-preview relative rounded-[2rem] border border-bronze/35 bg-surface p-5 text-ivory shadow-[0_24px_64px_-40px_rgba(0,0,0,0.45)] sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-taupe">A little direction goes a long way</p>
        <Compass className="h-6 w-6 shrink-0 text-gold" aria-hidden="true" />
      </div>
      <h2 className="mt-6 font-plex-serif text-3xl leading-tight sm:text-4xl">Find your focus.</h2>
      <div
        className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-night p-1.5"
        aria-label="Explore a SAT subject"
      >
        {(["reading", "math"] as const).map((value) => {
          const Icon = value === "reading" ? BookOpen : Calculator;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={subject === value}
              onClick={() => setSubject(value)}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-2 text-sm font-medium transition-colors ${subject === value ? "bg-surface text-ivory shadow-sm ring-1 ring-bronze/30" : "text-taupe hover:text-ivory"}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{value === "reading" ? "Reading & Writing" : "Math"}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 min-h-[15rem]" aria-live="polite" aria-atomic="true">
        <p className="text-xs text-taupe">
          From the {subject === "reading" ? "Reading & Writing" : "Math"} skill guide
        </p>
        <ul className="mt-3 divide-y divide-bronze/25">
          {skills.map((skill) => (
            <li key={skill.id} className="flex min-h-14 items-center gap-3 py-3 text-base">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${subject === "reading" ? "bg-rw" : "bg-math"}`}
                aria-hidden="true"
              />
              {skill.label}
            </li>
          ))}
        </ul>
        <Link
          href={`/learn/${subject}`}
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold underline underline-offset-4"
        >
          Explore the skill guide <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-4 border-t border-bronze/30 pt-5 text-sm leading-relaxed text-taupe">
        A skill guide helps you find your way. Sign in to see the practice currently available.
      </div>
    </div>
  );
}
