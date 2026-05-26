import { createAdminClient } from "@/lib/supabase/server";
import { emptySourceLineage, sortSourceAssets } from "@/lib/source-lineage/helpers";
import type {
  SourceLineage,
  SourceLineageAsset,
  SourceLineageSignals,
} from "@/lib/source-lineage/types";
import type { Database, Json } from "@/types/supabase";

type SignalRow = Database["public"]["Views"]["quiz_questions_phase3_signals"]["Row"];
type SourceAssetRow = Pick<
  Database["public"]["Tables"]["source_assets"]["Row"],
  | "id"
  | "question_id"
  | "source_pdf"
  | "page_number"
  | "asset_type"
  | "asset_path"
  | "public_url"
  | "bbox"
  | "crop_complete"
  | "relevance"
  | "repeated_across_pages"
  | "use_in_solving"
  | "match_method"
  | "match_confidence"
  | "validation_status"
  | "parent_asset_id"
  | "created_at"
  | "notes"
>;

const SIGNAL_SELECT =
  "question_id, source_pdf, source_page, source_assets_processed_at, source_assets_processed_status, question_crop_match_method, question_crop_match_confidence, question_crop_complete, has_question_crop, has_orphan_crops_on_page" as const;

const ASSET_SELECT =
  "id, question_id, source_pdf, page_number, asset_type, asset_path, public_url, bbox, crop_complete, relevance, repeated_across_pages, use_in_solving, match_method, match_confidence, validation_status, parent_asset_id, created_at, notes" as const;

const PAGE_RELATED_ASSET_TYPES = ["page_image", "question_crop", "expanded_question_crop"];
const IN_CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function numberOrNull(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function jsonNumberRecord(value: Json | null): Record<string, number> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "number") return null;
    out[key] = raw;
  }
  return out;
}

function normalizeSignals(row: SignalRow | null): SourceLineageSignals | null {
  if (!row) return null;
  return {
    question_id: row.question_id,
    source_pdf: row.source_pdf,
    source_page: row.source_page,
    source_assets_processed_at: row.source_assets_processed_at,
    source_assets_processed_status: row.source_assets_processed_status,
    question_crop_match_method: row.question_crop_match_method,
    question_crop_match_confidence: numberOrNull(row.question_crop_match_confidence),
    question_crop_complete: row.question_crop_complete,
    has_question_crop: row.has_question_crop,
    has_orphan_crops_on_page: row.has_orphan_crops_on_page,
  };
}

function normalizeAsset(row: SourceAssetRow): SourceLineageAsset {
  return {
    id: row.id,
    question_id: row.question_id,
    source_pdf: row.source_pdf,
    page_number: row.page_number,
    asset_type: row.asset_type,
    asset_path: row.asset_path,
    public_url: row.public_url,
    bbox: jsonNumberRecord(row.bbox),
    crop_complete: row.crop_complete,
    relevance: row.relevance,
    repeated_across_pages: row.repeated_across_pages,
    use_in_solving: row.use_in_solving,
    match_method: row.match_method,
    match_confidence: numberOrNull(row.match_confidence),
    validation_status: row.validation_status,
    parent_asset_id: row.parent_asset_id,
    created_at: row.created_at,
    notes: row.notes,
  };
}

export function normalizeSourceLineage(
  signalsRow: SignalRow | null,
  assetRows: SourceAssetRow[]
): SourceLineage {
  return {
    signals: normalizeSignals(signalsRow),
    assets: sortSourceAssets(assetRows.map(normalizeAsset)),
  };
}

export async function selectSourceLineageForQuestion(questionId: string): Promise<SourceLineage> {
  const supabase = createAdminClient();
  // RTT 1: signals + assets-by-question in parallel.
  const [signalsResult, assetsResult] = await Promise.all([
    supabase
      .from("quiz_questions_phase3_signals")
      .select(SIGNAL_SELECT)
      .eq("question_id", questionId)
      .maybeSingle(),
    supabase.from("source_assets").select(ASSET_SELECT).eq("question_id", questionId),
  ]);

  if (signalsResult.error) throw signalsResult.error;
  if (assetsResult.error) throw assetsResult.error;

  const signals = normalizeSignals(signalsResult.data);
  const assetsById = new Map<string, SourceAssetRow>();
  for (const asset of assetsResult.data ?? []) assetsById.set(asset.id, asset);

  // RTT 2: page-level orphan crops on this question's source page.
  // Cannot be parallelized with RTT 1 because the query needs
  // source_pdf + source_page from the signals view. Conditionally
  // skipped when signals don't carry them (pre-Phase-3 rows or rows
  // with no source_page). Total worst-case round-trip count = 2.
  if (signals?.source_pdf && signals.source_page != null) {
    const { data: pageAssets, error: pageAssetsError } = await supabase
      .from("source_assets")
      .select(ASSET_SELECT)
      .eq("source_pdf", signals.source_pdf)
      .eq("page_number", signals.source_page)
      .is("question_id", null)
      .in("asset_type", PAGE_RELATED_ASSET_TYPES);

    if (pageAssetsError) throw pageAssetsError;
    for (const asset of pageAssets ?? []) assetsById.set(asset.id, asset);
  }

  return {
    signals,
    assets: sortSourceAssets([...assetsById.values()].map(normalizeAsset)),
  };
}

export async function selectSourceLineageForQuestions(
  questionIds: string[]
): Promise<Record<string, SourceLineage>> {
  const ids = [...new Set(questionIds)].filter(Boolean);
  const byQuestionId: Record<string, SourceLineage> = Object.fromEntries(
    ids.map((id) => [id, emptySourceLineage()])
  );
  if (ids.length === 0) return byQuestionId;

  const supabase = createAdminClient();
  const idChunks = chunk(ids, IN_CHUNK_SIZE);

  const [signalResponses, assetResponses] = await Promise.all([
    Promise.all(
      idChunks.map((idChunk) =>
        supabase
          .from("quiz_questions_phase3_signals")
          .select(SIGNAL_SELECT)
          .in("question_id", idChunk)
      )
    ),
    Promise.all(
      idChunks.map((idChunk) =>
        supabase.from("source_assets").select(ASSET_SELECT).in("question_id", idChunk)
      )
    ),
  ]);

  for (const response of signalResponses) {
    if (response.error) throw response.error;
    for (const row of response.data ?? []) {
      byQuestionId[row.question_id] = {
        ...(byQuestionId[row.question_id] ?? emptySourceLineage()),
        signals: normalizeSignals(row),
      };
    }
  }

  for (const response of assetResponses) {
    if (response.error) throw response.error;
    for (const row of response.data ?? []) {
      if (!row.question_id) continue;
      const existing = byQuestionId[row.question_id] ?? emptySourceLineage();
      byQuestionId[row.question_id] = {
        ...existing,
        assets: [...existing.assets, normalizeAsset(row)],
      };
    }
  }

  for (const [questionId, lineage] of Object.entries(byQuestionId)) {
    byQuestionId[questionId] = { ...lineage, assets: sortSourceAssets(lineage.assets) };
  }

  return byQuestionId;
}
