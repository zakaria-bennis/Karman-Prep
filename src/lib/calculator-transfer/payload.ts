// Transfer payload contract (AR-16) and the status copy of c-transfer table 11.1.
// Eager leaf: no imports and no browser globals, so quiz routes can load it cheaply.

export interface TransferPayload {
  version: 1;
  questionKey: string; // attempt id + question id
  sourceId: string; // "stem:3", "table", "choice:B", …
  description: string; // plain text, as in table 8.1
  format: "rows" | "point" | "tableRow" | "evaluate" | "table"; // Phase 1 sends "rows" only
  dependencies: string[]; // stem definitions to insert first when unused (TR-37)
  rows?: string[];
  table?: { headers: (string | null)[]; columns: string[][] };
  pairs?: [string, string][];
  pointTableKey?: string;
}

export type TransferTrigger = "mouse" | "keyboard" | "touch";

export type TransferResult =
  | { status: "added" | "renamed" | "already-present"; message: string; focusRowId: string }
  | { status: "rejected"; message: string; focusRowId: null } // TR-73 core check; reported
  | { status: "unavailable" | "queue-full"; message: string; focusRowId: null }; // AR-55, AR-17; bridge only

export const MAX_QUEUED_TRANSFERS = 20; // AR-17

export const TRANSFER_MESSAGES = {
  added: (description: string): string => `Added to calculator: ${description}.`,
  // parts: "x₁ is t" per column, or "x₁" when the column has no header (TR-25)
  tableAdded: (parts: readonly string[], rows: number): string =>
    `Added table to calculator: ${[...parts, `${rows} ${rows === 1 ? "row" : "rows"}`].join(", ")}.`,
  pairAppended: (input: string, output: string, row: number): string =>
    `Added to table ${input}, ${output}, row ${row}.`,
  alreadyPresent: (row: number): string => `Already in the calculator, row ${row}.`,
  renamed: (newName: string, name: string): string =>
    `Added as ${newName} because ${name} is already defined.`,
  rejected: "This can't be added to the calculator.",
  unavailableRetry: "Calculator unavailable. Use Retry in the calculator panel.", // after a mount failure
  unavailableReload: "Calculator unavailable. Reload the page to use it.", // after a load failure (OI-28)
  tooManyWaiting: "Too many transfers are waiting. Try again when the calculator has opened.",
} as const;
