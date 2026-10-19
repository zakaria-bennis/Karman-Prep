import { expect, it } from "vitest";
import {
  MEMBER_NAMES,
  mathQuillAutoCommands,
  mathQuillAutoOperatorNames,
} from "@/lib/calculator/core/latex/operator-names";
import {
  CHARS_THAT_BREAK_OUT_OF_SUPSUB,
  NATIVE_HISTORY_CHORDS,
  isNativeHistoryChord,
  mathQuillOptions,
} from "./config";

const config = mathQuillOptions();

it("mathQuillOptions makes '/' take the preceding term as a numerator (both slash options off)", () => {
  expect(config.typingSlashWritesDivisionSymbol).toBe(false);
  expect(config.typingSlashCreatesNewFraction).toBe(false);
});
it("mathQuillOptions takes autoOperatorNames and autoCommands from operator-names.ts, member names excluded", () => {
  expect(config.autoOperatorNames).toBe(mathQuillAutoOperatorNames());
  expect(config.autoCommands).toBe(mathQuillAutoCommands());
  const names = config.autoOperatorNames.split(" ");
  for (const member of MEMBER_NAMES) expect(names).not.toContain(member);
  expect(config.autoCommands.split(" ")).toEqual(
    expect.arrayContaining([
      "sqrt",
      "cbrt",
      "nthroot",
      "pi",
      "theta",
      "tau",
      "phi",
      "infinity",
      "infty",
      "sum",
      "prod",
      "int",
    ])
  );
});
it("mathQuillAutoOperatorNames has an auto-command only as a name's last letters, and only in midpoint", () => {
  const commands = mathQuillAutoCommands().split(" ");
  const names = mathQuillAutoOperatorNames().split(" ");
  // an occurrence ending before the last letter fires mid-name; patch 0009 cannot help it
  expect(names.filter((n) => commands.some((c) => n.slice(0, -1).includes(c)))).toEqual([]);
  // an occurrence ending the name is what patch 0009 handles (keys case 56)
  expect(names.filter((n) => commands.some((c) => n.length > c.length && n.endsWith(c)))).toEqual([
    "midpoint",
  ]);
});
it("mathQuillOptions turns on autoSubscriptNumerals and disableAutoSubstitutionInSubscripts", () => {
  expect(config.autoSubscriptNumerals).toBe(true);
  expect(config.disableAutoSubstitutionInSubscripts).toBe(true);
});
it("CHARS_THAT_BREAK_OUT_OF_SUPSUB is exactly + - = < > ~ , and mathQuillOptions uses it", () => {
  expect(CHARS_THAT_BREAK_OUT_OF_SUPSUB).toBe("+-=<>~,");
  expect(config.charsThatBreakOutOfSupSub).toBe("+-=<>~,");
});
it("mathQuillOptions turns off typingAsteriskWritesTimesSymbol and typingPercentWritesPercentOf", () => {
  expect(config.typingAsteriskWritesTimesSymbol).toBe(false);
  expect(config.typingPercentWritesPercentOf).toBe(false);
});
it("mathQuillOptions turns on restrictMismatchedBrackets", () =>
  expect(config.restrictMismatchedBrackets).toBe(true));
it("mathQuillOptions sets no autoParenthesizedFunctions", () =>
  expect("autoParenthesizedFunctions" in config).toBe(false));
it("mathQuillOptions turns on enableDigitGrouping", () =>
  expect(config.enableDigitGrouping).toBe(true));
it("mathQuillOptions turns on disableCopyPaste, NATIVE_HISTORY_CHORDS lists the five chords and no other option is set", () => {
  expect(config.disableCopyPaste).toBe(true);
  expect(NATIVE_HISTORY_CHORDS).toEqual([
    "Ctrl-Z",
    "Meta-Z",
    "Ctrl-Shift-Z",
    "Meta-Shift-Z",
    "Ctrl-Y",
  ]);
  expect(isNativeHistoryChord("Meta-Shift-Z")).toBe(true);
  expect(isNativeHistoryChord("Ctrl-A")).toBe(false);
  expect(Object.keys(config).sort()).toEqual([
    "autoCommands",
    "autoOperatorNames",
    "autoSubscriptNumerals",
    "charsThatBreakOutOfSupSub",
    "disableAutoSubstitutionInSubscripts",
    "disableCopyPaste",
    "enableDigitGrouping",
    "restrictMismatchedBrackets",
    "typingAsteriskWritesTimesSymbol",
    "typingPercentWritesPercentOf",
    "typingSlashCreatesNewFraction",
    "typingSlashWritesDivisionSymbol",
  ]);
});
