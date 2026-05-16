"use client";

// VideoPromptBanner — sticky banner that appears after 3 consecutive
// wrong answers, inviting the student to watch the lesson video before
// continuing. Auto-dismisses when answered correctly.

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { playSound } from "@/lib/sounds";

export function VideoPromptBanner({
  videoUrl,
  onDismiss,
}: {
  videoUrl: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    playSound("error");
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-slate-950/95 p-6 backdrop-blur-sm"
    >
      <button
        onClick={onDismiss}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="mb-4 max-w-lg text-center text-lg font-semibold text-white">
        This concept might need another look before continuing.
      </p>
      <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        {videoUrl ? (
          <video src={videoUrl} controls autoPlay className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            Lesson video will auto-play once uploaded.
          </div>
        )}
      </div>
    </motion.div>
  );
}
