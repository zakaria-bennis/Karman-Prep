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
  // ─── Profanity / harassment intensifiers ──────────────────
  // Aggressive list — Karman's audience is 14-18 and parent-
  // visible. Better to over-block + let students rephrase
  // than under-block and have a parent see a slur in chat.
  "fuck",
  "fucker",
  "fuckers",
  "fucking",
  "fucked",
  "fuckin",
  "motherfucker",
  "motherfuckers",
  "motherfucking",
  "mf",
  "mfer",
  "stfu",
  "wtf",
  "bitch",
  "bitches",
  "bitching",
  "biatch",
  "asshole",
  "assholes",
  "ass-hole",
  "dickhead",
  "dickheads",
  "douche",
  "douchebag",
  "shit",
  "shits",
  "shitty",
  "shitting",
  "bullshit",
  "piss",
  "pissed",
  "pissing",
  "twat",
  "wanker",
  "prick",

  // ─── Slurs (always rejected) ──────────────────────────────
  "cunt",
  "whore",
  "whores",
  "slut",
  "sluts",
  "skank",
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "faggot",
  "faggots",
  "fag",
  "fags",
  "homo",
  "dyke",
  "tranny",
  "trannies",
  "retard",
  "retards",
  "retarded",
  "tard",
  "spaz",
  "chink",
  "gook",
  "kike",
  "wetback",
  "spic",
  "raghead",
  "towelhead",

  // ─── Sexual / explicit ────────────────────────────────────
  "sex",
  "sexual",
  "porn",
  "porno",
  "nudes",
  "horny",
  "boobs",
  "tits",
  "titties",
  "pussy",
  "pussies",
  "dick",
  "dicks",
  "penis",
  "penises",
  "vagina",
  "vaginas",
  "blowjob",
  "blowjobs",
  "handjob",
  "handjobs",
  "anal",
  "cumshot",

  // ─── Self-harm signals (any mention auto-rejects to surface for human follow-up) ──
  "kms",
  "kys",
  "suicide",
  "kill myself",
  "kill yourself",
  "self harm",
  "self-harm",
  "cut myself",
  "end it all",
  "want to die",

  // ─── Off-platform shorthand ──────────────────────────────
  // "hmu" = "hit me up" — almost always an off-platform invite
  // in chat. Standalone, no further context needed.
  "hmu",
];

