import DailyChallenge from "@/components/learn/DailyChallenge";
import LiveLearning from "@/components/learn/LiveLearning";
import DailyLearningHub from "@/components/learn/daily/DailyLearningHub";
import DailyWordLab from "@/components/vocabulary/DailyWordLab";
import WordPartFlashcards from "@/components/vocabulary/WordPartFlashcards";
import { loadDailySlot } from "@/lib/daily-challenge/server";

export const dynamic = "force-dynamic";

export default async function DailyPracticePage() {
  const asOf = new Date();
  const math = await loadDailySlot("math", asOf);
  const reading = await loadDailySlot("reading", asOf);
  return (
    <DailyLearningHub
      challenge={<DailyChallenge math={math} reading={reading} />}
      vocabulary={<DailyWordLab />}
      wordParts={<WordPartFlashcards />}
      liveLearning={<LiveLearning asOf={asOf.toISOString()} />}
    />
  );
}
