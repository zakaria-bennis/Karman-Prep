"use client";
// A strategy quiz: its start page and its play (founder, 2026-11-16 and 2026-11-20: strategy quizzes
// use a compass, are five questions at most, and live at the end of the skill's lesson). The lesson's
// button opens /learn/strategy/<skill>. The questions come from the skill's lesson (src/lib/lessons);
// a skill with none yet says so. Start opens the quiz over the page; its ending's Done goes back.
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QuizWorld } from "@/components/learn/quiz-shell/QuizWorld";
import { prefersStill } from "@/lib/painting/motion";
import { strategyNameFor, strategyQuizFor, type StrategyQuestion } from "@/lib/lessons";
import { skill72 } from "@/lib/skills/ids72";
import { Compass } from "./Compass";
import { usePlay } from "./PlayLayer";
import s from "./strategy.module.css";

export function StrategyStart({ skillId }: { skillId: string }) {
  const router = useRouter();
  const skill = skill72(skillId);
  const [quiz, setQuiz] = useState<StrategyQuestion[] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const start = useRef<HTMLButtonElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const { layer, play } = usePlay();

  useEffect(() => {
    let live = true;
    Promise.all([strategyQuizFor(skillId), strategyNameFor(skillId)])
      .then(([q, n]) => {
        if (!live) return;
        setQuiz(q);
        setName(n);
      })
      .catch(() => live && setQuiz([]));
    return () => {
      live = false;
    };
  }, [skillId]);

  useLayoutEffect(() => {
    const el = page.current;
    if (!el || !quiz || prefersStill()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.08 }
      );
    }, el);
    return () => ctx.revert();
  }, [quiz]);

  const back = () =>
    window.history.length > 1 ? router.back() : router.push("/dashboard/student");
  return (
    <div className={s.page} ref={page} data-flow-stage="">
      <QuizWorld />
      <button type="button" className={s.back} onClick={back}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M14.500 6.500L9 12l5.500 5.500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Lesson
      </button>
      <section className={s.card}>
        <span className={s.compass} data-rise>
          <Compass size={150} swing={!!quiz} />
        </span>
        <p className={s.kicker} data-rise>
          Strategy quiz · {skill?.name ?? "Skill"}
        </p>
        <h1 data-rise>{name ?? (quiz === null ? " " : "Strategy")}</h1>
        {quiz === null ? (
          <p data-rise>Getting it ready</p>
        ) : quiz.length === 0 ? (
          <p data-rise>This skill&rsquo;s strategy quiz is on its way.</p>
        ) : (
          <>
            <p data-rise>
              {quiz.length} {quiz.length === 1 ? "question" : "questions"} on the strategy you just
              read. Use it on each one.
            </p>
            <button
              ref={start}
              type="button"
              className={s.go}
              data-rise
              onClick={() =>
                play(
                  {
                    kind: "strategy",
                    skillId,
                    skill: skill?.name ?? "Strategy",
                    questions: quiz.map((q) => ({
                      text: q.text,
                      passage: q.passage,
                      choices: q.choices,
                      right: q.right,
                      why: q.why,
                      subject: q.subject,
                    })),
                  },
                  start.current
                )
              }
            >
              Start
            </button>
          </>
        )}
      </section>
      {layer}
    </div>
  );
}
