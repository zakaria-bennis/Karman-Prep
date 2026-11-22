"use client";
// Every activity, played for real from its start page to its ending (overnight build, 2026-11-22).
// A start page (the skill page, the Daily 10's, endless's, a time trial's, the challenge banner, a
// lesson's compass) calls `play(request, from)`; this layer covers the portal and:
//   opens    the Start button's glass grows into the whole screen while the questions are fetched
//            (something new, not a mirror of the ending's transition: founder, 2026-11-20)
//   plays    the activity on the real quiz screen (RunPlay, ChallengePlay, LocalPlay)
//   ends     the last question is carried into the ending (ActivityEnd), which banks nothing itself:
//            the server banked the coins when the run finished
// Done closes it and asks the portal to read the student again, so levels and coins are current.
// With less motion asked for, nothing animates.
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QuizWorld } from "@/components/learn/quiz-shell/QuizWorld";
import { prefersStill } from "@/lib/painting/motion";
import {
  actionChallengeToday,
  actionDailyMix,
  actionFinishStrategy,
  actionSecondChances,
  actionStartEndless,
  actionStartReview,
  actionStartSkillSet,
  actionStartTrial,
  type ChallengeToday,
} from "@/app/learn/play-actions";
import type { RunView } from "@/lib/assembler/run-types";
import type { PlayScope } from "@/lib/play/types";
import { usePortalData } from "../portalData";
import { ActivityEnd } from "./ActivityEnd";
import { ChallengePlay } from "./ChallengePlay";
import { endFromRun } from "./end-from-run";
import type { EndActions, EndView } from "./end-view";
import { LocalPlay, type LocalQuestion } from "./LocalPlay";
import { RunPlay } from "./RunPlay";
import styles from "./play.module.css";

export type PlayRequest =
  | { kind: "set"; skillId: string; skill: string }
  | { kind: "daily" }
  | { kind: "endless"; scope: PlayScope }
  | { kind: "review"; skillId?: string; questionIds?: string[] }
  | { kind: "trial"; scope: PlayScope }
  | { kind: "challenge"; noWorld?: boolean }
  | { kind: "strategy"; skillId: string; skill: string; questions: LocalQuestion[] }
  /** The design page (no student signed in): made-up questions, a made-up ending. */
  | { kind: "demo"; title: string; questions: LocalQuestion[] };

type Opened =
  | { kind: "run"; view: RunView; seed: string; chances: number }
  | { kind: "challenge"; today: ChallengeToday }
  | { kind: "local"; questions: LocalQuestion[]; title: string; seed?: string };

type Phase =
  | { at: "intro" }
  | { at: "opening" }
  | { at: "error"; text: string; limit?: boolean }
  | { at: "playing"; opened: Opened }
  | { at: "ending"; opened: Opened; end: EndView }
  | { at: "ended"; end: EndView };

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function open(request: PlayRequest): Promise<Opened | { error: string; limit?: boolean }> {
  const fail = (r: { error: string; limit?: boolean }) => ({ error: r.error, limit: r.limit });
  const run = async (
    start: Promise<
      | { ok: true; value: { view: RunView; seed: string } }
      | { ok: false; error: string; limit?: boolean }
    >,
    set = false
  ): Promise<Opened | { error: string; limit?: boolean }> => {
    const [r, chances] = await Promise.all([start, set ? actionSecondChances() : null]);
    if (!r.ok) return fail(r);
    return {
      kind: "run",
      view: r.value.view,
      seed: r.value.seed,
      chances: chances?.ok ? chances.value : 0,
    };
  };
  switch (request.kind) {
    case "set":
      return run(actionStartSkillSet({ skillId: request.skillId }), true);
    case "daily":
      return run(actionDailyMix({ timeZone: timeZone() }));
    case "endless":
      return run(actionStartEndless({ scope: request.scope }));
    case "review":
      return run(actionStartReview({ skillId: request.skillId, questionIds: request.questionIds }));
    case "trial":
      return run(actionStartTrial({ scope: request.scope }));
    case "challenge": {
      const r = await actionChallengeToday();
      if (!r.ok) return fail(r);
      return { kind: "challenge", today: r.value };
    }
    case "strategy":
      return { kind: "local", questions: request.questions, title: request.skill };
    case "demo":
      return { kind: "local", questions: request.questions, title: request.title };
  }
}

/** The made-up ending of a local play (a strategy quiz's coins come from the server). */
function localEnd(request: PlayRequest, right: boolean[], wallet: number): EndView {
  const strategy = request.kind === "strategy";
  return {
    activity: strategy ? "strategy" : "set",
    title: strategy ? request.skill : request.kind === "demo" ? request.title : "",
    right: right.filter(Boolean).length,
    total: right.length,
    answers: right.map((ok) => ({ ok })),
    coins: 0,
    coinLines: [],
    wallet,
    multiplier: 1,
    level: strategy
      ? undefined
      : { skill: "", from: 1, to: right.filter(Boolean).length >= 4 ? 2 : 1 },
  };
}

