// What the Page Studio passes between the server and the browser.
import type { NoteCategory, NoteKind, NoteStatus } from "./schemas";

export interface StudioMessage {
  id: string;
  author: "founder" | "claude";
  body: string;
  createdAt: string;
}

export interface StudioNote {
  id: string;
  createdAt: string;
  pageKey: string;
  pagePath: string;
  persona: string;
  viewport: string;
  kind: NoteKind;
  category: NoteCategory;
  selector: string;
  elementLabel: string;
  elementText: string;
  oldText: string | null;
  newText: string | null;
  body: string;
  status: NoteStatus;
  prUrl: string | null;
  sentAt: string | null;
  messages: StudioMessage[];
}

export type PageMark = "good" | "needs_work";

/** An account the studio can view the site as. */
export interface StudioAccount {
  userId: string;
  role: "student" | "parent" | "tutor" | "affiliate_tutor";
  name: string;
  /** Plan, for students. */
  detail: string;
  /** A sample or test account (shown first). */
  sample: boolean;
}

export interface ViewingAs {
  role: string;
  userId: string | null;
  name: string | null;
}
