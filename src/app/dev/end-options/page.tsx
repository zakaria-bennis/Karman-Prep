"use client";
// /dev/end-options: three options for the skill set's end screen, each made the way one of the
// portal's own pages is (founder, 2026-11-19, fifth try). Not wired to a real set: every number is
// made up (parts.tsx).
//   ?v=homework|progress|schedule   which option
//   ?mode=light|dark                day or night
//   ?score=0 to 8                   how the set went (6 when not given)
//   ?face=owl                       the character worn (the fox when not given)
// Production builds return 404.
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FaceKind } from "../shell/characters";
import { setEquipped } from "../shell/equipped";
import { HomeworkEnd } from "./HomeworkEnd";
import { ProgressEnd } from "./ProgressEnd";
import { ScheduleEnd } from "./ScheduleEnd";
import { setOf, useScore } from "./parts";
import "./moods.css";

const OPTIONS = { homework: HomeworkEnd, progress: ProgressEnd, schedule: ScheduleEnd } as const;

function Options() {
  const params = useSearchParams();
  const v = (params.get("v") ?? "homework") as keyof typeof OPTIONS;
  const mode = params.get("mode") === "dark" ? "dark" : "light";
  const face = params.get("face") as FaceKind | null;
  const score = useScore();
  const set = useMemo(() => setOf(score), [score]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", mode);
    if (face) setEquipped({ face });
    setReady(true);
  }, [mode, face]);
  const Option = OPTIONS[v] ?? HomeworkEnd;
  return ready ? <Option key={score} mode={mode} set={set} /> : null;
}

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Options />
    </Suspense>
  );
}
