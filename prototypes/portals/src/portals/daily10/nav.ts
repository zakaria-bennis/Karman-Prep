/**
 * Where the end screen's links go: the student portal, with the gallery's
 * switches (device, mode, theme, plan) carried along so the next screen
 * opens in the same world. Extra keys (a preselected skill) ride on the query.
 */
export function toStudent(screen: string, extra: Record<string, string> = {}) {
  const [, q = ""] = location.hash.split("?");
  const query = new URLSearchParams(q);
  query.set("portal", "student");
  query.set("screen", screen);
  for (const [k, v] of Object.entries(extra)) query.set(k, v);
  return `#/screen/student/${screen}?${query.toString()}`;
}
