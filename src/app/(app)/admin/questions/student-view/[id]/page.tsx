import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PrivateStudentQuestionView from "@/components/admin/PrivateStudentQuestionView";
import { withPrivateStudentFigure } from "@/lib/question-bank/private-student-figure";
import {
  PrivateStudentViewError,
  readPrivateStudentView,
} from "@/lib/question-bank/private-student-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Private unanswered student view | Karman",
  robots: { index: false, follow: false },
};

export default async function PrivateStudentViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let preview;
  try {
    preview = withPrivateStudentFigure(
      await readPrivateStudentView({
        questionId: id,
        payloadSha256: query.payload_sha256,
      })
    );
  } catch (error) {
    if (!(error instanceof PrivateStudentViewError)) throw error;
    if (error.reason === "unauthorized") redirect("/auth/sign-in");
    notFound();
  }
  return (
    <div
      data-private-figure-sha256={preview.transport?.assetSha256}
      data-stored-payload-sha256={preview.payloadSha256}
      data-source-student-payload-sha256={preview.transport?.sourceStudentPayloadSha256}
      data-runtime-student-payload-sha256={preview.transport?.runtimeStudentPayloadSha256}
      data-source-image-url={preview.transport?.sourceImageUrl}
      data-private-transport-image-url={preview.transport?.transportImageUrl}
    >
      <PrivateStudentQuestionView
        question={preview.question}
        payloadSha256={preview.payloadSha256}
      />
    </div>
  );
}
