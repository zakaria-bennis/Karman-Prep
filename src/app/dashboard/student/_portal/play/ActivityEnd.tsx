"use client";
// Every activity's ending, one family (founder, 2026-11-19, the Homework-made option he took forward,
// moved out of the dev demo for the overnight build, 2026-11-22):
//   Left    the student's character, dressed as they have it, in a ring that fills to the result and
//           changes color as it goes (red, orange, yellow, green; gold only when every answer is
//           right); under it the big number, the word for how it went, one fact row for the activity
//           (a skill set's level as Karman's tails, the Daily 10's streak, endless's best run, a time
//           trial's pace, the challenge's multiplier, the strategy quiz's compass), and the coins,
//           which fly up into the corner by themselves.
//   Right   each answer as glass (a time trial's as pacing bars, a long endless run as small discs),
//           and at the bottom right the next step: one green glowing button, the others small.
// No time or pace is shown for a skill set. With less motion asked for, nothing moves.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { confetti } from "@/components/quiz-flows/stage-motion";
import { prefersStill } from "@/lib/painting/motion";
import { formatClock } from "@/lib/student/time-trial";
import { Buddy } from "../HomeworkBuddy";
import hw from "../homework.module.css";
import lib from "../library.module.css";
import { LEVELS } from "../skills72";
import { Icon } from "../practice";
import { Compass } from "./Compass";
import type { EndActions, EndView } from "./end-view";
import { Frame, Go, Mood, Others, ringColor, toneOf, useCoins } from "./endParts";
import { TailsMark } from "./fox/TailsStage";
import { Intro, type IntroKind } from "./intro/Intro";
import { unfold } from "./intro/unfold";
import { LevelUp } from "./LevelUp";
import "./moods.css";
import o from "./activityEnd.module.css";

const R = 74;
const ROUND = 2 * Math.PI * R;

const VERDICT = {
  perfect: "Perfect",
  strong: "Strong",
  middle: "Getting there",
  tough: "Tough one",
} as const;

/** The share the ring fills to, and the big number under it. */
function measure(view: EndView): { share: number; big: string } {
  if (view.activity === "endless" && view.endless) {
    const { run, best } = view.endless;
    return { share: best > 0 ? Math.min(1, run / best) : run > 0 ? 1 : 0, big: String(run) };
  }
  const share = view.total ? view.right / view.total : 0;
  if (view.activity === "challenge" || view.activity === "strategy" || view.activity === "daily")
    return { share, big: `${view.right} of ${view.total}` };
  return { share, big: `${Math.round(share * 100)}%` };
}

function verdictOf(view: EndView, share: number) {
  if (view.activity === "endless" && view.endless)
    return view.endless.newBest ? "New best!" : view.endless.run >= 10 ? "Nice run" : "Good try";
  if (view.activity === "trial" && view.trial)
    return view.trial.held
      ? "Faster next round"
      : view.trial.timeUp
        ? "Out of time"
        : "Hold steady";
  return VERDICT[toneOf(share)];
}

/** The next step chosen from the result, and the others, small. Only steps with an action show. */
function nextFor(view: EndView, share: number, a: EndActions) {
  type Step = { label: string; onClick?: () => void };
  const done: Step = { label: "Done", onClick: a.done };
  const review: Step = { label: "Review mistakes", onClick: a.review };
  const missed = view.right < view.total;
  const plan: Step[] = (() => {
    switch (view.activity) {
      case "set": {
        const tone = toneOf(share);
        const lesson = { label: "Read the lesson", onClick: a.lesson };
        const again = { label: tone === "tough" ? "Try again" : "Another set", onClick: a.again };
        if (tone === "tough") return [lesson, again, review];
        if (tone === "middle") return [review, again, lesson];
        if (tone === "strong") return [again, review];
        return [again, { label: "Next skill", onClick: a.nextSkill }];
      }
      case "daily":
      case "challenge":
        return missed ? [review, done] : [done];
      case "endless":
        return [{ label: "Go again", onClick: a.again }, review];
      case "trial":
        return missed
          ? [review, { label: "Next round", onClick: a.again }]
          : [{ label: "Next round", onClick: a.again }];
      case "strategy":
        return [{ label: "Start a skill set", onClick: a.practice }, done];
      case "review":
        return [done, { label: "Review more", onClick: a.again }];
    }
  })();
  const steps = plan.filter((s): s is Required<Step> => !!s.onClick);
  const main = steps[0] ?? (done as Required<Step>);
  return { main, others: steps.slice(1).filter((s) => s.label !== main.label) };
}

