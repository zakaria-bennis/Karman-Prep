"use client";

// The hours a student has left, as sand in an hourglass (three.js, moved with GSAP). The sand in the
// top bulb is the share of their hours still free to book, measured by volume, so half the hours is
// half the sand. Booking a session lets that much sand run through; canceling one, or buying hours,
// brings it back. The glass turns slowly, leans toward the pointer, and spins once when pressed.
// With reduced motion it is drawn still and only redrawn when the hours change.
import gsap from "gsap";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { calm } from "./homeworkMotion";

const NECK = 0.055;
/** The glass's radius, from the neck (0) to the end of a bulb (1). */
const wall = (t: number) => NECK + 0.6 * Math.pow(Math.sin(Math.min(1, t) * Math.PI * 0.6), 0.8);
/** Where sand can lie: just inside the glass. */
const inner = (t: number) => Math.max(0.012, wall(t) * 0.93 - 0.012);
const T0 = 0.03;
const T1 = 0.965;
const STEPS = 72;

// How far up a bulb the sand reaches for a share of its volume.
const VOLUME = (() => {
  const cum = [0];
  for (let i = 1; i <= STEPS; i++) {
    const t = T0 + ((T1 - T0) * (i - 0.5)) / STEPS;
    cum.push(cum[i - 1] + inner(t) ** 2);
  }
  return cum;
})();
function reach(share: number): number {
  const want = Math.min(1, Math.max(0, share)) * VOLUME[STEPS];
  let i = 1;
  while (i < STEPS && VOLUME[i] < want) i++;
  const span = VOLUME[i] - VOLUME[i - 1] || 1;
  return T0 + ((T1 - T0) * (i - 1 + (want - VOLUME[i - 1]) / span)) / STEPS;
}

const along = (from: number, to: number, y: (t: number) => number) => {
  const pts: THREE.Vector2[] = [];
  const n = Math.max(2, Math.ceil(Math.abs(to - from) * 40));
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    pts.push(new THREE.Vector2(inner(t), y(t)));
  }
  return pts;
};
/** The sand still to run: it lies in the top bulb from the neck up, dished toward the middle. */
function topSand(level: number, flowing: boolean) {
  const dip = flowing ? Math.min(0.09, (level - T0) * 0.6) : 0.012;
  return new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0001, T0),
      ...along(T0, level, (t) => t),
      new THREE.Vector2(inner(level) * 0.5, level - dip * 0.45),
      new THREE.Vector2(0.0001, level - dip),
    ],
    44
  );
}
/** The sand that has run: a heap on the floor of the bottom bulb. */
function bottomSand(level: number) {
  const peak = Math.min(0.16, (T1 - level) * 0.7);
  return {
    top: -level + peak,
    geometry: new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0001, -T1),
        ...along(T1, level, (t) => -t),
        new THREE.Vector2(inner(level) * 0.45, -level + peak * 0.5),
        new THREE.Vector2(0.0001, -level + peak),
      ],
      44
    ),
  };
}

