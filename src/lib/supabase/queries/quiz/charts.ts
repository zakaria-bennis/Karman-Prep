// ============================================================
// Selectors for the chart-review queue (/admin/questions/chart-review).
//
// "Pending chart review" = a question where the extractor wrote
// figure_chart_data BUT figure_kind is still 'image' (i.e.
// confidence was below the auto-publish threshold of 0.8). The
// admin reviews each one side-by-side and decides: approve / edit
// / reject.
//
// "Live charts" = figure_kind='chart'. Already showing the SVG to
// students; surface separately so the admin can spot-check + roll
// back a published mistake.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { ChartFigure } from "@/types/chart";

export interface ChartReviewRow {
  question_id: string;
  source_pdf: string | null;
  source_page: number | null;
  subject: string;
  domain: string | null;
  question_text: string;
  image_url: string | null;
  image_alt: string | null;
  /** The AI's extracted chart data. */
  chart_data: ChartFigure;
  /** Where the admin lands when they click into the question. */
  inspect_href: string;
  /** Set when figure_kind='chart' (already live to students). */
  is_live: boolean;
}

/** Pending-review chart extractions: data populated, but kind not
 *  promoted to 'chart' yet. Sorted by source_pdf then source_page
 *  so the admin can review a test pack top-to-bottom. */
export async function selectPendingChartReviews(): Promise<ChartReviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, subject, domain, question_text, image_url, image_alt, figure_kind, figure_chart_data"
    )
    .not("figure_chart_data", "is", null)
    .neq("figure_kind", "chart")
    .order("source_pdf", { ascending: true, nullsFirst: false })
    .order("source_page", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.figure_chart_data != null)
    .map((r) => ({
      question_id: r.id,
      source_pdf: r.source_pdf,
      source_page: r.source_page,
      subject: r.subject,
      domain: r.domain,
      question_text: r.question_text,
      image_url: r.image_url,
      image_alt: r.image_alt,
      chart_data: r.figure_chart_data as unknown as ChartFigure,
      inspect_href: `/admin/questions/inspect/${r.id}`,
      is_live: false,
    }));
}

/** Live charts already promoted to figure_kind='chart'. Useful for
 *  spot-checking the auto-published ones + rolling back a bad one. */
export async function selectLiveCharts(): Promise<ChartReviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, subject, domain, question_text, image_url, image_alt, figure_chart_data"
    )
    .eq("figure_kind", "chart")
    .not("figure_chart_data", "is", null)
    .order("source_pdf", { ascending: true, nullsFirst: false })
    .order("source_page", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.figure_chart_data != null)
    .map((r) => ({
      question_id: r.id,
      source_pdf: r.source_pdf,
      source_page: r.source_page,
      subject: r.subject,
      domain: r.domain,
      question_text: r.question_text,
      image_url: r.image_url,
      image_alt: r.image_alt,
      chart_data: r.figure_chart_data as unknown as ChartFigure,
      inspect_href: `/admin/questions/inspect/${r.id}`,
      is_live: true,
    }));
}

/** Quick counters for the page header. Avoids fetching every row
 *  just to render "12 pending, 47 live" labels. */
export async function selectChartReviewCounts(): Promise<{
  pending: number;
  live: number;
}> {
  const supabase = createAdminClient();
  const [pendingRes, liveRes] = await Promise.all([
    supabase
      .from("quiz_questions")
      .select("id", { count: "exact", head: true })
      .not("figure_chart_data", "is", null)
      .neq("figure_kind", "chart"),
    supabase
      .from("quiz_questions")
      .select("id", { count: "exact", head: true })
      .eq("figure_kind", "chart"),
  ]);
  if (pendingRes.error) throw pendingRes.error;
  if (liveRes.error) throw liveRes.error;
  return {
    pending: pendingRes.count ?? 0,
    live: liveRes.count ?? 0,
  };
}
