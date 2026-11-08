/** Who may draw (spec: Pencil, Input routing). */
export type PointerKind = "pen" | "touch" | "mouse";
export type RoutingState = {
  pencilOn: boolean;
  /** Set once any pen has touched the screen this session; fingers never draw after that. */
  penSeen: boolean;
  activePenId: number | null;
  screenReaderTouch: boolean;
};
export type PointerSample = {
  kind: PointerKind;
  id: number;
  width: number;
  height: number;
  touchCount: number;
};

export const TAP_MAX_MS = 250;
export const TAP_MAX_MOVE_PX = 6;
export const PALM_MIN_CONTACT_PX = 40;

export function route(state: RoutingState, p: PointerSample): "draw" | "native" {
  if (p.kind === "pen") return "draw";
  if (!state.pencilOn) return "native";
  if (p.kind === "mouse") return "draw";
  if (state.penSeen || state.activePenId !== null || state.screenReaderTouch) return "native";
  if (p.touchCount !== 1) return "native";
  if (p.width > PALM_MIN_CONTACT_PX || p.height > PALM_MIN_CONTACT_PX) return "native";
  return "draw";
}

export function nextRoutingState(state: RoutingState, p: PointerSample): RoutingState {
  return p.kind === "pen" && !state.penSeen ? { ...state, penSeen: true } : state;
}

/** Tells a tap (activates the control underneath) from a stroke (ink). */
export class TapClassifier {
  private x = 0;
  private y = 0;
  private t = 0;
  private moved = false;
  down(x: number, y: number, t: number) {
    this.x = x;
    this.y = y;
    this.t = t;
    this.moved = false;
  }
  move(x: number, y: number): "pending" | "stroke" {
    if (Math.hypot(x - this.x, y - this.y) >= TAP_MAX_MOVE_PX) this.moved = true;
    return this.moved ? "stroke" : "pending";
  }
  up(t: number): "tap" | "stroke" {
    return !this.moved && t - this.t <= TAP_MAX_MS ? "tap" : "stroke";
  }
}
