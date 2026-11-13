// TEMPORARY (delete with auth-options.css once the founder picks): the sign-in layouts on offer. "now" is the
// page as it is live; a and b improve it; 1 to 5 start again.
export const AUTH_OPTIONS = ["now", "a", "b", "1", "2", "3", "4", "5"] as const;
export type AuthOption = (typeof AUTH_OPTIONS)[number];
