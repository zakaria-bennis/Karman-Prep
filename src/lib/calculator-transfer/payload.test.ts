import { readFileSync } from "node:fs";
import { expect, expectTypeOf, it } from "vitest";
import {
  MAX_QUEUED_TRANSFERS,
  TRANSFER_MESSAGES,
  type TransferPayload,
  type TransferResult,
  type TransferTrigger,
} from "./payload";

it("AR-16 TransferPayload has exactly the AR-16 fields and types", () => {
  expectTypeOf<keyof TransferPayload>().toEqualTypeOf<
    | "version"
    | "questionKey"
    | "sourceId"
    | "description"
    | "format"
    | "dependencies"
    | "rows"
    | "table"
    | "pairs"
    | "pointTableKey"
  >();
  expectTypeOf<TransferPayload["version"]>().toEqualTypeOf<1>();
  expectTypeOf<TransferPayload["format"]>().toEqualTypeOf<
    "rows" | "point" | "tableRow" | "evaluate" | "table"
  >();
  expectTypeOf<TransferPayload["table"]>().toEqualTypeOf<
    { headers: (string | null)[]; columns: string[][] } | undefined
  >();
  expectTypeOf<TransferPayload["pairs"]>().toEqualTypeOf<[string, string][] | undefined>();
  expectTypeOf<TransferTrigger>().toEqualTypeOf<"mouse" | "keyboard" | "touch">();
  expectTypeOf<TransferResult["status"]>().toEqualTypeOf<
    "added" | "renamed" | "already-present" | "rejected" | "unavailable" | "queue-full"
  >();
});
it("AR-16 payload.ts is an eager leaf with no imports and no browser globals", () => {
  const src = readFileSync("src/lib/calculator-transfer/payload.ts", "utf8");
  expect(src).not.toMatch(/^\s*import\s/m);
  expect(src).not.toMatch(/\b(window|document|navigator)\b/);
});
it("TR-35, TR-36, TR-73 TRANSFER_MESSAGES holds table 11.1's copy", () => {
  expect(TRANSFER_MESSAGES.added("y = 2x + 3")).toBe("Added to calculator: y = 2x + 3.");
  expect(TRANSFER_MESSAGES.alreadyPresent(2)).toBe("Already in the calculator, row 2.");
  expect(TRANSFER_MESSAGES.pairAppended("x₁", "y₁", 3)).toBe("Added to table x₁, y₁, row 3.");
  expect(TRANSFER_MESSAGES.tableAdded(["x₁ is t", "y₁"], 2)).toBe(
    "Added table to calculator: x₁ is t, y₁, 2 rows."
  );
  expect(TRANSFER_MESSAGES.renamed("f₂", "f")).toBe("Added as f₂ because f is already defined.");
  expect(TRANSFER_MESSAGES.rejected).toBe("This can't be added to the calculator.");
  expect(TRANSFER_MESSAGES.unavailableRetry).toBe(
    "Calculator unavailable. Use Retry in the calculator panel."
  );
  expect(TRANSFER_MESSAGES.unavailableReload).toBe(
    "Calculator unavailable. Reload the page to use it."
  );
  expect(TRANSFER_MESSAGES.tooManyWaiting).toBe(
    "Too many transfers are waiting. Try again when the calculator has opened."
  );
  expect(MAX_QUEUED_TRANSFERS).toBe(20);
});
