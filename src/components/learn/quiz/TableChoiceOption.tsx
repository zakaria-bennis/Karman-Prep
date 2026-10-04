"use client";

import QuestionTable from "@/components/learn/QuestionTable";
import { describeChoiceTable } from "@/lib/question-bank/choice-table";
import { cn } from "@/lib/utils";
import type { AnswerLetter } from "@/types/quiz";
import type { QuestionTableData } from "@/types/question-table";

/** A native radio beside a native table; a table cannot legally live inside a button. */
export function TableChoiceOption({
  id,
  groupName,
  letter,
  table,
  selected,
  submitted,
  correct,
  onSelect,
}: {
  id: string;
  groupName: string;
  letter: AnswerLetter;
  table: QuestionTableData;
  selected: boolean;
  submitted: boolean;
  correct: boolean;
  onSelect: (letter: AnswerLetter) => void;
}) {
  const summaryId = `${id}-table-summary`;
  const showCorrect = submitted && correct;
  const showWrong = submitted && selected && !correct;
  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-xl border px-4 py-3 text-left transition-colors focus-within:ring-2 focus-within:ring-info",
        !submitted && "border-bronze bg-surface hover:border-info/40",
        selected && !submitted && "border-info/40 bg-info/10",
        showCorrect && "border-success/40 bg-success/15",
        showWrong && "border-error/40 bg-error/15",
        submitted && !selected && !correct && "border-bronze opacity-50"
      )}
    >
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="radio"
          name={groupName}
          value={letter}
          checked={selected}
          disabled={submitted}
          onChange={() => onSelect(letter)}
          aria-label={`Choice ${letter}`}
          aria-describedby={summaryId}
          className="h-5 w-5 shrink-0 accent-info"
        />
        <label htmlFor={id} className={cn("font-semibold", !submitted && "cursor-pointer")}>
          {letter}
          {showCorrect ? " — correct" : showWrong ? " — incorrect" : ""}
        </label>
      </div>
      <span id={summaryId} className="sr-only">
        {describeChoiceTable(table)}
      </span>
      <div
        className={cn("min-w-0 pl-8", !submitted && "cursor-pointer")}
        onClick={() => !submitted && onSelect(letter)}
      >
        <QuestionTable
          data={table}
          ariaLabel={`Choice ${letter} data table`}
          className="my-2 w-auto max-w-full p-2 shadow-none"
        />
      </div>
    </div>
  );
}
