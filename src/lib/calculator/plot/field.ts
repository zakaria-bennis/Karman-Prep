// Pixel-centre field sampling for implicit curves and regions (G-15, G-16, G-17). Node (i, j) is
// the centre of pixel (i, j). A coarse pass evaluates every `cell`-th node, then a first-in
// first-out quadtree halves each square where a relation changes sign, meets an undefined value or
// nears zero, down to 1 px, within the evaluation budget. Squares the budget leaves unsplit are
// unresolved, and `contourField` draws them as bands (G-15). Pure TypeScript, no DOM (AR-44).

import type { EvaluationBudget } from "./budget";
import { pxToWorld, type ViewSpec } from "./viewport";

export const COARSE_CELL_PX = 4;
export const COARSE_SHARE = 4; // the coarse pass spends at most limit / COARSE_SHARE
export const NEAR_ZERO_FACTOR = 1;
export type NodeEvaluator = (x: number, y: number, out: Float64Array) => void;
export type Square = { readonly i: number; readonly j: number; readonly edge: number }; // top-left node
export interface SampledField {
  readonly width: number; // W = ceil(view.size.width)
  readonly height: number; // H = ceil(view.size.height)
  readonly cell: number; // coarse cell edge in px: COARSE_CELL_PX, doubled as needed
  readonly cellsX: number; // max(1, ceil((W - 1) / cell)); cellsY likewise with H
  readonly cellsY: number;
  readonly count: number; // relations per node
  readonly leaves: readonly Square[]; // active squares of edge 1, all four corners evaluated
  readonly unresolved: readonly Square[]; // active squares the budget left unsplit
  value(i: number, j: number, k: number): number; // NaN if undefined or not evaluated
  pixelValue(i: number, j: number, k: number): number; // the value pixel (i, j) is judged by
  /**
   * Package addition to Task 5's interface: true when the evaluated relation-k nodes on the
   * boundary of `s` (its corners and any evaluated node on its edges) mix finite and non-finite
   * values, or are finite and not all of one strict sign (a zero counts as mixed). The quadtree's
   * activity test and the contour's band rule for unresolved squares both use it, and only the
   * field knows which nodes were evaluated (`value` is NaN for both undefined and unevaluated).
   */
  boundaryMixes(s: Square, k: number): boolean;
  /**
   * Every unsplit square of the quadtree, each with its state: a leaf, one the budget left
   * unresolved, or inactive. The squares' half-open extents tile [0, cellsX·cell) × [0,
   * cellsY·cell). No node strictly inside an unsplit square is evaluated, so pixelValue is the
   * top-left corner's value at every pixel of an inactive square off its top row and left column.
   * Region shading uses it to judge whole blocks at once.
   */
  forEachUnsplit(visit: (s: Square, state: "leaf" | "unresolved" | "inactive") => void): void;
}

/** The world point of node (i, j): the centre (i + 0.5, j + 0.5) of pixel (i, j). */
export function nodeToWorld(view: ViewSpec, i: number, j: number): [number, number] {
  return pxToWorld(view, i + 0.5, j + 0.5);
}

const INACTIVE = 0;
const QUEUED = 1;
const LEAF = 2;
const UNRESOLVED = 3;
const SPLIT = 4;

/** A quadtree square; `children` are top-left, top-right, bottom-left, bottom-right once split. */
class Quad implements Square {
  readonly i: number;
  readonly j: number;
  readonly edge: number;
  state = INACTIVE;
  children: Quad[] | null = null;

  constructor(i: number, j: number, edge: number) {
    this.i = i;
    this.j = j;
    this.edge = edge;
  }
}

/** ceil of a positive finite pixel length, else 0 (a hidden or invalid view). */
function pixelCount(length: number): number {
  return Number.isFinite(length) && length > 0 ? Math.ceil(length) : 0;
}

/** Coarse cells along an axis of `pixels` nodes: max(1, ceil((pixels − 1)/cell)). */
function cellsAlong(pixels: number, cell: number): number {
  return Math.max(1, Math.ceil((pixels - 1) / cell));
}

