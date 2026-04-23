// ============================================================
// /admin/curriculum/[nodeId] — Question editor for a single node
// ============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNode, getNodes } from "@/data/curriculum";
import { fetchQuestionsForNode } from "@/lib/supabase/queries/quiz";
import QuestionEditor from "@/components/admin/QuestionEditor";
import BulkImportPanel from "@/components/admin/BulkImportPanel";

export const metadata: Metadata = { title: "Edit Node — Strata Admin" };

interface Params {
  params: Promise<{ nodeId: string }>;
}

export default async function NodeEditorPage({ params }: Params) {
  const { nodeId } = await params;

  // Resolve across both subjects
  const node =
    getNodes("reading").find((n) => n.id === nodeId) ??
    getNodes("math").find((n) => n.id === nodeId) ??
    null;

  if (!node) notFound();
  void getNode; // keep import exported

  const questions = await fetchQuestionsForNode(nodeId);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/curriculum"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to node browser
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{node.topic}</h1>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
          <code className="font-mono">{node.id}</code>
          <span>•</span>
          <span>{node.subject === "reading" ? "Reading & Writing" : "Math"}</span>
          <span>•</span>
          <span>Tier {node.tier}</span>
          <span>•</span>
          <span>Difficulty {node.difficulty}</span>
          <span>•</span>
          <span>Topic: <span className="text-slate-700 dark:text-slate-300">{node.topic_cluster}</span></span>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{node.description}</p>
      </div>

      {/* Editor */}
      <QuestionEditor
        nodeId={node.id}
        subject={node.subject}
        topicCluster={node.topic_cluster}
        initialQuestions={questions}
      />

      {/* Bulk import */}
      <BulkImportPanel nodeId={node.id} subject={node.subject} topicCluster={node.topic_cluster} />
    </div>
  );
}
