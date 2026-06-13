"use client";

// ============================================================
// NodeCard — the small card that appears when a student clicks
// a star on the ConstellationMap. From here they launch either
// the lesson overlay or the quiz engine directly.
//
// Uses Framer Motion `layoutId` so the card can morph into the
// full-screen LessonOverlay when "Watch Lesson" is clicked.
//
// Observatory chrome: warm surface, bronze hairline, the subject
// accent confined to the tier badge, top rule, and lesson CTA.
// Settle-style entry — no spring, no pop (docs/brand.md "Motion").
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

const CARD_WIDTH = 280;
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-40 overflow-hidden rounded-2xl border border-bronze shadow-2xl"
      style={{
        left: clampedX,
        top: clampedY,
        width: CARD_WIDTH,
        background: "rgba(23, 22, 17, 0.97)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Subject accent rule */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${subjectColor}, transparent)` }}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-taupe transition-colors duration-fast hover:text-ivory"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5 pt-4">
        {/* Tier badge */}
        <div className="mb-2 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
            style={{
              color: subjectColor,
              background: subjectColor + "15",
              border: `1px solid ${subjectColor}30`,
            }}
          >
            {atmosphere} · {TIER_LABELS[node.tier]}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-1 font-plex-serif text-base font-medium leading-snug text-ivory">
          {node.topic}
        </h3>
        <p className="mb-4 line-clamp-2 text-xs text-taupe">{node.description}</p>

        {/* Action buttons */}
        {isLocked ? (
          <div className="flex items-center gap-2 rounded-lg border border-bronze bg-charcoal p-3">
            <Lock className="h-3.5 w-3.5 text-taupe" />
            <span className="text-xs text-taupe">Complete prerequisite nodes to unlock.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onWatchLesson}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-opacity duration-fast hover:opacity-90"
              style={{ background: subjectColor, color: "#070605" }}
            >
              <Play className="h-4 w-4" /> Watch Lesson
            </button>
            <button
              onClick={onStartQuiz}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold",
                "border border-bronze bg-surface-raised text-ivory transition-colors duration-fast hover:border-taupe/50"
              )}
            >
              <Zap className="h-4 w-4" /> Start Quiz
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
