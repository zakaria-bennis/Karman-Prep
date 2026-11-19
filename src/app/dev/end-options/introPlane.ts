"use client";
// The paper plane (founder, 2026-11-19: the Library already has paper planes in its sky). The card,
// question and all, folds itself the way a paper plane is folded: the two top corners in to the
// middle, then in half along the middle, and its halves open into a V. It shrinks to a plane, takes
// off with a whoosh, flies a loop over the landscape leaving a trail of light, and circles where the
// ending's ring will be; the circle its trail draws there is the ring, and the plane tucks into it.
import gsap from "gsap";
import { FRAG, VERT } from "./introFireflies";
import { chime, drawCard, stageOn, whoosh, type Run } from "./introKit";

type V2 = [number, number];

export const plane: Run = ({ card, canvas, ring, onLanded, onGone }) => {
  let stop = false;
  let frame = 0;
  let cleanup = () => {};
  const timelines: gsap.core.Timeline[] = [];
  void (async () => {
    const stage = await stageOn(canvas, true);
    if (stop) return;
    if (!stage) {
      onLanded();
      onGone();
      return;
    }
    const { THREE, renderer, scene, camera, W, H, dpr, at } = stage;
    const box = card.getBoundingClientRect();
    const w = box.width;
    const h = box.height;
    const dark = card.parentElement?.getAttribute("data-mode") === "dark";
    const face = new THREE.CanvasTexture(drawCard(card, dpr));
    face.colorSpace = THREE.SRGBColorSpace;
    const front = new THREE.MeshBasicMaterial({ map: face, side: THREE.FrontSide });
    const back = new THREE.MeshBasicMaterial({
      color: dark ? 0x2a2d48 : 0xf3eee4,
      side: THREE.BackSide,
    });

    // a flat piece of the sheet, given in the sheet's own pixels (from its top left, down is +), its
    // points measured from `origin`
    const piece = (points: V2[], origin: V2) => {
      const pos: number[] = [];
      const uv: number[] = [];
      for (let i = 1; i < points.length - 1; i++)
        // wound so the face printed with the question faces the viewer (y runs down on the sheet)
        for (const [x, y] of [points[0], points[i + 1], points[i]]) {
          pos.push(x - origin[0], -(y - origin[1]), 0);
          uv.push(x / w, 1 - y / h);
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, front), new THREE.Mesh(geo, back));
      return g;
    };
    const fold = Math.min(w / 2, h * 0.9);
    // the sheet, its middle at the card's middle; the halves meet on its middle line
    const paper = new THREE.Group();
    const mid: V2 = [w / 2, h / 2];
    const right = new THREE.Group();
    const left = new THREE.Group();
    right.add(
      piece(
        [
          [w / 2, 0],
          [w, fold],
          [w, h],
          [w / 2, h],
        ],
        mid
      )
    );
    left.add(
      piece(
        [
          [w / 2, 0],
          [w / 2, h],
          [0, h],
          [0, fold],
        ],
        mid
      )
    );
    // the top corners, each on a hinge along its fold line, from the nose down to the edge
    const nose = new THREE.Vector3(0, h / 2, 0);
    const tr = new THREE.Group();
    tr.position.copy(nose);
    tr.add(
      piece(
        [
          [w / 2, 0],
          [w, 0],
          [w, fold],
        ],
        [w / 2, 0]
      )
    );
    const tl = new THREE.Group();
    tl.position.copy(nose);
    tl.add(
      piece(
        [
          [w / 2, 0],
          [0, fold],
          [0, 0],
        ],
        [w / 2, 0]
      )
    );
    right.add(tr);
    left.add(tl);
    paper.add(right, left);
    const start = at(box.left + w / 2, box.top + h / 2);
    paper.position.set(start.x, start.y, 0);
    scene.add(paper);
    card.style.visibility = "hidden";

    const axisR = new THREE.Vector3(w / 2, -fold, 0).normalize();
    const axisL = new THREE.Vector3(-w / 2, -fold, 0).normalize();
    // what the folding moves: each corner's turn, the halves' turn, the size, the heading, the roll
    const s = { tr: 0, tl: 0, half: 0, size: 1, heading: 0, roll: 0, tilt: 0 };
    const pose = () => {
      tr.quaternion.setFromAxisAngle(axisR, -s.tr);
      tr.position.z = s.tr > 0.01 ? 0.6 : 0;
      tl.quaternion.setFromAxisAngle(axisL, s.tl);
      tl.position.z = s.tl > 0.01 ? 0.6 : 0;
      left.rotation.y = -s.half;
      right.rotation.y = s.half * 0.18;
      paper.scale.setScalar(s.size);
      paper.rotation.set(s.tilt, s.roll, s.heading, "ZYX");
    };

    // the flight: up and over in a loop, then once round the ring
    const ringBox = ring;
    const rc = ringBox
      ? at(ringBox.left + ringBox.width / 2, ringBox.top + ringBox.height / 2)
      : { x: 0, y: 0 };
    const R = ringBox ? (ringBox.width * 74) / 168 : 80;
    const clampX = (x: number) => Math.max(-W / 2 + 60, Math.min(W / 2 - 60, x));
    const clampY = (y: number) => Math.max(-H / 2 + 80, Math.min(H / 2 - 60, y));
    const loop: V2[] = [
      [start.x, start.y],
      [clampX(start.x + W * 0.24), clampY(start.y + H * 0.12)],
      [clampX(start.x + W * 0.16), clampY(start.y + H * 0.36)],
      [clampX(start.x - W * 0.06), clampY(start.y + H * 0.2)],
      [clampX(start.x + W * 0.02), clampY(start.y - H * 0.04)],
    ];
    const enter = Math.atan2(loop[4][1] - rc.y, loop[4][0] - rc.x);
    const round: V2[] = Array.from({ length: 17 }, (_, i) => {
      const a = enter - (i / 16) * Math.PI * 2;
      return [rc.x + Math.cos(a) * R, rc.y + Math.sin(a) * R];
    });
    const curve = new THREE.CatmullRomCurve3(
      [...loop, ...round].map(([x, y]) => new THREE.Vector3(x, y, 0)),
      false,
      "centripetal"
    );
    // how far along the path the circle round the ring begins
    const lengths = curve.getLengths(400);
    const total = lengths[lengths.length - 1];
    const circleFrom = (total - Math.PI * 2 * R) / total;

    // the trail: soft dots of light, fading behind the plane except round the ring, where they stay
    const MAX = 900;
    const trailPos = new Float32Array(MAX * 3);
    const trailCol = new Float32Array(MAX * 3);
    const trailAlpha = new Float32Array(MAX);
    const trailSize = new Float32Array(MAX);
    const born: number[] = [];
    const keep: boolean[] = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(trailCol, 3));
    geo.setAttribute("alpha", new THREE.BufferAttribute(trailAlpha, 1));
    geo.setAttribute("size", new THREE.BufferAttribute(trailSize, 1));
    geo.setDrawRange(0, 0);
    const trailMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });
    const trail = new THREE.Points(geo, trailMat);
    scene.add(trail);
    const warm = dark ? [1, 0.78, 0.38] : [1, 0.62, 0.16];
    const dotSize = (W < 600 ? 9 : 12) * dpr;

    const fly = { u: 0, on: false };
    let last = performance.now();
    let clock = 0;
    let handed = false;
    const tick = (now: number) => {
      if (stop) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      if (fly.on) {
        const u = Math.min(1, fly.u);
        const p = curve.getPointAt(u);
        const t = curve.getTangentAt(u);
        paper.position.set(p.x, p.y, 0);
        s.heading = Math.atan2(t.y, t.x) - Math.PI / 2;
        s.roll = 0.55 + Math.sin(u * Math.PI * 4) * 0.35;
        s.tilt = -0.35;
        // a dot of light behind the plane
        const n = born.length;
        if (n < MAX && u < 0.999) {
          trailPos.set([p.x, p.y, -1], n * 3);
          trailCol.set(warm, n * 3);
          born.push(clock);
          keep.push(u >= circleFrom - 0.01);
        }
      }
      // the trail fades behind the plane, but not where it rounds the ring
      for (let i = 0; i < born.length; i++) {
        const age = clock - born[i];
        const k = keep[i] ? 1 : Math.max(0, 1 - age / 0.9);
        trailAlpha[i] = k;
        trailSize[i] = dotSize * (keep[i] ? 1 : 0.55 + 0.45 * k) * (age < 0.08 ? 1.4 : 1);
      }
      geo.setDrawRange(0, born.length);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      pose();
      renderer.render(scene, camera);
      if (fly.u >= 1 && !handed) {
        handed = true;
        onLanded();
        gsap.to(canvas, { opacity: 0, duration: 0.5, delay: 0.15, onComplete: onGone });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const line = gsap.timeline();
    timelines.push(line);
    line
      // the corners fold in to the middle
      .add(() => whoosh(0.35), 0)
      .to(s, { tr: Math.PI, duration: 0.42, ease: "power2.inOut" }, 0)
      .to(s, { tl: Math.PI, duration: 0.42, ease: "power2.inOut" }, 0.14)
      // in half along the middle, opening into a V as it shrinks to a plane
      .add(() => whoosh(0.3), 0.55)
      .to(s, { half: Math.PI * 0.84, duration: 0.5, ease: "power2.inOut" }, 0.55)
      .to(s, { size: (W < 600 ? 74 : 96) / h, duration: 0.6, ease: "power3.inOut" }, 0.7)
      .to(s, { tilt: -0.35, roll: 0.55, duration: 0.4, ease: "power2.out" }, 0.9)
      // off it goes, round the loop and once round the ring
      .add(() => {
        fly.on = true;
        whoosh(0.8);
        chime([660, 880, 1318.5]);
      }, 1.3)
      .to(fly, { u: 1, duration: 2.5, ease: "power1.inOut" }, 1.3)
      // it tucks into the ring
      .to(s, { size: 0.0001, duration: 0.3, ease: "back.in(2)" }, 3.65);

    cleanup = () => {
      timelines.forEach((t) => t.kill());
      paper.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      front.dispose();
      back.dispose();
      face.dispose();
      geo.dispose();
      trailMat.dispose();
      renderer.dispose();
    };
  })();
  return () => {
    stop = true;
    cancelAnimationFrame(frame);
    cleanup();
  };
};
