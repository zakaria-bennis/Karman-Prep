// The one error type the public calculator API throws (01-interfaces-runtime.md section 8, API-13).
// Math errors never throw: they are row values (AR-54).

export type KarmanCalculatorErrorCode = "invalid-argument" | "unsupported" | "destroyed";

export class KarmanCalculatorError extends Error {
  readonly code: KarmanCalculatorErrorCode;

  constructor(code: KarmanCalculatorErrorCode, message: string) {
    super(message);
    this.name = "KarmanCalculatorError";
    this.code = code;
  }
}