/** The lattice, its sparse node values and the quadtree over it. */
class Field implements SampledField {
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  readonly cellsX: number;
  readonly cellsY: number;
  readonly count: number;
  readonly leaves: Quad[] = [];
  readonly unresolved: Quad[] = [];
  private readonly view: ViewSpec;
  private readonly callsPerNode: number;
  private readonly evaluate: NodeEvaluator;
  private readonly budget: EvaluationBudget;
  private readonly lastI: number; // cellsX·cell, the lattice's last node column
  private readonly lastJ: number;
  private readonly stride: number; // nodes per lattice row
  private readonly index = new Map<number, number>(); // node key → slot in `store`
  private store: Float64Array;
  private slots = 0;
  private readonly scratch: Float64Array;
  private readonly coarse: Quad[] = [];
  private readonly queue: Quad[] = [];

  constructor(
    view: ViewSpec,
    count: number,
    callsPerNode: number,
    evaluate: NodeEvaluator,
    budget: EvaluationBudget
  ) {
    this.view = view;
    this.count = count;
    this.callsPerNode = callsPerNode;
    this.evaluate = evaluate;
    this.budget = budget;
    this.width = pixelCount(view.size.width);
    this.height = pixelCount(view.size.height);
    let cell = COARSE_CELL_PX;
    const coarseCost = (c: number) =>
      (cellsAlong(this.width, c) + 1) * (cellsAlong(this.height, c) + 1) * callsPerNode;
    const single = (c: number) =>
      cellsAlong(this.width, c) === 1 && cellsAlong(this.height, c) === 1;
    while (coarseCost(cell) > budget.limit / COARSE_SHARE && !single(cell)) cell *= 2;
    this.cell = cell;
    this.cellsX = cellsAlong(this.width, cell);
    this.cellsY = cellsAlong(this.height, cell);
    this.lastI = this.cellsX * cell;
    this.lastJ = this.cellsY * cell;
    this.stride = this.lastI + 1;
    this.store = new Float64Array(Math.max(1, count) * 1024);
    this.scratch = new Float64Array(count);
  }

  value(i: number, j: number, k: number): number {
    const slot = this.slotOf(i, j);
    return slot === undefined ? NaN : this.store[slot * this.count + k];
  }

  pixelValue(i: number, j: number, k: number): number {
    const slot = this.slotOf(i, j);
    if (slot !== undefined) return this.store[slot * this.count + k];
    const q = this.locate(i, j);
    if (q.state !== UNRESOLVED) return this.value(q.i, q.j, k);
    // The nearest corner, ties to the top and to the left.
    const right = i - q.i > q.i + q.edge - i;
    const below = j - q.j > q.j + q.edge - j;
    return this.value(right ? q.i + q.edge : q.i, below ? q.j + q.edge : q.j, k);
  }

  boundaryMixes(s: Square, k: number): boolean {
    return this.mixes(this.boundarySlots(s), k);
  }

  forEachUnsplit(visit: (s: Square, state: "leaf" | "unresolved" | "inactive") => void): void {
    const stack = [...this.coarse];
    while (stack.length > 0) {
      const q = stack.pop() as Quad;
      if (q.children !== null) stack.push(...q.children);
      else visit(q, q.state === LEAF ? "leaf" : q.state === UNRESOLVED ? "unresolved" : "inactive");
    }
  }

