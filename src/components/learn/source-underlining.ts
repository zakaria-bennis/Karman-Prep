// Explicit source formatting, never an HTML parser. Raw exam text stays separate.
export interface SourceTextRun {
  text: string;
  underlined: boolean;
}

export function parseSourceUnderlining(text: string): SourceTextRun[] {
  const plain = [{ text, underlined: false }];
  const markers = [...text.matchAll(/\[\[\/?u\]\]/g)];
  if (markers.length === 0) return plain;
  const runs: SourceTextRun[] = [];
  let cursor = 0;
  let underlined = false;
  for (const marker of markers) {
    const index = marker.index!;
    const opening = marker[0] === "[[u]]";
    if (opening === underlined || (!opening && index === cursor)) return plain;
    if (index > cursor) runs.push({ text: text.slice(cursor, index), underlined });
    underlined = opening;
    cursor = index + marker[0].length;
  }
  if (underlined) return plain;
  if (cursor < text.length) runs.push({ text: text.slice(cursor), underlined: false });
  return runs;
}
