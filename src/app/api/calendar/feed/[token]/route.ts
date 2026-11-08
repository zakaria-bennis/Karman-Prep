// ============================================================
// GET /api/calendar/feed/<token>.ics
//
// Subscribed calendar feed for Apple Calendar, Google Calendar and
// Outlook. Calendar apps fetch it without signing in, so the secret
// token in the path is the only credential: unknown or malformed
// tokens get the same plain 404, and responses are never cached by
// shared caches.
// ============================================================

import { buildFeedForToken } from "@/lib/calendar-feed/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && /^https?:\/\//.test(configured)) return configured;
  return new URL(request.url).origin;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  const feed = await buildFeedForToken(token.replace(/\.ics$/i, ""), siteUrl(request)).catch(
    (error: unknown) => {
      console.error("[calendar-feed] build failed:", error);
      return undefined;
    }
  );
  if (feed === undefined) {
    return new Response("Calendar is temporarily unavailable.", {
      status: 503,
      headers: { "Retry-After": "300", "Cache-Control": "no-store" },
    });
  }
  if (feed === null) {
    return new Response("Not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  return new Response(feed, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="karman.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
