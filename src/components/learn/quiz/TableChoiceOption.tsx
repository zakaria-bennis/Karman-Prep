"use client";

import { CalculatorTableAction } from "@/components/calculator/CalculatorSourceAction";
import { Ban } from "lucide-react";
import { useState } from "react";
import QuestionTable from "@/components/learn/QuestionTable";
import MathText from "@/components/learn/MathText";
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
  readOnly = false,
}: {
  id: string;
  groupName: string;
  letter: AnswerLetter;
  table: QuestionTableData;
  selected: boolean;
  submitted: boolean;
  correct: boolean;
  readOnly?: boolean;
  onSelect: (letter: AnswerLetter) => void;
}) {
  const [crossed, setCrossed] = useState(false);
  const summaryId = `${id}-table-summary`;
  const showCorrect = submitted && correct;
  const showWrong = submitted && selected && !correct;
  return (
    <div
      className={cn(
        crossed && "line-through opacity-50",
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
          disabled={readOnly || submitted || crossed}
          onChange={() => onSelect(letter)}
          aria-label={`Choice ${letter}`}
          aria-describedby={summaryId}
          className="h-5 w-5 shrink-0 accent-info"
        />
        <label htmlFor={id} className={cn("font-semibold", !submitted && "cursor-pointer")}>
          {letter}
          {showCorrect ? " — correct" : showWrong ? " — incorrect" : ""}
        </label>
        <button
          type="button"
          className="ml-auto min-h-11 min-w-11"
          aria-label={crossed ? `Restore choice ${letter}` : `Cross out choice ${letter}`}
          aria-pressed={crossed}
          disabled={readOnly}
          onClick={() => setCrossed(!crossed)}
        >
          <Ban size={18} />
        </button>
      </div>
      <span id={summaryId} className="sr-only">
        <MathText text={describeChoiceTable(table)} />
      </span>
      <div
        className={cn("flex min-w-0 justify-center", !submitted && "cursor-pointer")}
        onClick={() => !submitted && !crossed && onSelect(letter)}
      >
        <QuestionTable
          data={table}
          ariaLabel={`Choice ${letter} data table`}
          className="my-2 w-auto max-w-full p-2 shadow-none"
        />
      </div>
      <CalculatorTableAction rows={table.rows} />
    </div>
  );
}
