// A finished run said as an ending (end-view.ts). Pure, so it can be tested and shared.
import type { RunView } from "@/lib/assembler/run-types";
import { TRIAL_MODULE } from "@/lib/student/time-trial";
import type { EndAnswer, EndView, Level } from "./end-view";

/** The ending's facts for a finished run. `wallet` is the balance to start the counter from when
 *  the run could not say it (the coin ledger not there yet); `worked` is each question's time. */
export function endFromRun(
  view: RunView,
  fallback: { wallet: number; worked?: Record<string, number> }
): EndView {
  const play = view.result?.play;
  const section = view.sections[0];
  const reviews = view.reviews;
  const asked = view.sections.flatMap((s) => s.questions);
  const answers: EndAnswer[] = play
    ? play.answers.map((a) => ({
        ok: a.ok,
        rescued: a.rescued || undefined,
        skill: a.skill || undefined,
        seconds: fallback.worked?.[a.questionId]
          ? Math.round(fallback.worked[a.questionId] / 1000)
          : a.seconds,
      }))
    : asked
        .filter((q) => reviews[q.id])
        .map((q) => ({ ok: !!reviews[q.id]?.isCorrect, skill: section.topics[q.id] }));
  const right = answers.filter((a) => a.ok || a.rescued).length;
  const coins = play?.coins;
  const base: EndView = {
    activity: "set",
    title: view.title,
    right,
    total: answers.length,
    answers,
    coins: coins?.total ?? 0,
    coinLines: coins?.lines ?? [],
    wallet: coins?.walletBefore ?? fallback.wallet,
    multiplier: coins?.multiplier ?? 1,
  };
  const mode =
    play?.mode ??
    (view.kind === "daily-ten" ? "daily" : view.kind === "time-trial" ? "trial" : "set");
  if (mode === "daily")
    return {
      ...base,
      activity: "daily",
      title: "Daily 10",
      moves: (play?.moves ?? []).map((m) => ({ skill: m.skill, from: m.from, to: m.to })),
      streak:
        play?.streak ??
        (view.result?.streak ? { days: view.result.streak, best: view.result.streak } : undefined),
    };
  if (mode === "endless") {
    const run = play?.endless?.run ?? right;
    const best = play?.endless?.best ?? 0;
    return {
      ...base,
      activity: "endless",
      endless: { run, best, newBest: run > best, hearts: play?.endless?.hearts ?? 3 },
    };
  }
  if (mode === "review") return { ...base, activity: "review" };
  if (mode === "trial") {
    const t = view.result?.trial;
    const subject = section?.subject ?? "reading";
    const testPace = Math.round(TRIAL_MODULE[subject].seconds / TRIAL_MODULE[subject].questions);
    const scope = view.scope ?? "";
    const kind = scope.startsWith("trial:skill:")
      ? "skill"
      : scope.startsWith("trial:domain:")
        ? "domain"
        : "section";
    const answered = t?.answered || answers.length || 1;
    return {
      ...base,
      activity: "trial",
      title: section?.title?.replace(/, round \d+$/, "") ?? "Time trial",
      right: t?.correct ?? right,
      total: t?.questions ?? answers.length,
      trial: t
        ? {
            kind,
            round: t.round,
            multiplier: t.multiplier,
            next: t.nextMultiplier,
            limitSeconds: t.limitSeconds,
            usedSeconds: t.elapsedSeconds,
            pace: Math.round(t.elapsedSeconds / answered),
            testPace,
            accuracy: t.accuracy,
            bar: t.bar,
            held: t.held,
            timeUp: t.timeUp,
          }
        : undefined,
    };
  }
  const level = play?.level;
  return {
    ...base,
    activity: "set",
    title: level?.skill ?? view.title,
    level: level
      ? { skill: level.skill, from: level.from as Level, to: level.to as Level }
      : undefined,
  };
}
