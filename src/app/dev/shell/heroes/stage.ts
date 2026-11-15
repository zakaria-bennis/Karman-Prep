// The shared three.js stage for the Library's hero demos: one canvas, one camera, two "stations" where
// the two subjects stand. A wide stage puts them side by side (desktop); a tall one stacks them (phone),
// so each hero is composed for both without being written twice.
import { gsap } from "gsap";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** 0 is Reading and Writing, 1 is Math. */
export type Side = 0 | 1;

export interface Layout {
  portrait: boolean;
  /** Half the width and height of what the camera sees at z = 0, in world units. */
  halfW: number;
  halfH: number;
}

export interface Hero {
  hover(side: Side | null): void;
  choose(side: Side, done: () => void): void;
  /** Split sky only: the pointer is dragging at this point, or (null) was let go. */
  drag?(at: { x: number; y: number } | null): Side | null;
}

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  stations: [THREE.Group, THREE.Group];
  layout: Layout;
  still: boolean;
  onLayout(fn: (layout: Layout) => void): void;
  onFrame(fn: (time: number, dt: number) => void): void;
  toWorld(clientX: number, clientY: number): { x: number; y: number };
  start(): void;
  dispose(): void;
}

const FOV = 30;

export function createStage(box: HTMLElement, still: boolean): Stage {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.localClippingEnabled = true;
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });
  box.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  // a warm key from the upper left, a cool rim from behind, and little fill: faces must differ to read
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.0);
  sun.position.set(-4, 5, 5);
  const rim = new THREE.DirectionalLight(0xbcd4ff, 1.3);
  rim.position.set(5, 2, -4);
  scene.add(sun, rim, new THREE.HemisphereLight(0xfff4e6, 0x6b4a3a, 0.3));

  const stations: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  scene.add(...stations);

  const layout: Layout = { portrait: false, halfW: 1, halfH: 1 };
  const layoutFns: ((layout: Layout) => void)[] = [];
  const frameFns: ((time: number, dt: number) => void)[] = [];
  const draw = () => renderer.render(scene, camera);

  const size = () => {
    const w = box.clientWidth || 1;
    const h = box.clientHeight || 1;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const portrait = aspect < 0.95;
    // the camera backs off until both stations fit, whatever the shape of the stage
    const needW = portrait ? 5 : 10.4;
    const needH = portrait ? 10.6 : 5.9;
    const t = Math.tan((FOV * Math.PI) / 360);
    const z = Math.max(needW / (2 * t * aspect), needH / (2 * t));
    camera.aspect = aspect;
    camera.position.set(0, 0, z);
    camera.updateProjectionMatrix();
    layout.portrait = portrait;
    layout.halfH = t * z;
    layout.halfW = layout.halfH * aspect;
    if (portrait) {
      // each half keeps its lower third for the plaque, so the subject stands in the upper two thirds
      stations[0].position.set(0, layout.halfH * 0.74, 0);
      stations[1].position.set(0, -layout.halfH * 0.31, 0);
      stations.forEach((s) => s.scale.setScalar(0.68));
    } else {
      stations.forEach((s) => s.scale.setScalar(1));
      stations[0].position.set(-layout.halfW * 0.5, layout.halfH * 0.16, 0);
      stations[1].position.set(layout.halfW * 0.5, layout.halfH * 0.16, 0);
    }
    layoutFns.forEach((fn) => fn(layout));
  };

  let time = 0;
  let last = 0;
  const tick = () => {
    const now = performance.now();
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    time += dt;
    frameFns.forEach((fn) => fn(time, dt));
    draw();
  };
  const sized = new ResizeObserver(() => {
    size();
    if (still) tick();
  });

  return {
    scene,
    camera,
    renderer,
    stations,
    layout,
    still,
    onLayout: (fn) => {
      layoutFns.push(fn);
    },
    onFrame: (fn) => {
      frameFns.push(fn);
    },
    toWorld: (clientX, clientY) => {
      const r = box.getBoundingClientRect();
      return {
        x: (((clientX - r.left) / r.width) * 2 - 1) * layout.halfW,
        y: -(((clientY - r.top) / r.height) * 2 - 1) * layout.halfH,
      };
    },
    start: () => {
      sized.observe(box);
      size();
      if (still) tick();
      else gsap.ticker.add(tick);
    },
    dispose: () => {
      gsap.ticker.remove(tick);
      sized.disconnect();
      pmrem.dispose();
      scene.traverse((o) => {
        const m = o as {
          geometry?: { dispose(): void };
          material?: { dispose(): void } | { dispose(): void }[];
        };
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) =>
          x.dispose()
        );
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/** The usual way a chosen subject takes the stage: the other one shrinks away, this one comes forward. */
export function comeForward(stage: Stage, side: Side, then: gsap.core.Timeline) {
  const win = stage.stations[side];
  const lose = stage.stations[side === 0 ? 1 : 0];
  return gsap
    .timeline()
    .to(lose.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.45, ease: "back.in(1.8)" }, 0)
    .to(win.position, { x: 0, y: 0, z: 1.2, duration: 0.8, ease: "power3.inOut" }, 0)
    .to(win.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.8, ease: "power3.inOut" }, 0)
    .add(then, 0.45);
}
