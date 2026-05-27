import type { SourceLineage } from "@/lib/source-lineage/types";
import type { QuizQuestionWithChoices } from "@/types/quiz";

export type PreviewQuestionWithLineage = QuizQuestionWithChoices & {
  sourceLineage: SourceLineage | null;
};
