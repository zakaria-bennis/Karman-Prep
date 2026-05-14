// ============================================================
// Supabase queries — Per-node textbook + video content
// Admin-only. Students read these via the same server side
// (fallback to curriculum.ts defaults when no row exists).
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { NodeContent } from "@/types/quiz";

export async function fetchNodeContent(nodeId: string): Promise<NodeContent | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("node_content")
    .select("*")
    .eq("node_id", nodeId)
    .maybeSingle();
  return (data as NodeContent | null) ?? null;
}

export async function fetchAllNodeContent(): Promise<NodeContent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("node_content").select("*");
  if (error) throw error;
  return (data ?? []) as NodeContent[];
}

export async function upsertTextbook(
  nodeId: string,
  textbookContent: string,
  updatedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("node_content").upsert({
    node_id: nodeId,
    textbook_content: textbookContent,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function upsertVideoURL(
  nodeId: string,
  videoUrl: string | null,
  durationSeconds: number | null,
  updatedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("node_content").upsert({
    node_id: nodeId,
    video_url: videoUrl,
    video_duration_seconds: durationSeconds,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/**
 * Upload a video file to the `node-videos` bucket and record the public
 * URL on the node_content row. Returns the resulting public URL.
 */
export async function uploadVideoFile(
  nodeId: string,
  fileName: string,
  fileBytes: ArrayBuffer,
  contentType: string,
  updatedBy: string
): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = createAdminClient();
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "mp4";
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${nodeId}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from("node-videos")
    .upload(storagePath, fileBytes, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data: pub } = supabase.storage.from("node-videos").getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  const { error: upsertErr } = await supabase.from("node_content").upsert({
    node_id: nodeId,
    video_url: publicUrl,
    video_storage_path: storagePath,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
  if (upsertErr) throw upsertErr;

  return { publicUrl, storagePath };

  // `ext` is here for future format-specific handling; silence the lint.
  void ext;
}

export async function deleteVideo(
  nodeId: string,
  storagePath: string | null,
  updatedBy: string
): Promise<void> {
  const supabase = createAdminClient();

  if (storagePath) {
    await supabase.storage.from("node-videos").remove([storagePath]);
  }

  await supabase.from("node_content").upsert({
    node_id: nodeId,
    video_url: null,
    video_storage_path: null,
    video_duration_seconds: null,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  });
}
