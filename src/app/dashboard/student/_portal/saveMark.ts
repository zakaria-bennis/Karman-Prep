// Saves a bookmark or a tutor flag changed in the Mistake Log, through the quiz engine's own actions
// (src/app/learn/saved-question-actions.ts), so the tutor sees a flag wherever it was made. Only a
// real answer carries a question id; the design page's made-up ones are kept on the page alone.
import {
  actionFlagForTutor,
  actionRemoveTutorFlag,
  actionSetBookmark,
} from "@/app/learn/saved-question-actions";
import type { Asked } from "./mistakeLogData";
import type { Marked } from "./MistakeLogViews";

export function saveMark(q: Asked, was: Marked, now: Marked): void {
  const questionId = q.questionId;
  if (!questionId) return;
  const run = async () => {
    if (now.flagged && !was.flagged) {
      await actionFlagForTutor({ questionId, nodeId: null, note: null });
      return;
    }
    if (was.flagged && !now.flagged) await actionRemoveTutorFlag({ questionId });
    if (was.bookmarked !== now.bookmarked && !now.flagged)
      await actionSetBookmark({ questionId, on: now.bookmarked });
  };
  run().catch((e: unknown) => console.error("[mistake log] could not save the mark", e));
}
