import { NextResponse, type NextRequest } from "next/server";
import { isLocalRequest } from "../../figure-review/review-data";
import { QUESTION_ID, isQaRenderEnabled, loadQaQuestion } from "../qa-data";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

/** Dev only, from this machine: the student payload of one live row of the QA export, so the
 *  audit can swap questions in the open page without reloading it. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!isQaRenderEnabled() || !isLocalRequest(request.headers) || !QUESTION_ID.test(id))
    return new NextResponse("Not found", { status: 404, headers: NO_STORE });
  const question = await loadQaQuestion(id);
  if (!question) return new NextResponse("Not found", { status: 404, headers: NO_STORE });
  return NextResponse.json(question, { headers: NO_STORE });
}
