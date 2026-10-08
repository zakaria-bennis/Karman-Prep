import { readPrivateStudentFigure } from "@/lib/question-bank/private-student-figure";
import { PrivateStudentViewError } from "@/lib/question-bank/private-student-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; sandbox",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; sha256: string }> }
) {
  const { id, sha256 } = await context.params;
  const seal = new URL(request.url).search.match(/^\?payload_sha256=([a-f0-9]{64})$/)?.[1];
  try {
    const figure = await readPrivateStudentFigure({
      questionId: id,
      assetSha256: sha256,
      payloadSha256: seal,
    });
    return new Response(figure.svg, {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Length": String(new TextEncoder().encode(figure.svg).length),
        "X-Figure-Sha256": figure.sha256,
      },
    });
  } catch (error) {
    if (!(error instanceof PrivateStudentViewError)) throw error;
    return new Response("Private figure unavailable", {
      status: 404,
      headers: { ...privateHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
