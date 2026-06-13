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
  durationSeconds: number; // total seconds for the mocked video
  initialWatchPercentage: number; // resume from where we left off
}

const CHAPTERS = [
  { label: "Concept Overview", fraction: 0.0 },
  { label: "Example 1", fraction: 0.25 },
  { label: "Example 2", fraction: 0.5 },
  { label: "Example 3", fraction: 0.75 },
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
    return () => {
      persist();
    };
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
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-bronze bg-gradient-to-br from-charcoal via-surface to-charcoal">
        {videoUrl ? (
          <video
            className="h-full w-full"
            controls
            src={videoUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-surface/10 transition-colors hover:bg-surface/20"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 text-ivory" />
              ) : (
                <Play className="h-7 w-7 translate-x-0.5 text-ivory" />
              )}
            </button>
            <p className="max-w-sm text-xs text-taupe">
              Video placeholder. The Mux player will be wired in once the lesson recordings are
              uploaded. Playback is simulated for now.
            </p>
          </div>
        )}
      </div>

      {/* Scrubber */}
      <div className="mt-3">
        <div className="relative h-1.5 rounded-full bg-surface dark:bg-surface-raised">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-info transition-all"
            style={{ width: `${pct}%` }}
          />
          {CHAPTERS.map((c) => (
            <button
              key={c.label}
              onClick={() => jumpToChapter(c.fraction)}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-taupe/50 bg-ivory transition-transform hover:scale-125 dark:border-bronze dark:bg-ivory"
              style={{ left: `calc(${c.fraction * 100}% - 5px)` }}
              aria-label={`Jump to ${c.label}`}
              title={c.label}
            />
          ))}
        </div>

        {/* Time + chapters legend */}
        <div className="mt-2 flex items-center justify-between text-xs text-taupe/80 dark:text-taupe">
          <span className="font-mono">
            {mm(seconds)} / {mm(durationSeconds)}
          </span>
          <div className="flex flex-wrap justify-end gap-3">
            {CHAPTERS.map((c) => (
              <button
                key={c.label}
                onClick={() => jumpToChapter(c.fraction)}
                className={cn(
                  "flex items-center gap-1 transition-colors hover:text-night dark:hover:text-ivory",
                  pct >= c.fraction * 100 && "text-info"
                )}
              >
                <SkipForward className="h-3 w-3" />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
