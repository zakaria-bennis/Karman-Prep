// Reviewed import tools and the retained legacy CSV adapter.

import type { Metadata } from "next";
import Link from "next/link";
import { WbPage } from "@/components/admin/workbench";
import BankImportClient from "./BankImportClient";
import PdfPipelineUploadClient from "./PdfPipelineUploadClient";

export const metadata: Metadata = { title: "Admin — Question import | Karman" };

export default function QuestionImportPage() {
  return (
    <WbPage
      title="Question import"
      summary={
        <>
          Import reviewed questions with the offline JSON workflow. The CSV adapter stays below;
          imported rows still need triage on{" "}
          <Link href="/admin/questions/review">the review page</Link>.
        </>
      }
      actions={
        <Link className="wb-btn" href="/admin/curriculum">
          Back to admin
        </Link>
      }
    >
      <PdfPipelineUploadClient />
      <BankImportClient />
    </WbPage>
  );
}
