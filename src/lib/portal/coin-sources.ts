// Rewards' "This week": where each coin came from, by its award key. Pure.

/** Where an award came from, by the start of its key. The keys as they are written: the portal's
 *  activities and the exams bank under "play:<source>:" and "exam:" (loadPlayAwards,
 *  loadExamAwards); a quiz run's answers under "run:<runId>:<question>", named by the run's kind;
 *  the challenge under "daily:<day>:<subject>"; catalog practice and lessons under "catalog:" and
 *  "lesson:". */
const PLAY: Record<string, string> = {
  "skill-set": "Skill sets",
  "daily-ten": "Daily 10",
  endless: "Endless mode",
  "time-trial": "Time trials",
  challenge: "Challenge",
  strategy: "Strategy quizzes",
  review: "Reviews",
};
const RUN: Record<string, string> = {
  "daily-ten": "Daily 10",
  "full-test": "Exams",
  diagnostic: "Exams",
  "time-trial": "Time trials",
};
/** The run an award key belongs to, if it is a run's. */
export const runOf = (key: string) => (key.startsWith("run:") ? key.split(":")[1] || null : null);
export function sourceOf(
  key: string,
  kindOf: (runId: string) => string | undefined = () => undefined
) {
  const [head, second] = key.split(":");
  if (head === "play") return PLAY[second] ?? "Skill levels";
  if (head === "exam") return "Exams";
  if (head === "daily") return "Challenge";
  if (head === "run") return RUN[kindOf(second) ?? ""] ?? "Skill levels";
  return "Skill levels";
}
