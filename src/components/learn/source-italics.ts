// Exact reviewed-source tokens only. General HTML and malformed markers stay text.
export interface SourceItalicRun {
  text: string;
  italic: boolean;
}

export function parseSourceItalics(text: string): SourceItalicRun[] {
  const plain = [{ text, italic: false }];
  const markers = [...text.matchAll(/\[\[\/?i\]\]|<\/?i>/g)];
  if (!markers.length) return plain;
  const runs: SourceItalicRun[] = [];
  let cursor = 0;
  let opening: string | null = null;
  for (const marker of markers) {
    const index = marker.index!;
    const token = marker[0];
    const starts = token === "[[i]]" || token === "<i>";
    if (starts) {
      if (opening !== null) return plain;
    } else if (opening !== (token === "[[/i]]" ? "[[i]]" : "<i>") || index === cursor) {
      return plain;
    }
    if (index > cursor) runs.push({ text: text.slice(cursor, index), italic: opening !== null });
    opening = starts ? token : null;
    cursor = index + token.length;
  }
  if (opening !== null) return plain;
  if (cursor < text.length) runs.push({ text: text.slice(cursor), italic: false });
  return runs;
}
