import { useState } from "react";
import { Sheet } from "@/design-system/components/Sheet";
import { fmtDate } from "@/mock";
import { cn } from "@/design-system/cn";
import type { ReportUpload } from "../mock-work";

/*
 * ReportImage: the photo a student uploaded, drawn in code (never a real
 * score report: the image is private student data). A tap opens it large in
 * a sheet, the click-to-zoom idea of Zoomable Image (21st.dev 20027,
 * inference-sh); its react-medium-image-zoom dependency was not used.
 */
export function DrawnReport({
  r,
  name,
  className,
}: {
  r: ReportUpload;
  name: string;
  className?: string;
}) {
  const s = r.shows;
  return (
    <svg
      viewBox="0 0 400 300"
      className={cn("block h-auto w-full", className)}
      role="img"
      aria-label={`Photo of ${name}'s ${s.type} score report`}
    >
      <rect width="400" height="300" fill="rgb(var(--k-raised))" />
      <g transform="rotate(-2 200 150)">
        <rect
          x="52"
          y="26"
          width="296"
          height="250"
          rx="3"
          fill="rgb(var(--k-surface))"
          stroke="rgb(var(--k-border) / 0.5)"
        />
        <text
          x="72"
          y="60"
          fontSize="13"
          fontWeight="700"
          fill="rgb(var(--k-text))"
          fontFamily="var(--k-font-sans)"
        >
          {s.type === "PSAT" ? "PSAT/NMSQT" : "SAT"} score report
        </text>
        <text
          x="72"
          y="78"
          fontSize="10"
          fill="rgb(var(--k-muted))"
          fontFamily="var(--k-font-sans)"
        >
          {name} · test date {fmtDate(s.date, "long")}
        </text>
        <text
          x="72"
          y="128"
          fontSize="11"
          fill="rgb(var(--k-muted))"
          fontFamily="var(--k-font-sans)"
        >
          Total score
        </text>
        <text
          x="72"
          y="166"
          fontSize="40"
          fontWeight="600"
          fill="rgb(var(--k-text))"
          fontFamily="var(--k-font-sans)"
        >
          {s.rw + s.math}
        </text>
        <text
          x="212"
          y="128"
          fontSize="11"
          fill="rgb(var(--k-muted))"
          fontFamily="var(--k-font-sans)"
        >
          Reading and Writing
        </text>
        <text
          x="212"
          y="154"
          fontSize="22"
          fontWeight="600"
          fill="rgb(var(--k-text))"
          fontFamily="var(--k-font-sans)"
        >
          {s.rw}
        </text>
        <text
          x="212"
          y="196"
          fontSize="11"
          fill="rgb(var(--k-muted))"
          fontFamily="var(--k-font-sans)"
        >
          Math
        </text>
        <text
          x="212"
          y="222"
          fontSize="22"
          fontWeight="600"
          fill="rgb(var(--k-text))"
          fontFamily="var(--k-font-sans)"
        >
          {s.math}
        </text>
        <rect x="72" y="200" width="110" height="6" rx="3" fill="rgb(var(--k-text) / 0.12)" />
        <rect x="72" y="214" width="84" height="6" rx="3" fill="rgb(var(--k-text) / 0.12)" />
        <rect x="72" y="228" width="96" height="6" rx="3" fill="rgb(var(--k-text) / 0.12)" />
      </g>
    </svg>
  );
}

export function ReportImage({ r, name }: { r: ReportUpload; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full overflow-hidden rounded-card border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label="Open the photo larger"
      >
        <DrawnReport r={r} name={name} />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${name}'s ${r.shows.type} report`}
        width={560}
      >
        <DrawnReport r={r} name={name} className="rounded-card" />
        <p className="mt-3 text-dense text-muted">
          Private. Only you and the admin can see this photo.
        </p>
      </Sheet>
    </>
  );
}
