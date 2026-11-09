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
      <div className="flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_50%,transparent)] px-3 py-3 text-xs text-[color:var(--mute)]">
        <ImageOff className="h-4 w-4 shrink-0" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <MatchConfidenceBadge method={asset.match_method} confidence={asset.match_confidence} />
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[color:var(--mute)]">
          {sourceAssetFilename(asset.asset_path)}
        </span>
        {asset.public_url && (
          <a
            href={asset.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded border border-[color:var(--line)] bg-[color:var(--raised)] px-2 py-1 text-[10px] font-semibold text-[color:var(--ink)] hover:bg-[color:var(--raised)]"
          >
            <ExternalLink className="h-2.5 w-2.5" /> view
          </a>
        )}
      </div>

      {asset.public_url ? (
        <div className="overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--line)_50%,transparent)] bg-[color:var(--card)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.public_url}
            alt={`${assetType.replaceAll("_", " ")} for source question`}
            className="mx-auto block max-h-[520px] w-auto rounded object-contain"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--sunk)_50%,transparent)] px-3 py-3 text-xs text-[color:var(--mute)]">
          Asset exists but has no public URL. Path:{" "}
          <span className="font-mono text-[color:var(--ink)]">{asset.asset_path}</span>
        </div>
      )}
    </div>
  );
}
