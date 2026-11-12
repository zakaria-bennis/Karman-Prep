/*
 * Tokens flying to the balance (founder's reward layer: "the tokens earned fly to the corner
 * counter"). Each token leaves from `from`, rises on an arc and lands on `to`, a few at a time;
 * `onLand` runs as each one lands, so the balance can count and bump. Still: nothing flies, and
 * every landing happens at once.
 */
import { stillNow } from "./motion";
import s from "./rewards.module.css";

const TOKEN_SVG =
  '<svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><circle cx="10" cy="10" r="8" class="TOKEN"/><path d="M6.6 10h6.8" class="MARK"/></svg>';

export async function flyTokens(
  from: Element | null,
  to: Element | null,
  count: number,
  onLand: (index: number) => void
): Promise<void> {
  const n = Math.max(0, Math.min(10, Math.round(count)));
  if (!from || !to || n === 0 || stillNow() || typeof document === "undefined") {
    for (let i = 0; i < n; i++) onLand(i);
    return;
  }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2 - 11;
  const y0 = a.top + a.height * 0.4 - 11;
  const x1 = b.left + 14 - 11;
  const y1 = b.top + b.height / 2 - 11;
  const html = TOKEN_SVG.replace("TOKEN", s.token).replace("MARK", s.tokenMark);
  // The tokens fly over the page, outside the shell: carry its colors with them.
  const css = getComputedStyle(to);
  const shades = ["--l2", "--l4"].map((v) => [v, css.getPropertyValue(v)] as const);
  const flights = Array.from({ length: n }, (_, i) => {
    const el = document.createElement("span");
    el.className = s.flying;
    el.innerHTML = html;
    for (const [v, c] of shades) if (c) el.style.setProperty(v, c);
    document.body.appendChild(el);
    // Each token spreads a little as it leaves, peaks above the straight line, then dives in.
    const spread = (i - (n - 1) / 2) * 14;
    const lift = 90 + (i % 3) * 26;
    const point = (k: number) => {
      const mx = (x0 + x1) / 2 + spread;
      const my = Math.min(y0, y1) - lift;
      const x = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1;
      const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1;
      return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    const frames: Keyframe[] = [0, 0.25, 0.5, 0.75, 1].map((k) => ({
      transform: `${point(k)} scale(${k === 0 ? 0.5 : k === 1 ? 0.7 : 1})`,
      opacity: k === 0 ? 0 : 1,
      offset: k,
    }));
    const anim = el.animate(frames, {
      duration: 620 + (i % 3) * 40,
      delay: i * 70,
      easing: "cubic-bezier(0.45, 0, 0.55, 1)",
      fill: "both",
    });
    return anim.finished
      .catch(() => undefined)
      .then(() => {
        el.remove();
        onLand(i);
      });
  });
  await Promise.all(flights);
}
