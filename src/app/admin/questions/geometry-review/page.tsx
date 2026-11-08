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
import { WbPage, WbPill, WbStats, WbTabs } from "@/components/admin/workbench";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import {
  selectGeometryExtractions,
  type GeometryReviewRow,
  type GeometryData,
} from "@/lib/supabase/queries/quiz/geometry";

export const metadata: Metadata = { title: "Admin — Geometry review | Karman" };
export const dynamic = "force-dynamic";

type KindFilter = "all" | "geometry" | "3d";

export default async function GeometryReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  if (!(await requireRole(userId, ["admin"]))) redirect("/");

  const { kind: kindParam } = await searchParams;
  const kind: KindFilter = kindParam === "geometry" || kindParam === "3d" ? kindParam : "all";

  const rows = await selectGeometryExtractions();
  const solids = rows.filter((r) => r.kind === "3d_shape");
  const flat = rows.filter((r) => r.kind !== "3d_shape");
  const shown = kind === "3d" ? solids : kind === "geometry" ? flat : rows;

  return (
    <WbPage
      title="Geometry and 3D review"
      summary="Structured figure extractions next to the screenshot students see. Students keep seeing the screenshot for now; use this to judge whether extraction is reliable enough to render later."
      actions={
        <>
          <Link className="wb-btn" href="/admin/questions/chart-review">
            Chart review
          </Link>
          <Link className="wb-btn" href="/admin/curriculum">
            Back to admin
          </Link>
        </>
      }
    >
      <WbStats
        items={[
          { label: "Extractions", value: rows.length },
          { label: "Geometry", value: flat.length },
          { label: "3D shapes", value: solids.length },
        ]}
      />

      <WbTabs
        label="Figure kind"
        param="kind"
        value={kind}
        basePath="/admin/questions/geometry-review"
        options={[
          { value: "all", label: "All", count: rows.length },
          { value: "geometry", label: "Geometry", count: flat.length },
          { value: "3d", label: "3D shapes", count: solids.length },
        ]}
      />

      {shown.length === 0 ? (
        rows.length === 0 ? (
          <div className="wb-empty">
            <b>No geometry or 3D extractions yet.</b>
            They appear after the figure-structure pass runs on a PDF with geometry or 3D figures.
          </div>
        ) : (
          <div className="wb-empty">
            <b>Nothing of this kind.</b>
            <Link href="/admin/questions/geometry-review">Clear filters</Link>
          </div>
        )
      ) : (
        shown.map((row) => <GeometryCard key={row.question_id} row={row} />)
      )}
    </WbPage>
  );
}

function GeometryCard({ row }: { row: GeometryReviewRow }) {
  const is3d = row.kind === "3d_shape";
  return (
    <article
      className="wb-section"
      aria-label={`${row.source_pdf ?? "(no pdf)"}, page ${row.source_page ?? "?"}`}
      style={{ display: "grid", gap: 12 }}
    >
      <div className="wb-toolbar">
        <WbPill tone={is3d ? "info" : "warn"}>{is3d ? "3D shape" : "Geometry"}</WbPill>
        <span className="wb-note" style={{ overflowWrap: "anywhere" }}>
          {row.source_pdf ?? "(no pdf)"} · p{row.source_page ?? "?"} · {row.subject}
          {row.confidence != null && ` · confidence ${row.confidence.toFixed(2)}`}
        </span>
        <Link className="wb-btn" href={row.inspect_href} style={{ marginLeft: "auto" }}>
          Inspect
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Original screenshot (what students actually see) */}
        <figure style={{ margin: 0, minWidth: 0 }}>
          <figcaption className="wb-note" style={{ marginBottom: 6 }}>
            Screenshot (student-facing)
          </figcaption>
          {row.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin tool, external R2 crop
            <img
              src={row.image_url}
              alt={row.image_alt ?? "figure"}
              style={{
                maxHeight: "18rem",
                maxWidth: "100%",
                width: "auto",
                borderRadius: 4,
                border: "1px solid var(--line)",
                background: "#fff",
                padding: 8,
              }}
            />
          ) : (
            <p className="wb-note">(no screenshot)</p>
          )}
        </figure>

        {/* Extracted structure */}
        <div style={{ minWidth: 0 }}>
          <p className="wb-note" style={{ marginBottom: 6 }}>
            Extracted structure
          </p>
          <GeometryStructure data={row.geometry_data} />
        </div>
      </div>
    </article>
  );
}

function GeometryStructure({ data }: { data: GeometryData }) {
  return (
    <div style={{ display: "grid", gap: 8, fontSize: "0.85rem" }}>
      {data.notes && <p style={{ margin: 0, fontStyle: "italic" }}>{data.notes}</p>}

      <dl className="wb-dl">
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
                    (s) =>
                      `${(s.kind ?? "shape").replace(/_/g, " ")}${s.label ? ` ${s.label}` : ""}`
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
      </dl>

      <details>
        <summary className="wb-note" style={{ cursor: "pointer" }}>
          Raw JSON
        </summary>
        <pre
          style={{
            margin: "6px 0 0",
            maxHeight: "12rem",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontSize: "0.75rem",
            color: "var(--mute)",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
