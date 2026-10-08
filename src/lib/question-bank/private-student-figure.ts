import "server-only";
import { canonicalJson, sha256Hex } from "../../../scripts/pdf-pipeline/reviewed-input-hash";
import { PrivateStudentViewError, readPrivateStudentView } from "./private-student-view";
import {
  PRIVATE_Q283_QUESTION_ID,
  PRIVATE_Q283_SOURCE_URL,
  PRIVATE_Q283_SVG,
  PRIVATE_Q283_SVG_SHA256,
} from "./private-q283-svg";

type Preview = Awaited<ReturnType<typeof readPrivateStudentView>>;
const unavailable = () => new PrivateStudentViewError("unavailable");
function studentPayloadHash(question: Preview["question"]) {
  return sha256Hex(canonicalJson(JSON.parse(JSON.stringify(question))));
}

/** Map transport only AFTER the stored, complete catalog seal has been checked. */
export function withPrivateStudentFigure(preview: Preview) {
  if (preview.question.image_url !== PRIVATE_Q283_SOURCE_URL)
    return { ...preview, transport: null };
  if (preview.question.id !== PRIVATE_Q283_QUESTION_ID) throw unavailable();
  const imageUrl = `/admin/questions/student-view/${PRIVATE_Q283_QUESTION_ID}/figure/${PRIVATE_Q283_SVG_SHA256}?payload_sha256=${preview.payloadSha256}`;
  const question = { ...preview.question, image_url: imageUrl };
  return {
    question,
    payloadSha256: preview.payloadSha256,
    transport: {
      assetSha256: PRIVATE_Q283_SVG_SHA256,
      storedPayloadSha256: preview.payloadSha256,
      sourceStudentPayloadSha256: studentPayloadHash(preview.question),
      runtimeStudentPayloadSha256: studentPayloadHash(question),
      sourceImageUrl: PRIVATE_Q283_SOURCE_URL,
      transportImageUrl: imageUrl,
    },
  };
}

/** Every image request rechecks real auth, held status and the full stored seal. */
export async function readPrivateStudentFigure(request: {
  questionId: string;
  payloadSha256: unknown;
  assetSha256: string;
}) {
  const preview = await readPrivateStudentView({
    questionId: request.questionId,
    payloadSha256: request.payloadSha256,
  });
  if (
    request.questionId !== PRIVATE_Q283_QUESTION_ID ||
    request.assetSha256 !== PRIVATE_Q283_SVG_SHA256 ||
    preview.question.image_url !== PRIVATE_Q283_SOURCE_URL ||
    sha256Hex(PRIVATE_Q283_SVG) !== PRIVATE_Q283_SVG_SHA256
  ) {
    throw unavailable();
  }
  return { svg: PRIVATE_Q283_SVG, sha256: PRIVATE_Q283_SVG_SHA256 };
}
