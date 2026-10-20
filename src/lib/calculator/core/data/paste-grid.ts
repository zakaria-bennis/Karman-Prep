// Tabular paste (RT-8, TABLES-49, -50): pasted text that is a numeric grid becomes a table. The
// delimiter is the first of tab, comma, semicolon and pipe that splits every line into the same
// number of fields; quoted CSV fields work and lose their thousands separators; empty lines are
// dropped; a first line with a non-numeric field is a header and is dropped; every other field is
// empty or a plain decimal; at least 2 rows and 2 columns; at most 6 columns are kept. Pure
// TypeScript: no DOM.

export const MAX_PASTED_COLUMNS = 6;
const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;
const DELIMITERS = ["\t", ",", ";", "|"] as const;

/** One line split on `delimiter`, honouring double-quoted fields; null when quotes don't close. */
function splitLine(
  line: string,
  delimiter: string
): { fields: string[]; quoted: boolean[] } | null {
  const fields: string[] = [],
    quoted: boolean[] = [];
  let i = 0;
  for (;;) {
    if (line[i] === '"') {
      let value = "";
      i++;
      for (;;) {
        if (i >= line.length) return null;
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        value += line[i++];
      }
      fields.push(value);
      quoted.push(true);
      if (i < line.length && line[i] !== delimiter) return null;
    } else {
      const end = line.indexOf(delimiter, i);
      fields.push(line.slice(i, end < 0 ? line.length : end));
      quoted.push(false);
      i = end < 0 ? line.length : end;
    }
    if (i >= line.length) return { fields, quoted };
    i++; // past the delimiter
  }
}

/** The grid's columns (cells as entered, "" for empty), or null when `text` is not a grid. */
export function parsePastedGrid(text: string): string[][] | null {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");
  if (lines.length < 2) return null;
  for (const delimiter of DELIMITERS) {
    if (!lines.some((l) => l.includes(delimiter))) continue;
    const rows = lines.map((l) => splitLine(l, delimiter));
    if (rows.some((r) => r === null)) continue;
    const width = rows[0]!.fields.length;
    if (width < 2 || rows.some((r) => r!.fields.length !== width)) continue;
    const cells = rows.map((r) =>
      r!.fields.map((f, j) => {
        const v = f.trim();
        return r!.quoted[j] ? v.replace(/,(?=\d{3}(\D|$))/g, "") : v;
      })
    );
    const numeric = (v: string) => v === "" || NUMBER.test(v);
    const body = cells[0].every(numeric) ? cells : cells.slice(1);
    if (body.length < 2 || !body.every((row) => row.every(numeric))) return null;
    const columns = Math.min(width, MAX_PASTED_COLUMNS);
    return Array.from({ length: columns }, (_, j) => body.map((row) => row[j]));
  }
  return null;
}

/** TABLES-49: the header letters of a pasted table's columns, before the subscript. */
export const PASTED_HEADER_LETTERS = ["x", "y", "z", "u", "v", "w"] as const;
