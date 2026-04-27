// ============================================================
// /admin/curriculum/[nodeId] — Per-node editor with tabs:
//   Questions · Textbook · Video · Bulk Import
// ============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNodes, nodeAtmosphere, ATMOSPHERE_COLORS } from "@/data/curriculum";
import { fetchQuestionsForNode } from "@/lib/supabase/queries/quiz";
import { fetchNodeContent } from "@/lib/supabase/queries/content";
import NodeTabs from "@/components/admin/NodeTabs";

export const metadata: Metadata = { title: "Edit Node — Strata Admin" };

interface Params {
  params: Promise<{ nodeId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function NodeEditorPage({ params, searchParams }: Params) {
  const { nodeId } = await params;
  const { tab } = await searchParams;

  const node =
    getNodes("reading").find((n) => n.id === nodeId) ??
    getNodes("math").find((n) => n.id === nodeId) ??
    null;

  if (!node) notFound();

  const [questions, content] = await Promise.all([
    fetchQuestionsForNode(nodeId, { includeFlagged: true }),
    fetchNodeContent(nodeId),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All nodes
        </Link>
        <h1 className="text-2xl font-extrabold text-white">{node.topic}</h1>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.18em]"
            style={{
              background: ATMOSPHERE_COLORS[nodeAtmosphere(node.tier)].hex + "15",
              color: ATMOSPHERE_COLORS[nodeAtmosphere(node.tier)].hex,
              border: `1px solid ${ATMOSPHERE_COLORS[nodeAtmosphere(node.tier)].hex}30`,
            }}
          >
            {nodeAtmosphere(node.tier)}
          </span>
          <code className="font-mono text-slate-400">{node.id}</code>
          <span>·</span>
          <span>{node.subject === "reading" ? "Reading & Writing" : "Math"}</span>
          <span>·</span>
          <span>Topic: <span className="text-slate-300">{node.topic_cluster}</span></span>
        </div>
        <p className="mt-3 text-sm text-slate-400 max-w-2xl">{node.description}</p>
      </div>

      <NodeTabs
        nodeId={node.id}
        subject={node.subject}
        topicCluster={node.topic_cluster}
        initialTab={tab === "textbook" || tab === "video" || tab === "import" ? tab : "questions"}
        initialQuestions={questions}
        initialTextbook={content?.textbook_content ?? node.textbook_content ?? ""}
        initialVideoUrl={content?.video_url ?? node.video_url ?? null}
        initialVideoStoragePath={content?.video_storage_path ?? null}
        initialVideoDuration={content?.video_duration_seconds ?? node.estimated_video_length_seconds ?? null}
      />
    </div>
  );
}
