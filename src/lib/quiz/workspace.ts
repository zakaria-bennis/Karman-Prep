import { addHighlight } from "./annotations/ranges";
import { applyInkOp, invertInkOp } from "./ink/document";
import type { InkDocument, InkOp } from "./ink/types";

export type HighlightColor = 1 | 2 | 3;
export type AnnotationRange = { blockId: string; start: number; end: number };
export type Highlight = {
  id: number;
  range: AnnotationRange;
  color: HighlightColor;
  note?: string;
};

/** Session-only working state for one question (spec: Per-question workspace state). */
export type QuestionWorkspace = {
  answer: string | null;
  crossedOut: string[];
  markedForReview: boolean;
  ink: InkDocument;
  undo: InkOp[];
  redo: InkOp[];
  highlights: Highlight[];
};

export type WorkspaceAction =
  | { type: "answer"; value: string | null }
  | { type: "toggleCross"; letter: string }
  | { type: "toggleReview"; allowed: boolean }
  | { type: "inkOp"; op: InkOp }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "addHighlight"; highlight: Highlight }
  | { type: "updateNote"; id: number; note: string }
  | { type: "removeHighlight"; id: number }
  | { type: "recolorHighlight"; id: number; color: HighlightColor };

export function emptyWorkspace(): QuestionWorkspace {
  return {
    answer: null,
    crossedOut: [],
    markedForReview: false,
    ink: { strokes: [] },
    undo: [],
    redo: [],
    highlights: [],
  };
}

function reduceOne(ws: QuestionWorkspace, action: WorkspaceAction): QuestionWorkspace {
  switch (action.type) {
    case "answer":
      return { ...ws, answer: action.value };
    case "toggleCross": {
      const on = ws.crossedOut.includes(action.letter);
      return {
        ...ws,
        crossedOut: on
          ? ws.crossedOut.filter((l) => l !== action.letter)
          : [...ws.crossedOut, action.letter],
        answer: !on && ws.answer === action.letter ? null : ws.answer,
      };
    }
    case "toggleReview":
      return action.allowed ? { ...ws, markedForReview: !ws.markedForReview } : ws;
    case "inkOp":
    case "undo":
    case "redo":
      return reduceInk(ws, action);
    case "addHighlight":
      return { ...ws, highlights: addHighlight(ws.highlights, action.highlight) };
    case "updateNote":
      return {
        ...ws,
        highlights: ws.highlights.map((h) =>
          h.id === action.id ? { ...h, note: action.note } : h
        ),
      };
    case "recolorHighlight":
      return {
        ...ws,
        highlights: ws.highlights.map((h) =>
          h.id === action.id ? { ...h, color: action.color } : h
        ),
      };
    case "removeHighlight":
      return { ...ws, highlights: ws.highlights.filter((h) => h.id !== action.id) };
  }
}

function reduceInk(ws: QuestionWorkspace, action: WorkspaceAction): QuestionWorkspace {
  if (action.type === "inkOp")
    return { ...ws, ink: applyInkOp(ws.ink, action.op), undo: [...ws.undo, action.op], redo: [] };
  if (action.type === "undo") {
    const op = ws.undo.at(-1);
    if (!op) return ws;
    return {
      ...ws,
      ink: applyInkOp(ws.ink, invertInkOp(op)),
      undo: ws.undo.slice(0, -1),
      redo: [...ws.redo, op],
    };
  }
  if (action.type === "redo") {
    const op = ws.redo.at(-1);
    if (!op) return ws;
    return {
      ...ws,
      ink: applyInkOp(ws.ink, op),
      undo: [...ws.undo, op],
      redo: ws.redo.slice(0, -1),
    };
  }
  return ws;
}

export function workspaceReducer(
  state: Record<string, QuestionWorkspace>,
  questionId: string,
  action: WorkspaceAction
): Record<string, QuestionWorkspace> {
  const current = state[questionId] ?? emptyWorkspace();
  const next = reduceOne(current, action);
  return next === current && state[questionId] ? state : { ...state, [questionId]: next };
}

const key = (attemptKey: string) => `karman-quiz-ws:${attemptKey}`;

export function loadWorkspaces(attemptKey: string): Record<string, QuestionWorkspace> {
  try {
    const raw = sessionStorage.getItem(key(attemptKey));
    return raw ? (JSON.parse(raw) as Record<string, QuestionWorkspace>) : {};
  } catch {
    return {};
  }
}

export function saveWorkspaces(attemptKey: string, value: Record<string, QuestionWorkspace>) {
  try {
    sessionStorage.setItem(key(attemptKey), JSON.stringify(value));
  } catch {
    /* The screen keeps working from memory when storage is blocked. */
  }
}

export function clearWorkspaces(attemptKey: string) {
  try {
    sessionStorage.removeItem(key(attemptKey));
  } catch {
    /* Nothing stored. */
  }
}
