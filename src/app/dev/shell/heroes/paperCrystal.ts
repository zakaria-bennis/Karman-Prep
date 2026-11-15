// Hero 5, paper and crystal. Reading and Writing is one sheet of paper that folds itself, on a loop, into
// a book, a bird and a tower: every form is the same sheet, so each change is a real fold, crease by
// crease. Math is a cluster of crystal that grows shard by shard and catches a light that circles it.
// Chosen, the paper opens flat towards you and the crystal bursts apart.
import { gsap } from "gsap";
import * as THREE from "three";
import { comeForward, type Hero, type Stage } from "./stage";

const COLS = 6;
const ROWS = 8;
const W = 2.3;
const H = 3.1;

/** A soft round dot for the sparks. */
function dot(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  // it fades to black, not to clear: the sparks are added as light, so black adds nothing
  grad.addColorStop(0, "rgb(255,255,255)");
  grad.addColorStop(0.3, "rgb(150,150,150)");
  grad.addColorStop(1, "rgb(0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

type Form = (u: number, v: number, t: number, out: THREE.Vector3) => void;
const FORMS: { shape: Form; turn: [number, number, number] }[] = [
  // a sheet, barely moving
  {
    turn: [-0.5, 0.35, 0.08],
    shape: (u, v, t, o) =>
      o.set(
        (u - 0.5) * W,
        (v - 0.5) * H,
        Math.sin(u * 5 + t * 1.2) * 0.07 + Math.sin(v * 4 + t) * 0.04
      ),
  },
  // a book: folded down the middle and lying open, its two halves bowed like pages
  {
    turn: [-1.0, 0.34, 0.02],
    shape: (u, v, t, o) => {
      const x = (u - 0.5) * W;
      const bow = Math.sin(Math.min(1, Math.abs(x) / (W / 2)) * Math.PI) * 0.16;
      o.set(x * 0.92, (v - 0.5) * H * 0.76, Math.abs(x) * 0.5 - 0.3 + bow);
    },
  },
  // a bird: wide wings across the middle that beat, a neck lifted at one end, a tail at the other
  {
    turn: [-1.05, 0.5, 0.42],
    shape: (u, v, t, o) => {
      const span = 0.12 + 1.15 * Math.sin(Math.PI * v) ** 1.6;
      const x = (u - 0.5) * W * span;
      const beat = 0.55 + Math.sin(t * 5.5) * 0.45;
      const neck = Math.max(0, v - 0.78) * 3.4;
      const tail = Math.max(0, 0.16 - v) * 1.6;
      o.set(x, (v - 0.5) * H * 1.05, Math.abs(x) * beat - 0.3 + neck + tail);
    },
  },
  // a tower: rolled round, in four tiers, each with its eave standing out
  {
    turn: [0.16, 0.6, 0],
    shape: (u, v, t, o) => {
      const a = u * Math.PI * 2 + t * 0.25;
      const tier = Math.min(3, Math.floor(v * 4 + 0.0001));
      const r = (0.78 - 0.15 * tier) * (1 - 0.52 * (v * 4 - tier));
      o.set(Math.cos(a) * r, (v - 0.5) * H * 0.98, Math.sin(a) * r);
    },
  },
];

export function build(stage: Stage): Hero {
  // ---------------- the paper ----------------
  const geo = new THREE.PlaneGeometry(W, H, COLS, ROWS).toNonIndexed();
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const paper = new THREE.Group();
  paper.rotation.set(...FORMS[0].turn);
  stage.stations[0].add(paper);
  paper.add(
    new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0xd8c4a0,
        roughness: 0.9,
        side: THREE.DoubleSide,
        flatShading: true,
        envMapIntensity: 0.12,
      })
    )
  );
  // the creases: the sheet's own grid drawn as fine lines, so every fold shows
  const creases: [number, number][] = [];
  for (let r = 0; r <= ROWS; r++)
    for (let c = 0; c <= COLS; c++) {
      if (c < COLS) creases.push([c / COLS, r / ROWS], [(c + 1) / COLS, r / ROWS]);
      if (r < ROWS) creases.push([c / COLS, r / ROWS], [c / COLS, (r + 1) / ROWS]);
    }
  const creaseGeo = new THREE.BufferGeometry();
  const creasePos = new THREE.BufferAttribute(new Float32Array(creases.length * 3), 3);
  creaseGeo.setAttribute("position", creasePos);
  paper.add(
    new THREE.LineSegments(
      creaseGeo,
      new THREE.LineBasicMaterial({ color: 0x6f5334, transparent: true, opacity: 0.55 })
    )
  );

  const fold = { from: 0, to: 0, k: 1 };
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const at = (u: number, v: number, t: number, out: THREE.Vector3) => {
    // the fold travels across the sheet, corner to corner, instead of happening all at once
    const e = Math.max(0, Math.min(1, fold.k * 1.7 - 0.7 * (u * 0.5 + v * 0.5)));
    const s = e * e * (3 - 2 * e);
    FORMS[fold.from].shape(u, v, t, a);
    FORMS[fold.to].shape(u, v, t, b);
    out.set(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, a.z + (b.z - a.z) * s);
  };
  const p = new THREE.Vector3();
  const shape = (t: number) => {
    for (let i = 0; i < pos.count; i++) {
      at(uv.getX(i), uv.getY(i), t, p);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    creases.forEach(([u, v], i) => {
      at(u, v, t, p);
      creasePos.setXYZ(i, p.x, p.y, p.z);
    });
    creasePos.needsUpdate = true;
  };
  shape(0);
  const loop = gsap.timeline({ repeat: -1, paused: stage.still });
  FORMS.forEach((_, i) => {
    const next = (i + 1) % FORMS.length;
    loop
      .call(() => Object.assign(fold, { from: i, to: next, k: 0 }))
      .to(fold, { k: 1, duration: 1.8, ease: "none" })
      .to(
        paper.rotation,
        {
          x: FORMS[next].turn[0],
          y: FORMS[next].turn[1],
          z: FORMS[next].turn[2],
          duration: 1.8,
          ease: "power2.inOut",
        },
        "<"
      )
      .to({}, { duration: 1.6 });
  });

  // ---------------- the crystal ----------------
  const crystal = new THREE.Group();
  crystal.position.y = -1.25;
  crystal.rotation.set(0.12, 0.3, 0);
  stage.stations[1].add(crystal);
  const glassy = new THREE.MeshPhysicalMaterial({
    color: 0x52c4a2,
    emissive: 0x0f5a48,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.86,
    iridescence: 1,
    iridescenceIOR: 1.5,
    clearcoat: 1,
    flatShading: true,
    envMapIntensity: 0.9,
    side: THREE.DoubleSide,
  });
  // x, z, radius, height, lean sideways, lean forward
  const SPECS = [
    [0, 0, 0.44, 2.9, 0, 0],
    [0.52, 0.1, 0.3, 2.0, -0.38, 0.1],
    [-0.52, 0.02, 0.33, 2.25, 0.34, 0.05],
    [0.16, 0.5, 0.25, 1.6, -0.12, 0.5],
    [-0.26, -0.46, 0.27, 1.7, 0.16, -0.45],
    [0.8, -0.3, 0.19, 1.15, -0.72, -0.2],
    [-0.84, 0.34, 0.2, 1.25, 0.76, 0.25],
  ];
  const shards = SPECS.map(([x, z, r, h, lz, lx]) => {
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(r * 0.82, 0),
      new THREE.Vector2(r, h * 0.72),
      new THREE.Vector2(0, h),
    ];
    const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 6), glassy);
    mesh.position.set(x, 0, z);
    mesh.rotation.set(lx, x * 3, lz);
    crystal.add(mesh);
    return mesh;
  });
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.05, 0),
    new THREE.MeshStandardMaterial({ color: 0x4d4652, roughness: 0.9, flatShading: true })
  );
  rock.scale.set(1.15, 0.3, 1);
  rock.position.y = -0.12;
  crystal.add(rock);
  const glint = new THREE.PointLight(0xffffff, 16, 9);
  stage.stations[1].add(glint);

  // sparks near the tips, each on its own slow pulse
  const SPARKS = 26;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkCol = new Float32Array(SPARKS * 3);
  for (let i = 0; i < SPARKS; i++) {
    const spec = SPECS[i % SPECS.length];
    sparkPos.set(
      [
        spec[0] + Math.sin(i * 12.9) * 0.5,
        -1.25 + spec[3] * (0.5 + ((i * 0.37) % 0.6)),
        spec[1] + Math.cos(i * 7.3) * 0.5 + 0.3,
      ],
      i * 3
    );
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkCol, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    // light is added to what is behind and the canvas's own transparency is left alone, so an unlit
    // spark shows nothing at all (plain additive blending leaves a dark square on a see-through canvas)
    new THREE.PointsMaterial({
      size: 0.16,
      map: dot(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    })
  );
  stage.stations[1].add(sparks);

  if (!stage.still) {
    gsap.from(paper.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 1.3, ease: "elastic.out(1, 0.6)" });
    shards.forEach((shard, i) =>
      gsap.from(shard.scale, {
        y: 0.001,
        x: 0.3,
        z: 0.3,
        duration: 1.5,
        ease: "elastic.out(1, 0.5)",
        delay: 0.2 + i * 0.12,
      })
    );
    gsap.to(paper.position, { y: 0.12, duration: 3, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(crystal.rotation, {
      y: crystal.rotation.y + Math.PI * 2,
      duration: 40,
      ease: "none",
      repeat: -1,
    });
  }

  stage.onFrame((t) => {
    shape(t);
    glint.position.set(
      Math.cos(t * 0.9) * 2.2,
      0.6 + Math.sin(t * 1.3) * 0.9,
      Math.sin(t * 0.9) * 2.2 + 0.8
    );
    for (let i = 0; i < SPARKS; i++) {
      const lit = Math.max(0, Math.sin(t * 1.7 + i * 2.4)) ** 6;
      sparkCol.set([lit, lit * 0.97, lit * 0.85], i * 3);
    }
    sparkGeo.attributes.color.needsUpdate = true;
  });

  return {
    hover(side) {
      const p = side === 0 ? 1.1 : 1;
      gsap.to(paper.scale, {
        x: p,
        y: p,
        z: p,
        duration: 0.9,
        ease: "elastic.out(1, 0.5)",
        overwrite: "auto",
      });
      gsap.to(loop, { timeScale: side === 0 ? 2.2 : 1, duration: 0.4 });
      if (side === 1) {
        shards.forEach((shard, i) =>
          gsap.fromTo(
            shard.scale,
            { y: 1 },
            {
              y: 1.16,
              duration: 0.3,
              ease: "power2.out",
              yoyo: true,
              repeat: 1,
              delay: i * 0.045,
              overwrite: "auto",
            }
          )
        );
        gsap.fromTo(glint, { intensity: 60 }, { intensity: 16, duration: 1.1, ease: "power2.out" });
      }
    },
    choose(side, done) {
      const flourish = gsap.timeline();
      if (side === 0) {
        // the paper lets go of whatever it was and opens flat towards you
        loop.pause();
        flourish
          .call(() => Object.assign(fold, { from: fold.to, to: 0, k: 0 }), [], 0)
          .to(fold, { k: 1, duration: 0.7, ease: "none" }, 0)
          .to(paper.rotation, { x: 0, y: 0, z: 0, duration: 0.7, ease: "power2.inOut" }, 0)
          .to(paper.scale, { x: 2.4, y: 2.4, z: 2.4, duration: 0.5, ease: "power2.in" }, 0.45);
      } else {
        // the crystal bursts: every shard is thrown its own way
        shards.forEach((shard, i) => {
          const away = new THREE.Vector3(
            shard.position.x || 0.2,
            0.9 + i * 0.1,
            shard.position.z + 0.6
          )
            .normalize()
            .multiplyScalar(5);
          flourish
            .to(
              shard.position,
              { x: away.x, y: away.y, z: away.z, duration: 0.75, ease: "power2.in" },
              0.05
            )
            .to(
              shard.rotation,
              {
                x: shard.rotation.x + 3 + i,
                z: shard.rotation.z + 2,
                duration: 0.75,
                ease: "power1.in",
              },
              0.05
            );
        });
        flourish
          .fromTo(glint, { intensity: 120 }, { intensity: 0, duration: 0.8 }, 0.05)
          .to(rock.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.4 }, 0.1);
      }
      comeForward(stage, side, flourish).eventCallback("onComplete", done);
    },
  };
}