  /** Steps 1 to 3: the coarse pass, the active coarse cells, then the quadtree. */
  run(): this {
    const { cell, cellsX, cellsY } = this;
    let refused = false;
    for (let cj = 0; cj <= cellsY && !refused; cj++) {
      for (let ci = 0; ci <= cellsX && !refused; ci++) {
        refused = !this.evaluateNode(ci * cell, cj * cell);
      }
    }
    for (let cj = 0; cj < cellsY; cj++) {
      for (let ci = 0; ci < cellsX; ci++) this.coarse.push(new Quad(ci * cell, cj * cell, cell));
    }
    for (const q of this.coarse) {
      if (!this.cornersEvaluated(q)) {
        this.markUnresolved(q); // the coarse pass was refused before reaching a corner
      } else if (this.active(q)) {
        this.enqueue(q);
      }
    }
    const { queue } = this;
    for (let head = 0; head < queue.length; head++) {
      const q = queue[head];
      if (q.edge === 1) {
        this.markLeaf(q);
      } else if (!this.split(q)) {
        // The budget refused: this square and every queued one are left unsplit. A queued square
        // of edge 1 needs no evaluation, so it is still a leaf.
        for (let rest = head; rest < queue.length; rest++) {
          if (queue[rest].edge === 1) this.markLeaf(queue[rest]);
          else this.markUnresolved(queue[rest]);
        }
        break;
      }
    }
    return this;
  }

  /**
   * Evaluates the top, left, centre, right and bottom midpoints of `q` not yet evaluated, queues
   * its active children, then re-tests each unsplit inactive neighbour that now has a newly
   * evaluated midpoint on its boundary. False, with `q` unsplit, when the budget refuses.
   */
  private split(q: Quad): boolean {
    const { i, j, edge } = q;
    const h = edge / 2;
    // Each midpoint [x, y], then the unit cell just across its outer edge (none for the centre).
    const midpoints = [
      [i + h, j, i + h, j - 1], // top
      [i, j + h, i - 1, j + h], // left
      [i + h, j + h, NaN, NaN], // centre
      [i + edge, j + h, i + edge, j + h], // right
      [i + h, j + edge, i + h, j + edge], // bottom
    ];
    const fresh = midpoints.filter(([x, y]) => this.slotOf(x, y) === undefined);
    for (const [x, y] of fresh) {
      if (!this.evaluateNode(x, y)) return false;
    }
    q.state = SPLIT;
    q.children = [
      new Quad(i, j, h),
      new Quad(i + h, j, h),
      new Quad(i, j + h, h),
      new Quad(i + h, j + h, h),
    ];
    for (const child of q.children) {
      if (this.active(child)) this.enqueue(child);
    }
    for (const [, , ci, cj] of fresh) {
      // The centre (NaN) and cells off the lattice have no neighbour to re-test.
      if (!(ci >= 0 && ci < this.lastI && cj >= 0 && cj < this.lastJ)) continue;
      const neighbour = this.locate(ci, cj);
      if (neighbour.state === INACTIVE && this.active(neighbour)) this.enqueue(neighbour);
    }
    return true;
  }

  /**
   * Step 2: for some relation, the evaluated boundary nodes mix finiteness or strict sign, or the
   * four corners are finite with min|v| ≤ NEAR_ZERO_FACTOR·max|Δv| along the four edges.
   */
  private active(s: Quad): boolean {
    const slots = this.boundarySlots(s);
    for (let k = 0; k < this.count; k++) {
      if (this.mixes(slots, k) || this.nearZero(s, k)) return true;
    }
    return false;
  }

  private mixes(slots: number[], k: number): boolean {
    let finite = false;
    let undefinedValue = false;
    let positive = false;
    let negative = false;
    let zero = false;
    for (const slot of slots) {
      const v = this.store[slot * this.count + k];
      if (Number.isNaN(v)) {
        undefinedValue = true;
      } else {
        finite = true;
        if (v > 0) positive = true;
        else if (v < 0) negative = true;
        else zero = true;
      }
    }
    return finite && (undefinedValue || zero || (positive && negative));
  }

