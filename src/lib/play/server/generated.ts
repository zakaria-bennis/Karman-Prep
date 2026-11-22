// Math on demand (Generator stream, src/lib/generator/serve.ts): a generated Math question is made
// and saved only when a student is about to see it, so generated Math never runs out and still lands
// in the Mistake Log by its question id. Server only.
//   Skill sets   a Math skill with fewer than eight fresh questions is filled up at the start.
//   Endless      when a Math skill in the run is down to its last few open questions, one more is
//                made and added to the open run before the next question is chosen.
//   Reviews      a due Math skill with no fresh question left gets a made one.
// The hook returns nothing for a core plan, a skill that isn't Math, or while an admin has hidden
// generated questions; then the bank's own questions are all there is.
import "server-only";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import { updateRun } from "@/lib/assembler/run-store";
import type { RunRecord, RunResponse } from "@/lib/assembler/run-types";
import { nextGeneratedQuestion } from "@/lib/generator/serve";
import { skill72 } from "@/lib/skills/ids72";
import type { Item72 } from "./pool72";

/** A Math skill with fewer open questions than this in a run gets one made for it. */
export const LOW_WATER = 3;
/** Runs keep at most 400 questions (quiz_runs' check). */
const RUN_CAP = 400;

export type Made = { item: Item72; snapshot: CatalogDeliverySnapshot };

const isMath = (skillId: string) => skill72(skillId)?.section === "Math";

/** Up to `count` questions made for one Math skill, near `difficulty`. Never throws. */
export async function makeMath(
  skillId: string,
  difficulty: number,
  practiceSet: boolean,
  count = 1
): Promise<Made[]> {
  if (!isMath(skillId) || practiceSet || count < 1) return [];
  const made = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      nextGeneratedQuestion({
        skillId,
        // a spread around the asked difficulty, so a set still has somewhere to go
        difficulty: Math.max(1, Math.min(7, difficulty + ((i % 3) - 1))),
        practiceSet,
      }).catch(() => null)
    )
  );
  return made.filter((m): m is Made => m !== null);
}

/** The difficulty an endless run is aiming at now. */
function aim(run: RunRecord, responses: readonly RunResponse[]): number {
  const adaptive = run.form.adaptive;
  if (!adaptive) return 4;
  let target = adaptive.startDifficulty;
  for (const r of responses) target += r.isCorrect ? 1 : -1;
  return Math.max(1, Math.min(adaptive.maxDifficulty, target));
}

/** An open endless run with one more Math question in it when a Math skill in the run is running
 *  low, the lowest first; the run as it was otherwise. Saved before the next question is chosen. */
export async function topUpEndless(
  run: RunRecord,
  responses: readonly RunResponse[],
  families: ReadonlyMap<string, string>
): Promise<RunRecord> {
  const play = run.form.play;
  if (play?.mode !== "endless" || play.practiceSet || run.snapshots.length >= RUN_CAP) return run;
  const files = play.skills ?? {};
  const served = new Set(run.sequence);
  const usedFamilies = new Set(run.sequence.map((id) => families.get(id)));
  const open = new Map<string, number>();
  const inRun = new Set(Object.values(files).map((f) => f.s));
  if (play.scope?.kind === "skill") inRun.add(play.scope.skillId);
  for (const skillId of inRun) if (isMath(skillId)) open.set(skillId, 0);
  for (const s of run.snapshots) {
    const id = s.binding.questionId;
    const skillId = files[id]?.s;
    if (!skillId || !open.has(skillId) || served.has(id) || usedFamilies.has(families.get(id)))
      continue;
    open.set(skillId, (open.get(skillId) ?? 0) + 1);
  }
  const low = [...open]
    .filter(([, n]) => n < LOW_WATER)
    .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))[0];
  if (!low) return run;
  const [made] = await makeMath(low[0], aim(run, responses), false, 1);
  if (!made || run.snapshots.some((s) => s.binding.questionId === made.item.id)) return run;
  const next: RunRecord = {
    ...run,
    snapshots: [...run.snapshots, made.snapshot],
    form: {
      ...run.form,
      play: {
        ...play,
        skills: { ...files, [made.item.id]: { s: made.item.skill72, d: made.item.domain72 } },
      },
    },
  };
  await updateRun(run.id, run.studentId, { snapshots: next.snapshots, form: next.form });
  return next;
}
