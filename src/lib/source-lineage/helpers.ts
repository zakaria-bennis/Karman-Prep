import type { SourceLineage, SourceLineageAsset, SourceAssetType } from "./types";

export const SOURCE_ASSET_TYPE_ORDER = [
  "page_image",
  "question_crop",
  "expanded_question_crop",
  "figure_crop",
  "table_crop",
  "chart_crop",
  "graph_crop",
  "answer_key_crop",
  "answer_key_page",
  "calculator_artifact",
  "background_ui_artifact",
] as const;

const ASSET_TYPE_RANK = new Map<string, number>(
  SOURCE_ASSET_TYPE_ORDER.map((assetType, index) => [assetType, index])
);

export function emptySourceLineage(): SourceLineage {
  return { signals: null, assets: [] };
}

export function sourceAssetTypeRank(assetType: string): number {
  return ASSET_TYPE_RANK.get(assetType) ?? SOURCE_ASSET_TYPE_ORDER.length;
}

export function sortSourceAssets(assets: SourceLineageAsset[]): SourceLineageAsset[] {
  return [...assets].sort((a, b) => {
    const rankDiff = sourceAssetTypeRank(a.asset_type) - sourceAssetTypeRank(b.asset_type);
    if (rankDiff !== 0) return rankDiff;
    const timeDiff = Date.parse(a.created_at) - Date.parse(b.created_at);
    if (timeDiff !== 0 && Number.isFinite(timeDiff)) return timeDiff;
    return a.asset_path.localeCompare(b.asset_path);
  });
}

export function groupSourceAssets(
  assets: SourceLineageAsset[]
): Array<{ assetType: SourceAssetType; assets: SourceLineageAsset[] }> {
  const grouped = new Map<SourceAssetType, SourceLineageAsset[]>();
  for (const asset of sortSourceAssets(assets)) {
    const list = grouped.get(asset.asset_type) ?? [];
    list.push(asset);
    grouped.set(asset.asset_type, list);
  }
  return [...grouped.entries()]
    .map(([assetType, list]) => ({ assetType, assets: list }))
    .sort((a, b) => sourceAssetTypeRank(a.assetType) - sourceAssetTypeRank(b.assetType));
}

export function findPreferredSourceAsset(
  lineage: SourceLineage | null | undefined,
  assetType: string
): SourceLineageAsset | null {
  const matching = (lineage?.assets ?? []).filter((asset) => asset.asset_type === assetType);
  if (matching.length === 0) return null;
  return [...matching].sort((a, b) => {
    const confidenceDiff = (b.match_confidence ?? -1) - (a.match_confidence ?? -1);
    if (confidenceDiff !== 0) return confidenceDiff;
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  })[0];
}

export function hasProcessedSourceLineage(lineage: SourceLineage | null | undefined): boolean {
  return Boolean(lineage?.signals?.source_assets_processed_at);
}

export function hasOrphanCropsOnPage(lineage: SourceLineage | null | undefined): boolean {
  return lineage?.signals?.has_orphan_crops_on_page === true;
}

export function sourceAssetFilename(assetPath: string): string {
  const parts = assetPath.split("/").filter(Boolean);
  return parts.at(-1) ?? assetPath;
}

export function sourceAssetLabel(assetType: string): string {
  return assetType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function compactMatchMethod(method: string | null | undefined): string {
  switch (method) {
    case "page_question_number":
      return "question #";
    case "page_passage_snippet":
      return "passage";
    case "page_choice_snippets":
      return "choices";
    case "page_stem_snippet":
      return "stem";
    case "ordered_fallback":
      return "fallback";
    case "orphan":
      return "orphan";
    case null:
    case undefined:
    case "":
      return "no match";
    default:
      return method.replaceAll("_", " ");
  }
}