  private nearZero(s: Quad, k: number): boolean {
    const { i, j, edge: e } = s;
    const tl = this.value(i, j, k);
    const tr = this.value(i + e, j, k);
    const br = this.value(i + e, j + e, k);
    const bl = this.value(i, j + e, k);
    if (
      !(Number.isFinite(tl) && Number.isFinite(tr) && Number.isFinite(br) && Number.isFinite(bl))
    ) {
      return false;
    }
    const least = Math.min(Math.abs(tl), Math.abs(tr), Math.abs(br), Math.abs(bl));
    const step = Math.max(
      Math.abs(tl - tr),
      Math.abs(tr - br),
      Math.abs(br - bl),
      Math.abs(bl - tl)
    );
    return least <= NEAR_ZERO_FACTOR * step;
  }

  /** Slots of the evaluated nodes on the boundary of `s`: its corners and edge nodes. */
  private boundarySlots(s: Square): number[] {
    const { i, j, edge } = s;
    const slots: number[] = [];
    const add = (x: number, y: number) => {
      const slot = this.slotOf(x, y);
      if (slot !== undefined) slots.push(slot);
    };
    for (let d = 0; d <= edge; d++) {
      add(i + d, j);
      add(i + d, j + edge);
    }
    for (let d = 1; d < edge; d++) {
      add(i, j + d);
      add(i + edge, j + d);
    }
    return slots;
  }

  private cornersEvaluated(s: Square): boolean {
    const { i, j, edge: e } = s;
    const has = (x: number, y: number) => this.slotOf(x, y) !== undefined;
    return has(i, j) && has(i + e, j) && has(i, j + e) && has(i + e, j + e);
  }

  /**
   * The unsplit square whose half-open extent [i0, i0 + edge) × [j0, j0 + edge) holds node (i, j);
   * a node on the lattice's last row or column uses the square it bounds.
   */
  private locate(i: number, j: number): Quad {
    const ci = Math.min(Math.max(Math.floor(i / this.cell), 0), this.cellsX - 1);
    const cj = Math.min(Math.max(Math.floor(j / this.cell), 0), this.cellsY - 1);
    let q = this.coarse[cj * this.cellsX + ci];
    while (q.children !== null) {
      const h = q.edge / 2;
      q = q.children[(j >= q.j + h ? 2 : 0) + (i >= q.i + h ? 1 : 0)];
    }
    return q;
  }

  /** The storage slot of node (i, j), or undefined when it is off the lattice or not evaluated. */
  private slotOf(i: number, j: number): number | undefined {
    if (!(i >= 0 && i <= this.lastI && j >= 0 && j <= this.lastJ)) return undefined;
    return this.index.get(j * this.stride + i);
  }

  /** One node: budget.take(callsPerNode), then the evaluator; non-finite values are stored as NaN. */
  private evaluateNode(i: number, j: number): boolean {
    if (!this.budget.take(this.callsPerNode)) return false;
    const [x, y] = nodeToWorld(this.view, i, j);
    const { scratch, count } = this;
    scratch.fill(NaN);
    this.evaluate(x, y, scratch);
    if ((this.slots + 1) * count > this.store.length) {
      const grown = new Float64Array(this.store.length * 2);
      grown.set(this.store);
      this.store = grown;
    }
    const base = this.slots * count;
    for (let k = 0; k < count; k++) {
      this.store[base + k] = Number.isFinite(scratch[k]) ? scratch[k] : NaN;
    }
    this.index.set(j * this.stride + i, this.slots++);
    return true;
  }

  private enqueue(q: Quad): void {
    q.state = QUEUED;
    this.queue.push(q);
  }

  private markLeaf(q: Quad): void {
    q.state = LEAF;
    this.leaves.push(q);
  }

  private markUnresolved(q: Quad): void {
    q.state = UNRESOLVED;
    this.unresolved.push(q);
  }
}

/**
 * Samples `count` relations at the pixel-centre lattice of `view`: `evaluate` writes the relation
 * values of one node into `out`, and each node costs `callsPerNode` evaluations of the budget.
 */
export function sampleField(
  view: ViewSpec,
  count: number,
  callsPerNode: number,
  evaluate: NodeEvaluator,
  budget: EvaluationBudget
): SampledField {
  return new Field(view, count, callsPerNode, evaluate, budget).run();
}
