// False while the server's page is being taken over in the browser, true from the next moment on.
//
// Days and times are the student's own: "Yesterday", a chat's "4:00 PM", the calendar's today. The
// server cannot know them (the live site's server keeps UTC), so a page that shows them is drawn
// once the browser has it, never from the server's clock: otherwise every evening session moved to
// the next day and React threw the page away to draw it again (found 2026-11-22 with the browser in
// another time zone).
import { useSyncExternalStore } from "react";

const nothing = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    nothing,
    () => true,
    () => false
  );
}
