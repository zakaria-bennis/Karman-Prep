// Transfer fixture corpus shape (TR-79, c-transfer.md section 14): one question source, the
// calculator it is applied to, and the expected control, payload, apply status and final list.

import type { TransferItemKind } from "../classify";

export type FixtureSource =
  | { kind: "stem"; text: string; segment: number; serializedFunctionLines?: boolean }
  | { kind: "choice"; letter: string; text: string; stem?: string };
export type FixtureExpect =
  | { control: false; rule: string }
  | {
      control: true;
      kind: TransferItemKind;
      rows: string[];
      dependencies?: string[];
      corpus: string[]; // one question-dialect case id per row
      status: "added" | "renamed" | "already-present" | "rejected";
      inserted: string[]; // the whole list after apply
    };
export interface TransferFixture {
  id: string;
  rules: string[];
  source: FixtureSource;
  calculator?: string[];
  expect: FixtureExpect;
}
