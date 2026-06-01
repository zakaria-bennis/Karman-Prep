// ============================================================
// Selectors for the geometry/3D review queue
// (/admin/questions/geometry-review).
//
// Phase 9D/9E extract structure into figure_geometry_data but
// DON'T promote it to a student-facing renderer — the screenshot
// keeps rendering ("clean-looking wrong geometry is more dangerous
// than a real screenshot"). This queue surfaces "here's what we
// extracted" next to the original screenshot so an admin can build
// a track record of extraction quality before v2 promotes geometry
// to a real SVG render.
//
// There's no pending/live split (geometry always renders as the
// screenshot in v1) — just one worklist of every extraction.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

/** The figure_geometry_data shape (2D geometry OR 3D solid), as
 *  written by scripts/lib/figure-geometry-logic.mjs. Both variants
 *  share `kind` + `notes`; the rest is per-dimensionality. */
export interface GeometryData {
  kind?: "geometric" | "3d_shape";
  // 2D geometry
  shapes?: Array<{
    kind?: string;
    label?: string | null;
    vertices_or_points?: Array<{ label?: string; x?: number | null; y?: number | null }>;
  }>;
  angle_markings?: Array<{ at_vertex?: string; measure?: string | null; right_angle?: boolean }>;
  length_markings?: Array<{ on_segment?: string[]; value?: string | null }>;
  relationships?: Array<{ kind?: string; between?: string[] }>;
  // 3D shapes
  solid_kind?: string;
  is_net?: boolean;
  dimensions?: Array<{ label?: string; value?: string | null }>;
  labels?: string[];
  // shared
  notes?: string | null;
  extracted_by?: string;
}

export interface GeometryReviewRow {
  question_id: string;
  source_pdf: string | null;
  source_page: number | null;
  subject: string;
  domain: string | null;
  question_text: string;
  image_url: string | null;
  image_alt: string | null;
  /** The AI's extracted geometry/3D structure. */
  geometry_data: GeometryData;
  /** "geometric" | "3d_shape" — drives the badge + which fields show. */
  kind: string;
  /** Model's self-reported / pipeline confidence, if present. */
  confidence: number | null;
  /** Where the admin lands when they click into the question. */
  inspect_href: string;
}

const SELECT =
  "id, source_pdf, source_page, subject, domain, question_text, image_url, image_alt, figure_geometry_data, figure_quality";

/** Every geometry/3D extraction, newest test pack first then by page
 *  so an admin can review a PDF top-to-bottom. */
export async function selectGeometryExtractions(): Promise<GeometryReviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select(SELECT)
    .not("figure_geometry_data", "is", null)
    .order("source_pdf", { ascending: true, nullsFirst: false })
    .order("source_page", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.figure_geometry_data != null)
    .map((r) => {
      const geometry = r.figure_geometry_data as unknown as GeometryData;
      const quality = (r.figure_quality ?? null) as { extraction_model_confidence?: number } | null;
      return {
        question_id: r.id,
        source_pdf: r.source_pdf,
        source_page: r.source_page,
        subject: r.subject,
        domain: r.domain,
        question_text: r.question_text,
        image_url: r.image_url,
        image_alt: r.image_alt,
        geometry_data: geometry,
        kind: geometry.kind ?? "geometric",
        confidence:
          typeof quality?.extraction_model_confidence === "number"
            ? quality.extraction_model_confidence
            : null,
        inspect_href: `/admin/questions/inspect/${r.id}`,
      };
    });
}

/** Count for the page header + the nav badge. */
export async function selectGeometryReviewCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .not("figure_geometry_data", "is", null);
  if (error) throw error;
  return count ?? 0;
}
