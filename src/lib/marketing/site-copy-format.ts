// How site-copy.ts lists are read: split out of site-copy.ts to keep it under the 700-line limit.

/** "a | b | c" -> ["a", "b", "c"] */
export function list(s: string | undefined): string[] {
  return (s ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** "a = b | c = d" -> [["a", "b"], ["c", "d"]] */
export function pairs(s: string | undefined): [string, string][] {
  return list(s).map((x) => {
    const [a, ...b] = x.split(" = ");
    return [a.trim(), b.join(" = ").trim()];
  });
}
