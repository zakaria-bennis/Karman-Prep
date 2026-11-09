import DailyChallenge from "@/components/learn/DailyChallenge";
import LiveLearning from "@/components/learn/LiveLearning";
import DailyLearningHub from "@/components/learn/daily/DailyLearningHub";
import DailyWordLab from "@/components/vocabulary/DailyWordLab";
import WordPartFlashcards from "@/components/vocabulary/WordPartFlashcards";
import { loadDailySlot } from "@/lib/daily-challenge/server";
import { maxDifficultyFor } from "@/lib/assembler/plan-gate";
import { safeAuth } from "@/lib/auth/dev-auth";

export const dynamic = "force-dynamic";

export default async function DailyPracticePage() {
  const asOf = new Date();
  // The plan sets the Challenge's top difficulty: core plans and visitors 5, mastery plans 7.
  const { userId } = await safeAuth();
  const top = await maxDifficultyFor(userId ?? null);
  const math = await loadDailySlot("math", top, asOf);
  const reading = await loadDailySlot("reading", top, asOf);
  return (
    <DailyLearningHub
      challenge={<DailyChallenge math={math} reading={reading} />}
      vocabulary={<DailyWordLab />}
      wordParts={<WordPartFlashcards />}
      liveLearning={<LiveLearning asOf={asOf.toISOString()} />}
    />
  );
}
