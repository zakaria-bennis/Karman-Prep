// ============================================================
// Which addresses count as a chat picture.
//
// A picture in chat is a file the sender uploaded through
// /api/chat/upload, kept in the private chat-media bucket and
// reached by a signed address. Nothing else is accepted: an
// address on some other site could show the moderation check one
// picture and the class another, since whoever runs that site
// can change what it serves.
// ============================================================

/** How many pictures one message may carry. */
export const MAX_PICTURES = 4;

/** True for a signed address of a file in Karman's own chat-media bucket. */
export function isChatMediaUrl(
  url: string,
  storageBase: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): boolean {
  if (!storageBase) return false;
  try {
    const given = new URL(url);
    const ours = new URL(storageBase);
    return (
      given.protocol === "https:" &&
      given.origin === ours.origin &&
      given.pathname.startsWith("/storage/v1/object/sign/chat-media/")
    );
  } catch {
    return false;
  }
}
