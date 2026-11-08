// ============================================================
// /admin/curriculum/[nodeId] — Per-node editor with tabs:
//   Questions · Textbook · Video · Bulk Import
// ============================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { WbPage } from "@/components/admin/workbench";
import { getNodes, nodeAtmosphere } from "@/data/curriculum";
import { fetchQuestionsForNode } from "@/lib/supabase/queries/quiz";
import { fetchNodeContent } from "@/lib/supabase/queries/content";
import NodeTabs from "@/components/admin/NodeTabs";

export const metadata: Metadata = { title: "Edit Node — Karman Admin" };

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

  const atmo = nodeAtmosphere(node.tier);

  return (
    <WbPage
      title={node.topic}
      summary={node.description}
      actions={
        <Link className="wb-btn" href="/admin/curriculum">
          All nodes
        </Link>
      }
    >
      <dl className="wb-dl">
        <dt>Node</dt>
        <dd>
          <code>{node.id}</code>
        </dd>
        <dt>Tier</dt>
        <dd>{atmo}</dd>
        <dt>Subject</dt>
        <dd>{node.subject === "reading" ? "Reading & Writing" : "Math"}</dd>
        <dt>Topic</dt>
        <dd>{node.topic_cluster}</dd>
      </dl>

      <NodeTabs
        nodeId={node.id}
        subject={node.subject}
        topicCluster={node.topic_cluster}
        initialTab={tab === "textbook" || tab === "video" || tab === "import" ? tab : "questions"}
        initialQuestions={questions}
        initialTextbook={content?.textbook_content ?? node.textbook_content ?? ""}
        initialVideoUrl={content?.video_url ?? node.video_url ?? null}
        initialVideoStoragePath={content?.video_storage_path ?? null}
        initialVideoDuration={
          content?.video_duration_seconds ?? node.estimated_video_length_seconds ?? null
        }
      />
    </WbPage>
  );
}
