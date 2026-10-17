// Parse-tree types (01-interfaces.md section 1). Types only: no runtime code.

export interface SourceSpan {
  start: number;
  end: number;
} // UTF-16 offsets into normalizeLatex(input)
export type RelOp = "=" | "<" | ">" | "<=" | ">=";
export type InequalityOp = Exclude<RelOp, "=">;
export type ConstName = "e" | "pi" | "tau";
export type Node =
  | { kind: "num"; value: number; span: SourceSpan }
  | { kind: "id"; name: string; span: SourceSpan } // "x", "A", "a_{1}", "v_{max}", "\\alpha", "e_{3}"
  | { kind: "const"; name: ConstName; span: SourceSpan }
  | { kind: "add" | "sub" | "mul" | "div" | "pow"; left: Node; right: Node; span: SourceSpan }
  | { kind: "neg" | "pct" | "deg" | "fact" | "abs"; arg: Node; span: SourceSpan }
  | { kind: "root"; arg: Node; index: Node | null; span: SourceSpan } // \sqrt, \sqrt[n]
  | { kind: "call"; name: string; args: Node[]; span: SourceSpan } // \log_{b}x is call "log" args [x, b]
  | { kind: "point"; x: Node; y: Node; span: SourceSpan }
  | { kind: "rel"; ops: RelOp[]; operands: Node[]; span: SourceSpan }; // operands.length === ops.length + 1
