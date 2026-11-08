import Link from "next/link";

export default function PdfPipelineUploadClient() {
  return (
    <section className="wb-section" aria-labelledby="reviewed-import-title">
      <h2 id="reviewed-import-title">Reviewed question imports</h2>
      <p className="wb-note">
        Automatic paid PDF processing has been retired. Released-exam questions now pass source,
        answer, figure, category and duplicate review before import. Existing job history is
        preserved.
      </p>
      <div className="wb-toolbar" style={{ marginTop: 12 }}>
        <Link className="wb-btn" href="/admin/bank">
          View question bank
        </Link>
        <Link className="wb-btn" href="/admin/jobs">
          Job history
        </Link>
      </div>
    </section>
  );
}