export function PlayLayer({
  request: asked,
  from: startedFrom,
  intro,
  actions,
  onClose,
}: {
  request: PlayRequest;
  /** Where the Start button was, for the glass to grow from. */
  from?: DOMRect | null;
  /** A start page shown first, inside the layer (the Daily 10's, opened from the Library):
   *  nothing starts until its Start is pressed. */
  intro?: (start: (from?: Element | null) => void) => ReactNode;
  /** What the ending's buttons do, beyond Done (which closes this). */
  actions?: Omit<EndActions, "done">;
  /** `finished`: the activity reached its ending before it was closed. */
  onClose(finished: boolean): void;
}) {
  const router = useRouter();
  const portal = usePortalData();
  // the activity now: the one asked for, then perhaps a review of its mistakes or another set
  const [request, setRequest] = useState<PlayRequest>(asked);
  const wallet = portal?.rewards?.coins ?? 0;
  const root = useRef<HTMLDivElement>(null);
  const quiz = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>(intro ? { at: "intro" } : { at: "opening" });
  const [from, setFrom] = useState<DOMRect | null>(startedFrom ?? null);
  const [begun, setBegun] = useState(!intro);
  const [card, setCard] = useState<HTMLElement | null>(null);
  const worked = useRef<Record<string, number>>({});
  /** The finished run's misses, for "Review mistakes". */
  const [missed, setMissed] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  // the portal's menu steps away while a quiz has the screen
  useEffect(() => {
    const doc = document.documentElement;
    doc.setAttribute("data-quiz-up", "");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      doc.removeAttribute("data-quiz-up");
      document.body.style.overflow = overflow;
    };
  }, []);

  // open the activity (again after Try again)
  useEffect(() => {
    if (!begun) return;
    let live = true;
    setPhase({ at: "opening" });
    open(request)
      .then((r) => {
        if (!live) return;
        if ("error" in r) return setPhase({ at: "error", text: r.error, limit: r.limit });
        // a run that was already finished (today's Daily 10 done) goes straight to its ending
        if (r.kind === "run" && r.view.completedAt)
          return setPhase({ at: "ended", end: endFromRun(r.view, { wallet }) });
        setPhase({ at: "playing", opened: r });
      })
      .catch(
        () => live && setPhase({ at: "error", text: "We could not reach Karman. Try again." })
      );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, attempt, begun]);

  // the Start button's glass grows into the screen
  const opening = phase.at === "opening";
  useLayoutEffect(() => {
    const el = root.current?.querySelector<HTMLElement>("[data-grow]");
    if (!opening || !el || prefersStill() || !from) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      {
        clipPath: `inset(${from.top}px ${w - from.right}px ${h - from.bottom}px ${from.left}px round 18px)`,
        opacity: 0.6,
      },
      {
        clipPath: "inset(0px 0px 0px 0px round 0px)",
        opacity: 1,
        duration: 0.7,
        ease: "power3.inOut",
      }
    );
    return () => void tl.kill();
  }, [from, opening]);

  // the first question rises into place when it arrives
  const playing = phase.at === "playing";
  useLayoutEffect(() => {
    if (!playing || prefersStill() || !quiz.current) return;
    const tween = gsap.fromTo(
      quiz.current,
      { opacity: 0, y: 28, scale: 0.985 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out" }
    );
    return () => void tween.kill();
  }, [playing]);

  const finish = useCallback((opened: Opened, end: EndView) => {
    setCard(quiz.current?.querySelector<HTMLElement>("[data-quiz-shell]") ?? null);
    setPhase({ at: "ending", opened, end });
  }, []);

  const finished = phase.at === "ending" || phase.at === "ended";
  const close = useCallback(() => {
    onClose(finished);
    router.refresh();
  }, [onClose, router, finished]);

  const error = (text: string) => setPhase({ at: "error", text });
  let body: ReactNode = null;
  const opened = phase.at === "playing" || phase.at === "ending" ? phase.opened : null;
  if (opened?.kind === "run")
    body = (
      <RunPlay
        view={opened.view}
        seed={opened.seed}
        secondChances={opened.chances}
        onWorked={(id, ms) => (worked.current[id] = ms)}
        onFinished={(view) => {
          setMissed(
            Object.values(view.reviews)
              .filter((r) => !r.isCorrect)
              .map((r) => r.questionId)
          );
          finish(opened, endFromRun(view, { wallet, worked: worked.current }));
        }}
        onExit={close}
        onError={error}
      />
    );
  else if (opened?.kind === "challenge")
    body = (
      <ChallengePlay
        today={opened.today}
        noWorld={request.kind === "challenge" && request.noWorld}
        onExit={close}
        onError={error}
        onFinished={({ answers, done }) =>
          finish(opened, {
            activity: "challenge",
            title: "Challenge",
            right: answers.filter((a) => a.ok).length,
            total: answers.length,
            answers,
            coins: done?.coins.total ?? 0,
            coinLines: done?.coins.lines ?? [],
            wallet: done?.coins.walletBefore ?? wallet,
            multiplier: done?.multiplier.after ?? opened.today.multiplier,
            streak: done?.streak,
            challenge: done?.multiplier ?? {
              before: opened.today.multiplier,
              after: opened.today.multiplier,
            },
          })
        }
      />
    );
  else if (opened?.kind === "local")
    body = (
      <LocalPlay
        questions={opened.questions}
        section={request.kind === "strategy" ? "Strategy" : "Skill set"}
        topic={opened.title}
        seed={opened.seed}
        onExit={close}
        onFinished={async (right) => {
          const end = localEnd(request, right, wallet);
          if (request.kind === "strategy") {
            const r = await actionFinishStrategy({
              skillId: request.skillId,
              right: right.filter(Boolean).length,
              total: Math.max(1, Math.min(5, right.length)),
            }).catch(() => null);
            if (r?.ok)
              Object.assign(end, {
                coins: r.value.coins,
                coinLines: r.value.lines,
                wallet: r.value.walletBefore,
                multiplier: r.value.multiplier,
              });
          }
          finish(opened, end);
        }}
      />
    );

  const end = phase.at === "ending" || phase.at === "ended" ? phase.end : null;
  return (
    <div ref={root} className={styles.layer} data-play={request.kind}>
      {phase.at === "intro" && intro && (
        <div className={styles.intro}>
          <QuizWorld />
          {intro((el) => {
            setFrom(el?.getBoundingClientRect() ?? null);
            setBegun(true);
          })}
        </div>
      )}
      {(phase.at === "opening" || phase.at === "error") && (
        <div className={styles.grow} data-grow aria-hidden="true" />
      )}
      {phase.at === "opening" && (
        <div className={styles.wait} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          Getting your questions ready
        </div>
      )}
      {phase.at === "error" && (
        <div className={styles.wait} role="alert">
          <p>{phase.text}</p>
          <div className={styles.row}>
            {phase.limit ? (
              <a className={styles.go} href="/billing">
                Upgrade
              </a>
            ) : (
              <button type="button" className={styles.go} onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            )}
            <button type="button" className={styles.back} onClick={close}>
              Back
            </button>
          </div>
        </div>
      )}
      {body && phase.at !== "ended" && (
        <div ref={quiz} className={styles.quiz}>
          {body}
        </div>
      )}
      {end && (
        <ActivityEnd
          view={end}
          intro={phase.at === "ending" ? { kind: "singularity", card } : undefined}
          onGone={() => setPhase({ at: "ended", end })}
          actions={endActions(request, {
            ...actions,
            done: close,
            again: () => setAttempt((n) => n + 1),
            review: () =>
              setRequest(
                missed.length
                  ? { kind: "review", questionIds: missed }
                  : {
                      kind: "review",
                      skillId: request.kind === "set" ? request.skillId : undefined,
                    }
              ),
            practice: (skillId, skill) => setRequest({ kind: "set", skillId, skill }),
          })}
        />
      )}
    </div>
  );
}

