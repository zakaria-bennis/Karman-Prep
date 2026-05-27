export type SourceAssetType =
  | "page_image"
  | "question_crop"
  | "expanded_question_crop"
  | "figure_crop"
  | "table_crop"
  | "chart_crop"
  | "graph_crop"
  | "answer_key_crop"
  | "answer_key_page"
  | "calculator_artifact"
  | "background_ui_artifact"
  | (string & {});

export interface SourceLineageSignals {
  question_id: string;
  source_pdf: string | null;
  source_page: number | null;
  source_assets_processed_at: string | null;
  source_assets_processed_status: string | null;
  question_crop_match_method: string | null;
  question_crop_match_confidence: number | null;
  question_crop_complete: boolean | null;
  has_question_crop: boolean | null;
  has_orphan_crops_on_page: boolean | null;
}

export interface SourceLineageAsset {
  id: string;
  question_id: string | null;
  source_pdf: string | null;
  page_number: number | null;
  asset_type: SourceAssetType;
  asset_path: string;
  public_url: string | null;
  bbox: Record<string, number> | null;
  crop_complete: boolean | null;
  relevance: string | null;
  repeated_across_pages: boolean;
  use_in_solving: boolean;
  match_method: string | null;
  match_confidence: number | null;
  validation_status: string | null;
  parent_asset_id: string | null;
  created_at: string;
  notes: string | null;
}

export interface SourceLineage {
  signals: SourceLineageSignals | null;
  assets: SourceLineageAsset[];
}
