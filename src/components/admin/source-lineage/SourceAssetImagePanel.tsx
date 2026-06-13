"use client";

import { ExternalLink, ImageOff } from "lucide-react";
import { findPreferredSourceAsset, sourceAssetFilename } from "@/lib/source-lineage/helpers";
import type { SourceLineage } from "@/lib/source-lineage/types";
import { MatchConfidenceBadge } from "./MatchConfidenceBadge";

interface Props {
  lineage: SourceLineage | null | undefined;
  assetType: "question_crop" | "expanded_question_crop";
  emptyLabel: string;
}

export function SourceAssetImagePanel({ lineage, assetType, emptyLabel }: Props) {
  const asset = findPreferredSourceAsset(lineage, assetType);

  if (!asset) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-bronze bg-night/50 px-3 py-3 text-xs text-taupe">
        <ImageOff className="h-4 w-4 shrink-0" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <MatchConfidenceBadge method={asset.match_method} confidence={asset.match_confidence} />
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-taupe">
          {sourceAssetFilename(asset.asset_path)}
        </span>
        {asset.public_url && (
          <a
            href={asset.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-bronze bg-surface-raised px-2 py-1 text-[10px] font-semibold text-ivory hover:bg-surface-raised"
          >
            <ExternalLink className="h-2.5 w-2.5" /> view
          </a>
        )}
      </div>

      {asset.public_url ? (
        <div className="overflow-hidden rounded-lg border border-bronze/50 bg-surface p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.public_url}
            alt={`${assetType.replaceAll("_", " ")} for source question`}
            className="mx-auto block max-h-[520px] w-auto rounded object-contain"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-bronze bg-night/50 px-3 py-3 text-xs text-taupe">
          Asset exists but has no public URL. Path:{" "}
          <span className="font-mono text-ivory">{asset.asset_path}</span>
        </div>
      )}
    </div>
  );
}
