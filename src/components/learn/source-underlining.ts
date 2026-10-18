// Recognize only exact, attribute-free source underline tokens, never general HTML.
export interface SourceTextRun {
  text: string;
  underlined: boolean;
}

export function parseSourceUnderlining(text: string): SourceTextRun[] {
  const plain = [{ text, underlined: false }];
  const markers = [...text.matchAll(/\[\[\/?u\]\]|<\/?u>/g)];
  if (markers.length === 0) return plain;
  const runs: SourceTextRun[] = [];
  let cursor = 0;
  let activeOpening: string | null = null;
  for (const marker of markers) {
    const index = marker.index!;
    const token = marker[0];
    const opening = token === "[[u]]" || token === "<u>";
    if (opening) {
      if (activeOpening !== null) return plain;
    } else {
      const matchingOpening = token === "[[/u]]" ? "[[u]]" : "<u>";
      if (activeOpening !== matchingOpening || index === cursor) return plain;
    }
    if (index > cursor)
      runs.push({ text: text.slice(cursor, index), underlined: activeOpening !== null });
    activeOpening = opening ? token : null;
    cursor = index + marker[0].length;
  }
  if (activeOpening !== null) return plain;
  if (cursor < text.length) runs.push({ text: text.slice(cursor), underlined: false });
  return runs;
}
