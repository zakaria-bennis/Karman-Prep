"use client";

// ============================================================
// PdfSourceViewer — embeds the source PDF for a question's
// source_pdf + source_page via the browser's built-in PDF
// viewer (Chrome/Edge/Firefox/Safari all ship one). Uses
// /api/admin/source-pdf?file=<filename> to fetch the bytes,
// admin-gated.
//
// WHY <iframe> + #page=N AND NOT pdfjs-dist:
//   pdfjs-dist is a ~3 MB JS lib that needs a web-worker setup.
//   The OpenNext + Cloudflare Worker bundler has historically
//   been fragile with pdfjs's worker loading pattern. For an
//   admin tool used by 1-2 people, the built-in browser viewer
//   handles render + zoom + pan + page nav for free, with zero
//   bundle weight. Caveat: Chrome / Edge / Firefox honour the
//   `#page=N` URL fragment to jump to a specific page; Safari
//   ignores it (Preview-based viewer). Admins almost always
//   use Chrome, so this is acceptable.
//
// Layout: 100% width, ~600 px tall. The PDF panel itself
// scrolls so the iframe doesn't need its own scrollbars beyond
// what the browser viewer provides.
// ============================================================

import { useState } from "react";
import { ExternalLink, FileText, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  sourcePdf: string;
  sourcePage: number | null;
}

export function PdfSourceViewer({ sourcePdf, sourcePage }: Props) {
  // The admin can step pages around the question's source_page
  // to see context. Starts at source_page (or 1 if unknown).
  const initialPage = sourcePage ?? 1;
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = `/api/admin/source-pdf?file=${encodeURIComponent(sourcePdf)}`;
  // The `#page=N&toolbar=1` fragment is honored by Chrome/Edge/Firefox
  // built-in PDF viewers (PDFium / Mozilla pdf.js). Safari ignores it.
  const iframeSrc = `${pdfUrl}#page=${page}&toolbar=1&zoom=page-width`;

  return (
    <div className="flex flex-col">
      {/* ── Controls bar ───────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 text-taupe">
          <FileText className="h-3 w-3" />
          <span className="font-mono text-ivory">{sourcePdf}</span>
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-bronze bg-surface-raised p-1 hover:bg-surface-raised disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3 w-3 text-ivory" />
          </button>
          <span className="min-w-[3rem] text-center font-mono text-[11px] text-ivory">p{page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-bronze bg-surface-raised p-1 hover:bg-surface-raised"
            aria-label="Next page"
          >
            <ChevronRight className="h-3 w-3 text-ivory" />
          </button>
          {page !== initialPage && (
            <button
              onClick={() => setPage(initialPage)}
              className="ml-1 text-[10px] text-taupe hover:text-ivory"
              title={`Jump back to the question's page (${initialPage})`}
            >
              reset
            </button>
          )}
        </span>
        <a
          href={iframeSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded border border-bronze bg-surface-raised px-2 py-1 text-[10px] text-ivory hover:bg-surface-raised"
          title="Open in new tab"
        >
          <ExternalLink className="h-2.5 w-2.5" /> open
        </a>
      </div>

      {/* ── PDF viewer iframe ──────────────────────────────── */}
      <div
        className={cn(
          "relative h-[600px] w-full overflow-hidden rounded-lg border border-bronze bg-night"
        )}
      >
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-taupe">
            <Loader2 className="h-3 w-3 animate-spin" /> loading PDF…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center text-xs text-error-bright">
            <div className="font-semibold">Failed to load PDF</div>
            <div className="text-[11px] text-error-bright/70">{error}</div>
            <div className="mt-1 text-[10px] italic text-taupe">
              The PDF may have been imported via the older CSV path, which doesn&rsquo;t store
              source PDFs in R2.
            </div>
          </div>
        )}
        {/* Key on `pdfUrl` (the file part) so changing question doesn't
            keep showing the previous PDF. The page is controlled via
            the URL fragment which doesn't require a full reload but
            re-mounting via the `page` key catches Safari which ignores
            fragments. */}
        <iframe
          key={`${pdfUrl}-p${page}`}
          src={iframeSrc}
          className="h-full w-full"
          title={`Source PDF ${sourcePdf} page ${page}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError("Browser couldn't render the PDF.");
          }}
        />
      </div>
      <div className="mt-1 text-[10px] italic text-taupe">
        Built-in browser viewer · #page jumping works on Chrome / Edge / Firefox; Safari ignores
        fragments.
      </div>
    </div>
  );
}
