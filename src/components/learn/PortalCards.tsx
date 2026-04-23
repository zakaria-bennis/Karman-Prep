"use client";

// ============================================================
// Portal selection cards — Framer Motion animated
// Used on /learn mode selection page
// ============================================================

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Calculator, ArrowRight, Star } from "lucide-react";
import { RW_NODES, MATH_NODES } from "@/data/curriculum";

interface SubjectStats {
  total: number;
  mastered: number;
  available: number;
}

interface Props {
  readingStats: SubjectStats;
  mathStats: SubjectStats;
}

const CARDS = [
  {
    subject: "reading" as const,
    href: "/learn/reading",
    label: "Reading & Writing",
    emoji: "♥",
    Icon: BookOpen,
    tagline: "Heart constellation · 50 nodes",
    gradient: "from-rose-500/20 via-pink-600/10 to-transparent",
    border: "border-rose-500/20",
    glow: "hover:shadow-rose-500/20",
    iconColor: "text-rose-400",
    barColor: "bg-rose-500",
    accentColor: "text-rose-400",
    bgStarColor: "#fb7185",
    nodes: RW_NODES,
  },
  {
    subject: "math" as const,
    href: "/learn/math",
    label: "Math",
    emoji: "⬡",
    Icon: Calculator,
    tagline: "Brain constellation · 50 nodes",
    gradient: "from-indigo-500/20 via-blue-600/10 to-transparent",
    border: "border-indigo-500/20",
    glow: "hover:shadow-indigo-500/20",
    iconColor: "text-indigo-400",
    barColor: "bg-indigo-500",
    accentColor: "text-indigo-400",
    bgStarColor: "#818cf8",
    nodes: MATH_NODES,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const card = {
  hidden: { opacity: 0, y: 48 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function MiniConstellation({ color, nodes }: { color: string; nodes: typeof RW_NODES }) {
  // Render a tiny SVG preview of the constellation shape (all locked look)
  const W = 200, H = 130;
  const pts = nodes.map((n) => ({ x: n.x * W, y: n.y * H, id: n.id }));
  const edges = nodes.flatMap((n) =>
    n.prereqIds.map((pid) => {
      const from = pts.find((p) => p.id === pid);
      const to   = pts.find((p) => p.id === n.id);
      return from && to ? { x1: from.x, y1: from.y, x2: to.x, y2: to.y } : null;
    }).filter(Boolean)
  ) as { x1: number; y1: number; x2: number; y2: number }[];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 opacity-25 pointer-events-none"
      aria-hidden
    >
      {edges.slice(0, 60).map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={color} strokeWidth={0.5} strokeOpacity={0.6} />
      ))}
      {pts.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r={1.2}
          fill={color} fillOpacity={0.8} />
      ))}
    </svg>
  );
}

export default function PortalCards({ readingStats, mathStats }: Props) {
  const statsMap = { reading: readingStats, math: mathStats };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl"
    >
      {CARDS.map((c) => {
        const stats = statsMap[c.subject];
        const pct = stats.total > 0
          ? Math.round((stats.mastered / stats.total) * 100)
          : 0;
        const started = stats.mastered > 0 || stats.available > 1;

        return (
          <motion.div
            key={c.subject}
            variants={card}
            whileHover={{ scale: 1.03, y: -6 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="flex-1"
          >
            <Link href={c.href} className="block group">
              <div
                className={[
                  "relative overflow-hidden rounded-2xl border bg-white/[0.03]",
                  "p-6 flex flex-col gap-4",
                  "transition-shadow duration-300",
                  c.border,
                  c.glow,
                  "hover:shadow-2xl",
                ].join(" ")}
              >
                {/* Gradient backdrop */}
                <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} pointer-events-none`} />

                {/* Mini constellation preview */}
                <MiniConstellation color={c.bgStarColor} nodes={c.nodes} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <c.Icon className={`w-6 h-6 ${c.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-extrabold text-white mb-1">{c.label}</h2>
                  <p className="text-xs text-slate-500 mb-5">{c.tagline}</p>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">
                        {stats.mastered} / {stats.total} mastered
                      </span>
                      <span className={`font-bold ${c.accentColor}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${c.barColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${c.accentColor} flex items-center gap-1`}>
                      {started ? (
                        <><Star className="w-3.5 h-3.5" /> Continue</>
                      ) : (
                        "Begin constellation"
                      )}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
