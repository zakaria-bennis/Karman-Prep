"use client";
// From the last question into the ending (founder, 2026-11-19: "a crazy good animation ... right as
// you submit your last question"). One idea carried through: the question's own glass becomes the
// ring around the character.
//   1 the last question, on its glass card; Submit (pressed here after a moment, for the demo); the
//     chosen answer lights and the card holds for a beat
//   2 the card cracks into shards of glass (three.js), each carrying its piece of the question; they
//     burst out, tumbling and catching the light
//   3 they spiral in and close up into a ring where the ending's ring is, flash once, and hand over
//     to the real ring (`onLanded`), out of which the ending then unfolds (HomeworkEnd)
// With less motion asked for, none of it plays.
import gsap from "gsap";
import { useEffect, useRef, useState, type RefObject } from "react";
import { prefersStill } from "@/lib/painting/motion";
import q from "./intro.module.css";

const CHOICES = ["3", "5", "10", "25"];
const PICKED = 1;

/** A few bright high notes at once, like glass giving way. */
function crack() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 2200 + Math.random() * 3200;
      const at = now + i * 0.018 + Math.random() * 0.02;
      amp.gain.setValueAtTime(0.0001, now);
      amp.gain.setValueAtTime(0.05, at);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.25 + Math.random() * 0.2);
      osc.connect(amp).connect(ctx.destination);
      osc.start(now);
      osc.stop(at + 0.5);
    }
  } catch {
    /* no sound where the browser has none */
  }
}

/** The card as it looks, drawn onto a canvas from its own boxes and words, for the shards to carry. */
function drawCard(card: HTMLElement, dpr: number) {
  const box = card.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  const round = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const paint = (el: Element) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const x = r.left - box.left;
    const y = r.top - box.top;
    if (s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)") {
      round(x, y, r.width, r.height, parseFloat(s.borderTopLeftRadius) || 0);
      ctx.fillStyle = s.backgroundColor;
      ctx.fill();
    }
    if (s.outlineColor && el.hasAttribute("data-edge")) {
      round(
        x + 0.75,
        y + 0.75,
        r.width - 1.5,
        r.height - 1.5,
        parseFloat(s.borderTopLeftRadius) || 0
      );
      ctx.strokeStyle = s.outlineColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (el.hasAttribute("data-text")) {
      ctx.fillStyle = s.color;
      ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      ctx.textBaseline = "top";
      // the words as the browser has laid them out, line by line
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = Array.from(range.getClientRects());
      const words = (el.textContent ?? "").split(" ");
      let at = 0;
      for (const line of lines) {
        let text = "";
        while (
          at < words.length &&
          ctx.measureText(`${text}${words[at]}`).width <= line.width + 2
        ) {
          text += `${words[at]} `;
          at += 1;
        }
        ctx.fillText(
          text.trim(),
          line.left - box.left,
          line.top - box.top + (line.height - parseFloat(s.fontSize)) / 2
        );
      }
    }
    Array.from(el.children).forEach(paint);
  };
  paint(card);
  return canvas;
}

type Shard = {
  mesh: import("three").Mesh;
  /** Where it starts, in the scene's units (the middle of the screen is 0, up is +). */
  x0: number;
  y0: number;
  slot: number;
};

