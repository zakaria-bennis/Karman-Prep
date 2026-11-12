"use client";

// ============================================================
// ConstellationMap — full-screen "brain constellation" star map.
//
// Observatory system (docs/archive/brand.md): the warm night sky seen from
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
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  type CurriculumNode,
  type NodeStatus,
  type Subject,
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
import { W, H, edgeOpacity } from "./ConstellationMapHelpers";
import ConstellationBackdrop from "./ConstellationBackdrop";
import ConstellationStar from "./ConstellationStar";
import { ConstellationTooltip, ConstellationLegend } from "./ConstellationOverlays";

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
  /** A validated deep link from the study dashboard. */
  initialQuizNodeId?: string;
  resumeAttemptId?: string;
  initialLessonNodeId?: string;
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
function ConstellationMapInner({
  activeSubject,
  readingNodes,
  mathNodes,
  initialQuizNodeId,
  resumeAttemptId,
  initialLessonNodeId,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MappedNode | null>(() => {
    const nodes = activeSubject === "reading" ? readingNodes : mathNodes;
    return nodes.find((node) => node.id === (initialQuizNodeId ?? initialLessonNodeId)) ?? null;
  });
  const [cardOrigin, setCardOrigin] = useState<{ x: number; y: number } | null>(null);
  const [lessonOpen, setLessonOpen] = useState(!!initialLessonNodeId);
  const [quizOpen, setQuizOpen] = useState(!!initialQuizNodeId);
  const [pendingResumeAttemptId, setPendingResumeAttemptId] = useState(resumeAttemptId);
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
    setPendingResumeAttemptId(undefined);
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
        if (reduceMotion) return;
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
          <ConstellationBackdrop
            reduceMotion={reduceMotion}
            parallaxTransformX={parallaxTransformX}
            parallaxTransformY={parallaxTransformY}
          />

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
              .map((node) => (
                <ConstellationStar
                  key={node.id}
                  node={node}
                  activeSubject={activeSubject}
                  activeHex={activeHex}
                  otherHex={otherHex}
                  hovered={hovered}
                  setHovered={setHovered}
                  handleNodeClick={handleNodeClick}
                />
              ))}
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
            onStartQuiz={() => {
              setPendingResumeAttemptId(undefined);
              setQuizOpen(true);
            }}
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
            onClose={() => (cardOrigin ? setLessonOpen(false) : closeAll())}
            onStartQuiz={() => {
              setPendingResumeAttemptId(undefined);
              setQuizOpen(true);
            }}
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
            resumeAttemptId={pendingResumeAttemptId}
            onClose={() => (cardOrigin ? setQuizOpen(false) : closeAll())}
            onGoToNext={() => goToNextNode(mappedSelected.id)}
          />
        )}
      </AnimatePresence>

      {/* ── Tooltip overlay ──────────────────────────────────── */}
      {hoveredNode && !selectedNode && (
        <ConstellationTooltip hoveredNode={hoveredNode} activeSubject={activeSubject} />
      )}

      {/* ── Legend ───────────────────────────────────────────── */}
      <ConstellationLegend activeHex={activeHex} />
    </motion.div>
  );
}
