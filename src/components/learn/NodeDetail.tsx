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
  ArrowLeft, CheckCircle, Lock, Clock,
  Star, BookOpen, Zap, ChevronRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type CurriculumNode, type NodeStatus, type Subject, TIER_LABELS, SUBJECT_COLORS } from "@/data/curriculum";
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

const STATUS_CONFIG: Record<NodeStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  locked:             { label: "Locked",             icon: Lock,        color: "text-slate-500" },
  available:          { label: "Available",          icon: Clock,       color: "text-amber-400" },
  in_progress:        { label: "In Progress",        icon: BookOpen,    color: "text-blue-400" },
  partially_complete: { label: "Partially Complete", icon: Star,        color: "text-teal-400" },
  mastered:           { label: "Mastered",           icon: CheckCircle, color: "text-emerald-400" },
};

function DifficultyDots({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((d) => (
        <div
          key={d}
          className={cn(
            "w-2 h-2 rounded-full",
            d <= difficulty ? "bg-amber-400" : "bg-slate-700"
          )}
        />
      ))}
    </div>
  );
}

export default function NodeDetail({ node, subject, currentStatus, currentScore, prereqs, unlocks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justCompleted, setJustCompleted] = useState(false);
  const [unlockedTopics, setUnlockedTopics] = useState<string[]>([]);

  const subjectColor = SUBJECT_COLORS[subject].hex;
  const StatusIcon = STATUS_CONFIG[currentStatus].icon;
  const isCompletable = currentStatus === "available" || currentStatus === "in_progress";
  const isMastered    = currentStatus === "mastered";

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
    <div className="min-h-[calc(100vh-56px)] bg-[#060b16] px-4 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back link */}
        <Link
          href={`/learn/${subject}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to constellation
        </Link>

        {/* Node header */}
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: subjectColor + "30", background: subjectColor + "08" }}
        >
          {/* Tier + difficulty */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full border"
              style={{ color: subjectColor, borderColor: subjectColor + "40", background: subjectColor + "15" }}
            >
              Tier {node.tier} · {TIER_LABELS[node.tier]}
            </span>
            <DifficultyDots difficulty={node.difficulty} />
          </div>

          {/* Topic title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 leading-tight">
            {node.topic}
          </h1>

          {/* Description */}
          <p className="text-slate-300 text-sm leading-relaxed mb-5">
            {node.description}
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("w-4 h-4", STATUS_CONFIG[currentStatus].color)} />
            <span className={cn("text-sm font-semibold", STATUS_CONFIG[currentStatus].color)}>
              {STATUS_CONFIG[currentStatus].label}
            </span>
            {currentScore !== null && (
              <span className="text-xs text-slate-500 ml-2">
                · Last score: <span className="text-slate-300 font-semibold">{currentScore}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Concept content placeholder */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" style={{ color: subjectColor }} />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Concept Lesson</h2>
          </div>

          {/* Video / lesson placeholder */}
          <div
            className="w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 mb-4"
            style={{ borderColor: subjectColor + "30", background: subjectColor + "05" }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: subjectColor + "20" }}
            >
              <BookOpen className="w-6 h-6" style={{ color: subjectColor }} />
            </div>
            <p className="text-sm text-slate-400 text-center px-4">
              Animated lesson content for <span className="font-semibold text-slate-200">{node.topic}</span> is coming soon.
            </p>
            <span className="text-xs text-slate-600 px-3 py-1 rounded-full border border-white/5 bg-white/5">
              Lesson in development
            </span>
          </div>

          {/* Key takeaways placeholder */}
          <div className="space-y-2">
            {["What to expect on the SAT", "Common traps to avoid", "Strategy and timing tips"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: subjectColor + "80" }} />
                {item}
                <span className="text-xs text-slate-700 italic">(lesson coming soon)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Practice placeholder */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Practice Questions</h2>
          </div>
          <div className="rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 p-5 text-center">
            <p className="text-sm text-slate-400">
              Practice questions for this node are in development.
            </p>
            <p className="text-xs text-slate-600 mt-1">Check back soon — or mark this node complete to unlock the next concept.</p>
          </div>
        </div>

        {/* Mark complete / already mastered */}
        {justCompleted ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Node mastered! 🎉</h3>
            {unlockedTopics.length > 0 && (
              <div className="text-sm text-slate-300">
                <p className="mb-2 text-slate-400">New nodes unlocked:</p>
                {unlockedTopics.map((t) => (
                  <p key={t} className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-white">{t}</span>
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push(`/learn/${subject}`)}
              className="mt-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 mx-auto"
            >
              Back to constellation <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : isMastered ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Already mastered</p>
              <p className="text-xs text-slate-500 mt-0.5">
                You've completed this node.{" "}
                <Link href={`/learn/${subject}`} className="text-slate-400 hover:text-white underline">
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
              "w-full py-4 rounded-2xl font-bold text-sm transition-all",
              "flex items-center justify-center gap-2",
              isPending
                ? "opacity-60 cursor-not-allowed"
                : "hover:scale-[1.02] active:scale-[0.98]"
            )}
            style={{ background: subjectColor, color: "#fff" }}
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Marking complete…
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Mark as Mastered
              </>
            )}
          </button>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex items-center gap-3">
            <Lock className="w-5 h-5 text-slate-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-500">Node locked</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Complete all prerequisite nodes to unlock this one.
              </p>
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {prereqs.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Prerequisites</h2>
            <div className="space-y-2">
              {prereqs.map((p) => {
                const pStatus = STATUS_CONFIG[p.status];
                const PIcon = pStatus.icon;
                return (
                  <Link
                    key={p.id}
                    href={`/learn/${subject}/${p.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
                  >
                    <PIcon className={cn("w-4 h-4 shrink-0", pStatus.color)} />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors flex-1 truncate">
                      {p.topic}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Unlocks next */}
        {unlocks.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Unlocks next</h2>
            <div className="space-y-2">
              {unlocks.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] opacity-60"
                >
                  <Lock className="w-4 h-4 shrink-0 text-slate-600" />
                  <span className="text-sm text-slate-500 flex-1 truncate">{u.topic}</span>
                  <span className="text-xs text-slate-700">Tier {u.tier}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
