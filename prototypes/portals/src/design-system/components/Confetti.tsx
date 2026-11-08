import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useThemeColors } from "../theme";
import { COIN } from "../themes";
import { reducedMotionNow } from "../motion";

/*
 * Confetti: pieces that fly out at a real moment, fall, flutter and stop.
 * Ported from the end screen's canvas port of Burst (21st.dev 33152): a radial
 * pop with drag and gravity, plus the two corner cannons and the gold coin discs
 * for the token moment. Off under reduced motion. Place a <ConfettiLayer> at the
 * top of a `relative` screen and fire it with useConfetti().
 */
type Kind = "score" | "companion" | "prize" | "level" | "tokens";
type Shape = "ribbon" | "dot" | "coin";
interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shape: Shape;
  color: string;
  size: number;
  rot: number;
  spin: number;
  flip: number;
  flipV: number;
  sway: number;
  life: number;
  age: number;
  wait: number;
}

const Ctx = createContext<{
  fire(kind: Kind, at: HTMLElement | { x: number; y: number }): void;
} | null>(null);

export function useConfetti() {
  const c = useContext(Ctx);
  return c ?? { fire: () => {} };
}

export function ConfettiLayer({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Piece[]>([]);
  const raf = useRef(0);
  const last = useRef(0);
  const theme = useThemeColors();
  const [active, setActive] = useState(false);

  const tick = useCallback((t: number) => {
    const c = canvasRef.current;
    const host = c?.parentElement;
    if (!c || !host) return;
    const dt = Math.min(0.033, (t - last.current) / 1000 || 0.016);
    last.current = t;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const grav = 900 * (h / 844);
    parts.current = parts.current.filter((p) => {
      if (p.wait > 0) {
        p.wait -= dt;
        return true;
      }
      p.age += dt;
      if (p.age > p.life || p.y - p.size > h) return false;
      p.vy += grav * dt;
      p.vx *= 1 - 1.2 * dt;
      if (p.vy > 0) p.vy *= 1 - 2.2 * dt;
      p.sway += dt * 3;
      p.x += (p.vx + (p.vy > 0 ? Math.sin(p.sway) * 30 : 0)) * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.flip += p.flipV * dt;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.globalAlpha = Math.min(1, (p.life - p.age) * 1.6, p.age * 12);
      if (p.shape === "ribbon") {
        g.scale(1, Math.cos(p.flip));
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === "dot") {
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(0, 0, p.size / 3, 0, 6.28);
        g.fill();
      } else {
        const r = p.size / 2;
        g.scale(Math.cos(p.flip), 1);
        g.fillStyle = COIN.face[2];
        g.beginPath();
        g.arc(0, 0, r, 0, 6.28);
        g.fill();
        g.fillStyle = COIN.face[1];
        g.beginPath();
        g.arc(0, 0, r * 0.74, 0, 6.28);
        g.fill();
        g.fillStyle = "rgba(255,255,255,.7)";
        g.beginPath();
        g.arc(-r * 0.25, -r * 0.3, r * 0.22, 0, 6.28);
        g.fill();
      }
      g.restore();
      return true;
    });
    raf.current = parts.current.length ? requestAnimationFrame(tick) : 0;
    if (!parts.current.length) {
      g.clearRect(0, 0, w, h);
      setActive(false);
    }
  }, []);

  const run = useCallback(() => {
    setActive(true);
    if (!raf.current) {
      last.current = performance.now();
      raf.current = requestAnimationFrame(tick);
    }
  }, [tick]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const value = useMemo(() => {
    const piece = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      cols: string[],
      shapes: Shape[]
    ): Piece => {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      return {
        x,
        y,
        vx,
        vy,
        shape,
        color: cols[Math.floor(Math.random() * cols.length)],
        size: shape === "coin" ? 7 + Math.random() * 4 : 6 + Math.random() * 6,
        rot: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 14,
        flip: Math.random() * 6.28,
        flipV: 6 + Math.random() * 8,
        sway: Math.random() * 6.28,
        life: 1.6 + Math.random() * 1.4,
        age: 0,
        wait: 0,
      };
    };
    return {
      fire(kind: Kind, at: HTMLElement | { x: number; y: number }) {
        const host = canvasRef.current?.parentElement;
        if (!host || reducedMotionNow()) return;
        const hr = host.getBoundingClientRect();
        const k = hr.width / host.clientWidth || 1;
        let o: { x: number; y: number };
        if (at instanceof HTMLElement) {
          const r = at.getBoundingClientRect();
          o = { x: (r.left + r.width / 2 - hr.left) / k, y: (r.top + r.height / 2 - hr.top) / k };
        } else o = at;
        const W = host.clientWidth,
          H = host.clientHeight,
          s = H / 844;
        const cols = [
          theme.accent,
          theme.accent,
          theme.math,
          theme.reading,
          COIN.face[1],
          theme.text,
        ];
        const pop = (n: number, power: number, c: string[], shapes: Shape[]) => {
          for (let i = 0; i < n; i++) {
            const a = Math.random() * 6.28,
              v = power * s * (0.45 + Math.random() * 0.55);
            parts.current.push(
              piece(o.x, o.y, Math.cos(a) * v, Math.sin(a) * v - power * s * 0.35, c, shapes)
            );
          }
        };
        const cannon = (x: number, y: number, n: number) => {
          const g = 900 * s,
            rise = Math.max(120, y - o.y + 80),
            dx = o.x - x,
            deg = (Math.atan2(-rise, dx * 1.25) * 180) / Math.PI;
          const power =
            (Math.sqrt(2 * g * rise) / Math.sin((Math.abs(deg) * Math.PI) / 180)) * 1.12;
          for (let i = 0; i < n; i++) {
            const a = ((deg + (Math.random() - 0.5) * 34) * Math.PI) / 180,
              v = power * (0.62 + Math.random() * 0.42);
            const p = piece(
              x + (Math.random() - 0.5) * 30,
              y,
              Math.cos(a) * v,
              Math.sin(a) * v,
              cols,
              ["ribbon", "ribbon", "dot"]
            );
            p.life += 0.8;
            p.wait = Math.random() * 0.22;
            parts.current.push(p);
          }
        };
        if (kind === "score" || kind === "companion") {
          cannon(-6, H + 6, 60);
          cannon(W + 6, H + 6, 60);
          pop(40, 620, cols, ["ribbon", "dot"]);
        } else if (kind === "prize") pop(70, 760, cols, ["ribbon", "ribbon", "dot"]);
        else if (kind === "level") pop(22, 380, cols, ["dot", "ribbon"]);
        else pop(22, 360, [COIN.face[1], COIN.rim[0]], ["coin", "coin", "dot"]);
        run();
      },
    };
  }, [theme, run]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Hidden until a moment fires, so it never covers text and costs nothing at rest. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-confetti${active ? "" : "hidden"}`}
      />
    </Ctx.Provider>
  );
}
