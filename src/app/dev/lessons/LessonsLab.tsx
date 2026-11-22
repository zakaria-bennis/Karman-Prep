"use client";

// The lessons, one skill at a time, on the skill page's own glass (dev only; page.tsx).
import { useEffect, useState } from "react";
import { hasLesson, hasVideo } from "@/lib/lessons";
import { SKILLS72 } from "@/lib/skills/ids72";
import lib from "@/app/dashboard/student/_portal/library.module.css";
import shell from "@/app/dashboard/student/_portal/shell.module.css";
import skillStyles from "@/app/dashboard/student/_portal/skill.module.css";
import { SkillLesson } from "@/app/dashboard/student/_portal/SkillLesson";

export default function LessonsLab({ skill, night }: { skill: string; night: boolean }) {
  const [id, setId] = useState(skill);
  const [dark, setDark] = useState(night);
  const found = SKILLS72.find((s) => s.id === id) ?? SKILLS72[0];

  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [dark]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("skill", id);
    url.searchParams.set("night", dark ? "1" : "0");
    window.history.replaceState(null, "", url);
  }, [id, dark]);

  return (
    <div
      className={shell.shell}
      data-mode={dark ? "dark" : "light"}
      style={{
        minHeight: "100dvh",
        padding: "16px",
        background: dark
          ? "linear-gradient(160deg, #1d2547 0%, #2c2b4f 45%, #3d2f3f 100%)"
          : "linear-gradient(160deg, #a9cfe9 0%, #e9dcc0 55%, #c9b98f 100%)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          aria-label="Skill"
          style={{ padding: "8px 10px", borderRadius: 10, maxWidth: "100%" }}
        >
          {SKILLS72.map((s) => (
            <option key={s.id} value={s.id}>
              {hasLesson(s.id) ? "" : "(none) "}
              {hasVideo(s.id) ? "[video] " : ""}
              {s.section === "Math" ? "M" : "RW"} · {s.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setDark((d) => !d)} style={{ padding: "8px 12px" }}>
          {dark ? "Light" : "Dark"}
        </button>
      </div>
      <div className={`${lib.library} ${skillStyles.page}`} style={{ maxWidth: 820 }}>
        <section className={`${lib.glass} ${skillStyles.lesson}`}>
          <SkillLesson key={found.id} name={found.name} />
        </section>
      </div>
    </div>
  );
}
