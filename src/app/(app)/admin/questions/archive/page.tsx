// ============================================================
// /admin/questions/archive — bookmarkable entry point to the
// archived-content view.
//
// This is a thin redirect that lands on the preview page with
// archived_only=true. We keep the page as its own route so admins
// can bookmark /admin/questions/archive and have it survive
// future param-name refactors (just update the redirect target).
//
// Carry-over of source_pdf is intentional — going Archive →
// "filter by file" → toggle between archive/active should keep
// the file filter intact.
// ============================================================

import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminQuestionsArchivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sourcePdf = typeof params.source_pdf === "string" ? params.source_pdf : null;

  const dest = sourcePdf
    ? `/admin/questions/preview?archived_only=true&source_pdf=${encodeURIComponent(sourcePdf)}`
    : "/admin/questions/preview?archived_only=true";
  redirect(dest);
}