export default function HourGlass({ share, bump }: { share: number; bump: number }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ to(share: number, first?: boolean): void; spin(): void } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      // no WebGL here: the number beside it says everything the glass does
      return;
    }
    const still = calm();
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // the canvas is drawn at the screen's own sharpness and shown at the box's size
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
    camera.position.set(0, 0.25, 7.4);
    camera.lookAt(0, 0, 0);
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.6);
    sun.position.set(2.4, 3.2, 4);
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.35));

    // the whole hourglass leans; the part inside turns
    const lean = new THREE.Group();
    const turn = new THREE.Group();
    lean.add(turn);
    scene.add(lean);

    const light = () => !!el.closest('[data-kp-mode="light"]');
    const glassMat = new THREE.MeshPhysicalMaterial({
      transparent: true,
      roughness: 0.03,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wood = new THREE.MeshStandardMaterial({
      color: 0x8f5d3b,
      roughness: 0.5,
      metalness: 0.05,
    });
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xe8a23a,
      roughness: 1,
      emissive: 0x4a2400,
      emissiveIntensity: 0.3,
    });
    // by day the glass is seen against a bright pane, so it is tinted and a little more solid
    const dress = () => {
      const day = light();
      glassMat.color.set(day ? 0x9fb3d6 : 0xffffff);
      glassMat.opacity = day ? 0.34 : 0.2;
      glassMat.envMapIntensity = day ? 1.1 : 1.9;
      wood.color.set(day ? 0x7a4c2e : 0xa87148);
    };
    dress();

    const profile: THREE.Vector2[] = [];
    for (let i = -48; i <= 48; i++) profile.push(new THREE.Vector2(wall(Math.abs(i) / 48), i / 48));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(profile, 56), glassMat);
    glass.renderOrder = 2;
    turn.add(glass);

    const plate = new THREE.CylinderGeometry(0.76, 0.76, 0.1, 56);
    const rim = new THREE.CylinderGeometry(0.7, 0.7, 0.05, 56);
    for (const side of [1, -1]) {
      const a = new THREE.Mesh(plate, wood);
      a.position.y = side * 1.07;
      const b = new THREE.Mesh(rim, wood);
      b.position.y = side * 1.0;
      turn.add(a, b);
    }
    const post = new THREE.CylinderGeometry(0.03, 0.03, 2.06, 16);
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(post, wood);
      const angle = (i / 3) * Math.PI * 2 + 0.5;
      p.position.set(Math.cos(angle) * 0.68, 0, Math.sin(angle) * 0.68);
      turn.add(p);
    }

    const top = new THREE.Mesh(new THREE.BufferGeometry(), sandMat);
    const heap = new THREE.Mesh(new THREE.BufferGeometry(), sandMat);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 1, 10), sandMat);
    const grains = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(28 * 3), 3)
      ),
      new THREE.PointsMaterial({ color: 0xffe2a0, size: 0.03, transparent: true, opacity: 0.9 })
    );
    turn.add(top, heap, stream, grains);

    const state = { share: 1, flowing: false, heapTop: -T1, t: 0 };
    const build = () => {
      const level = reach(state.share);
      top.geometry.dispose();
      top.geometry = topSand(level, state.flowing);
      top.visible = state.share > 0.004;
      const pile = bottomSand(level);
      heap.geometry.dispose();
      heap.geometry = pile.geometry;
      heap.visible = state.share < 0.996;
      state.heapTop = pile.top;
      const fall = 0 - pile.top;
      stream.scale.y = fall;
      stream.position.y = -fall / 2;
      stream.visible = grains.visible = state.flowing && top.visible;
    };
    const frame = () => renderer.render(scene, camera);
    build();

    const size = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // a narrow box pulls the camera back so the frame's corners stay inside
      camera.position.z = 7.4 * Math.max(1, 0.78 / camera.aspect);
      camera.updateProjectionMatrix();
      frame();
    };
    const sized = new ResizeObserver(size);
    sized.observe(el);
    const mode = new MutationObserver(() => {
      dress();
      frame();
    });
    const shell = el.closest("[data-kp-mode]");
    if (shell) mode.observe(shell, { attributes: true, attributeFilter: ["data-kp-mode"] });

    // ---- motion ----
    let level: gsap.core.Tween | null = null;
    const to = (share: number, first = false) => {
      const target = Math.min(1, Math.max(0, share));
      level?.kill();
      if (still) {
        state.share = target;
        state.flowing = false;
        build();
        return frame();
      }
      // sand only runs down: when hours come back, it rises without a stream
      state.flowing = target < state.share;
      level = gsap.to(state, {
        share: target,
        duration: first ? 2.2 : Math.max(0.9, Math.abs(target - state.share) * 6),
        delay: first ? 0.35 : 0,
        ease: first ? "power2.out" : "power2.inOut",
        onUpdate: build,
        onComplete: () => {
          state.flowing = false;
          build();
        },
      });
    };
    const spin = () => {
      if (still) return;
      gsap.fromTo(
        turn.rotation,
        { y: turn.rotation.y },
        {
          y: turn.rotation.y + Math.PI * 2,
          duration: 1.5,
          ease: "elastic.out(1, 0.6)",
        }
      );
      gsap.fromTo(
        lean.scale,
        { x: 0.9, y: 0.9, z: 0.9 },
        { x: 1, y: 1, z: 1, duration: 0.9, ease: "elastic.out(1, 0.4)" }
      );
    };
    api.current = { to, spin };

    const leanX = gsap.quickTo(lean.rotation, "x", { duration: 0.6, ease: "power3.out" });
    const leanZ = gsap.quickTo(lean.rotation, "z", { duration: 0.6, ease: "power3.out" });
    const point = (e: PointerEvent) => {
      if (still) return;
      const box = el.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height / 2);
      // it leans toward a pointer that is near, and stands straight for one far away
      const near = Math.max(0, 1 - Math.hypot(dx, dy) / 460);
      leanZ(Math.max(-1, Math.min(1, dx / 200)) * -0.13 * near);
      leanX(Math.max(-1, Math.min(1, dy / 200)) * 0.1 * near);
    };
    const rest = () => {
      leanX(0);
      leanZ(0);
    };
    window.addEventListener("pointermove", point);
    el.addEventListener("pointerleave", rest);
    el.addEventListener("click", spin);

    let seen = true;
    const watch = new IntersectionObserver(([entry]) => (seen = entry.isIntersecting));
    watch.observe(el);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!seen || document.hidden) return;
      state.t += dt;
      turn.rotation.y += dt * 0.22;
      lean.position.y = Math.sin(state.t * 0.9) * 0.02;
      if (grains.visible) {
        const pos = grains.geometry.getAttribute("position") as THREE.BufferAttribute;
        const fall = 0 - state.heapTop;
        for (let i = 0; i < pos.count; i++) {
          const phase = (state.t * 1.6 + i / pos.count) % 1;
          const spread = phase * phase * 0.05;
          pos.setXYZ(
            i,
            Math.sin(i * 12.9898) * spread,
            -phase * phase * fall,
            Math.cos(i * 78.233) * spread
          );
        }
        pos.needsUpdate = true;
      }
      frame();
    };
    size();
    if (!still) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      level?.kill();
      gsap.killTweensOf([turn.rotation, lean.rotation, lean.scale]);
      window.removeEventListener("pointermove", point);
      el.removeEventListener("pointerleave", rest);
      el.removeEventListener("click", spin);
      sized.disconnect();
      mode.disconnect();
      watch.disconnect();
      api.current = null;
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
      });
      [glassMat, wood, sandMat, grains.material as THREE.Material].forEach((m) => m.dispose());
      scene.environment?.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const first = useRef(true);
  useEffect(() => {
    api.current?.to(share, first.current);
    first.current = false;
  }, [share]);
  useEffect(() => {
    if (bump > 0) api.current?.spin();
  }, [bump]);

  return <div ref={host} aria-hidden="true" style={{ width: "100%", height: "100%" }} />;
}
