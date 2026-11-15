// Hero 2, the book and the orrery. Reading and Writing is a great open book: its pages lift, curl and
// turn, and folded paper birds rise out of it. Math is a brass orrery: gimbal rings turn about a lit
// sun while planets run their orbits; hovered, the rings swing level like the rings of a diagram.
// Everything is built from shapes here. No model file, no image.
import { gsap } from "gsap";
import * as THREE from "three";
import { comeForward, type Hero, type Stage } from "./stage";

const CREAM = 0xfff6e8;

/** Lines of "writing" for the pages, drawn on a small canvas. */
function writing(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 352;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff6e8";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "rgba(74, 54, 46, 0.4)";
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 36, i = 0; y < 320; y += 16, i++) {
    if (i % 6 === 5) continue; // a gap between paragraphs
    g.fillRect(26, y, (i % 6 === 4 ? 90 : 170) + rnd() * 34, 4.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function build(stage: Stage): Hero {
  // ---------------- the book ----------------
  const book = new THREE.Group();
  book.rotation.set(-0.82, 0.36, 0.05);
  stage.stations[0].add(book);
  const W = 1.5;
  const H = 2.05;
  const OPEN = 0.3;
  const tex = writing();
  const leather = new THREE.MeshPhysicalMaterial({
    color: 0x9a5234,
    roughness: 0.55,
    clearcoat: 0.4,
    clearcoatRoughness: 0.5,
  });
  const paper = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.85 });
  const written = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.rotation.y = -side * OPEN;
    const cover = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, H + 0.14, 0.09), leather);
    cover.position.x = (side * (W + 0.12)) / 2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.2), paper);
    block.position.set((side * W) / 2, 0, 0.145);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.98, H * 0.98), written);
    face.position.set((side * W) / 2, 0, 0.248);
    hinge.add(cover, block, face);
    book.add(hinge);
  }
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.16, H + 0.14, 0.12), leather);
  spine.position.z = -0.02;
  const ribbon = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.95, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.6 })
  );
  ribbon.position.set(0.3, -1.42, 0.22);
  book.add(spine, ribbon);

  // pages that lift, curl and turn: each is a strip of the page bent along its width every frame
  const SEG = 16;
  const pages = [0, 1, 2, 3].map((i) => {
    const geo = new THREE.PlaneGeometry(W * 0.97, H * 0.97, SEG, 1);
    const mesh = new THREE.Mesh(geo, written);
    mesh.position.z = 0.252 + i * 0.006;
    book.add(mesh);
    return { geo, p: 0 };
  });
  const bend = (page: (typeof pages)[number]) => {
    const pos = page.geo.attributes.position;
    const turn = OPEN + (Math.PI - 2 * OPEN) * page.p;
    const curl = Math.sin(Math.PI * page.p) * 0.95;
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG;
      const a = turn + curl * (0.3 - u * 0.8);
      const x = Math.cos(a) * W * 0.97 * u;
      const z = Math.sin(a) * W * 0.97 * u;
      pos.setX(j, x);
      pos.setZ(j, z);
      pos.setX(j + SEG + 1, x);
      pos.setZ(j + SEG + 1, z);
    }
    pos.needsUpdate = true;
    page.geo.computeVertexNormals();
  };
  pages.forEach(bend);
  const flip = gsap.timeline({ repeat: -1, repeatDelay: 0.9, paused: stage.still });
  pages.forEach((page, i) =>
    flip.to(page, { p: 1, duration: 1.5, ease: "power2.inOut" }, i * 0.36)
  );
  [...pages]
    .reverse()
    .forEach((page, i) =>
      flip.to(page, { p: 0, duration: 1.5, ease: "power2.inOut" }, 3.3 + i * 0.36)
    );

  // paper birds that rise out of the book in a widening spiral
  const birdMat = new THREE.MeshStandardMaterial({
    color: CREAM,
    roughness: 0.7,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const birds = Array.from({ length: 11 }, (_, i) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          0, 0, 0.17, 0, 0, -0.13, -0.22, 0.05, -0.03, 0, 0, 0.17, 0.22, 0.05, -0.03, 0, 0, -0.13,
        ]),
        3
      )
    );
    const mesh = new THREE.Mesh(geo, birdMat);
    stage.stations[0].add(mesh);
    return { mesh, geo, seed: i / 11 };
  });

  // ---------------- the orrery ----------------
  const orrery = new THREE.Group();
  orrery.rotation.set(0.4, -0.3, 0.08);
  orrery.scale.setScalar(0.92);
  stage.stations[1].add(orrery);
  const brass = new THREE.MeshStandardMaterial({ color: 0xcf9f45, metalness: 1, roughness: 0.27 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x7a5a2a, metalness: 1, roughness: 0.4 });
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 40, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffd98a,
      emissive: 0xffa93a,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    })
  );
  const glow = new THREE.PointLight(0xffc47a, 9, 7);
  orrery.add(sun, glow);
  const gimbals = new THREE.Group();
  orrery.add(gimbals);
  const tilts = [
    [1.15, 0.2],
    [0.35, 0.9],
    [1.9, -0.6],
  ];
  const rings = [1.78, 1.5, 1.22].map((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.042, 16, 120), brass);
    ring.rotation.set(tilts[i][0], 0, tilts[i][1]);
    gimbals.add(ring);
    return ring;
  });
  const planets = [
    { r: 0.72, size: 0.09, color: 0xc97b55, long: 5 },
    { r: 1.04, size: 0.13, color: 0x7fb394, long: 9 },
    { r: 1.36, size: 0.1, color: 0xf3e6cf, long: 14 },
  ].map((p) => {
    const arm = new THREE.Group();
    const track = new THREE.Mesh(new THREE.TorusGeometry(p.r, 0.008, 8, 100), dark);
    track.rotation.x = Math.PI / 2;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(p.size, 28, 18),
      new THREE.MeshPhysicalMaterial({ color: p.color, roughness: 0.3, clearcoat: 1 })
    );
    ball.position.x = p.r;
    arm.add(ball);
    orrery.add(track, arm);
    return { arm, long: p.long };
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 1.5, 20), brass);
  stem.position.y = -1.15;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.12, 40), brass);
  foot.position.y = -1.95;
  orrery.add(stem, foot);

  const spins: gsap.core.Tween[] = [];
  if (!stage.still) {
    spins.push(
      gsap.to(gimbals.rotation, { y: Math.PI * 2, duration: 26, ease: "none", repeat: -1 })
    );
    planets.forEach((p) =>
      spins.push(
        gsap.to(p.arm.rotation, { y: Math.PI * 2, duration: p.long, ease: "none", repeat: -1 })
      )
    );
    // both rise into place, then float
    gsap.from(book.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 1.3, ease: "elastic.out(1, 0.6)" });
    gsap.from(book.rotation, { y: book.rotation.y - 1.6, duration: 1.5, ease: "power3.out" });
    gsap.from(orrery.scale, {
      x: 0.4,
      y: 0.4,
      z: 0.4,
      duration: 1.3,
      ease: "elastic.out(1, 0.6)",
      delay: 0.15,
    });
    gsap.from(orrery.rotation, {
      y: orrery.rotation.y + 1.6,
      duration: 1.5,
      ease: "power3.out",
      delay: 0.15,
    });
    gsap.to(book.position, { y: 0.1, duration: 2.8, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(orrery.position, {
      y: 0.08,
      duration: 3.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  stage.onFrame((t) => {
    pages.forEach(bend);
    birds.forEach((b) => {
      const k = (t * 0.085 + b.seed) % 1;
      const a = k * 5.2 + b.seed * 21;
      const r = 0.25 + k * 2.1;
      b.mesh.position.set(Math.cos(a) * r, -0.15 + k * 2.9, Math.sin(a) * r * 0.55 + 0.5);
      b.mesh.rotation.set(0.25, -a + Math.PI / 2, Math.sin(t * 2 + b.seed * 9) * 0.25);
      b.mesh.scale.setScalar(Math.sin(Math.PI * k) ** 0.6 * 0.95);
      const flap = Math.sin(t * 9 + b.seed * 40) * 0.13;
      const pos = b.geo.attributes.position;
      pos.setY(2, 0.03 + flap);
      pos.setY(4, 0.03 + flap);
      pos.needsUpdate = true;
      b.geo.computeVertexNormals();
    });
    glow.intensity = 9 + Math.sin(t * 2.2) * 1.5;
  });

  return {
    hover(side) {
      gsap.to(book.scale, {
        x: side === 0 ? 1.1 : 1,
        y: side === 0 ? 1.1 : 1,
        z: side === 0 ? 1.1 : 1,
        duration: 0.9,
        ease: "elastic.out(1, 0.5)",
        overwrite: "auto",
      });
      gsap.to(flip, { timeScale: side === 0 ? 2.4 : 1, duration: 0.4 });
      const s = side === 1 ? 1.02 : 0.92;
      gsap.to(orrery.scale, {
        x: s,
        y: s,
        z: s,
        duration: 0.9,
        ease: "elastic.out(1, 0.5)",
        overwrite: "auto",
      });
      rings.forEach((ring, i) =>
        gsap.to(ring.rotation, {
          x: side === 1 ? Math.PI / 2 : tilts[i][0],
          z: side === 1 ? 0 : tilts[i][1],
          duration: 1.1,
          ease: "elastic.out(1, 0.6)",
          delay: i * 0.06,
          overwrite: "auto",
        })
      );
      spins.forEach((spin) => gsap.to(spin, { timeScale: side === 1 ? 3 : 1, duration: 0.5 }));
    },
    choose(side, done) {
      const inner = side === 0 ? book : orrery;
      const flourish = gsap
        .timeline()
        .to(
          inner.rotation,
          { y: inner.rotation.y + Math.PI * 2, duration: 0.9, ease: "power2.inOut" },
          0
        );
      if (side === 0) flourish.to(flip, { timeScale: 5, duration: 0.3 }, 0);
      else spins.forEach((spin) => flourish.to(spin, { timeScale: 8, duration: 0.3 }, 0));
      comeForward(stage, side, flourish).eventCallback("onComplete", done);
    },
  };
}
