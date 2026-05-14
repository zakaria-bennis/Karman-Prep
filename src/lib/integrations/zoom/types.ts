// ============================================================
// Zoom webhook payload types — minimal, only the fields we read.
// Zoom returns much more; we don't model what we don't consume.
// ============================================================

export interface ZoomParticipant {
  user_id?: string;
  user_name?: string;
  id?: string;
  email?: string;
  join_time?: string; // ISO
  leave_time?: string; // ISO
  leave_reason?: string;
}

export interface ZoomMeetingObject {
  id: string | number;
  uuid?: string;
  host_id?: string;
  topic?: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  end_time?: string;
  participant?: ZoomParticipant;
}

export interface ZoomWebhookEnvelope {
  event: string;
  event_ts?: number;
  payload: {
    account_id?: string;
    plainToken?: string; // for endpoint.url_validation
    object?: ZoomMeetingObject;
  };
}
