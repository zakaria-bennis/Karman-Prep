import type { NextRequest } from "next/server";

/**
 * The address the visitor is really on, for building a redirect. Behind a proxy or a tunnel, Next's own
 * `nextUrl.origin` is the machine it runs on (seen 2026-11-14: a visitor on the test tunnel was sent to
 * https://localhost after paying). The host comes from the visitor's own request, so the redirect can
 * only ever lead back to the site they asked for.
 */
export function visitorOrigin(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return req.nextUrl.origin;
  const forwarded = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const proto =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
