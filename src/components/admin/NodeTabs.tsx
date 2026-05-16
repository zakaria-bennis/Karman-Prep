"use client";

// ============================================================
// NodeTabs — client-side tab container for the per-node editor.
// ============================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HelpCircle, BookOpenText, Video, Upload } from "lucide-react";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import type { Subject } from "@/data/curriculum";
import QuestionEditor from "./QuestionEditor";
import TextbookEditor from "./TextbookEditor";
import VideoUploader from "./VideoUploader";
import BulkImportPanel from "./BulkImportPanel";

type Tab = "questions" | "textbook" | "video" | "import";

interface Props {
  nodeId: string;
  subject: Subject;
  topicCluster: string;
  initialTab: Tab;
  initialQuestions: QuizQuestionWithChoices[];
  initialTextbook: string;
  initialVideoUrl: string | null;
  initialVideoStoragePath: string | null;
  initialVideoDuration: number | null;
}

const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "questions", label: "Questions", Icon: HelpCircle },
  { key: "textbook", label: "Textbook", Icon: BookOpenText },
  { key: "video", label: "Video", Icon: Video },
  { key: "import", label: "Bulk Import", Icon: Upload },
];

export default function NodeTabs({
  nodeId,
  subject,
  topicCluster,
  initialTab,
  initialQuestions,
  initialTextbook,
  initialVideoUrl,
  initialVideoStoragePath,
  initialVideoDuration,
}: Props) {
  const [active, setActive] = useState<Tab>(initialTab);

  return (
    <div>
      <div className="mb-6 flex gap-0.5 overflow-x-auto border-b border-slate-800 text-sm">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 pb-3 pt-2 font-semibold transition-colors",
              active === key
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {key === "questions" && initialQuestions.length > 0 && (
              <span className="text-xs text-slate-400">({initialQuestions.length})</span>
            )}
          </button>
        ))}
      </div>

      {active === "questions" && (
        <QuestionEditor
          nodeId={nodeId}
          subject={subject}
          topicCluster={topicCluster}
          initialQuestions={initialQuestions}
        />
      )}
      {active === "textbook" && <TextbookEditor nodeId={nodeId} initial={initialTextbook} />}
      {active === "video" && (
        <VideoUploader
          nodeId={nodeId}
          initialVideoUrl={initialVideoUrl}
          initialStoragePath={initialVideoStoragePath}
          initialDurationSeconds={initialVideoDuration}
        />
      )}
      {active === "import" && (
        <BulkImportPanel nodeId={nodeId} subject={subject} topicCluster={topicCluster} />
      )}
    </div>
  );
}
