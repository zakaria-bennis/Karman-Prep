// vendor/mathquill/mathquill.d.ts: only the members MathField.ts and config.ts use (AR-5)
export interface MathQuillHandlers {
  edit?(mq: EditableMathQuill): void;
  enter?(mq: EditableMathQuill): void;
  upOutOf?(mq: EditableMathQuill): void;
  downOutOf?(mq: EditableMathQuill): void;
  deleteOutOf?(direction: -1 | 1, mq: EditableMathQuill): void;
}
export interface MathQuillConfig {
  substituteTextarea(): HTMLElement;
  overrideTypedText(text: string): void;
  overrideKeystroke(key: string, event: KeyboardEvent): void;
  handlers: MathQuillHandlers;
  autoOperatorNames: string;
  autoCommands: string;
  charsThatBreakOutOfSupSub: string;
  autoSubscriptNumerals: boolean;
  disableAutoSubstitutionInSubscripts: boolean;
  restrictMismatchedBrackets: boolean;
  enableDigitGrouping: boolean;
  disableCopyPaste: boolean;
  typingAsteriskWritesTimesSymbol: boolean;
  typingPercentWritesPercentOf: boolean;
  typingSlashWritesDivisionSymbol: boolean;
  typingSlashCreatesNewFraction: boolean;
}
export interface EditableMathQuill {
  latex(): string;
  latex(value: string): EditableMathQuill;
  write(latex: string): EditableMathQuill;
  cmd(name: string): EditableMathQuill;
  keystroke(keys: string, event?: KeyboardEvent): EditableMathQuill;
  typedText(text: string): EditableMathQuill;
  select(): EditableMathQuill;
  clearSelection(): EditableMathQuill;
  selectionLatex(): string | null; // patches/0005
  focus(): EditableMathQuill;
  blur(): EditableMathQuill;
  reflow(): void;
  mathspeak(): string;
  revert(): HTMLElement;
}
export interface MathQuillInterface {
  MathField(element: HTMLElement, config: MathQuillConfig): EditableMathQuill;
}
declare const MathQuill: { getInterface(version: 3): MathQuillInterface };
export default MathQuill;
