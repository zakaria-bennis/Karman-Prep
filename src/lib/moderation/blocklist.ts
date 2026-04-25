// ============================================================
// Moderation blocklist — Layer 1 of the chat moderation pipeline.
//
// This is the FAST + ZERO-COST first pass. Anything that matches
// a literal term or a regex here is rejected immediately, never
// reaches Claude, never reaches Slack. The blocklist is
// intentionally narrow — slurs, sexual content, self-harm
// signals, obvious PII (phone, email, common social-media
// handles). Subtle bullying and off-topic chatter is the job
// of Layer 2 (Claude AI) — don't try to keyword-match it here
// or you'll false-positive on normal student conversation.
//
// HOW TO ADD A TERM
//   · Edit BLOCKED_TERMS or BLOCKED_PATTERNS below.
//   · Use lowercase for terms (matched case-insensitively).
//   · Use regex literals for patterns.
//   · No restart required after deploy — this file is bundled.
//
// HOW TO REMOVE A TERM
//   · Edit the array. Same as above.
//
// Patterns vs terms: TERMS match whole-word with simple boundary
// detection; PATTERNS use raw regex. Use TERMS for slurs and
// known bad nouns/verbs; use PATTERNS for structured data like
// phone numbers and emails.
// ============================================================

/** Whole-word literal matches. Compared case-insensitively. */
export const BLOCKED_TERMS: readonly string[] = [
  // Sexual / explicit (starter set — extend as needed)
  "sex",
  "sexual",
  "porn",
  "nudes",
  "horny",

  // Self-harm signals (any mention auto-rejects to surface for human follow-up)
  "kms",
  "kys",
  "suicide",
  "kill myself",
  "kill yourself",
  "self harm",
  "self-harm",
  "cut myself",

  // Slurs — intentionally not enumerated in source. Add per your
  // legal / community-guidelines team. The blocklist would be
  // populated from a separate non-public list in production.
];

/** Raw regex patterns. Tested with .test(message). */
export const BLOCKED_PATTERNS: readonly RegExp[] = [
  // US phone numbers — (xxx) xxx-xxxx, xxx-xxx-xxxx, +1 xxx xxx xxxx, 10-digit run.
  /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/,

  // Email addresses
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,

  // Common social-media handle patterns and DMs-elsewhere bait.
  // Discord-style #1234 tag
  /\b[A-Za-z0-9_.]{2,32}#\d{4}\b/,
  // Telegram, WhatsApp, Snapchat, Instagram, TikTok handle invites
  /\b(?:t\.me|wa\.me|snapchat\.com|instagram\.com|tiktok\.com|ig:|snap:|sc:)\/?[\w.-]+/i,
  // "my snap is xyz" / "my insta is xyz" — bait for off-platform
  /\b(?:my|add me on)\s+(?:snap|insta|ig|tiktok|telegram|whatsapp|discord|kik|wickr)\b/i,
];

export interface KeywordHit {
  /** Which term or pattern matched. For terms: the matched word.
   *  For patterns: a label like "phone-number" or "social-handle". */
  matched: string;
  /** Where in the message it matched (start index, char). */
  index: number;
  /** Whether this came from the literal-term set or the regex set. */
  source: "term" | "pattern";
}

/** Returns the FIRST blocklist hit, or null if the message is clean.
 *  We stop at the first hit because a single match is enough to
 *  reject — we don't need to enumerate all violations. */
export function scanForBlocked(message: string): KeywordHit | null {
  const lower = message.toLowerCase();

  // Whole-word term scan: split on non-letter/digit/underscore so
  // "assist" doesn't match "ass" but "ass." does.
  for (const term of BLOCKED_TERMS) {
    const t = term.toLowerCase();
    if (lower.includes(t)) {
      // Validate word boundary so "scunthorpe" doesn't fire on a
      // single letter. Multi-word terms (e.g. "kill myself") are
      // checked as a substring directly since they include spaces.
      const isMultiWord = /\s/.test(t);
      if (isMultiWord) {
        return { matched: term, index: lower.indexOf(t), source: "term" };
      }
      const re = new RegExp(`(^|[^a-z0-9_])${escapeRegex(t)}([^a-z0-9_]|$)`, "i");
      const m = lower.match(re);
      if (m && m.index !== undefined) {
        return { matched: term, index: m.index + (m[1]?.length ?? 0), source: "term" };
      }
    }
  }

  // Pattern scan
  for (const pattern of BLOCKED_PATTERNS) {
    const m = message.match(pattern);
    if (m && m.index !== undefined) {
      return { matched: labelFor(pattern), index: m.index, source: "pattern" };
    }
  }

  return null;
}

function labelFor(pattern: RegExp): string {
  const src = pattern.source;
  if (src.includes("@") && src.includes("[A-Z0-9")) return "email";
  if (src.includes("\\d{3}") && src.includes("\\d{4}")) return "phone-number";
  if (src.includes("t\\.me") || src.includes("snap")) return "social-handle";
  if (src.includes("#\\d{4}")) return "discord-tag";
  if (src.includes("my|add me")) return "off-platform-invite";
  return "blocked-pattern";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