export function Intro({
  mode,
  target,
  onLanded,
}: {
  mode: "light" | "dark";
  /** The ring the shards close up into. */
  target: RefObject<SVGSVGElement | null>;
  onLanded: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"asking" | "sent" | "broken" | "gone">("asking");
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  }, [onLanded]);

  // with less motion asked for, straight to the ending
  useEffect(() => {
    if (prefersStill()) {
      setState("gone");
      landed.current();
    }
  }, []);

  // the card arrives as the last question, then is sent (pressed here after a moment, for the demo)
  useEffect(() => {
    if (state !== "asking" || !card.current || prefersStill()) return;
    gsap.fromTo(
      card.current,
      { y: 30, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" }
    );
    const timer = window.setTimeout(() => setState("sent"), 1700);
    return () => window.clearTimeout(timer);
  }, [state]);

  // sent: the answer lights, the button sinks, the card holds its breath, then breaks
  useEffect(() => {
    if (state !== "sent" || !card.current) return;
    const el = card.current;
    const line = gsap.timeline({ onComplete: () => setState("broken") });
    line
      .to(el.querySelector("[data-submit]"), { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 })
      .fromTo(
        el.querySelector("[data-picked]"),
        { scale: 1 },
        { scale: 1.03, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" },
        0.1
      )
      .to(el, { scale: 1.015, duration: 0.5, ease: "sine.inOut" }, 0.3)
      .to(el, { x: -2, duration: 0.04, yoyo: true, repeat: 5, ease: "none" }, 0.75);
    return () => void line.kill();
  }, [state]);

  // broken: the shards fly and close up into the ring
  useEffect(() => {
    if (state !== "broken" || !card.current || !canvas.current) return;
    let stop = false;
    let frame = 0;
    let cleanup = () => {};
    const el = card.current;
    const cv = canvas.current;
    void (async () => {
      const THREE = await import("three");
      if (stop) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio);
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
      } catch {
        setState("gone");
        landed.current();
        return;
      }
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -2000, 2000);

      const box = el.getBoundingClientRect();
      const texture = new THREE.CanvasTexture(drawCard(el, dpr));
      texture.colorSpace = THREE.SRGBColorSpace;
      // the ring the shards are going to: its middle and its radius on the screen
      const ring = target.current?.getBoundingClientRect();
      const cx = ring ? ring.left + ring.width / 2 - W / 2 : 0;
      const cy = ring ? H / 2 - (ring.top + ring.height / 2) : 0;
      const radius = ring ? (ring.width * 74) / 168 : 80;

      // the card cut into triangles on a jittered grid
      const cols = W < 600 ? 7 : 9;
      const rows = Math.max(5, Math.round((cols * box.height) / box.width));
      const pts: [number, number][][] = [];
      for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        for (let c = 0; c <= cols; c++) {
          const edge = r === 0 || r === rows || c === 0 || c === cols;
          const jx = edge && (c === 0 || c === cols) ? 0 : (Math.random() - 0.5) * 0.7;
          const jy = edge && (r === 0 || r === rows) ? 0 : (Math.random() - 0.5) * 0.7;
          pts[r][c] = [((c + jx) / cols) * box.width, ((r + jy) / rows) * box.height];
        }
      }
      const tris: [number, number][][] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const a = pts[r][c];
          const b = pts[r][c + 1];
          const d = pts[r + 1][c];
          const e = pts[r + 1][c + 1];
          if (Math.random() < 0.5) tris.push([a, b, e], [a, e, d]);
          else tris.push([a, b, d], [b, e, d]);
        }
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const shards: Shard[] = tris.map((t) => {
        const mx = (t[0][0] + t[1][0] + t[2][0]) / 3;
        const my = (t[0][1] + t[1][1] + t[2][1]) / 3;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            t.flatMap(([x, y]) => [x - mx, -(y - my), 0]),
            3
          )
        );
        geo.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(
            t.flatMap(([x, y]) => [x / box.width, 1 - y / box.height]),
            2
          )
        );
        const mesh = new THREE.Mesh(geo, material.clone());
        // a sheen of light on each piece of glass, brighter as it tilts and as the ring closes
        const shine = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({
            color: 0xfff6dc,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        shine.position.z = 1;
        mesh.add(shine);
        const x0 = box.left + mx - W / 2;
        const y0 = H / 2 - (box.top + my);
        mesh.position.set(x0, y0, 0);
        scene.add(mesh);
        return { mesh, x0, y0, slot: 0 };
      });
      // each shard takes the place on the ring nearest its own side, so they sweep round, not across
      const order = shards
        .map((s, i) => ({ i, a: Math.atan2(s.y0 - cy, s.x0 - cx) }))
        .sort((a, b) => a.a - b.a);
      order.forEach((o, n) => (shards[o.i].slot = n));
      el.style.visibility = "hidden";
      crack();
      if (flash.current)
        gsap.fromTo(
          flash.current,
          { opacity: 0.9, scale: 0.4 },
          { opacity: 0, scale: 2.2, duration: 0.9, ease: "power2.out" }
        );

      const N = shards.length;
      const cardCx = box.left + box.width / 2 - W / 2;
      const cardCy = H / 2 - (box.top + box.height / 2);
      const start = performance.now();
      const BURST = 0.55;
      const SWIRL = 1.35;
      const ease = (k: number) => 1 - Math.pow(1 - k, 3);
      const inOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
      const spin = shards.map(() => ({
        rx: (Math.random() - 0.5) * 9,
        ry: (Math.random() - 0.5) * 9,
        rz: (Math.random() - 0.5) * 6,
        out: 40 + Math.random() * (W < 600 ? 70 : 140),
        wait: Math.random() * 0.12,
      }));
      let handed = false;
      const tick = (now: number) => {
        if (stop) return;
        const t = (now - start) / 1000;
        shards.forEach((s, i) => {
          const sp = spin[i];
          const local = Math.max(0, t - sp.wait);
          // 1 out: pushed from the card's middle, tumbling
          const dx = s.x0 - cardCx;
          const dy = s.y0 - cardCy;
          const d = Math.hypot(dx, dy) || 1;
          const kb = ease(Math.min(1, local / BURST));
          const bx = s.x0 + (dx / d) * sp.out * kb;
          const by = s.y0 + (dy / d) * sp.out * kb + 30 * kb;
          // 2 in: a spiral round the ring's middle to its own place on the ring
          const ks = inOut(Math.max(0, Math.min(1, (local - BURST * 0.7) / SWIRL)));
          const a0 = Math.atan2(by - cy, bx - cx);
          const r0 = Math.hypot(bx - cx, by - cy);
          let a1 = -Math.PI / 2 + (2 * Math.PI * s.slot) / N;
          while (a1 < a0) a1 += 2 * Math.PI;
          const a = a0 + (a1 - a0) * ks;
          const r = r0 + (radius - r0) * ks;
          s.mesh.position.x = cx + Math.cos(a) * r;
          s.mesh.position.y = cy + Math.sin(a) * r;
          const tumble = (1 - ks) * kb;
          s.mesh.rotation.x = sp.rx * tumble;
          s.mesh.rotation.y = sp.ry * tumble;
          s.mesh.rotation.z = sp.rz * tumble;
          // closing up, each one thins into a piece of the ring and turns to light
          const size = 1 - ks * 0.82;
          s.mesh.scale.set(size, size, 1);
          const glint = s.mesh.children[0] as import("three").Mesh;
          const gm = glint.material as import("three").MeshBasicMaterial;
          gm.opacity = Math.min(
            0.95,
            0.25 * Math.abs(Math.sin(s.mesh.rotation.x + s.mesh.rotation.y)) + ks * ks * 0.85
          );
        });
        renderer.render(scene, camera);
        const done = t > BURST * 0.7 + SWIRL + 0.14;
        if (done && !handed) {
          handed = true;
          landed.current();
          gsap.to(cv, {
            opacity: 0,
            duration: 0.45,
            ease: "power2.out",
            onComplete: () => setState("gone"),
          });
        }
        if (t < BURST * 0.7 + SWIRL + 0.8) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      cleanup = () => {
        shards.forEach((s) => {
          s.mesh.geometry.dispose();
          (s.mesh.material as import("three").Material).dispose();
          (
            (s.mesh.children[0] as import("three").Mesh).material as import("three").Material
          ).dispose();
        });
        material.dispose();
        texture.dispose();
        renderer.dispose();
      };
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [state, target]);

  if (state === "gone") return null;
  return (
    <div className={q.layer} data-mode={mode}>
      <div className={q.flash} ref={flash} aria-hidden="true" />
      <canvas className={q.canvas} ref={canvas} aria-hidden="true" />
      <div className={q.card} ref={card} role="group" aria-label="Question 8 of 8">
        <p className={q.count} data-text>
          Question 8 of 8
        </p>
        <p className={q.ask} data-text>
          A circle in the xy-plane has the equation (x − 3)² + (y + 2)² = 25. What is the radius of
          the circle?
        </p>
        <ol className={q.choices}>
          {CHOICES.map((c, i) => (
            <li
              key={c}
              className={q.choice}
              data-edge
              data-picked={i === PICKED || undefined}
              data-right={(i === PICKED && state !== "asking") || undefined}
            >
              <span className={q.letter} data-text>
                {"ABCD"[i]}
              </span>
              <span className={q.value} data-text>
                {c}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={q.submit}
          data-submit
          onClick={() => setState("sent")}
          disabled={state !== "asking"}
        >
          <span data-text>Submit</span>
        </button>
      </div>
    </div>
  );
}
