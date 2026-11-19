"use client";
// What the last-question transitions share (Intro.tsx): the sounds, the card drawn onto a canvas for
// three.js to carry, and a full-screen three.js stage measured in screen pixels.
/** A few bright high notes at once, like glass giving way. */
export function crack() {
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
/** `every`: draw the words of every element that holds only words, not just those marked data-text. */
export function drawCard(card: HTMLElement, dpr: number, every = false) {
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
    const leaf = every && el.children.length === 0 && (el.textContent ?? "").trim() !== "";
    if (el.hasAttribute("data-text") || leaf) {
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

/** A soft rising chime, for something gathering (fireflies, a plane taking off). */
export function chime(notes = [880, 1108.7, 1318.5, 1760]) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const at = now + i * 0.09;
      amp.gain.setValueAtTime(0.0001, now);
      amp.gain.linearRampToValueAtTime(0.06, at + 0.02);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
      osc.connect(amp).connect(ctx.destination);
      osc.start(now);
      osc.stop(at + 1);
    });
  } catch {
    /* no sound where the browser has none */
  }
}

/** A paper whoosh: noise swept through a filter. */
export function whoosh(seconds = 0.7) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const n = Math.round(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + seconds);
    const amp = ctx.createGain();
    amp.gain.value = 0.12;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start();
  } catch {
    /* no sound where the browser has none */
  }
}

export type Stage = {
  THREE: typeof import("three");
  renderer: import("three").WebGLRenderer;
  scene: import("three").Scene;
  camera: import("three").Camera;
  W: number;
  H: number;
  dpr: number;
  /** A point on the screen (pixels from the top left) in the scene (middle 0, up +). */
  at: (x: number, y: number) => { x: number; y: number };
};

/** A full-screen three.js stage on `canvas`, measured in screen pixels. Null where WebGL is not to
 *  be had. `perspective` gives a camera with depth whose plane at z = 0 is still one pixel a unit. */
export async function stageOn(
  canvas: HTMLCanvasElement,
  perspective = false
): Promise<Stage | null> {
  const THREE = await import("three");
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio);
  let renderer: import("three").WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  let camera: import("three").Camera;
  if (perspective) {
    const fov = 40;
    const cam = new THREE.PerspectiveCamera(fov, W / H, 1, 6000);
    cam.position.z = H / 2 / Math.tan((fov * Math.PI) / 360);
    camera = cam;
  } else {
    camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -2000, 2000);
  }
  return {
    THREE,
    renderer,
    scene,
    camera,
    W,
    H,
    dpr,
    at: (x, y) => ({ x: x - W / 2, y: H / 2 - y }),
  };
}

/** What a transition is given, and gives back (a way to stop it). */
export type Run = (o: {
  card: HTMLElement;
  canvas: HTMLCanvasElement;
  flash: HTMLElement | null;
  /** The ring on the ending, where it will be. */
  ring: DOMRect | null;
  /** The ending's left pane, where it will be (for the flip). */
  side: HTMLElement | null;
  /** Hand over to the ending: it starts to open. */
  onLanded: () => void;
  /** The transition is over: its layer can go. */
  onGone: () => void;
}) => () => void;
