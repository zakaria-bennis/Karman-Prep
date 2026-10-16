/** Public data model for the locally implemented Karman calculator. */
export type CalculatorMode = "graphing" | "scientific";
export interface Expression {
  id: string;
  type?: "expression" | "table" | "folder" | "text";
  latex?: string;
  columns?: { latex: string; values?: string[] }[];
  color?: string;
  hidden?: boolean;
  folderId?: string;
  collapsed?: boolean;
  slider?: { min: number; max: number; step: number };
}
export interface CalculatorInstance {
  getExpressions(): Expression[];
  setExpressions(expressions: Expression[]): void;
  subscribe(callback: () => void): () => void;
}
export interface Settings {
  degrees: boolean;
  complex: boolean;
  grid: "square" | "polar" | "none";
  axes: boolean;
  labels: boolean;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}
export const DEFAULT_SETTINGS: Settings = {
  degrees: true,
  complex: false,
  grid: "square",
  axes: true,
  labels: true,
  xmin: -10,
  xmax: 10,
  ymin: -10,
  ymax: 10,
};
export const COLORS = ["#c74440", "#2d70b3", "#388c46", "#6042a6", "#d07822", "#555555"];
let sequence = 0;
export function newExpression(type: Expression["type"] = "expression"): Expression {
  return {
    id: `karman-row-${++sequence}`,
    type,
    latex: "",
    color: COLORS[(sequence - 1) % COLORS.length],
  };
}
