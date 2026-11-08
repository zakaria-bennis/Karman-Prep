"use client";
// Everything the shell remembers during one section: workspaces, pencil, highlights, markers.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { RoutingState } from "@/lib/quiz/ink/routing";
import type { PenIndex } from "@/lib/quiz/ink/types";
import type { QuizMode } from "@/lib/quiz/mode";
import {
  loadWorkspaces,
  saveWorkspaces,
  workspaceReducer,
  type QuestionWorkspace,
  type WorkspaceAction,
} from "@/lib/quiz/workspace";
import type { StudentQuizQuestion } from "@/types/quiz";
import type { AnnotationContextValue } from "./annotation-context";
import type { PencilContextValue, PencilTool } from "./pencil-context";
import { TEXT_SIZES } from "./MoreMenu";

/** loadedFor: the attempt whose saved work has been read; nothing is saved before that. */
type State = { workspaces: Record<string, QuestionWorkspace>; loadedFor: string | null };
type Act =
  | { questionId: string; action: WorkspaceAction }
  | { load: State["workspaces"]; key: string };
function reduce(state: State, act: Act): State {
  if ("load" in act) return { workspaces: act.load, loadedFor: act.key };
  return { ...state, workspaces: workspaceReducer(state.workspaces, act.questionId, act.action) };
}

const SIZE_KEY = "karman-quiz-text-size";
function readSize(): number {
  try {
    const n = Number(localStorage.getItem(SIZE_KEY));
    return (TEXT_SIZES as readonly number[]).includes(n) ? n : 100;
  } catch {
    return 100;
  }
}

export function useShellState({
  attemptKey,
  q,
  mode,
  locked,
  saved: initialSaved,
}: {
  attemptKey: string;
  q: StudentQuizQuestion | undefined;
  mode: QuizMode;
  locked: boolean;
  saved?: Record<string, "bookmark" | "tutor_flag">;
}) {
  const [state, dispatch] = useReducer(reduce, { workspaces: {}, loadedFor: null });
  const [saved, setSaved] = useState(initialSaved ?? {});
  const [pencilOn, setPencilOn] = useState(false);
  const [tool, setTool] = useState<PencilTool>("pen");
  const [pen, setPen] = useState<PenIndex>(1);
  const [drawing, setDrawing] = useState(false);
  const [penSeen, setPenSeen] = useState(false);
  const [pickOffer, setPickOffer] = useState<string | null>(null);
  const [textSize, setTextSizeState] = useState(100);
  const routing = useRef<RoutingState>({
    pencilOn: false,
    penSeen: false,
    activePenId: null,
    screenReaderTouch: false,
  });
  routing.current = { ...routing.current, pencilOn };
  const highlightSerial = useRef(0);

  useEffect(() => dispatch({ load: loadWorkspaces(attemptKey), key: attemptKey }), [attemptKey]);
  // Saved markers can arrive after the first render (loaded by the host).
  useEffect(() => {
    if (initialSaved) setSaved((now) => ({ ...initialSaved, ...now }));
  }, [initialSaved]);
  useEffect(() => {
    if (state.loadedFor === attemptKey) saveWorkspaces(attemptKey, state.workspaces);
  }, [attemptKey, state.workspaces, state.loadedFor]);
  useEffect(() => setTextSizeState(readSize()), []);
  useEffect(() => setPickOffer(null), [q?.id]);

  const ws = q ? state.workspaces[q.id] : undefined;
  const act = (action: WorkspaceAction) => q && dispatch({ questionId: q.id, action });

  useEffect(() => {
    if (!pickOffer) return;
    const t = setTimeout(() => setPickOffer(null), 4000);
    return () => clearTimeout(t);
  }, [pickOffer, ws?.ink]);

  const pencil = useMemo<PencilContextValue>(
    () => ({
      pencilOn,
      tool,
      pen,
      routing,
      ink: ws?.ink ?? { strokes: [] },
      apply: (op) => q && dispatch({ questionId: q.id, action: { type: "inkOp", op } }),
      offerPick: setPickOffer,
      allowPick: !locked && q?.answer_format === "multiple_choice",
      setDrawing: (d) => {
        setDrawing(d);
        setPenSeen(routing.current.penSeen);
      },
    }),
    [pencilOn, tool, pen, ws?.ink, q, locked]
  );

  const annotations = useMemo<AnnotationContextValue>(
    () => ({
      enabled: !pencilOn,
      highlights: ws?.highlights ?? [],
      add: (range, color) => {
        const id = Math.max(highlightSerial.current, Date.now()) + 1;
        highlightSerial.current = id;
        if (q)
          dispatch({
            questionId: q.id,
            action: { type: "addHighlight", highlight: { id, range, color } },
          });
        return id;
      },
      recolor: (id, color) =>
        q && dispatch({ questionId: q.id, action: { type: "recolorHighlight", id, color } }),
      note: (id, note) =>
        q && dispatch({ questionId: q.id, action: { type: "updateNote", id, note } }),
      remove: (id) => q && dispatch({ questionId: q.id, action: { type: "removeHighlight", id } }),
    }),
    [pencilOn, ws?.highlights, q]
  );

  return {
    workspaces: state.workspaces,
    loadedFor: state.loadedFor,
    ws,
    act,
    saved,
    setSaved,
    pencilOn,
    setPencilOn,
    tool,
    setTool,
    pen,
    setPen,
    drawing,
    penSeen,
    pickOffer,
    pencil,
    annotations,
    textSize,
    setTextSize(size: number) {
      setTextSizeState(size);
      try {
        localStorage.setItem(SIZE_KEY, String(size));
      } catch {
        /* A per-device convenience only. */
      }
    },
    canBookmark: mode.canBookmark,
  };
}
