"use client";

// ============================================================
// ConstellationMap — full-screen "brain constellation" star map.
//
// Observatory system (docs/brand.md): the warm night sky seen from
// the lamp-lit study.
//   • Left lobe = Reading & Writing (R&W rose), right lobe = Math
//     (Math blue) — constellation accents as subject SIGNALS
//   • Mastered stars earn GOLD — halo + core dot (gold marks
//     earned moments; mastery is the canonical one)
//   • Background is a warm-dark vertical gradient, lamp-warmth near
//     the Troposphere at the bottom, near-black at the top
//   • Nodes are real stars: bright core + four diffraction rays + halo
//   • Prereq lines are the brain's "convolutions"
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type CurriculumNode,
  type NodeStatus,
  type Subject,
  TIER_LABELS,
  SUBJECT_COLORS,
  getEdges,
  recommendedNextNode,
} from "@/data/curriculum";
import { playSound } from "@/lib/sounds";
import { QuizProvider, useQuiz } from "@/contexts/QuizContext";
import { actionFetchNodeBundle } from "@/app/learn/quiz-actions";
import NodeCard from "./NodeCard";
import LessonOverlay from "./LessonOverlay";
import QuizEngine from "./QuizEngine";
import ConstellationSidebar from "./ConstellationSidebar";
import type { QuizAttempt, ConfidenceBand } from "@/types/quiz";
import {
  W,
  H,
  BG_STARS,
  NEBULAE,
  DIFF_R,
  starConfig,
  edgeOpacity,
} from "./ConstellationMapHelpers";

// ── Types ────────────────────────────────────────────────────
export interface MappedNode extends CurriculumNode {
  status: NodeStatus;
}

interface Props {
  /** Which subject is currently focused — its nodes are fully lit. */
  activeSubject: Subject;
  /** All 50 Reading & Writing nodes with their status. */
  readingNodes: MappedNode[];
  /** All 50 Math nodes with their status. */
  mathNodes: MappedNode[];
}

// ── Public wrapper — provides QuizContext ───────────────────
export default function ConstellationMap(props: Props) {
  return (
    <QuizProvider>
      <ConstellationMapInner {...props} />
    </QuizProvider>
  );
}