function Fact({ view, shown }: { view: EndView; shown: number }) {
  if (view.activity === "set" && view.level)
    return (
      <>
        <span key={shown} className={o.stageMark}>
          <TailsMark level={shown} size={44} />
        </span>
        <b>{LEVELS[shown]}</b>
      </>
    );
  if ((view.activity === "daily" || view.activity === "challenge") && view.streak)
    return (
      <>
        <span className={o.factIcon} data-flame>
          <Icon name="flame" size={30} />
        </span>
        <b>
          {view.streak.days} {view.streak.days === 1 ? "day" : "days"} in a row
        </b>
      </>
    );
  if (view.activity === "endless" && view.endless)
    return (
      <>
        <span className={o.factIcon}>
          <Icon name="endless" size={30} />
        </span>
        <b>Best {Math.max(view.endless.best, view.endless.run)}</b>
      </>
    );
  if (view.activity === "trial" && view.trial)
    return (
      <>
        <span className={o.factIcon}>
          <Icon name="trial" size={40} />
        </span>
        <b>
          {formatClock(view.trial.pace)} a question{" "}
          <small>SAT {formatClock(view.trial.testPace)}</small>
        </b>
      </>
    );
  if (view.activity === "strategy")
    return (
      <>
        <Compass size={44} swing />
        <b>Strategy</b>
      </>
    );
  return null;
}

