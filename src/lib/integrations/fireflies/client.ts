// ============================================================
// Fireflies API client — minimal GraphQL wrapper.
//
// We pull two things from Fireflies:
//   1. transcript() — the full session transcript by id, plus
//      attendees, duration, and the meeting URL we use to match
//      back to a booking.
//
// Auth: Bearer token from FIREFLIES_API_KEY env.
// Endpoint: https://api.fireflies.ai/graphql
// ============================================================

const FIREFLIES_GRAPHQL = "https://api.fireflies.ai/graphql";

export interface FirefliesSentence {
  speaker_name: string | null;
  text: string;
  start_time: number | null; // seconds from start
}

export interface FirefliesAttendee {
  displayName: string | null;
  email: string | null;
}

export interface FirefliesTranscript {
  id: string;
  title: string | null;
  /** Epoch milliseconds. */
  date: number | null;
  /** Minutes (Fireflies returns a Float). */
  duration: number | null;
  /** Original meeting URL (Zoom link). Used to match to a booking.
   *  Note: Fireflies' field name is `meeting_link`, not `meeting_url`. */
  meeting_link: string | null;
  meeting_attendees: FirefliesAttendee[];
  sentences: FirefliesSentence[];
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) throw new Error("FIREFLIES_API_KEY missing");

  const res = await fetch(FIREFLIES_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    throw new Error(`Fireflies HTTP ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(`Fireflies GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("Fireflies returned no data");
  return json.data;
}

const TRANSCRIPT_QUERY = /* GraphQL */ `
  query Transcript($id: String!) {
    transcript(id: $id) {
      id
      title
      date
      duration
      meeting_link
      meeting_attendees {
        displayName
        email
      }
      sentences {
        speaker_name
        text
        start_time
      }
    }
  }
`;

/** Fetch a full Fireflies transcript by its meeting/transcript id. */
export async function fetchFirefliesTranscript(id: string): Promise<FirefliesTranscript> {
  const data = await gql<{ transcript: FirefliesTranscript }>(TRANSCRIPT_QUERY, { id });
  if (!data.transcript) throw new Error(`Fireflies returned no transcript for id ${id}`);
  return data.transcript;
}

/** Render sentences as `Speaker: text` lines for GPT consumption. Handles
 *  null speaker (system messages) gracefully. */
export function renderTranscriptText(sentences: FirefliesSentence[]): string {
  return sentences
    .filter((s) => s.text?.trim())
    .map((s) => `${s.speaker_name || "Unknown"}: ${s.text}`)
    .join("\n");
}

/** Extract the Zoom meeting id from a Zoom join URL.
 *  Examples handled:
 *    https://us05web.zoom.us/j/12345678901?pwd=...   → "12345678901"
 *    https://zoom.us/wc/12345678901/join             → "12345678901"
 *  Returns null if the URL isn't a recognizable Zoom link. */
export function parseZoomMeetingId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/zoom\.us\/(?:j|wc)\/(\d{8,})/i);
  return m ? m[1] : null;
}
