"use client";

// ============================================================
// LessonOverlay — full-screen lesson page that expands from
// the NodeCard position. Two-column: icon sidebar + scrollable
// content (header, video, textbook, quiz launcher).
// ============================================================

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { X, Video, BookOpen, Zap, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MappedNode } from "./ConstellationMap";
import {
  TIER_LABELS,
  nodeAtmosphere,
  SUBJECT_COLORS,
} from "@/data/curriculum";
import type { QuizAttempt, ConfidenceBand } from "@/types/quiz";
import { DIFFICULTY_COLORS } from "@/types/quiz";
import VideoPlayer from "./VideoPlayer";
import TextbookContent from "./TextbookContent";
import QuizLauncher from "./QuizLauncher";

interface Props {
  node: MappedNode;
  attempts: QuizAttempt[];
  watchPercentage: number | null;
  bestScore: number | null;
  band: ConfidenceBand | null;
  onClose: () => void;
  onStartQuiz: () => void;
  onGoToNext: (() => void) | null;
}

type SectionKey = "video" | "textbook" | "quiz";

const SIDEBAR_ICONS: { key: SectionKey; Icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: "video",    Icon: Video,    label: "Video" },
  { key: "textbook", Icon: BookOpen, label: "Textbook" },
  { key: "quiz",     Icon: Zap,      label: "Quiz" },
];

export default function LessonOverlay({
  node,
  attempts,
  watchPercentage,
  bestScore,
  onClose,
  onStartQuiz,
  onGoToNext,
}: Props) {
  const subjectColor = SUBJECT_COLORS[node.subject].hex;
  const atmosphere   = nodeAtmosphere(node.tier);
  const [activeSection, setActiveSection] = useState<SectionKey>("video");

  const videoRef    = useRef<HTMLDivElement>(null);
  const textbookRef = useRef<HTMLDivElement>(null);
  const quizRef     = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  function scrollTo(key: SectionKey) {
    const el =
      key === "video"    ? videoRef.current :
      key === "textbook" ? textbookRef.current :
                           quizRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(key);
  }

  // Observe scroll position to highlight active section
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const key = e.target.getAttribute("data-section") as SectionKey | null;
            if (key) setActiveSection(key);
          }
        });
      },
      { root, rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    [videoRef, textbookRef, quizRef].forEach((r) => r.current && observer.observe(r.current));
    return () => observer.disconnect();
  }, []);

  // Approx difficulty key for display
  const diffKey = node.difficulty === 1 ? "foundational" : node.difficulty === 2 ? "intermediate" : "advanced";
  const diffStyle = DIFFICULTY_COLORS[diffKey];

  const videoLength = node.estimated_video_length_seconds ?? 360;
  const vmin = Math.floor(videoLength / 60);
  const vsec = videoLength % 60;

  return (
    <motion.div
      layoutId={`lesson-overlay-${node.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32, duration: 0.4 }}
      className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex"
    >
      {/* ── Icon sidebar ──────────────────────────────── */}
      <aside className="shrink-0 w-14 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-6 gap-3">
        {SIDEBAR_ICONS.map(({ key, Icon, label }) => {
          const active = activeSection === key;
          return (
            <button
              key={key}
              onClick={() => scrollTo(key)}
              className={cn(
                "relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                active
                  ? "text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
              )}
              aria-label={label}
            >
              {active && (
                <div
                  className="absolute -left-px top-2 bottom-2 w-0.5 rounded-r"
                  style={{ background: subjectColor }}
                />
              )}
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </aside>

      {/* ── Main scrollable content ────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {/* Close button — always visible top right */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-900/90 dark:bg-white/10 hover:bg-slate-900 dark:hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-lg transition-colors"
          aria-label="Close lesson"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 space-y-10">
          {/* ── Section 1 — Header ─────────────────────── */}
          <header>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
              {node.topic}
              <span className="text-slate-400 dark:text-slate-500 font-semibold"> — {atmosphere}</span>
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400 text-base">
              {node.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full border",
                diffStyle.bg, diffStyle.text, diffStyle.border
              )}>
                {diffKey[0].toUpperCase() + diffKey.slice(1)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {vmin}:{vsec.toString().padStart(2, "0")}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Tier {node.tier} · {TIER_LABELS[node.tier]}
              </span>
              {bestScore !== null && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                  <Trophy className="w-3.5 h-3.5" />
                  Personal best: {bestScore}%
                </span>
              )}
            </div>
          </header>

          {/* ── Section 2 — Video ──────────────────────── */}
          <section ref={videoRef} data-section="video">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
              Lesson Video
            </h2>
            <VideoPlayer
              nodeId={node.id}
              subject={node.subject}
              videoUrl={node.video_url ?? null}
              durationSeconds={videoLength}
              initialWatchPercentage={watchPercentage ?? 0}
            />
          </section>

          {/* ── Section 3 — Textbook ───────────────────── */}
          <section ref={textbookRef} data-section="textbook" className="border-t border-slate-200 dark:border-slate-800 pt-8">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Lesson Notes
              </span>
            </div>
            <div className="max-w-[62ch] mx-auto">
              <TextbookContent markdown={node.textbook_content ?? node.description} />
              {node.subject === "math" && node.desmos_strategy && (
                <div className="mt-10 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10 p-5">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
                    Desmos Strategy
                  </h3>
                  <TextbookContent markdown={node.desmos_strategy} />
                </div>
              )}
            </div>
          </section>

          {/* ── Section 4 — Quiz launcher ──────────────── */}
          <section ref={quizRef} data-section="quiz" className="border-t border-slate-200 dark:border-slate-800 pt-8">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Practice
              </span>
            </div>
            <QuizLauncher
              attempts={attempts}
              onStartQuiz={onStartQuiz}
              onGoToNext={onGoToNext}
            />
          </section>
        </div>
      </div>
    </motion.div>
  );
}
