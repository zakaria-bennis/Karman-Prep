// Test support for the renderer: a plain object standing in for a 2D canvas context.
// It implements only the members the draw modules use and records every method call with the
// drawing state copied at that moment, so tests read what was stroked, filled and where. Never
// imported by production code.

export type RecordedState = { fillStyle: unknown; strokeStyle: unknown; lineWidth: number };
export type DashState = { lineDash: number[]; lineDashOffset: number };
export type RecordedCall = { name: string; args: unknown[]; state: RecordedState & DashState };

/** The context methods that only draw or change the path or transform; each is recorded as is. */
const RECORDED_METHODS = [
  "setTransform",
  "clearRect",
  "fillRect",
  "beginPath",
  "closePath",
  "moveTo",
  "lineTo",
  "arc",
  "ellipse",
  "stroke",
  "fill",
  "strokeText",
  "fillText",
  "save",
  "restore",
] as const;

/**
 * A recording context: `calls` gains `{ name, args, state }` for every method call, and
 * `measureText(t)` measures 7 px per character. `canvas` is a stand-in with the default
 * 300×150 canvas size.
 */
export function createRecordingContext(): {
  ctx: CanvasRenderingContext2D;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  let lineDash: number[] = [];
  const target: Record<string, unknown> = {
    canvas: { width: 300, height: 150 },
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineDashOffset: 0,
    lineJoin: "miter",
    lineCap: "butt",
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
  };
  const record = (name: string, args: unknown[]) => {
    calls.push({
      name,
      args,
      state: {
        fillStyle: target.fillStyle,
        strokeStyle: target.strokeStyle,
        lineWidth: target.lineWidth as number,
        lineDash: [...lineDash],
        lineDashOffset: target.lineDashOffset as number,
      },
    });
  };
  for (const name of RECORDED_METHODS) {
    target[name] = (...args: unknown[]) => record(name, args);
  }
  target.setLineDash = (segments: number[]) => {
    lineDash = [...segments];
    record("setLineDash", [[...segments]]);
  };
  target.getLineDash = () => {
    record("getLineDash", []);
    return [...lineDash];
  };
  target.measureText = (text: string) => {
    record("measureText", [text]);
    return { width: 7 * text.length } as TextMetrics;
  };
  return { ctx: target as unknown as CanvasRenderingContext2D, calls };
}
