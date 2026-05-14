"use client";

// ============================================================
// TierAscensionCinematic — 4-phase ascent animation.
//
// Triggered externally (e.g. after a checkpoint pass) and accepts
// currentTier + nextTier as props so it's reusable across all
// tier transitions. Pure Framer Motion + Howler sound crossfade.
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { Tier, AtmosphereTier } from "@/data/curriculum";
import {
  ATMOSPHERE_COLORS,
  ATMOSPHERE_CONTEXT,
  nodeAtmosphere,
  ascendsTo,
} from "@/data/curriculum";
import { playSound, crossfadeAmbient, getSound } from "@/lib/sounds";

interface Props {
  currentTier: Tier;
  nextTier: Tier;
  onComplete: () => void;
}

type Phase = "zoomOut" | "panUp" | "reveal" | "banner" | "done";

export default function TierAscensionCinematic({ currentTier, nextTier, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("zoomOut");
  const fromAtmo: AtmosphereTier = nodeAtmosphere(currentTier);
  const toAtmo: AtmosphereTier = ascendsTo(currentTier);

  const fromColor = ATMOSPHERE_COLORS[fromAtmo].hex;
  const toColor = ATMOSPHERE_COLORS[toAtmo].hex;

  // Schedule phase transitions
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1 → 2 @ 1500 ms
    timers.push(
      setTimeout(() => {
        setPhase("panUp");
        playSound("tierAscendBreak");
      }, 1500)
    );

    // Phase 2 → 3 @ 2500 ms
    timers.push(setTimeout(() => setPhase("reveal"), 2500));

    // Phase 3 → 4 @ 4000 ms
    timers.push(setTimeout(() => setPhase("banner"), 4000));

    // Ambient crossfade overlap (start halfway through Phase 2)
    timers.push(
      setTimeout(() => {
        const fromTrack = ambientTrackFor(fromAtmo);
        const toTrack = ambientTrackFor(toAtmo);
        crossfadeAmbient(fromTrack, toTrack, 2000);
      }, 2000)
    );

    // Start Phase 1 rumble immediately
    playSound("tierAscendRumble");

    // Fade current ambient slightly down during cinematic
    const fromSnd = getSound(ambientTrackFor(fromAtmo));
    if (fromSnd?.playing()) fromSnd.fade(fromSnd.volume(), 0.2, 600);

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss banner after 5 s
  useEffect(() => {
    if (phase !== "banner") return;
    const t = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 5000);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  // Stars for Phase 3 reveal
  const newStars = Array.from({ length: 40 }, (_, i) => ({
    x: (Math.sin(i * 1.7) + 1) * 50,
    y: (Math.cos(i * 2.3) + 1) * 50,
    delay: 0.08 * (i % 18),
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] overflow-hidden bg-slate-950"
    >
      {/* ── Phase 1 — Zoom-out & tier glow ──────────────── */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.0, opacity: 1 }}
        animate={{
          scale: phase === "zoomOut" ? 1.0 : 0.7,
          opacity: phase === "panUp" ? 0.3 : 1,
        }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      >
        {/* Current atmosphere gradient base */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center 70%, ${fromColor}30, #060b16 60%)`,
          }}
        />
        {/* Completed constellation glow */}
        <motion.div
          className="absolute inset-0"
          style={{ boxShadow: `inset 0 0 200px ${fromColor}40` }}
          animate={{ opacity: phase === "zoomOut" ? [0.4, 0.9, 0.7] : 0 }}
          transition={{ duration: 1.4, times: [0, 0.6, 1] }}
        />
      </motion.div>

      {/* ── Phase 2 — Atmospheric boundary pan ──────────── */}
      <AnimatePresence>
        {(phase === "panUp" || phase === "reveal" || phase === "banner") && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{
              y: phase === "panUp" ? "0%" : "-100%",
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${toColor}00 0%, ${fromColor}90 45%, ${toColor}90 55%, ${toColor}00 100%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Momentary dim as camera crosses the boundary */}
      <AnimatePresence>
        {phase === "panUp" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 1.0, times: [0, 0.55, 1] }}
            className="pointer-events-none absolute inset-0 bg-black"
          />
        )}
      </AnimatePresence>

      {/* ── Phase 3 — New atmosphere reveal ─────────────── */}
      <AnimatePresence>
        {(phase === "reveal" || phase === "banner") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at center 30%, ${toColor}35, #060b16 65%)`,
              }}
            />
            {/* Staggered star materialization */}
            {newStars.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0.7], scale: [0, 1.2, 1] }}
                transition={{
                  duration: 1.0,
                  delay: s.delay,
                  ease: "easeOut",
                }}
                className="absolute h-1 w-1 rounded-full"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  background: toColor,
                  boxShadow: `0 0 8px ${toColor}`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 4 — Congratulations banner ───────────── */}
      <AnimatePresence>
        {phase === "banner" && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center p-6"
          >
            <div className="max-w-xl text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-white/60">
                You have ascended to
              </p>
              <h1
                className="mb-5 text-5xl font-extrabold tracking-tight sm:text-6xl"
                style={{
                  color: toColor,
                  textShadow: `0 0 40px ${toColor}70`,
                }}
              >
                {toAtmo}
              </h1>
              <p className="mb-8 text-base leading-relaxed text-white/80">
                {ATMOSPHERE_CONTEXT[toAtmo]}
              </p>
              <button
                onClick={() => {
                  setPhase("done");
                  onComplete();
                }}
                className="rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                Continue Your Ascent
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unused nextTier prop reference — keeps lint happy while leaving room for future tier-specific effects */}
      <span className="sr-only">Advancing to Tier {nextTier}</span>
    </motion.div>
  );
}

import type { SoundName } from "@/lib/sounds";

function ambientTrackFor(atmo: AtmosphereTier): SoundName {
  switch (atmo) {
    case "Troposphere":
      return "ambientTroposphere";
    case "Mesosphere":
      return "ambientMesosphere";
    case "Stratosphere":
      return "ambientStratosphere";
    case "Kármán Line":
      return "ambientKarman";
  }
}