export function ActivityEnd({
  view,
  actions,
  intro,
  onGone,
}: {
  view: EndView;
  actions: EndActions;
  /** Carry the last question (the player's quiz screen) into this ending. */
  intro?: { kind: IntroKind; card: HTMLElement | null };
  onGone?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const ringSvg = useRef<SVGSVGElement>(null);
  const corner = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const big = useRef<HTMLElement>(null);
  const levelRow = useRef<HTMLParagraphElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const transition = intro?.card && !prefersStill() ? intro : null;
  const [begun, setBegun] = useState(!transition);
  const [leveled, setLeveled] = useState(false);
  const [home, setHome] = useState(false);
  const { share, big: bigText } = measure(view);
  const tone = toneOf(view.activity === "endless" ? (view.endless?.newBest ? 1 : share) : share);
  const up = view.activity === "set" && !!view.level && view.level.to > view.level.from;
  const shown = view.level ? (leveled ? view.level.to : view.level.from) : 0;
  const { burst, coins } = useCoins({ coins: view.coins, wallet: view.wallet }, corner, 2.4, begun);
  const next = nextFor(view, share, actions);
  const final = ringColor(share);

  // with no transition, the player may take its quiz away at once
  useEffect(() => {
    if (!transition) onGone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // laid out before the first paint, so the ending is never seen in its place before it flies there
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !begun) return;
    const paint = (f: number) => {
      ring.current?.setAttribute("stroke-dashoffset", String(ROUND * (1 - f)));
      el.style.setProperty("--ring", ringColor(f));
      if (big.current && view.activity !== "endless" && bigText.endsWith("%"))
        big.current.textContent = `${Math.round(f * 100)}%`;
    };
    if (prefersStill()) {
      paint(share);
      const id = requestAnimationFrame(() => setHome(true));
      return () => cancelAnimationFrame(id);
    }
    paint(0);
    const at = { f: 0 };
    const line = gsap.timeline();
    const plan = unfold(
      transition?.kind ?? "none",
      el,
      line,
      ringSvg.current?.getBoundingClientRect(),
      (when, seconds) => {
        line.to(
          at,
          { f: share, duration: seconds, ease: "power2.inOut", onUpdate: () => paint(at.f) },
          when
        );
        if (share === 1)
          line.fromTo(
            ring.current,
            { strokeWidth: 10 },
            { strokeWidth: 14, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" },
            when + seconds
          );
      }
    );
    line
      .fromTo(
        el.querySelectorAll("[data-about]"),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "power3.out" },
        plan.about
      )
      .call(() => setHome(true), [], plan.home)
      .fromTo(
        el.querySelectorAll("[data-next]"),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)" },
        up ? plan.home + 4.4 : plan.next
      );
    return () => void line.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [begun]);

  // a good result: once home, the character celebrates and confetti bursts out of its ring
  useEffect(() => {
    if (!home || (tone !== "strong" && tone !== "perfect")) return;
    return confetti(hero.current, 0.15, tone === "perfect" ? 90 : 60);
  }, [home, tone]);

  const many = view.answers.length > 12;
  const longest = Math.max(
    1,
    ...view.answers.map((a) => a.seconds ?? 0),
    view.trial?.testPace ?? 0
  );
  return (
    <Frame title={view.title} corner={corner} wallet={view.wallet} onDone={actions.done}>
      {burst}
      {transition?.card && (
        <Intro
          kind={transition.kind}
          card={transition.card}
          target={ringSvg}
          onTaken={() => undefined}
          onLanded={() => setBegun(true)}
          onGone={() => onGone?.()}
        />
      )}
      {begun && up && view.level && (
        <LevelUp
          skill={view.level.skill}
          from={view.level.from}
          to={view.level.to}
          after={2.9}
          target={levelRow}
          onDone={() => setLeveled(true)}
        />
      )}
      <div
        className={`${lib.library} ${hw.homework} ${o.page}`}
        ref={root}
        data-held={!begun || undefined}
        data-activity={view.activity}
        style={{ "--ring": final } as CSSProperties}
      >
        <section className={`${lib.glass} ${hw.side} ${o.side}`} data-pane aria-label="You">
          <div className={o.hero} ref={hero} data-hero>
            <div className={`${hw.ring} ${o.ring}`} data-gold={share === 1 || undefined}>
              <svg ref={ringSvg} viewBox="0 0 168 168" width="168" height="168" aria-hidden="true">
                <circle cx="84" cy="84" r={R} className={hw.track} />
                <circle
                  ref={ring}
                  cx="84"
                  cy="84"
                  r={R}
                  className={`${hw.fill} ${o.fill}`}
                  strokeDasharray={ROUND}
                  strokeDashoffset={ROUND}
                  transform="rotate(-90 84 84)"
                />
              </svg>
              {begun && (
                <span className={o.pop} data-pop>
                  <Mood tone={tone} start={home}>
                    <Buddy size={104} cheer={0} />
                  </Mood>
                </span>
              )}
            </div>
            <b className={o.percent} ref={big} data-percent>
              {bigText.endsWith("%") && view.activity !== "endless" ? "0%" : bigText}
            </b>
          </div>
          <div className={o.about}>
            <h2 className={o.verdict} data-about>
              {verdictOf(view, share)}
            </h2>
            {view.activity === "challenge" && view.challenge && (
              <p className={o.sub} data-about>
                Multiplier ×{view.challenge.before.toFixed(2)} → ×{view.challenge.after.toFixed(2)}
              </p>
            )}
            {view.activity === "trial" && view.trial && (
              <p className={o.sub} data-about>
                Round {view.trial.round} at {view.trial.multiplier.toFixed(2)}× · next{" "}
                {view.trial.next.toFixed(2)}×
              </p>
            )}
          </div>
          <p className={o.levelRow} ref={levelRow} data-lit={leveled || undefined} data-about>
            <Fact view={view} shown={shown} />
          </p>
          {view.coins > 0 && (
            <p className={o.coinRow} data-about>
              {coins}
            </p>
          )}
        </section>

        <section className={`${lib.glass} ${hw.main} ${o.main}`} data-pane aria-label="Answers">
          {view.activity === "trial" && view.trial ? (
            <div className={o.bars} aria-label="Seconds a question">
              {view.answers.map((a, i) => (
                <span
                  key={i}
                  data-answer
                  data-bar
                  data-ok={a.ok || undefined}
                  style={{ height: `${Math.max(6, ((a.seconds ?? 0) / longest) * 100)}%` }}
                  title={`Question ${i + 1}: ${a.seconds ?? 0}s, ${a.ok ? "correct" : "incorrect"}`}
                />
              ))}
              <i
                className={o.paceLine}
                style={{ bottom: `${(view.trial.testPace / longest) * 100}%` }}
                aria-hidden="true"
              />
              <small className={o.barsKey}>
                {formatClock(view.trial.usedSeconds)} of {formatClock(view.trial.limitSeconds)} ·{" "}
                {Math.round(view.trial.accuracy * 100)}% right · line: the SAT&rsquo;s pace
              </small>
            </div>
          ) : many ? (
            <ol className={o.discs} aria-label={`${view.right} of ${view.total} right`}>
              {view.answers.map((a, i) => (
                <li key={i} data-answer data-ok={a.ok || a.rescued || undefined}>
                  {i + 1}
                </li>
              ))}
            </ol>
          ) : (
            <ol className={o.answers}>
              {view.answers.map((a, i) => (
                <li key={i} data-answer>
                  <span className={o.answer} data-ok={a.ok || a.rescued || undefined}>
                    <i className={o.num}>{i + 1}</i>
                    <b>
                      {a.rescued ? "Put right" : a.ok ? "Correct" : "Incorrect"}
                      {a.skill && view.activity !== "set" && (
                        <small>{a.review ? `Review · ${a.skill}` : a.skill}</small>
                      )}
                    </b>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      {a.ok || a.rescued ? (
                        <path d="M5 12.500l4.500 4.500L19 7.500" />
                      ) : (
                        <path d="M7 7l10 10M17 7L7 17" />
                      )}
                    </svg>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {view.activity === "daily" && !!view.moves?.length && (
            <ul className={o.moves} aria-label="Skills that moved">
              {view.moves.map((m) => (
                <li key={m.skill} data-up={m.to > m.from || undefined}>
                  <TailsMark level={m.to} size={30} />
                  <span>{m.skill}</span>
                  <b>{LEVELS[m.to]}</b>
                </li>
              ))}
            </ul>
          )}
          <div className={o.next}>
            <div data-next>
              <Go onClick={next.main.onClick}>{next.main.label}</Go>
            </div>
            {next.others.length > 0 && (
              <div data-next>
                <Others links={next.others} />
              </div>
            )}
          </div>
        </section>
      </div>
    </Frame>
  );
}
