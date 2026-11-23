"use client";

// The design page's switches (/dev/shell, signed out): whose menu to show, which made-up student,
// the Free plan, the chat's states, the exam's banner, the challenge's intro and the music offer.
// A signed-in student never sees them.
import type { Page, Plan } from "./plans";
import { PLANS } from "./plans";
import { STUDENTS, type StudentKey } from "./Progress";
import { ChatDemo } from "./shellBits";
import { forgetMusic } from "./MusicOffer";
import styles from "./shell.module.css";

export function DemoSwitches({
  plan,
  onPlan,
  page,
  student,
  onStudent,
  free,
  onFree,
  examOpen,
  onExamOpen,
  onIntro,
  onOffer,
}: {
  plan: Plan;
  onPlan: (plan: Plan) => void;
  page: Page;
  student: StudentKey;
  onStudent: (student: StudentKey) => void;
  free: boolean;
  onFree: (free: boolean) => void;
  examOpen: boolean;
  onExamOpen: (open: boolean) => void;
  onIntro: () => void;
  onOffer: () => void;
}) {
  return (
    <div className={styles.demo} role="group" aria-label="Demo switches">
      {(Object.keys(PLANS) as Plan[]).map((k) => (
        <button key={k} type="button" aria-pressed={plan === k} onClick={() => onPlan(k)}>
          {PLANS[k].label}
        </button>
      ))}
      {(page === "progress" || page === "mistakes") &&
        (Object.keys(STUDENTS) as StudentKey[]).map((k) => (
          <button key={k} type="button" aria-pressed={student === k} onClick={() => onStudent(k)}>
            {STUDENTS[k].label}
          </button>
        ))}
      {(page === "progress" || page === "library") && plan === "practice" && (
        <button type="button" aria-pressed={free} onClick={() => onFree(!free)}>
          Free plan
        </button>
      )}
      {plan !== "practice" && <ChatDemo plan={plan} />}
      {page === "homework" && (
        <>
          <button type="button" aria-pressed={examOpen} onClick={() => onExamOpen(!examOpen)}>
            Exam open
          </button>
          <button type="button" onClick={onIntro}>
            Challenge intro
          </button>
        </>
      )}
      {/* shows the late-night offer of music now, whatever the hour and whatever was answered */}
      <button
        type="button"
        onClick={() => {
          forgetMusic();
          onOffer();
        }}
      >
        Offer music
      </button>
    </div>
  );
}
