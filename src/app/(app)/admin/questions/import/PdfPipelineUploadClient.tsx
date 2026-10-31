import Link from "next/link";

export default function PdfPipelineUploadClient() {
  return (
    <section
      className="rounded-xl border border-bronze bg-surface p-5"
      aria-labelledby="reviewed-import-title"
    >
      <h2 id="reviewed-import-title" className="text-lg font-semibold text-ivory">
        Reviewed question imports
      </h2>
      <p className="mt-2 text-sm text-taupe">
        Automatic paid PDF processing has been retired. Released-exam questions now pass source,
        answer, figure, category and duplicate review before import. Existing job history is
        preserved.
      </p>
      <Link
        href="/admin/questions"
        className="mt-3 inline-flex rounded-lg border border-bronze px-3 py-2 text-sm text-ivory hover:bg-surface-raised"
      >
        View question bank
      </Link>
    </section>
  );
}
