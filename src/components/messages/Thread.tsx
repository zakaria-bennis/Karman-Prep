/*
 * One family's conversation with the Karman Prep team, oldest first. `mine` says whose side
 * the viewer is on: the parent's in the portal, the team's in admin.
 */
import { KIND_LABEL, type FamilyMessage } from "@/lib/parent/messages-model";
import "./messages.css";

export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
}

export function Thread({
  messages,
  mine,
  teamName = "Karman Prep",
  familyName = "You",
}: {
  messages: FamilyMessage[];
  mine: "parent" | "staff";
  teamName?: string;
  familyName?: string;
}) {
  return (
    <ol className="kp-thread" aria-label="Conversation">
      {messages.map((m) => (
        <li key={m.id} className="kp-bubble" data-mine={m.from === mine ? "" : undefined}>
          <header>
            <b>
              {m.from === "staff"
                ? `${m.authorName ? `${m.authorName}, ` : ""}${teamName}`
                : familyName}
            </b>
            <time dateTime={m.createdAt}>{when(m.createdAt)}</time>
            {m.kind !== "message" && (
              <span className="kp-tag">
                {KIND_LABEL[m.kind]}
                {m.sessionStartsAt ? `: ${when(m.sessionStartsAt)}` : ""}
              </span>
            )}
            {m.from === "parent" && m.status === "handled" && mine === "staff" && (
              <span className="kp-tag">Handled</span>
            )}
          </header>
          {m.body}
        </li>
      ))}
    </ol>
  );
}
