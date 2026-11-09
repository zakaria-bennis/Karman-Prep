/*
 * Intro 4's paper pop-up: the subject's ground scene cut into three paper layers along wavy,
 * hand-cut lines, with a pale paper rim on each cut. Stacked flat, the three layers make up the
 * ground scene exactly, so the camera can dive into the pop-up and land on the real scene.
 */
import { ctx2d } from "@/lib/painting/noise";

/** Where each layer's top edge is cut, as a fraction of the height (null: the whole picture). */
export const CUTS: (number | null)[] = [null, 0.5, 0.78];

/** Draws one pop-up layer from the finished ground painting into `dst` (same backing size). */
export function cutLayer(dst: HTMLCanvasElement, ground: HTMLCanvasElement, cut: number | null) {
  const W = ground.width;
  const H = ground.height;
  dst.width = W;
  dst.height = H;
  const g = ctx2d(dst);
  g.clearRect(0, 0, W, H);
  if (cut === null) {
    g.drawImage(ground, 0, 0);
    return;
  }
  const seed = cut * 97;
  const edge = (x: number) =>
    H * cut +
    Math.sin(x / (W * 0.11) + seed) * H * 0.022 +
    Math.sin(x / (W * 0.037) + seed * 2) * H * 0.008;
  const path = new Path2D();
  path.moveTo(0, H);
  for (let x = 0; x <= W; x += Math.max(2, W / 240)) path.lineTo(x, edge(x));
  path.lineTo(W, edge(W));
  path.lineTo(W, H);
  path.closePath();
  g.save();
  g.clip(path);
  g.drawImage(ground, 0, 0);
  g.restore();
  /* The paper's cut edge catches the light. */
  g.strokeStyle = "rgba(250, 244, 230, 0.85)";
  g.lineWidth = Math.max(2, W / 520);
  g.beginPath();
  for (let x = 0; x <= W; x += Math.max(2, W / 240)) {
    if (x === 0) g.moveTo(x, edge(x));
    else g.lineTo(x, edge(x));
  }
  g.stroke();
}
