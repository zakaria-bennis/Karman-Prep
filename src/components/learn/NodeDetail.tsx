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
  locked: { label: "Locked", icon: Lock, color: "text-taupe" },
  available: { label: "Available", icon: Clock, color: "text-warning" },
  in_progress: { label: "In Progress", icon: BookOpen, color: "text-info" },
  partially_complete: { label: "Partially Complete", icon: Star, color: "text-success" },
  mastered: { label: "Mastered", icon: CheckCircle, color: "text-success" },
};

function DifficultyDots({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((d) => (
        <div
          key={d}
          className={cn(
            "h-2 w-2 rounded-full",
            d <= difficulty ? "bg-warning" : "bg-surface-raised"
          )}
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
    <div className="min-h-screen overflow-y-auto bg-[#070605] px-4 pb-8 pt-20">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Back link */}
        <Link
          href={`/learn/${subject}`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-taupe transition-colors hover:text-ivory/80"
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
          <h1 className="mb-3 text-2xl font-extrabold leading-tight text-ivory sm:text-3xl">
            {node.topic}
          </h1>

          {/* Description */}
          <p className="mb-5 text-sm leading-relaxed text-ivory/80">{node.description}</p>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4", STATUS_CONFIG[currentStatus].color)} />
            <span className={cn("text-sm font-semibold", STATUS_CONFIG[currentStatus].color)}>
              {STATUS_CONFIG[currentStatus].label}
            </span>
            {currentScore !== null && (
              <span className="ml-2 text-xs text-taupe">
                · Last score: <span className="font-semibold text-ivory/80">{currentScore}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Concept content placeholder */}
        <div className="rounded-2xl border border-ivory/5 bg-surface/[0.02] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: subjectColor }} />
            <h2 className="text-sm font-bold uppercase tracking-widest text-ivory">
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
            <p className="px-4 text-center text-sm text-taupe">
              Animated lesson content for{" "}
              <span className="font-semibold text-ivory/90">{node.topic}</span> is coming soon.
            </p>
            <span className="rounded-full border border-ivory/10 bg-surface/[0.06] px-3 py-1 text-xs text-ivory/80">
              Lesson in development
            </span>
          </div>

          {/* Key takeaways placeholder */}
          <div className="space-y-2">
            {["What to expect on the SAT", "Common traps to avoid", "Strategy and timing tips"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-taupe">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: subjectColor + "80" }}
                  />
                  {item}
                  <span className="text-xs italic text-taupe">(lesson coming soon)</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Practice placeholder */}
        <div className="rounded-2xl border border-ivory/5 bg-surface/[0.02] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-ivory">
              Practice Questions
            </h2>
          </div>
          <div className="rounded-xl border border-dashed border-warning/20 bg-warning/5 p-5 text-center">
            <p className="text-sm text-taupe">
              Practice questions for this node are in development.
            </p>
            <p className="mt-1 text-xs text-taupe">
              Check back soon — or mark this node complete to unlock the next concept.
            </p>
          </div>
        </div>

        {/* Mark complete / already mastered */}
        {justCompleted ? (
          <div className="space-y-3 rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-success" />
            <h3 className="text-lg font-bold text-ivory">Node mastered! 🎉</h3>
            {unlockedTopics.length > 0 && (
              <div className="text-sm text-ivory/80">
                <p className="mb-2 text-taupe">New nodes unlocked:</p>
                {unlockedTopics.map((t) => (
                  <p key={t} className="flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-warning" />
                    <span className="font-semibold text-ivory">{t}</span>
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push(`/learn/${subject}`)}
              className="mx-auto mt-2 flex items-center gap-1 text-sm font-semibold text-success transition-colors hover:text-success-bright"
            >
              Back to constellation <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : isMastered ? (
          <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 p-5">
            <CheckCircle className="h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-semibold text-success">Already mastered</p>
              <p className="mt-0.5 text-xs text-taupe">
                You&apos;ve completed this node.{" "}
                <Link href={`/learn/${subject}`} className="text-taupe underline hover:text-ivory">
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
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-ivory/30 border-t-white" />
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
          <div className="flex items-center gap-3 rounded-2xl border border-bronze bg-surface/40 p-5">
            <Lock className="h-5 w-5 shrink-0 text-taupe" />
            <div>
              <p className="text-sm font-semibold text-ivory/90">Node locked</p>
              <p className="mt-0.5 text-xs text-taupe">
                Complete all prerequisite nodes to unlock this one.
              </p>
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {prereqs.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-taupe">
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
                    className="group flex items-center gap-3 rounded-xl border border-ivory/5 bg-surface/[0.02] px-4 py-3 transition-colors hover:bg-surface/[0.05]"
                  >
                    <PIcon className={cn("h-4 w-4 shrink-0", pStatus.color)} />
                    <span className="flex-1 truncate text-sm text-ivory/80 transition-colors group-hover:text-ivory">
                      {p.topic}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-taupe group-hover:text-taupe" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlocks next */}
        {unlocks.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-taupe">
              Unlocks next
            </h2>
            <div className="space-y-2">
              {unlocks.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl border border-ivory/5 bg-surface/[0.02] px-4 py-3 opacity-60"
                >
                  <Lock className="h-4 w-4 shrink-0 text-taupe" />
                  <span className="flex-1 truncate text-sm text-ivory/80">{u.topic}</span>
                  <span className="text-xs text-taupe">Tier {u.tier}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
