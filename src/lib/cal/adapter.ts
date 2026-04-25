// ============================================================
// Cal.com Platform API adapter — THE ONLY FILE in the codebase
// allowed to call Cal.com directly.
//
// Every other module — API routes, webhook handlers, server
// components — must import its functions from here. If you find
// yourself fetching `https://api.cal.com/...` anywhere else,
// stop and add a new exported function to this file instead.
//
// Why: a single point of contact makes it trivial to swap Cal
// versions, add request retries, mock during tests, or migrate
// to the Platform OAuth Client model without touching callers.
//
// Auth: personal API key (CAL_API_KEY, format `cal_live_...`).
// Base URL: CAL_API_URL (defaults to https://api.cal.com/v2).
// API version pinned via the `cal-api-version` header.
// ============================================================

import type {
  CreateBookingParams,
  AvailableSlot,
  CalBookingResponse,
} from "./types";
import { CalAdapterError } from "./types";

/** Cal v2 stable API version. Bump deliberately when reading
 *  the Cal changelog and verifying response shapes. */
const CAL_API_VERSION = "2024-08-13";

interface AdapterEnv {
  apiKey: string;
  apiUrl: string;
}

function loadEnv(): AdapterEnv {
  const apiKey = process.env.CAL_API_KEY;
  const apiUrl = process.env.CAL_API_URL ?? "https://api.cal.com/v2";
  if (!apiKey) {
    throw new CalAdapterError("init", 0, null, "CAL_API_KEY is not set");
  }
  return { apiKey, apiUrl };
}

interface RequestOptions {
  operation: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

async function callCal<T>(opts: RequestOptions): Promise<T> {
  const { apiKey, apiUrl } = loadEnv();
  const { operation, method, path, query, body } = opts;

  const search = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const url = `${apiUrl}${path}${search}`;

  const startedAt = Date.now();
  const ts = new Date().toISOString();
  console.log(`[cal-adapter] ${ts} ${operation} → ${method} ${path}${search}`);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "cal-api-version": CAL_API_VERSION,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new CalAdapterError(operation, 0, null, `network error: ${(err as Error).message}`);
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  console.log(
    `[cal-adapter] ${operation} done in ${Date.now() - startedAt}ms (HTTP ${res.status})`
  );

  if (!res.ok) {
    throw new CalAdapterError(operation, res.status, parsed);
  }

  // Cal v2 wraps every successful response in { status: "success", data: ... }.
  // We unwrap so callers get the inner shape directly.
  if (parsed && typeof parsed === "object" && "data" in parsed) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}

// ─────────────────────────────────────────────────────────────
// Public surface — one exported function per booking operation.
// ─────────────────────────────────────────────────────────────

/**
 * List available slots for a tutor's event type within a window.
 * Used by the student dashboard to render bookable time options.
 *
 * Cal returns slots grouped by date. We flatten to a plain array
 * of { start, end } pairs for easier consumption in the UI.
 */
export async function getAvailability(args: {
  eventTypeId: number | string;
  dateFrom: string; // ISO date or datetime
  dateTo: string;   // ISO date or datetime
  timeZone?: string;
}): Promise<AvailableSlot[]> {
  // Verified against the live Cal v2 API on 2026-04-25:
  // GET /v2/slots/available with cal-api-version=2024-08-13 returns
  // { status, data: { slots: { "YYYY-MM-DD": [{ time: ISO }, ...] } } }
  // — only `time` per slot. End is implied by the event-type duration;
  // we surface end === time so callers that need an end have something
  // non-undefined to render. Display widgets only use `start`.
  interface CalSlotsResponse {
    slots?: Record<string, Array<{ time: string; start?: string; end?: string }>>;
  }

  const data = await callCal<CalSlotsResponse>({
    operation: "getAvailability",
    method: "GET",
    path: "/slots/available",
    query: {
      eventTypeId: args.eventTypeId,
      startTime: args.dateFrom,
      endTime: args.dateTo,
      timeZone: args.timeZone,
    },
  });

  const out: AvailableSlot[] = [];
  const buckets = data?.slots ?? {};
  for (const date of Object.keys(buckets)) {
    for (const slot of buckets[date] ?? []) {
      const start = slot.time ?? slot.start;
      if (!start) continue;
      out.push({ start, end: slot.end ?? start });
    }
  }
  return out;
}

/**
 * Create a booking on Cal.com. Cal then provisions the Zoom meeting
 * (when the event type's location is set to Zoom) and returns the
 * meeting URL in the response. The webhook BOOKING_CREATED will
 * also fire — we use the API response as the source of truth at
 * call time, then reconcile in the webhook handler.
 */
export async function createBooking(
  params: CreateBookingParams
): Promise<CalBookingResponse> {
  return callCal<CalBookingResponse>({
    operation: "createBooking",
    method: "POST",
    path: "/bookings",
    body: params,
  });
}

/**
 * Cancel a booking by its Cal-assigned UID. The webhook
 * BOOKING_CANCELLED will fire as a side effect.
 */
export async function cancelBooking(
  calBookingUid: string,
  reason?: string
): Promise<CalBookingResponse> {
  return callCal<CalBookingResponse>({
    operation: "cancelBooking",
    method: "POST",
    path: `/bookings/${encodeURIComponent(calBookingUid)}/cancel`,
    body: reason ? { cancellationReason: reason } : {},
  });
}

/**
 * Reschedule a booking to a new start time. Cal generates a NEW
 * Zoom meeting + URL for the new slot; the prior meeting is
 * cancelled. Webhook BOOKING_RESCHEDULED fires as a side effect.
 */
export async function rescheduleBooking(args: {
  calBookingUid: string;
  newStart: string; // ISO datetime
  reason?: string;
}): Promise<CalBookingResponse> {
  return callCal<CalBookingResponse>({
    operation: "rescheduleBooking",
    method: "POST",
    path: `/bookings/${encodeURIComponent(args.calBookingUid)}/reschedule`,
    body: {
      start: args.newStart,
      ...(args.reason ? { rescheduleReason: args.reason } : {}),
    },
  });
}
