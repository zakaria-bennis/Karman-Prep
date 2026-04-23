"use client";

// ============================================================
// NodeCard — the small card that appears when a student clicks
// a star on the ConstellationMap. From here they launch either
// the lesson overlay or the quiz engine directly.
//
// Uses Framer Motion `layoutId` so the card can morph into the
// full-screen LessonOverlay when "Watch Lesson" is clicked.
// ============================================================

import { motion } from "framer-motion";
import { Play, Zap, X, Lock } from "lucide-react";
import type { MappedNode } from "./ConstellationMap";
import { TIER_LABELS, nodeAtmosphere, SUBJECT_COLORS } from "@/data/curriculum";
import { cn } from "@/lib/utils";

interface Props {
  node: MappedNode;
  origin: { x: number; y: number };
  onWatchLesson: () => void;
  onStartQuiz: () => void;
  onClose: () => void;
}

const CARD_WIDTH  = 280;
const CARD_HEIGHT = 230;

export default function NodeCard({ node, origin, onWatchLesson, onStartQuiz, onClose }: Props) {
  const subjectColor = SUBJECT_COLORS[node.subject].hex;
  const atmosphere = nodeAtmosphere(node.tier);
  const isLocked = node.status === "locked";

  // Clamp card position so it stays inside the viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const clampedX = Math.max(16, Math.min(vw - CARD_WIDTH - 16, origin.x - CARD_WIDTH / 2));
  const clampedY = Math.max(72, Math.min(vh - CARD_HEIGHT - 16, origin.y + 24));

  return (
    <motion.div
      layoutId={`lesson-overlay-${node.id}`}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="fixed z-40 rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        left: clampedX,
        top: clampedY,
        width: CARD_WIDTH,
        background: "rgba(9, 14, 28, 0.96)",
        backdropFilter: "blur(12px)",
        borderColor: subjectColor + "40",
      }}
    >
      {/* Gradient accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${subjectColor}, transparent)` }}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-5 pt-4">
        {/* Tier badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: subjectColor, background: subjectColor + "15", border: `1px solid ${subjectColor}30` }}
          >
            {atmosphere} · {TIER_LABELS[node.tier]}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white leading-snug mb-1">{node.topic}</h3>
        <p className="text-xs text-slate-400 line-clamp-2 mb-4">{node.description}</p>

        {/* Action buttons */}
        {isLocked ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Complete prerequisite nodes to unlock.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onWatchLesson}
              className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: subjectColor, color: "#fff" }}
            >
              <Play className="w-4 h-4" /> Watch Lesson
            </button>
            <button
              onClick={onStartQuiz}
              className={cn(
                "w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2",
                "border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
              )}
            >
              <Zap className="w-4 h-4" /> Start Quiz
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
