"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  ImageIcon,
} from "lucide-react";
import { MatchConfidenceBadge } from "@/components/admin/source-lineage/MatchConfidenceBadge";
import {
  groupSourceAssets,
  hasProcessedSourceLineage,
  sourceAssetFilename,
  sourceAssetLabel,
} from "@/lib/source-lineage/helpers";
import type { SourceLineage, SourceLineageAsset } from "@/lib/source-lineage/types";
import { cn } from "@/lib/utils";

interface Props {
  lineage: SourceLineage | null;
}

export function SourceLineageSection({ lineage }: Props) {
  const [open, setOpen] = useState(true);
  const processed = hasProcessedSourceLineage(lineage);
  const assets = lineage?.assets ?? [];

  if (!processed && assets.length === 0) return null;

  const processedAt = lineage?.signals?.source_assets_processed_at
    ? new Date(lineage.signals.source_assets_processed_at).toLocaleString()
    : "not processed";
  const status = lineage?.signals?.source_assets_processed_status ?? "unknown";
  const groups = groupSourceAssets(assets);

  return (
    <section className="rounded-xl border border-bronze bg-surface/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 border-b border-bronze px-4 py-3 text-left"
      >
        <ImageIcon className="h-4 w-4 text-gold-bright" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ivory">Source lineage</h2>
          <p className="mt-0.5 text-[11px] text-taupe">
            Processed: <span className="font-mono text-ivory">{processedAt}</span> - status:{" "}
            <span className="font-mono text-ivory">{status}</span>
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-taupe" />
        ) : (
          <ChevronDown className="h-4 w-4 text-taupe" />
        )}
      </button>

      {open && (
        <div className="space-y-3 px-4 py-4">
          {groups.length === 0 ? (
            <div className="rounded-lg border border-bronze bg-night/40 px-3 py-3 text-xs text-taupe">
              Phase 3 marked this row as processed, but no source assets are attached.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.assetType} className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-taupe">
                  <AssetTypeIcon assetType={group.assetType} />
                  {sourceAssetLabel(group.assetType)}
                </div>
                <div className="space-y-2">
                  {group.assets.map((asset) => (
                    <SourceAssetRow key={asset.id} asset={asset} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function SourceAssetRow({ asset }: { asset: SourceLineageAsset }) {
  const isCrop = asset.asset_type.includes("crop");
  return (
    <div className="rounded-lg border border-bronze bg-night/35 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ivory">
          {sourceAssetFilename(asset.asset_path)}
        </span>
        {asset.match_method && (
          <MatchConfidenceBadge method={asset.match_method} confidence={asset.match_confidence} />
        )}
        {isCrop && <CropCompletePill complete={asset.crop_complete} />}
        {asset.relevance && (
          <RelevancePill
            relevance={asset.relevance}
            useInSolving={asset.use_in_solving}
            repeated={asset.repeated_across_pages}
          />
        )}
        {asset.public_url ? (
          <a
            href={asset.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-bronze bg-surface-raised px-2 py-1 text-[10px] font-semibold text-ivory hover:bg-surface-raised"
          >
            <ExternalLink className="h-2.5 w-2.5" /> view
          </a>
        ) : (
          <span className="rounded-md border border-bronze px-2 py-1 text-[10px] text-taupe">
            no URL
          </span>
        )}
      </div>
      {(asset.validation_status || asset.notes) && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-taupe">
          {asset.validation_status && (
            <span>
              validation: <span className="font-mono text-taupe">{asset.validation_status}</span>
            </span>
          )}
          {asset.notes && <span className="truncate">notes: {asset.notes}</span>}
        </div>
      )}
    </div>
  );
}

function RelevancePill({
  relevance,
  useInSolving,
  repeated,
}: {
  relevance: string;
  useInSolving: boolean;
  repeated: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        relevance === "required" && "border-success/30 bg-success/10 text-success-bright",
        relevance === "irrelevant" && "border-bronze bg-surface-raised/70 text-ivory",
        relevance === "uncertain" && "border-warning/30 bg-warning/10 text-warning-bright",
        relevance === "optional" && "border-info/30 bg-info/10 text-info-bright"
      )}
      title={[
        `relevance=${relevance}`,
        useInSolving ? "used in solving" : "not used in solving",
        repeated ? "repeated across pages" : null,
      ]
        .filter(Boolean)
        .join(" - ")}
    >
      {relevance}
      {useInSolving ? " - solve" : ""}
      {repeated ? " - repeated" : ""}
    </span>
  );
}

function CropCompletePill({ complete }: { complete: boolean | null }) {
  const ok = complete !== false;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        ok
          ? "border-success/30 bg-success/10 text-success-bright"
          : "border-warning/30 bg-warning/10 text-warning-bright"
      )}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {ok ? "crop complete" : "crop incomplete"}
    </span>
  );
}

function AssetTypeIcon({ assetType }: { assetType: string }) {
  if (assetType.includes("crop")) return <ImageIcon className="h-3.5 w-3.5 text-gold-bright" />;
  return <FileText className="h-3.5 w-3.5 text-taupe" />;
}
