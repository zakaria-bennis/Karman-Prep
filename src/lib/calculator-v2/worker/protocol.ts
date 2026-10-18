// Worker protocol (01-interfaces-runtime.md section 7; spec AR-45). Messages are versioned plain
// objects: no function, closure or SharedArrayBuffer crosses threads. Pure TypeScript: no DOM.

import type { RowError } from "../core/analysis";
import type { RowKind } from "../core/corpus/types";
import type { Value } from "../core/eval/values";
import type { Geometry } from "../plot/geometry";
import type { PoiPoint } from "../poi/types";
import type { PixelSize, Viewport } from "../plot/viewport";

export const PROTOCOL_VERSION = 1;
export const WORKER_MARKER = "karman-compute-v1"; // OI-29: finds the worker code in build output
export interface WireRow {
  id: string;
  type: "expression"; // "table" from Phase 3
  latex: string;
  columns: null; // Phase 3
  hidden: boolean;
  sliderBounds: { min: string; max: string; step: string } | null;
}
export interface WireSettings {
  angleMode: "radians" | "degrees";
  complex: boolean;
}
export interface WireAnalysis {
  kind: RowKind;
  error: RowError | null;
  isGraphable: boolean;
}
export type MainToWorker =
  | { v: 1; type: "hello"; seed: number }
  | {
      v: 1;
      type: "state";
      generation: number;
      rows: WireRow[];
      settings: WireSettings;
      sliders: Record<string, number>;
    }
  | { v: 1; type: "view"; generation: number; viewport: Viewport; size: PixelSize; dpr: number }
  | { v: 1; type: "evaluate"; jobId: number; generation: number; latex: string } // HelperExpression
  | { v: 1; type: "select"; rowId: string | null } // POI-1: the row whose points of interest to find
  | { v: 1; type: "dispose" };
export type WorkerToMain =
  | { v: 1; type: "ready"; worker: typeof WORKER_MARKER }
  | { v: 1; type: "begin"; generation: number; rowId: string }
  | { v: 1; type: "analysis"; generation: number; rowId: string; analysis: WireAnalysis }
  | {
      v: 1;
      type: "value";
      generation: number;
      rowId: string | null;
      jobId: number | null;
      value: Value;
    }
  | { v: 1; type: "plot"; generation: number; rowId: string; geometry: Geometry }
  | { v: 1; type: "regression"; generation: number; rowId: string } // reserved; never sent before Phase 3
  | { v: 1; type: "poi"; generation: number; rowId: string; points: PoiPoint[] } // POI-1
  | { v: 1; type: "overrun"; generation: number; rowId: string } // AR-48 deadline or AR-49 watchdog
  | { v: 1; type: "heartbeat"; generation: number }
  | { v: 1; type: "done"; generation: number }
  | { v: 1; type: "fault"; generation: number | null; message: string };

type Fields = Record<string, unknown>;

const isRecord = (x: unknown): x is Fields =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const isNumber = (x: unknown): x is number => typeof x === "number";
const isString = (x: unknown): x is string => typeof x === "string";
/** An object whose `tag` field is a string: a Geometry's `kind` or a Value's `type`. */
const isTagged = (x: unknown, tag: "kind" | "type"): boolean => isRecord(x) && isString(x[tag]);
const hasNumbers = (x: unknown, keys: readonly string[]): boolean =>
  isRecord(x) && keys.every((k) => isNumber(x[k]));

/** A plain object carrying `v: 1`; its `type` decides the rest. */
function versioned(data: unknown): data is Fields {
  return isRecord(data) && data.v === PROTOCOL_VERSION;
}

function isWireAnalysis(x: unknown): boolean {
  return (
    isRecord(x) &&
    isString(x.kind) &&
    (x.error === null || isRecord(x.error)) &&
    typeof x.isGraphable === "boolean"
  );
}

function isWireRow(x: unknown): boolean {
  if (!isRecord(x)) return false;
  const b = x.sliderBounds;
  return (
    isString(x.id) &&
    x.type === "expression" &&
    isString(x.latex) &&
    x.columns === null &&
    typeof x.hidden === "boolean" &&
    (b === null || (isRecord(b) && isString(b.min) && isString(b.max) && isString(b.step)))
  );
}

function isWireSettings(x: unknown): boolean {
  return (
    isRecord(x) &&
    (x.angleMode === "radians" || x.angleMode === "degrees") &&
    typeof x.complex === "boolean"
  );
}

/** AR-45: a message the worker may post to the main thread. */
export function isWorkerMessage(data: unknown): data is WorkerToMain {
  if (!versioned(data)) return false;
  const m = data;
  switch (m.type) {
    case "ready":
      return m.worker === WORKER_MARKER;
    case "poi":
      return (
        isNumber(m.generation) &&
        isString(m.rowId) &&
        Array.isArray(m.points) &&
        m.points.every((p) => hasNumbers(p, ["x", "y"]) && Array.isArray((p as Fields).kinds))
      );
    case "begin":
    case "regression":
    case "overrun":
      return isNumber(m.generation) && isString(m.rowId);
    case "analysis":
      return isNumber(m.generation) && isString(m.rowId) && isWireAnalysis(m.analysis);
    case "value":
      return (
        isNumber(m.generation) &&
        (m.rowId === null || isString(m.rowId)) &&
        (m.jobId === null || isNumber(m.jobId)) &&
        isTagged(m.value, "type")
      );
    case "plot":
      return isNumber(m.generation) && isString(m.rowId) && isTagged(m.geometry, "kind");
    case "heartbeat":
    case "done":
      return isNumber(m.generation);
    case "fault":
      return (m.generation === null || isNumber(m.generation)) && isString(m.message);
    default:
      return false;
  }
}

/** AR-45: a message the main thread may post to the worker (package-internal). */
export function isMainMessage(data: unknown): data is MainToWorker {
  if (!versioned(data)) return false;
  const m = data;
  switch (m.type) {
    case "hello":
      return isNumber(m.seed);
    case "state":
      return (
        isNumber(m.generation) &&
        Array.isArray(m.rows) &&
        m.rows.every(isWireRow) &&
        isWireSettings(m.settings) &&
        isRecord(m.sliders) &&
        Object.values(m.sliders).every(isNumber)
      );
    case "view":
      return (
        isNumber(m.generation) &&
        hasNumbers(m.viewport, ["left", "right", "bottom", "top"]) &&
        hasNumbers(m.size, ["width", "height"]) &&
        isNumber(m.dpr)
      );
    case "evaluate":
      return isNumber(m.jobId) && isNumber(m.generation) && isString(m.latex);
    case "select":
      return m.rowId === null || isString(m.rowId);
    case "dispose":
      return true;
    default:
      return false;
  }
}
