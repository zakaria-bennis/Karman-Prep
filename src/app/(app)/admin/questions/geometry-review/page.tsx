// ============================================================
// /admin/questions/geometry-review — Phase 9D/9E review surface.
//
// Surfaces every geometry (2D) + 3D-shape extraction next to its
// original screenshot. These are NOT rendered to students in v1
// (screenshot-first by design) — this queue exists so an admin can
// eyeball extraction quality and build the track record that decides
// whether v2 promotes geometry to a real SVG render.
//
// Read-only viewer for now (verify/flag actions are a follow-up).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Shapes, Microscope, Box, Triangle } from "lucide-react";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import {
  selectGeometryExtractions,
  type GeometryReviewRow,
  type GeometryData,
} from "@/lib/supabase/queries/quiz/geometry";

export const metadata: Metadata = { title: "Admin — Geometry review | Karman" };
export const dynamic = "force-dynamic";

export default async function GeometryReviewPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  if (!(await requireRole(userId, ["admin"]))) redirect("/");

  const rows = await selectGeometryExtractions();

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-taupe hover:text-ivory"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <div className="flex items-start justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ivory">
            <Shapes className="h-5 w-5 text-warning" /> Geometry &amp; 3D review
            <span className="rounded bg-surface-raised px-2 py-0.5 font-mono text-xs text-ivory">
              {rows.length}
            </span>
          </h1>
          <Link
            href="/admin/questions/chart-review"
            className="inline-flex items-center gap-1.5 rounded-md border border-bronze bg-surface/60 px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-surface-raised"
          >
            <Microscope className="h-3.5 w-3.5" /> Chart review
          </Link>
        </div>
        <p className="mt-1.5 text-sm text-taupe">
          Structured extractions stored for admin verification. Students keep seeing the screenshot
          in v1 — clean-looking wrong geometry is more dangerous than a real screenshot. Use this to
          judge whether extraction is reliable enough to promote to a rendered figure later.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-bronze bg-surface/40 px-6 py-12 text-center text-sm text-taupe">
          No geometry or 3D extractions yet. They appear here after the figure-structure pass (Stage
          6.5) runs on a PDF with geometry/3D figures.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <GeometryCard key={row.question_id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function GeometryCard({ row }: { row: GeometryReviewRow }) {
  const is3d = row.kind === "3d_shape";
  return (
    <article className="rounded-xl border border-bronze bg-surface/50 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={
            is3d
              ? "inline-flex items-center gap-1 rounded bg-info/15 px-2 py-0.5 font-semibold text-info-bright"
              : "inline-flex items-center gap-1 rounded bg-warning/15 px-2 py-0.5 font-semibold text-warning-bright"
          }
        >
          {is3d ? <Box className="h-3 w-3" /> : <Triangle className="h-3 w-3" />}
          {is3d ? "3D shape" : "Geometry"}
        </span>
        <span className="text-taupe">
          {row.source_pdf ?? "(no pdf)"} · p{row.source_page ?? "?"}
        </span>
        <span className="text-taupe">·</span>
        <span className="text-taupe">{row.subject}</span>
        {row.confidence != null && (
          <span className="text-taupe">· conf {row.confidence.toFixed(2)}</span>
        )}
        <Link
          href={row.inspect_href}
          className="ml-auto inline-flex items-center gap-1 rounded border border-bronze px-2 py-0.5 text-ivory hover:bg-surface-raised"
        >
          <Microscope className="h-3 w-3" /> Inspect
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Original screenshot (what students actually see) */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-taupe">
            Screenshot (student-facing)
          </div>
          {row.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin tool, external R2 crop
            <img
              src={row.image_url}
              alt={row.image_alt ?? "figure"}
              className="max-h-72 w-auto rounded border border-bronze bg-[#F3ECDD] p-2"
            />
          ) : (
            <div className="text-xs text-taupe">(no screenshot)</div>
          )}
        </div>

        {/* Extracted structure */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-taupe">
            Extracted structure
          </div>
          <GeometryStructure data={row.geometry_data} />
        </div>
      </div>
    </article>
  );
}

function GeometryStructure({ data }: { data: GeometryData }) {
  return (
    <div className="space-y-2 text-sm text-ivory">
      {data.notes && <p className="italic text-ivory">{data.notes}</p>}

      {data.kind === "3d_shape" ? (
        <>
          <Field label="Solid">{(data.solid_kind ?? "?").replace(/_/g, " ")}</Field>
          {data.is_net && <Field label="Form">net (unfolded)</Field>}
          {data.dimensions?.length ? (
            <Field label="Dimensions">
              {data.dimensions.map((d) => `${d.label ?? "?"} = ${d.value ?? "?"}`).join(", ")}
            </Field>
          ) : null}
          {data.labels?.length ? <Field label="Labels">{data.labels.join(", ")}</Field> : null}
        </>
      ) : (
        <>
          {data.shapes?.length ? (
            <Field label="Shapes">
              {data.shapes
                .map(
                  (s) => `${(s.kind ?? "shape").replace(/_/g, " ")}${s.label ? ` ${s.label}` : ""}`
                )
                .join(", ")}
            </Field>
          ) : null}
          {data.angle_markings?.length ? (
            <Field label="Angles">
              {data.angle_markings
                .map(
                  (a) =>
                    `${a.at_vertex ?? "?"}${a.right_angle ? " (right)" : ""}${a.measure ? ` = ${a.measure}` : ""}`
                )
                .join(", ")}
            </Field>
          ) : null}
          {data.length_markings?.length ? (
            <Field label="Lengths">
              {data.length_markings
                .map((l) => `${(l.on_segment ?? []).join("")} = ${l.value ?? "?"}`)
                .join(", ")}
            </Field>
          ) : null}
          {data.relationships?.length ? (
            <Field label="Relationships">
              {data.relationships
                .map(
                  (r) => `${(r.kind ?? "?").replace(/_/g, " ")} (${(r.between ?? []).join(", ")})`
                )
                .join("; ")}
            </Field>
          ) : null}
        </>
      )}

      <details className="mt-1">
        <summary className="cursor-pointer text-[11px] text-taupe hover:text-taupe">
          raw JSON
        </summary>
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-night/60 p-2 text-[11px] text-taupe">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-taupe">
        {label}
      </span>
      <span className="text-ivory">{children}</span>
    </div>
  );
}
