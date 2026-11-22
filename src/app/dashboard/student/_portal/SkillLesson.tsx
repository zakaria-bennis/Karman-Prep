"use client";

// The lesson on a skill's page (SkillPage.tsx): written or video, switched at the top. Both come from
// src/lib/lessons, one file per skill, loaded when the page opens. The written lesson ends with the
// skill's strategy quiz (founder, 2026-11-20: "the strategy quiz actually lives at the end of the
// lesson"). The video is drawn in code and narrated (LessonVideo.tsx).
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  lessonFor,
  skillIdForName,
  videoFor,
  type LessonVideo,
  type SkillLessonData,
} from "@/lib/lessons";
import { Lesson } from "./lesson/Lesson";
import { LessonVideoPlayer } from "./lesson/LessonVideo";
import lessonStyles from "./lesson/lesson.module.css";
import { Icon } from "./practice";
import styles from "./skill.module.css";

const LESSONS = { written: "Written", video: "Video" } as const;
type Kind = keyof typeof LESSONS;

type Loaded<T> = { id: string; data: T | null };

function Waiting() {
  return (
    <div className={lessonStyles.waiting} aria-label="Loading the lesson" role="status">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

export function SkillLesson({ name }: { name: string }) {
  const still = useReducedMotion() ?? false;
  const [kind, setKind] = useState<Kind>("written");
  const id = skillIdForName(name) ?? "";
  const [lesson, setLesson] = useState<Loaded<SkillLessonData> | null>(null);
  const [video, setVideo] = useState<Loaded<LessonVideo> | null>(null);

  useEffect(() => {
    let live = true;
    lessonFor(id).then((data) => live && setLesson({ id, data }));
    videoFor(id).then((data) => live && setVideo({ id, data }));
    return () => {
      live = false;
    };
  }, [id]);

  const written = lesson?.id === id ? lesson : null;
  const film = video?.id === id ? video : null;

  return (
    <>
      <div className={styles.toggle} role="group" aria-label="Lesson">
        {(Object.keys(LESSONS) as Kind[]).map((key) => (
          <button key={key} type="button" aria-pressed={kind === key} onClick={() => setKind(key)}>
            {kind === key && (
              <motion.span
                layoutId="lesson-toggle"
                className={styles.lens}
                transition={
                  still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                }
              />
            )}
            <span>
              <Icon name={key} size={18} />
              {LESSONS[key]}
            </span>
          </button>
        ))}
      </div>
      {kind === "written" ? (
        !written ? (
          <Waiting />
        ) : written.data ? (
          <Lesson lesson={written.data} />
        ) : (
          <p className={lessonStyles.missing}>The lesson for {name} is on its way.</p>
        )
      ) : !film ? (
        <Waiting />
      ) : (
        <LessonVideoPlayer video={film.data} name={name} />
      )}
    </>
  );
}