// ── Inner component ──────────────────────────────────────────
function ConstellationMapInner({ activeSubject, readingNodes, mathNodes }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MappedNode | null>(null);
  const [cardOrigin, setCardOrigin] = useState<{ x: number; y: number } | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [nodeBundle, setNodeBundle] = useState<{
    attempts: QuizAttempt[];
    watch_percentage: number | null;
    best_quiz_score: number | null;
    confidence_band: ConfidenceBand | null;
  } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const quiz = useQuiz();

  // Mouse parallax — subtle "looking around in the sky" feel
  const parallaxMx = useMotionValue(0);
  const parallaxMy = useMotionValue(0);
  const parallaxTransformX = useTransform(parallaxMx, [-1, 1], [-12, 12]);
  const parallaxTransformY = useTransform(parallaxMy, [-1, 1], [-8, 8]);

  const allNodes: MappedNode[] = [...readingNodes, ...mathNodes];
  const activeNodes = activeSubject === "reading" ? readingNodes : mathNodes;
  const otherSubject: Subject = activeSubject === "reading" ? "math" : "reading";

  const readingEdges = getEdges("reading");
  const mathEdges = getEdges("math");

  const allNodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const statusMap = new Map(activeNodes.map((n) => [n.id, n.status]));

  const activeHex = SUBJECT_COLORS[activeSubject].hex;
  const otherHex = SUBJECT_COLORS[otherSubject].hex;

  // SVG coords ↔ screen coords (respects preserveAspectRatio="xMidYMid meet")
  function toScreen(nx: number, ny: number): { x: number; y: number } {
    if (!mapRef.current) return { x: 0, y: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    const svgAspect = W / H;
    const boxAspect = rect.width / rect.height;
    let renderW = rect.width,
      renderH = rect.height,
      ox = 0,
      oy = 0;
    if (boxAspect > svgAspect) {
      renderW = rect.height * svgAspect;
      ox = (rect.width - renderW) / 2;
    } else {
      renderH = rect.width / svgAspect;
      oy = (rect.height - renderH) / 2;
    }
    return {
      x: rect.left + ox + nx * renderW,
      y: rect.top + oy + ny * renderH,
    };
  }

  const handleNodeClick = useCallback(
    (node: MappedNode) => {
      // Only allow interacting with the active subject's nodes.
      if (node.subject !== activeSubject) return;
      if (node.status === "locked") return;
      playSound("nodeClick");
      setCardOrigin(toScreen(node.x, node.y));
      setSelectedNode(node);
      setNodeBundle(null);
    },
    [activeSubject]
  );

  // Load quiz history / watch% when a node is selected
  useEffect(() => {
    if (!selectedNode) return;
    let cancelled = false;
    actionFetchNodeBundle(selectedNode.id)
      .then((data) => {
        if (cancelled) return;
        setNodeBundle({
          attempts: data.attempts,
          watch_percentage: data.watch_percentage,
          best_quiz_score: data.best_quiz_score,
          confidence_band: data.confidence_band,
        });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  function closeAll() {
    setQuizOpen(false);
    setLessonOpen(false);
    setSelectedNode(null);
    setCardOrigin(null);
    quiz.reset();
  }

  function goToNextNode(nodeId: string) {
    const next = recommendedNextNode(activeSubject, nodeId, statusMap);
    closeAll();
    if (next) {
      setTimeout(() => {
        setSelectedNode({ ...next, status: statusMap.get(next.id) ?? "available" });
        setCardOrigin(toScreen(next.x, next.y));
      }, 200);
    }
  }

  const hoveredNode = hovered ? allNodeMap.get(hovered) : null;
  const isOverlayOpen = lessonOpen || quizOpen;
  const mappedSelected = selectedNode
    ? { ...selectedNode, status: statusMap.get(selectedNode.id) ?? selectedNode.status }
    : null;

  return (
    <motion.div
      ref={mapRef}
      className="relative w-full"
      style={{ height: "100vh" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        parallaxMx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
        parallaxMy.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
      }}
    >
      <div
        className="h-full w-full transition-opacity duration-300"
        style={{
          opacity: isOverlayOpen ? 0.4 : 1,
          pointerEvents: isOverlayOpen ? "none" : "auto",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className="block"
          aria-label="Karman constellation map"
        >
          <defs>
            {/* Warm-night vertical gradient: lamp-warmth near the
                Troposphere (bottom), near-black at the top */}
            <linearGradient id="space-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#040302" />
              <stop offset="40%" stopColor="#070605" />
              <stop offset="75%" stopColor="#0d0a08" />
              <stop offset="100%" stopColor="#1a1610" />
            </linearGradient>

            {/* Soft nebulae (extremely faint subject washes) */}
            <radialGradient id="nebula-pink" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d84f73" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#d84f73" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nebula-cyan" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2fa8ff" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#2fa8ff" stopOpacity="0" />
            </radialGradient>

            {/* Star halos per subject */}
            <radialGradient id="halo-reading" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d84f73" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#d84f73" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d84f73" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="halo-math" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2fa8ff" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#2fa8ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2fa8ff" stopOpacity="0" />
            </radialGradient>

            {/* Gold halo — mastered stars only. Gold is earned. */}
            <radialGradient id="halo-mastered" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e4c86a" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#c8ab6a" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c8ab6a" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="star-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Space background ──────────────────────────────── */}
          <rect width={W} height={H} fill="url(#space-gradient)" />

          {/* Nebulae — one behind each lobe */}
          <ellipse
            cx={NEBULAE[0].cx}
            cy={NEBULAE[0].cy}
            rx={NEBULAE[0].rx}
            ry={NEBULAE[0].ry}
            fill="url(#nebula-pink)"
          />
          <ellipse
            cx={NEBULAE[1].cx}
            cy={NEBULAE[1].cy}
            rx={NEBULAE[1].rx}
            ry={NEBULAE[1].ry}
            fill="url(#nebula-cyan)"
          />

          {/* Background star field — ivory, parallaxes subtly with the cursor */}
          <motion.g style={{ x: parallaxTransformX, y: parallaxTransformY }}>
            {BG_STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f3ecdd" opacity={s.o} />
            ))}
          </motion.g>

          {/* ── Atmospheric tier labels on the right edge ──── */}
          {[
            { label: "TROPOSPHERE", y: H * 0.88 },
            { label: "MESOSPHERE", y: H * 0.54 },
            { label: "STRATOSPHERE", y: H * 0.13 },
          ].map(({ label, y }) => (
            <text
              key={label}
              x={W - 18}
              y={y}
              textAnchor="end"
              fill="#b8b0a1"
              fillOpacity={0.3}
              fontSize={10}
              fontWeight={500}
              letterSpacing={2.5}
              fontFamily="var(--font-plex-mono), ui-monospace, monospace"
            >
              {label}
            </text>
          ))}

          {/* Faint horizontal atmospheric bands */}
          {[0.33, 0.66].map((fy, i) => (
            <line
              key={i}
              x1={40}
              x2={W - 40}
              y1={H * fy}
              y2={H * fy}
              stroke="#b8b0a1"
              strokeOpacity={0.06}
              strokeDasharray="2 8"
            />
          ))}

          {/* ── Edges — ONLY active subject (inactive is hidden) ── */}
          <g>
            {(activeSubject === "reading" ? readingEdges : mathEdges).map(({ from, to }, i) => {
              const fn = allNodeMap.get(from);
              const tn = allNodeMap.get(to);
              if (!fn || !tn) return null;
              if (fn.subject !== activeSubject || tn.subject !== activeSubject) return null;
              const opacity = edgeOpacity(fn.status, tn.status, true);
              const highlight = hovered === from || hovered === to;
              return (
                <line
                  key={`e-${i}`}
                  x1={fn.x * W}
                  y1={fn.y * H}
                  x2={tn.x * W}
                  y2={tn.y * H}
                  stroke={activeHex}
                  strokeWidth={highlight ? 1.4 : 0.85}
                  strokeOpacity={highlight ? 0.85 : opacity}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* ── Nodes (stars) — ONLY active subject ──────────── */}
          <g>
            {allNodes
              .filter((n) => n.subject === activeSubject)
              .map((node) => {
                const cx = node.x * W;
                const cy = node.y * H;
                const active = node.subject === activeSubject;
                const subjectHex = active ? activeHex : otherHex;
                // Mastery is the earned moment — it trades the subject halo
                // for gold (docs/brand.md "Prestige — gold").
                const haloId =
                  node.status === "mastered"
                    ? "halo-mastered"
                    : node.subject === "reading"
                      ? "halo-reading"
                      : "halo-math";
                const r = DIFF_R[node.difficulty];
                const cfg = starConfig(node.status);
                const isHovered = hovered === node.id;
                const isLocked = node.status === "locked";

                // Non-active lobe gets muted
                const dimFactor = active ? 1 : 0.25;
                const coreO = cfg.coreOpacity * dimFactor;
                const haloO = cfg.haloOpacity * dimFactor;
                const rayO = cfg.rayOpacity * dimFactor;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${cx}, ${cy})`}
                    style={{ cursor: !active || isLocked ? "default" : "pointer" }}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                    // role="img" on locked/inactive nodes so the
                    // aria-label is announced (locked stars are still
                    // informative — screen readers should read the
                    // topic name + status). aria-label on a `<g>`
                    // without a role fails axe-core's a11y check.
                    role={active && !isLocked ? "button" : "img"}
                    aria-label={`${node.topic} — ${node.status}`}
                    tabIndex={active && !isLocked ? 0 : -1}
                    onKeyDown={(e) => e.key === "Enter" && handleNodeClick(node)}
                  >
                    {/* Outer halo */}
                    {cfg.haloOpacity > 0 && (
                      <circle
                        r={r * cfg.glow}
                        fill={`url(#${haloId})`}
                        opacity={isHovered ? Math.min(1, haloO * 1.5) : haloO}
                        className={cfg.pulse && active ? "animate-pulse" : undefined}
                      />
                    )}

                    {/* Hover ring (only on active lobe) */}
                    {isHovered && active && !isLocked && (
                      <circle
                        r={r * cfg.glow + 4}
                        fill="none"
                        stroke={subjectHex}
                        strokeWidth={0.8}
                        strokeOpacity={0.55}
                        strokeDasharray="2 3"
                      />
                    )}

                    {/* Diffraction rays (the cross + diagonals) */}
                    {cfg.rayLen > 0 && (
                      <g opacity={rayO}>
                        {/* Vertical + horizontal rays */}
                        <line
                          x1={0}
                          y1={-r * cfg.rayLen}
                          x2={0}
                          y2={r * cfg.rayLen}
                          stroke={subjectHex}
                          strokeWidth={0.7}
                          strokeLinecap="round"
                        />
                        <line
                          x1={-r * cfg.rayLen}
                          y1={0}
                          x2={r * cfg.rayLen}
                          y2={0}
                          stroke={subjectHex}
                          strokeWidth={0.7}
                          strokeLinecap="round"
                        />
                        {/* Shorter diagonals — white for sparkle */}
                        <line
                          x1={-r * cfg.rayLen * 0.55}
                          y1={-r * cfg.rayLen * 0.55}
                          x2={r * cfg.rayLen * 0.55}
                          y2={r * cfg.rayLen * 0.55}
                          stroke="#f3ecdd"
                          strokeWidth={0.35}
                          strokeOpacity={0.55}
                          strokeLinecap="round"
                        />
                        <line
                          x1={-r * cfg.rayLen * 0.55}
                          y1={r * cfg.rayLen * 0.55}
                          x2={r * cfg.rayLen * 0.55}
                          y2={-r * cfg.rayLen * 0.55}
                          stroke="#f3ecdd"
                          strokeWidth={0.35}
                          strokeOpacity={0.55}
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* Bright ivory core */}
                    <circle
                      r={r * 0.55}
                      fill="#f3ecdd"
                      opacity={coreO}
                      filter={node.status === "mastered" && active ? "url(#star-glow)" : undefined}
                    />

                    {/* Gold heart on mastered stars — the earned mark */}
                    {node.status === "mastered" && active && (
                      <circle r={r * 0.28} fill="#e4c86a" opacity={0.95} />
                    )}
                  </g>
                );
              })}
          </g>
        </svg>
      </div>

      {/* ── Left-side "Star-Trek" command sidebar ──────────── */}
      {!isOverlayOpen && (
        <ConstellationSidebar
          subject={activeSubject}
          nodes={activeNodes}
          selectedNodeId={selectedNode?.id ?? null}
          onNodeClick={(n) => handleNodeClick(n)}
        />
      )}

      {/* ── Node card popup ──────────────────────────────────── */}
      <AnimatePresence>
        {mappedSelected && cardOrigin && !lessonOpen && !quizOpen && (
          <NodeCard
            node={mappedSelected}
            origin={cardOrigin}
            onWatchLesson={() => setLessonOpen(true)}
            onStartQuiz={() => setQuizOpen(true)}
            onClose={() => {
              setSelectedNode(null);
              setCardOrigin(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Lesson overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {mappedSelected && lessonOpen && !quizOpen && nodeBundle && (
          <LessonOverlay
            node={mappedSelected}
            attempts={nodeBundle.attempts}
            watchPercentage={nodeBundle.watch_percentage}
            bestScore={nodeBundle.best_quiz_score}
            band={nodeBundle.confidence_band}
            onClose={() => setLessonOpen(false)}
            onStartQuiz={() => setQuizOpen(true)}
            onGoToNext={() => goToNextNode(mappedSelected.id)}
          />
        )}
      </AnimatePresence>

      {/* ── Quiz engine ──────────────────────────────────────── */}
      <AnimatePresence>
        {mappedSelected && quizOpen && (
          <QuizEngine
            node={mappedSelected}
            videoUrl={mappedSelected.video_url ?? null}
            onClose={() => setQuizOpen(false)}
            onGoToNext={() => goToNextNode(mappedSelected.id)}
          />
        )}
      </AnimatePresence>

      {/* ── Tooltip overlay ──────────────────────────────────── */}
      {hoveredNode && !selectedNode && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2",
            "flex items-center gap-3 rounded-xl px-4 py-2.5",
            "border border-bronze bg-surface/95 shadow-2xl backdrop-blur-sm",
            "z-30 max-w-xs text-sm text-ivory"
          )}
        >
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor:
                hoveredNode.status === "mastered"
                  ? "#E4C86A"
                  : hoveredNode.status === "locked"
                    ? "#3B3426"
                    : hoveredNode.subject === "reading"
                      ? "#D84F73"
                      : "#2FA8FF",
            }}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {hoveredNode.topic}{" "}
              {hoveredNode.subject !== activeSubject && (
                <span className="text-xs text-taupe">
                  ({hoveredNode.subject === "math" ? "Math" : "R&W"} — not active)
                </span>
              )}
            </p>
            <p className="text-xs capitalize text-taupe">
              {TIER_LABELS[hoveredNode.tier]} · Difficulty {hoveredNode.difficulty} ·{" "}
              <span
                className={cn(
                  hoveredNode.status === "locked"
                    ? "text-taupe/70"
                    : hoveredNode.status === "mastered"
                      ? "text-gold-bright"
                      : hoveredNode.status === "partially_complete"
                        ? "text-gold/80"
                        : hoveredNode.status === "available"
                          ? "text-ivory/85"
                          : "text-ivory"
                )}
              >
                {hoveredNode.status === "in_progress"
                  ? "in progress"
                  : hoveredNode.status.replace(/_/g, " ")}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 rounded-xl border border-bronze bg-night/70 px-3 py-2 backdrop-blur-md">
        {[
          // Mastered is gold — the earned mark — regardless of subject.
          { status: "mastered" as NodeStatus, label: "Mastered", color: "#E4C86A" },
          {
            status: "partially_complete" as NodeStatus,
            label: "Partial pass",
            color: activeHex + "cc",
          },
          { status: "in_progress" as NodeStatus, label: "In progress", color: activeHex + "99" },
          { status: "available" as NodeStatus, label: "Available", color: activeHex + "66" },
          { status: "locked" as NodeStatus, label: "Locked", color: "#3B3426" },
        ].map(({ status, label, color }) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full border border-bronze/60"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-taupe">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
