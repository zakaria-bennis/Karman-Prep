// Backend messages applied to the engine's results (07 Decisions 3 to 5, 12 and 14): AR-46's
// acceptance rule, each row's latest value or overrun, each row's geometry, the AR-45 development
// kind check and worker faults. Package-internal.

import type { Geometry } from "../../plot/geometry";
import type { PoiPoint } from "../../poi/types";
import type { WorkerToMain } from "../../worker/protocol";
import type { AnalysisResult } from "../analysis";
import type { RowKind } from "../corpus/types";
import type { Value } from "../eval/values";
import type { StoredRow } from "./document";

export interface SentRow {
  id: string;
  latex: string;
  hidden: boolean;
  kind: RowKind; // the main thread's kind, for the AR-45 development check
  isGraphable: boolean;
}
export interface RowResult {
  value: Value | null;
  overrun: boolean;
}
export interface InboxHooks {
  onFault(message: string): void;
  onHelperValue(jobId: number, value: Value): void; // HelperRegistry (Task 12) checks liveness
}

type RowMessage = { generation: number; rowId: string | null };

const NO_RESULT: RowResult = Object.freeze({ value: null, overrun: false });

/** The rows of a `state` send with the main thread's kind and graphability (AR-51). */
export function sentRows(rows: readonly StoredRow[], analysis: AnalysisResult): SentRow[] {
  return rows.map(({ id, latex, hidden }) => {
    const { kind, isGraphable } = analysis.byId.get(id)!;
    return { id, latex, hidden, kind, isGraphable };
  });
}

export class ResultInbox {
  private readonly hooks: InboxHooks;
  /** The rows of the latest `state` sent, by id. */
  private rows = new Map<string, SentRow>();
  private readonly results = new Map<string, RowResult>();
  /** The published geometry: replaced, never changed, so a snapshot holding it stays as it was. */
  private plots: ReadonlyMap<string, Geometry> = new Map();
  /** The rows plotted in the latest generation; at its `done` only these keep geometry. */
  private plotted = new Set<string>();
  /** The generation of the latest `state` sent, and of the latest `state` or `view` sent. */
  private stateGeneration = 0;
  private latestGeneration = 0;
  /** POI-1: the latest accepted points of interest, for the row they were found for. */
  private points: { rowId: string; points: readonly PoiPoint[] } | null = null;

  constructor(hooks: InboxHooks) {
    this.hooks = hooks;
  }

  /**
   * After every `state` send (Decisions 4 and 5): rows deleted or whose latex or hidden flag
   * changed lose their value, overrun and geometry; rows no longer graphable lose their geometry.
   * Values and overruns are kept across settings changes until replaced (Decision 12).
   */
  noteState(generation: number, rows: readonly SentRow[]): void {
    const next = new Map(rows.map((row) => [row.id, row]));
    const edited = (id: string): boolean => {
      const before = this.rows.get(id),
        after = next.get(id);
      return !before || !after || after.latex !== before.latex || after.hidden !== before.hidden;
    };
    for (const id of this.rows.keys()) if (edited(id)) this.results.delete(id);
    if (this.points !== null && edited(this.points.rowId)) this.points = null;
    this.keepGeometry((id) => !edited(id) && next.get(id)!.isGraphable);
    this.rows = next;
    this.stateGeneration = this.latestGeneration = generation;
    this.plotted = new Set();
  }

  /** After every `view` send: region spans are in the old pixel frame, so region geometry goes. */
  noteView(generation: number): void {
    this.latestGeneration = generation;
    this.plotted = new Set();
    this.keepGeometry((_, geometry) => geometry.kind !== "region");
  }

  /**
   * Decision 3 (AR-46): `plot` and `done` count only at the latest generation sent; `analysis`,
   * `value` and `overrun` count from the latest `state` on, for rows it sent. Helper values go to
   * `onHelperValue` and faults to `onFault`. True when a row result, the geometry or the backend
   * kind (`ready`) changed.
   */
  receive(message: WorkerToMain): boolean {
    switch (message.type) {
      case "ready":
        return true;
      case "analysis":
        if (this.accepts(message)) this.checkKind(message.rowId, message.analysis.kind);
        return false;
      case "value":
        if (message.jobId !== null) {
          this.hooks.onHelperValue(message.jobId, message.value);
          return false;
        }
        return this.store(message, { value: message.value, overrun: false });
      case "overrun":
        return this.store(message, { value: null, overrun: true });
      case "plot": {
        const { generation, rowId, geometry } = message;
        const graphable = this.rows.get(rowId)?.isGraphable === true;
        if (generation !== this.latestGeneration || !graphable) return false;
        this.plots = new Map(this.plots).set(rowId, geometry);
        this.plotted.add(rowId);
        return true;
      }
      case "done":
        if (message.generation !== this.latestGeneration) return false;
        return this.keepGeometry((id) => this.plotted.has(id));
      case "poi": {
        if (message.generation !== this.latestGeneration || !this.rows.has(message.rowId)) {
          return false;
        }
        this.points = Object.freeze({
          rowId: message.rowId,
          points: Object.freeze(message.points),
        });
        return true;
      }
      case "fault":
        this.hooks.onFault(message.message);
        return false;
      default:
        return false; // begin, heartbeat, and the reserved regression
    }
  }

  /** A row's latest accepted result; `{ value: null, overrun: false }` for an unknown row. */
  result(rowId: string): RowResult {
    return this.results.get(rowId) ?? NO_RESULT;
  }

  get geometry(): ReadonlyMap<string, Geometry> {
    return this.plots;
  }

  /** POI-1: the latest accepted points of interest, or null. */
  get poi(): { rowId: string; points: readonly PoiPoint[] } | null {
    return this.points;
  }

  /** setBlank: forgets every result, geometry and generation mark. */
  reset(): void {
    this.rows = new Map();
    this.results.clear();
    this.plots = new Map();
    this.plotted = new Set();
    this.points = null;
    this.stateGeneration = this.latestGeneration = 0;
  }

  /** A row message counts from the latest `state` on, and only for a row that state sent. */
  private accepts(message: RowMessage): message is { generation: number; rowId: string } {
    const { generation, rowId } = message;
    return rowId !== null && generation >= this.stateGeneration && this.rows.has(rowId);
  }

  private store(message: RowMessage, result: RowResult): boolean {
    if (!this.accepts(message)) return false;
    this.results.set(message.rowId, result);
    return true;
  }

  /** Keeps the geometry entries `keep` accepts, in a new map; true when any was dropped. */
  private keepGeometry(keep: (rowId: string, geometry: Geometry) => boolean): boolean {
    const next = new Map([...this.plots].filter(([id, geometry]) => keep(id, geometry)));
    if (next.size === this.plots.size) return false;
    this.plots = next;
    return true;
  }

  /**
   * AR-45, AR-51 (development only): the worker's kind must match the main thread's, except for
   * an overrun row, whose state the backend may withhold (AR-49).
   */
  private checkKind(rowId: string, kind: RowKind): void {
    if (process.env.NODE_ENV === "production") return;
    const main = this.rows.get(rowId)!.kind;
    if (main === kind || this.result(rowId).overrun) return;
    console.error(
      `Karman calculator: worker analysis kind mismatch for row ${rowId} (main ${main}, worker ${kind})`
    );
  }
}
