"use client";

// ============================================================
// VideoPlayer — placeholder-ready player with chapter markers.
// When a real Mux/HLS URL is wired in, swap the <div> background for
// a <video> or <MuxPlayer>. For now it mocks playback and chapter
// jumps so the UX chrome and watch-percentage hook are testable.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward } from "lucide-react";
import { actionUpdateWatchPercentage } from "@/app/learn/quiz-actions";
import { cn } from "@/lib/utils";

interface Props {
  nodeId: string;
  subject: "reading" | "math";
  videoUrl: string | null;
  durationSeconds: number;        // total seconds for the mocked video
  initialWatchPercentage: number; // resume from where we left off
}

const CHAPTERS = [
  { label: "Concept Overview", fraction: 0.0 },
  { label: "Example 1",        fraction: 0.25 },
  { label: "Example 2",        fraction: 0.50 },
  { label: "Example 3",        fraction: 0.75 },
];

export default function VideoPlayer({
  nodeId,
  videoUrl,
  durationSeconds,
  initialWatchPercentage,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [seconds, setSeconds] = useState(
    Math.round((initialWatchPercentage / 100) * durationSeconds)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPersistedRef = useRef(initialWatchPercentage);

  const pct = Math.min(100, Math.round((seconds / durationSeconds) * 100));

  // Mock playback ticker
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => Math.min(durationSeconds, s + 1));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, durationSeconds]);

  // Persist watch-percentage on pause and every 10 seconds while playing
  useEffect(() => {
    if (!isPlaying) {
      persist();
      return;
    }
    const iv = setInterval(persist, 10000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Persist on unmount (close) too
  useEffect(() => {
    return () => { persist(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist() {
    if (pct === lastPersistedRef.current) return;
    lastPersistedRef.current = pct;
    actionUpdateWatchPercentage(nodeId, pct).catch(console.error);
  }

  function jumpToChapter(fraction: number) {
    setSeconds(Math.round(fraction * durationSeconds));
    // Persist on chapter change
    setTimeout(persist, 100);
  }

  const mm = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full">
      {/* Aspect-ratio video frame */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800">
        {videoUrl ? (
          <video
            className="w-full h-full"
            controls
            src={videoUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white translate-x-0.5" />}
            </button>
            <p className="text-xs text-slate-400 max-w-sm">
              Video placeholder. The Mux player will be wired in once the lesson
              recordings are uploaded. Playback is simulated for now.
            </p>
          </div>
        )}
      </div>

      {/* Scrubber */}
      <div className="mt-3">
        <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${pct}%` }}
          />
          {CHAPTERS.map((c) => (
            <button
              key={c.label}
              onClick={() => jumpToChapter(c.fraction)}
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-300 hover:scale-125 transition-transform border border-slate-400 dark:border-slate-600"
              style={{ left: `calc(${c.fraction * 100}% - 5px)` }}
              aria-label={`Jump to ${c.label}`}
              title={c.label}
            />
          ))}
        </div>

        {/* Time + chapters legend */}
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono">{mm(seconds)} / {mm(durationSeconds)}</span>
          <div className="flex gap-3 flex-wrap justify-end">
            {CHAPTERS.map((c) => (
              <button
                key={c.label}
                onClick={() => jumpToChapter(c.fraction)}
                className={cn(
                  "flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors",
                  pct >= c.fraction * 100 && "text-blue-500"
                )}
              >
                <SkipForward className="w-3 h-3" />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
