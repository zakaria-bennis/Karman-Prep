"use client";

// ============================================================
// NodeDetail — Individual concept lesson page
// Shows topic info, prerequisites, mark-complete button,
// and content/quiz placeholder.
// ============================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Lock,
  Clock,
  Star,
  BookOpen,
  Zap,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CurriculumNode,
  type NodeStatus,
  type Subject,
  TIER_LABELS,
  SUBJECT_COLORS,
} from "@/data/curriculum";
import { markNodeComplete } from "@/app/learn/actions";
import { playSound } from "@/lib/sounds";

interface NeighborNode extends CurriculumNode {
  status: NodeStatus;
}

interface Props {
  node: CurriculumNode;
  subject: Subject;
  currentStatus: NodeStatus;
  currentScore: number | null;
  prereqs: NeighborNode[];
  unlocks: NeighborNode[];
}

const STATUS_CONFIG: Record<
  NodeStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  locked: { label: "Locked", icon: Lock, color: "text-slate-400" },
  available: { label: "Available", icon: Clock, color: "text-amber-400" },
  in_progress: { label: "In Progress", icon: BookOpen, color: "text-blue-400" },
  partially_complete: { label: "Partially Complete", icon: Star, color: "text-teal-400" },
  mastered: { label: "Mastered", icon: CheckCircle, color: "text-emerald-400" },
};

function DifficultyDots({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((d) => (
        <div
          key={d}
          className={cn("h-2 w-2 rounded-full", d <= difficulty ? "bg-amber-400" : "bg-slate-700")}
        />
      ))}
    </div>
  );
}

export default function NodeDetail({
  node,
  subject,
  currentStatus,
  currentScore,
  prereqs,
  unlocks,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justCompleted, setJustCompleted] = useState(false);
  const [unlockedTopics, setUnlockedTopics] = useState<string[]>([]);

  const subjectColor = SUBJECT_COLORS[subject].hex;
  const StatusIcon = STATUS_CONFIG[currentStatus].icon;
  const isCompletable = currentStatus === "available" || currentStatus === "in_progress";
  const isMastered = currentStatus === "mastered";

  function handleMarkComplete() {
    startTransition(async () => {
      try {
        const result = await markNodeComplete(node.id, subject);
        setUnlockedTopics(result.newNodes);
        setJustCompleted(true);
        playSound("nodeComplete");
        if (result.unlockedCount > 0) playSound("tierUnlock");
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[#060b16] px-4 pb-8 pt-20">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Back link */}
        <Link
          href={`/learn/${subject}`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to constellation
        </Link>

        {/* Node header */}
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: subjectColor + "30", background: subjectColor + "08" }}
        >
          {/* Tier + difficulty */}
          <div className="mb-4 flex items-center gap-3">
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-bold"
              style={{
                color: subjectColor,
                borderColor: subjectColor + "40",
                background: subjectColor + "15",
              }}
            >
              Tier {node.tier} · {TIER_LABELS[node.tier]}
            </span>
            <DifficultyDots difficulty={node.difficulty} />
          </div>

          {/* Topic title */}
          <h1 className="mb-3 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            {node.topic}
          </h1>

          {/* Description */}
          <p className="mb-5 text-sm leading-relaxed text-slate-300">{node.description}</p>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", STATUS_CONFIG[currentStatus].color)} />
            <span className={cn("text-sm font-semibold", STATUS_CONFIG[currentStatus].color)}>
              {STATUS_CONFIG[currentStatus].label}
            </span>
            {currentScore !== null && (
              <span className="ml-2 text-xs text-slate-400">
                · Last score: <span className="font-semibold text-slate-300">{currentScore}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Concept content placeholder */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: subjectColor }} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              Concept Lesson
            </h2>
          </div>

          {/* Video / lesson placeholder */}
          <div
            className="mb-4 flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed"
            style={{ borderColor: subjectColor + "30", background: subjectColor + "05" }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: subjectColor + "20" }}
            >
              <BookOpen className="h-6 w-6" style={{ color: subjectColor }} />
            </div>
            <p className="px-4 text-center text-sm text-slate-400">
              Animated lesson content for{" "}
              <span className="font-semibold text-slate-200">{node.topic}</span> is coming soon.
            </p>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-300">
              Lesson in development
            </span>
          </div>

          {/* Key takeaways placeholder */}
          <div className="space-y-2">
            {["What to expect on the SAT", "Common traps to avoid", "Strategy and timing tips"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: subjectColor + "80" }}
                  />
                  {item}
                  <span className="text-xs italic text-slate-400">(lesson coming soon)</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Practice placeholder */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              Practice Questions
            </h2>
          </div>
          <div className="rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 p-5 text-center">
            <p className="text-sm text-slate-400">
              Practice questions for this node are in development.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Check back soon — or mark this node complete to unlock the next concept.
            </p>
          </div>
        </div>

        {/* Mark complete / already mastered */}
        {justCompleted ? (
          <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Node mastered! 🎉</h3>
            {unlockedTopics.length > 0 && (
              <div className="text-sm text-slate-300">
                <p className="mb-2 text-slate-400">New nodes unlocked:</p>
                {unlockedTopics.map((t) => (
                  <p key={t} className="flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span className="font-semibold text-white">{t}</span>
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push(`/learn/${subject}`)}
              className="mx-auto mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Back to constellation <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : isMastered ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Already mastered</p>
              <p className="mt-0.5 text-xs text-slate-400">
                You&apos;ve completed this node.{" "}
                <Link
                  href={`/learn/${subject}`}
                  className="text-slate-400 underline hover:text-white"
                >
                  Return to constellation
                </Link>
              </p>
            </div>
          </div>
        ) : isCompletable ? (
          <button
            onClick={handleMarkComplete}
            disabled={isPending}
            className={cn(
              "w-full rounded-2xl py-4 text-sm font-bold transition-all",
              "flex items-center justify-center gap-2",
              isPending ? "cursor-not-allowed opacity-60" : "hover:scale-[1.02] active:scale-[0.98]"
            )}
            style={{ background: subjectColor, color: "#fff" }}
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Marking complete…
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Mark as Mastered
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <Lock className="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-200">Node locked</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Complete all prerequisite nodes to unlock this one.
              </p>
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {prereqs.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Prerequisites
            </h2>
            <div className="space-y-2">
              {prereqs.map((p) => {
                const pStatus = STATUS_CONFIG[p.status];
                const PIcon = pStatus.icon;
                return (
                  <Link
                    key={p.id}
                    href={`/learn/${subject}/${p.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.05]"
                  >
                    <PIcon className={cn("h-4 w-4 shrink-0", pStatus.color)} />
                    <span className="flex-1 truncate text-sm text-slate-300 transition-colors group-hover:text-white">
                      {p.topic}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlocks next */}
        {unlocks.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
              Unlocks next
            </h2>
            <div className="space-y-2">
              {unlocks.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 opacity-60"
                >
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-sm text-slate-300">{u.topic}</span>
                  <span className="text-xs text-slate-400">Tier {u.tier}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
