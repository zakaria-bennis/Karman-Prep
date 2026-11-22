"use client";

// Every lesson's main picture on one page, for checking them by eye (dev only, /dev/lessons?gallery=1).
import { useEffect, useState } from "react";
import { lessonFor, type SkillLessonData } from "@/lib/lessons";
import { SKILLS72 } from "@/lib/skills/ids72";
import { Figure } from "@/app/dashboard/student/_portal/lesson/figures/Figure";

export function FigureGallery({ section }: { section: string }) {
  const [lessons, setLessons] = useState<SkillLessonData[]>([]);
  useEffect(() => {
    const ids = SKILLS72.filter((s) => section === "all" || s.id.startsWith(section)).map(
      (s) => s.id
    );
    Promise.all(ids.map((id) => lessonFor(id))).then((all) =>
      setLessons(all.filter((l): l is SkillLessonData => l !== null))
    );
  }, [section]);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16,
      }}
    >
      {lessons.map((l) => (
        <figure
          key={l.id}
          style={{ margin: 0, padding: 12, borderRadius: 16, background: "var(--glass)" }}
        >
          <figcaption style={{ fontSize: 13, marginBottom: 8 }}>
            {l.skill.name} · {l.figure.kind}
          </figcaption>
          <Figure fig={l.figure} />
        </figure>
      ))}
    </div>
  );
}
