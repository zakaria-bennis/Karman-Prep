"use client";
// What the last-question transitions share (Intro.tsx): the glass's crack, the quiz drawn onto a
// canvas for three.js to carry, specks of light, and a full-screen three.js stage in screen pixels.
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
  const glass =
    getComputedStyle(card).getPropertyValue("--quiz-panel").trim() || "rgba(255, 255, 255, 0.5)";
  const round = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const paint = (el: Element) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const x = r.left - box.left;
    const y = r.top - box.top;
    // its glass: its own color, a ::before or ::after that paints it, or, for frosted glass with no
    // color of its own, the page's glass color
    const clear = "rgba(0, 0, 0, 0)";
    const before = getComputedStyle(el, "::before");
    const after = getComputedStyle(el, "::after");
    const fill =
      (s.backgroundColor !== clear && s.backgroundColor) ||
      (before.content !== "none" && before.backgroundColor !== clear && before.backgroundColor) ||
      (after.content !== "none" && after.backgroundColor !== clear && after.backgroundColor) ||
      (s.backdropFilter && s.backdropFilter !== "none" && glass) ||
      "";
    if (fill && r.width > 0 && r.height > 0) {
      round(x, y, r.width, r.height, parseFloat(s.borderTopLeftRadius) || 0);
      ctx.fillStyle = fill;
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

/** Points of light with their own color, alpha and size (three.js ShaderMaterial). */
export const VERT = `
attribute vec3 color;
attribute float alpha;
attribute float size;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = color;
  vAlpha = alpha;
  gl_PointSize = size;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
/** A speck of light: a white-hot middle in its own color and a soft halo round it. */
export const FRAG = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float halo = pow(1.0 - d, 1.6);
  float core = pow(1.0 - d, 6.0);
  vec3 c = mix(vColor * 0.85, vec3(1.0, 0.98, 0.9), core);
  gl_FragColor = vec4(c, vAlpha * clamp(halo * 1.3, 0.0, 1.0));
}`;

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
  /** A dark veil over the landscape, for the light being drawn in. */
  veil: HTMLElement | null;
  /** The ring on the ending, where it will be. */
  ring: DOMRect | null;
  /** The ending's left pane, where it will be (for the flip). */
  side: HTMLElement | null;
  /** Hand over to the ending: it starts to open. */
  onLanded: () => void;
  /** The transition is over: its layer can go. */
  onGone: () => void;
}) => () => void;

/** A piece of the broken glass: its mesh (carrying its piece of the picture) inside a holder, the
 *  sheen on it, and where it started (the middle of the screen is 0, up is +). */
export type Piece = {
  holder: import("three").Group;
  mesh: import("three").Mesh;
  shine: import("three").MeshBasicMaterial;
  x0: number;
  y0: number;
};

/** The card cut into triangles of glass on a jittered grid, each carrying its piece of `texture`,
 *  added to the stage where the card was. */
export function cutShards(stage: Stage, el: HTMLElement, texture: import("three").Texture) {
  const { THREE, scene, W, H } = stage;
  const box = el.getBoundingClientRect();
  const cols = W < 600 ? 7 : 9;
  const rows = Math.max(5, Math.round((cols * box.height) / box.width));
  const pts: [number, number][][] = [];
  for (let r = 0; r <= rows; r++) {
    pts[r] = [];
    for (let c = 0; c <= cols; c++) {
      const side = c === 0 || c === cols;
      const end = r === 0 || r === rows;
      const jx = side ? 0 : (Math.random() - 0.5) * 0.7;
      const jy = end ? 0 : (Math.random() - 0.5) * 0.7;
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
  return tris.map((t): Piece => {
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
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
    );
    // a sheen of light on the glass, brighter as it tilts
    const shine = new THREE.MeshBasicMaterial({
      color: 0xfff6dc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glint = new THREE.Mesh(geo, shine);
    glint.position.z = 1;
    mesh.add(glint);
    const holder = new THREE.Group();
    holder.add(mesh);
    const x0 = box.left + mx - W / 2;
    const y0 = H / 2 - (box.top + my);
    holder.position.set(x0, y0, 0);
    scene.add(holder);
    return { holder, mesh, shine, x0, y0 };
  });
}

/** Lets go of the pieces' geometry and materials. */
export function dropShards(pieces: Piece[]) {
  pieces.forEach((p) => {
    p.mesh.geometry.dispose();
    (p.mesh.material as import("three").Material).dispose();
    p.shine.dispose();
  });
}