/** Which of the ending's buttons an activity has, and what each does. */
function endActions(
  request: PlayRequest,
  can: Omit<EndActions, "done" | "review" | "practice"> & {
    done(): void;
    again(): void;
    review(): void;
    practice(skillId: string, skill: string): void;
  }
): EndActions {
  const skill =
    request.kind === "set" || request.kind === "strategy"
      ? { id: request.skillId, name: request.skill }
      : request.kind === "review" && request.skillId
        ? { id: request.skillId, name: "" }
        : null;
  const again = ["set", "endless", "trial", "review"].includes(request.kind)
    ? can.again
    : undefined;
  const review = ["set", "daily", "endless", "trial"].includes(request.kind)
    ? can.review
    : undefined;
  return {
    done: can.done,
    again,
    review,
    lesson: can.lesson,
    nextSkill: can.nextSkill,
    practice:
      skill && (request.kind === "strategy" || request.kind === "review")
        ? () => can.practice(skill.id, skill.name)
        : undefined,
  };
}

/** A start page's player: `play(request, startButton)` opens an activity over the portal. */
export function usePlay(
  actions?: Omit<EndActions, "done">,
  /** Called when the layer closes; `finished` when the activity reached its ending. */
  onClosed?: (finished: boolean) => void
) {
  const [now, setNow] = useState<{
    request: PlayRequest;
    from: DOMRect | null;
    intro?: (start: (from?: Element | null) => void) => ReactNode;
  } | null>(null);
  const play = useCallback(
    (
      request: PlayRequest,
      from?: Element | null,
      intro?: (start: (from?: Element | null) => void) => ReactNode
    ) => {
      setNow({ request, from: from?.getBoundingClientRect() ?? null, intro });
    },
    []
  );
  // on the page's body, so no moving or clipped parent (a sliding skill page) holds it in
  const layer = now
    ? createPortal(
        <PlayLayer
          key={JSON.stringify(now.request)}
          request={now.request}
          from={now.from}
          intro={now.intro}
          actions={actions}
          onClose={(finished) => {
            setNow(null);
            onClosed?.(finished);
          }}
        />,
        document.body
      )
    : null;
  return { layer, play, playing: now?.request ?? null, close: () => setNow(null) };
}