/** Raw regex patterns. Tested with .test(message). */
export const BLOCKED_PATTERNS: readonly RegExp[] = [
  // ─── PII: phone, email ──────────────────────────────────
  // US phone numbers — (xxx) xxx-xxxx, xxx-xxx-xxxx, +1 xxx xxx xxxx, 10-digit run.
  /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/,
  // Email addresses (must come BEFORE the bare-@ handle pattern below
  // so emails get the more specific "email" label).
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,

  // ─── PII: street addresses ──────────────────────────────
  // Number + 1-3 intermediate words + street-type word. Matches
  // "123 Main St", "456 Oak Ridge Avenue", "789 5th Ave". Requires
  // at least one intermediate word so "1 st" (a fragment) doesn't
  // hit, and the street-type list is exhaustive enough to keep the
  // false-positive rate low for normal SAT prep chat.
  /\b\d{1,5}\s+(?:[A-Za-z0-9'.]+\s+){1,3}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|way|circle|cir|terrace|ter|highway|hwy|parkway|pkwy)\.?\b/i,

  // ─── Social-media handles + URLs ────────────────────────
  // Discord-style legacy #1234 tag
  /\b[A-Za-z0-9_.]{2,32}#\d{4}\b/,
  // Direct URL/domain to a social platform (catches links AND bare
  // mentions like "snapchat.com/add/foo"). Covers the common ones a
  // student might paste; we don't try to enumerate every fringe app.
  /\b(?:t\.me|wa\.me|snapchat\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.com|fb\.me|reddit\.com|threads\.net|bsky\.app|bluesky\.app|youtube\.com|youtu\.be|discord\.gg|discordapp\.com|linkedin\.com|messenger\.com|kik\.me|line\.me)\/?[\w.-]*/i,
  // Inline platform-prefix like "ig:bob_smith" or "snap: jane123"
  /\b(?:ig|insta|snap|sc|tt|tiktok|telegram|tg|wa|whatsapp|kik|wickr|signal|line|viber|threads|bsky|bluesky|twitter|reddit|fb|facebook|messenger)\s*[:=]\s*[\w.-]+/i,
  // Bare @handle (3-30 alnum/_/.) NOT preceded by alphanum/email-y
  // chars, so emails (caught above) don't double-match. Catches
  // "@bob_123", "DM @jane", "follow @user_name". Single @ in code
  // contexts (e.g. "@override") would also match — we live with
  // that since chat isn't a code-review surface.
  /(?:^|[^A-Za-z0-9._%+-])@[A-Za-z0-9_.]{3,30}\b/,

  // ─── Off-platform invitations: "X me" verbs ─────────────
  // Direct invitations to switch surface: "text me", "dm me",
  // "pm me", "message me later". Each of these almost always
  // means "leave Karman" in a student-chat context.
  /\b(?:text|txt|dm|pm)\s+me\b/i,
  /\bmessage\s+me\s+(?:on|at|later|after|when)\b/i,

  // ─── Off-platform invitations: "<verb> me on <platform>" ──
  // "find me on Snapchat", "follow me on Insta", "add me on TikTok",
  // "catch me on Discord", "hit me up on Discord", "shoot me a DM
  // on insta". Allow up to 2 intermediate words between "me" and
  // "on/at/via" so "hit me up" / "shoot me a line" still match.
  // Anchored to a known-platform whitelist so benign phrases
  // ("follow me on this journey") don't fire.
  /\b(?:find|follow|add|catch|hit|meet|message|reach|shoot|ping|dm|drop)\s+me(?:\s+\w+){0,2}\s+(?:on|at|via|through|over)\s+(?:insta(?:gram)?|ig|snap(?:chat)?|sc|tiktok|tt|discord|disc|telegram|tg|whatsapp|wa|kik|wickr|signal|line|viber|threads|bluesky|bsky|twitter|x|reddit|fb|facebook|youtube|yt|messenger|sms|email|text|texting|phone|call)\b/i,
  // "let's switch / move / continue / chat to/on <platform>"
  /\b(?:let'?s|i'?ll|we should|we can|wanna|let us)\s+(?:move|switch|chat|talk|continue|message|text|hop|jump|head|take this)\s+(?:to|on|via|over|over to|onto)\s+(?:insta(?:gram)?|ig|snap(?:chat)?|sc|tiktok|tt|discord|telegram|whatsapp|kik|signal|line|viber|threads|twitter|x|messenger|sms|text|texting|email|phone)\b/i,

  // ─── "what's your <platform/PII>" / "do you have <platform>" ─
  // Asking for off-platform contact info or a phone/address.
  /\b(?:can\s+i\s+get|what'?s|whats|do\s+you\s+have|got\s+a|got\s+an)\s+(?:your|ur|a)?\s*(?:insta(?:gram)?|ig|snap(?:chat)?|sc|tiktok|tt|discord|telegram|whatsapp|kik|signal|line|viber|threads|bluesky|bsky|twitter|x|reddit|fb|facebook|youtube|yt|number|phone|cell|email|address|handle|tag|user(?:name)?)\b/i,

  // ─── "my <platform/PII> is …" — explicit handoff ─────────
  // Broader than the original. Matches "my insta is bob",
  // "his snap is jane123", "their phone is 555…", etc.
  /\b(?:my|your|his|her|their|our)\s+(?:insta(?:gram)?|ig|snap(?:chat)?|sc|tiktok|tt|discord|telegram|whatsapp|kik|wickr|signal|line|viber|threads|bluesky|bsky|twitter|x|reddit|fb|facebook|youtube|yt|messenger|number|phone|cell|address|handle|tag|user(?:name)?)\s+(?:is|@|=|:|\/|-)\s*[\w.-]+/i,
  // Same family but without the "is X" tail — "add me on snap" /
  // "follow me on insta" without an explicit handle.
  /\b(?:add|follow|hit)\s+me\s+on\s+(?:snap|insta|ig|tiktok|telegram|whatsapp|discord|kik|wickr|threads|twitter|x|messenger|fb|facebook)\b/i,
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
  // Most specific first.
  if (src.includes("[A-Z0-9._%+-]+@")) return "email";
  if (src.includes("\\(\\\\d{3}\\\\)") || (src.includes("\\d{3}") && src.includes("\\d{4}"))) {
    return "phone-number";
  }
  if (src.includes("street|st|avenue|ave|road|rd")) return "street-address";
  if (src.includes("#\\d{4}")) return "discord-tag";
  if (src.includes("twitter\\.com|x\\.com") || src.includes("snapchat\\.com|instagram\\.com")) {
    return "social-url";
  }
  if (src.includes("text|txt|dm|pm") && src.includes("\\s+me\\b")) return "off-platform-invite";
  if (src.includes("find|follow|add|catch|hit|meet")) return "off-platform-handle";
  if (src.includes("let'?s|i'?ll|we should")) return "off-platform-switch";
  if (src.includes("can\\s+i\\s+get|what'?s")) return "off-platform-ask";
  if (src.includes("my|your|his|her|their|our")) return "off-platform-share";
  if (src.includes("@[A-Za-z0-9_.]{3,30}")) return "social-handle";
  if (src.includes("ig|insta|snap") && src.includes("[:=]")) return "social-handle";
  if (src.includes("add|follow|hit") && src.includes("me\\s+on")) return "off-platform-invite";
  return "blocked-pattern";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
