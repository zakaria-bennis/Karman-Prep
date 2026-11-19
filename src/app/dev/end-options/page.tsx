"use client";
// /dev/end-options: three options for the skill set's end screen, each made the way one of the
// portal's own pages is (founder, 2026-11-19, fifth try). Not wired to a real set: every number is
// made up (parts.tsx).
//   ?v=homework|progress|schedule   which option
//   ?mode=light|dark                day or night
//   ?score=0 to 8                   how the set went (6 when not given)
//   ?face=owl                       the character worn (the fox when not given)
//   ?wear=Top hat,Round glasses     what it has on
//   ?intro=plane|fireflies|flip|shatter  the transition from the last question (plane when not
//                                   given); ?intro=0 opens straight on the ending
// Production builds return 404.
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FaceKind } from "../shell/characters";
import { setEquipped } from "../shell/equipped";
import { wearing } from "../shell/HomeworkBits";
import { HomeworkEnd } from "./HomeworkEnd";
import { ProgressEnd } from "./ProgressEnd";
import { ScheduleEnd } from "./ScheduleEnd";
import { INTROS, type IntroKind } from "./Intro";
import { setOf, useScore } from "./parts";
import "./moods.css";

const OPTIONS = { homework: HomeworkEnd, progress: ProgressEnd, schedule: ScheduleEnd } as const;

function Options() {
  const params = useSearchParams();
  const v = (params.get("v") ?? "homework") as keyof typeof OPTIONS;
  const mode = params.get("mode") === "dark" ? "dark" : "light";
  const face = params.get("face") as FaceKind | null;
  const wear = params.get("wear");
  const asked = params.get("intro");
  const intro: IntroKind | false =
    asked === "0" ? false : asked && asked in INTROS ? (asked as IntroKind) : "plane";
  const score = useScore();
  const set = useMemo(() => setOf(score), [score]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", mode);
    if (face) setEquipped({ face });
    if (wear) setEquipped({ outfit: wearing(...wear.split(",")) });
    setReady(true);
  }, [mode, face, wear]);
  const Option = OPTIONS[v] ?? HomeworkEnd;
  return ready ? <Option key={score} mode={mode} set={set} intro={intro} /> : null;
}

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Options />
    </Suspense>
  );
}
