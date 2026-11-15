// The Reading and Writing half of the Library's hero: an open book, and what rises
// from the pages. Everything is built here from shapes and from small canvases drawn in code: the print
// on the pages is real text set in a serif, the page edges and the leather grain are drawn textures.
// No model file and no image. The book casts and takes shadows from one warm light.
import { gsap } from "gsap";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Stage } from "./stage";

const W = 1.55;
const H = 2.1;
const T = 0.2;
const OPEN = 0.24;
const SEG = 18;
const INK = "rgba(52, 38, 30, 0.86)";

const LEFT = [
  "A careful reader does not hurry. She weighs each claim against the lines that came before it, and asks what the author most wants her to believe.",
  "Some sentences carry the argument. Others only decorate it. The work is to tell the two apart, and to notice which words were chosen to persuade.",
  "When a passage turns, a small word usually gives it away: however, yet, instead. Mark it. The point of the whole often sits just after.",
];
const RIGHT = [
  "Evidence is not the same as agreement. A line supports a claim only when it would be hard to explain if the claim were false.",
  "So read the question first, then the text, then the question once more. Most wrong answers are true statements that answer something else.",
  "The figure shows how often each kind of error appeared across forty practice sets. Notice where the bars fall, and where they do not.",
];

/** One printed page, drawn on a canvas: heading, drop capital, paragraphs, a small figure, a folio. */
function page(side: "left" | "right"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 704;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f5ead6";
  g.fillRect(0, 0, c.width, c.height);
  // the paper's tooth, and the shade that falls into the gutter
  let seed = side === "left" ? 5 : 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(120, 92, 60, ${0.02 + rnd() * 0.05})`;
    g.fillRect(rnd() * c.width, rnd() * c.height, 1.4, 1.4);
  }
  const gutter = g.createLinearGradient(
    side === "left" ? c.width : 0,
    0,
    side === "left" ? c.width - 150 : 150,
    0
  );
  gutter.addColorStop(0, "rgba(96, 66, 40, 0.38)");
  gutter.addColorStop(1, "rgba(96, 66, 40, 0)");
  g.fillStyle = gutter;
  g.fillRect(0, 0, c.width, c.height);

  const left = side === "left" ? 54 : 62;
  const width = c.width - 116;
  let y = 70;
  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  const wrap = (text: string, x: number, w: number, lead: number, indentFirst = 0) => {
    const words = text.split(" ");
    let line = "";
    let first = true;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (g.measureText(next).width > w - (first ? indentFirst : 0) && line) {
        g.fillText(line, x + (first ? indentFirst : 0), y);
        y += lead;
        line = word;
        first = false;
      } else line = next;
    }
    g.fillText(line, x + (first ? indentFirst : 0), y);
    y += lead;
  };

  if (side === "left") {
    g.textAlign = "center";
    g.font = "600 13px Georgia, 'Times New Roman', serif";
    g.fillText("C H A P T E R   S E V E N", c.width / 2 - 6, y);
    y += 34;
    g.font = "italic 25px Georgia, 'Times New Roman', serif";
    g.fillText("The Quiet Art of", c.width / 2 - 6, y);
    y += 30;
    g.fillText("Reading Closely", c.width / 2 - 6, y);
    y += 22;
    g.fillRect(c.width / 2 - 46, y, 80, 1.2);
    y += 44;
    g.textAlign = "left";
    // a drop capital, with the first lines set round it
    g.font = "62px Georgia, 'Times New Roman', serif";
    g.fillText("A", left - 2, y + 26);
    g.font = "15px Georgia, 'Times New Roman', serif";
    const body = LEFT[0].slice(2);
    const words = body.split(" ");
    let line = "";
    let row = 0;
    for (const word of words) {
      const inset = row < 2 ? 52 : 0;
      const next = line ? `${line} ${word}` : word;
      if (g.measureText(next).width > width - inset && line) {
        g.fillText(line, left + inset, y);
        y += 22;
        row++;
        line = word;
      } else line = next;
    }
    g.fillText(line, left + (row < 2 ? 52 : 0), y);
    y += 30;
    LEFT.slice(1).forEach((p) => {
      wrap(p, left, width, 22, 20);
      y += 8;
    });
  } else {
    g.textAlign = "left";
    g.font = "15px Georgia, 'Times New Roman', serif";
    wrap(RIGHT[0], left, width, 22, 20);
    y += 8;
    wrap(RIGHT[1], left, width, 22, 20);
    y += 18;
    // a small bar figure, as a printed plate
    const top = y;
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.strokeRect(left + 40, top, width - 80, 150);
    [0.82, 0.55, 0.38, 0.68, 0.24].forEach((h, i) => {
      g.fillStyle = i === 0 ? "rgba(150, 70, 40, 0.75)" : "rgba(52, 38, 30, 0.55)";
      g.fillRect(left + 70 + i * 52, top + 128 - h * 104, 30, h * 104);
    });
    g.fillStyle = INK;
    g.fillRect(left + 58, top + 128, width - 116, 1.2);
    y = top + 174;
    g.font = "italic 12.5px Georgia, 'Times New Roman', serif";
    g.textAlign = "center";
    g.fillText("Fig. 3. Errors by kind, across forty sets.", c.width / 2 + 6, y);
    y += 30;
    g.textAlign = "left";
    g.font = "15px Georgia, 'Times New Roman', serif";
    wrap(RIGHT[2], left, width, 22, 20);
  }
  g.font = "13px Georgia, 'Times New Roman', serif";
  g.textAlign = "center";
  g.fillStyle = INK;
  g.fillText(side === "left" ? "112" : "113", c.width / 2, c.height - 34);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The edge of a block of pages: many fine lines. */
function edges(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ecdfc6";
  g.fillRect(0, 0, 8, 64);
  for (let y = 0; y < 64; y += 2) {
    g.fillStyle = `rgba(120, 96, 66, ${0.18 + ((y * 7) % 5) * 0.05})`;
    g.fillRect(0, y, 8, 0.8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Fine noise, used as the grain of the leather. */
function grain(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const img = g.createImageData(128, 128);
  let seed = 3;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = 110 + (seed % 90);
    img.data.set([v, v, v, 255], i);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 4);
  return t;
}

/** One letter, glowing, for the script that rises off the page. */
function glyph(char: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d")!;
  g.font = "italic 64px Georgia, 'Times New Roman', serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "rgba(255, 196, 96, 0.95)";
  g.shadowBlur = 14;
  g.fillStyle = "#fff6dc";
  g.fillText(char, 48, 50);
  g.fillText(char, 48, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** How far a page stands above the flat at a distance u (0 at the spine, 1 at the edge): the open arch. */
const arch = (u: number) => 0.085 * Math.sin(Math.PI * u ** 0.72);

export interface Book {
  /** The book and all that belongs to it; the stage positions this. */
  root: THREE.Group;
  lively(on: boolean): void;
  /** Chosen: the book opens towards the reader and lifts away. */
  leave(rise: number): gsap.core.Timeline;
}

export function buildBook(stage: Stage, clip: THREE.Plane): Book {
  const clippingPlanes = [clip];
  const root = new THREE.Group();
  const book = new THREE.Group();
  book.rotation.set(-0.76, 0.26, 0.04);
  root.add(book);

  // one warm light, low and to the left like the evening sun, that casts the book's shadows
  const key = new THREE.DirectionalLight(0xffdfb4, 1.9);
  key.position.set(-2.6, 3.4, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -2.6;
  key.shadow.camera.right = key.shadow.camera.top = 2.6;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 5;
  root.add(key, key.target);

  const shaded = <M extends THREE.Mesh>(mesh: M) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const texLeft = page("left");
  const texRight = page("right");
  const texBack = page("left");
  texBack.wrapS = THREE.RepeatWrapping;
  texBack.repeat.x = -1;
  texBack.offset.x = 1;
  const leather = new THREE.MeshPhysicalMaterial({
    color: 0x6f3423,
    roughness: 0.62,
    clearcoat: 0.3,
    clearcoatRoughness: 0.55,
    bumpMap: grain(),
    bumpScale: 0.6,
    clippingPlanes,
  });
  const gilt = new THREE.MeshStandardMaterial({
    color: 0xd9ad55,
    metalness: 1,
    roughness: 0.32,
    clippingPlanes,
  });
  const edge = new THREE.MeshStandardMaterial({ map: edges(), roughness: 0.9, clippingPlanes });
  const plain = new THREE.MeshStandardMaterial({ color: 0xf1e5cd, roughness: 0.9, clippingPlanes });
  const z0 = 0.04 + T;

  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.rotation.y = -side * OPEN;
    const cover = shaded(
      new THREE.Mesh(new RoundedBoxGeometry(W + 0.16, H + 0.18, 0.08, 3, 0.028), leather)
    );
    cover.position.x = (side * (W + 0.16)) / 2;
    // gilt corners on the cover, where they show past the pages
    for (const up of [-1, 1]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.086), gilt);
      corner.position.set(side * (W + 0.07), up * (H / 2 + 0.0), 0);
      hinge.add(corner);
    }
    const block = shaded(
      new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [edge, edge, edge, edge, plain, plain])
    );
    block.position.set((side * W) / 2, 0, 0.04 + T / 2);
    // the top leaf, arched as an open book's pages are
    const geo = new THREE.PlaneGeometry(W * 0.985, H * 0.985, SEG, 1);
    const pos = geo.attributes.position;
    for (let j = 0; j <= SEG; j++) {
      const u = side > 0 ? j / SEG : 1 - j / SEG;
      const x = side * W * 0.985 * u;
      for (const k of [j, j + SEG + 1]) {
        pos.setX(k, x);
        pos.setZ(k, arch(u));
      }
    }
    geo.computeVertexNormals();
    const leaf = shaded(
      new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          map: side < 0 ? texLeft : texRight,
          roughness: 0.92,
          clippingPlanes,
        })
      )
    );
    leaf.position.z = z0 + 0.004;
    hinge.add(cover, block, leaf);
    book.add(hinge);
  }
  const spine = shaded(
    new THREE.Mesh(new RoundedBoxGeometry(0.2, H + 0.18, 0.13, 3, 0.03), leather)
  );
  spine.position.z = -0.015;
  book.add(spine);

  // a silk ribbon that hangs out of the foot of the book and sways
  const ribbonGeo = new THREE.PlaneGeometry(0.1, 1, 1, 12);
  const ribbon = shaded(
    new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshStandardMaterial({
        color: 0xa5322c,
        roughness: 0.45,
        side: THREE.DoubleSide,
        clippingPlanes,
      })
    )
  );
  ribbon.position.set(0.14, -H / 2 - 0.02, z0 + 0.02);
  book.add(ribbon);

  // leaves that lift, curl and turn. Each is one sheet with print on both faces.
  const front = new THREE.MeshStandardMaterial({
    map: texRight,
    roughness: 0.92,
    side: THREE.FrontSide,
    clippingPlanes,
  });
  const back = new THREE.MeshStandardMaterial({
    map: texBack,
    roughness: 0.92,
    side: THREE.BackSide,
    clippingPlanes,
  });
  const leaves = [0, 1, 2, 3, 4].map((i) => {
    const geo = new THREE.PlaneGeometry(W * 0.97, H * 0.975, SEG, 1);
    const group = new THREE.Group();
    group.add(shaded(new THREE.Mesh(geo, front)), shaded(new THREE.Mesh(geo, back)));
    group.position.z = z0 + 0.012 + i * 0.005;
    book.add(group);
    return { geo, p: 0 };
  });
  const bend = (leaf: (typeof leaves)[number]) => {
    const pos = leaf.geo.attributes.position;
    const turn = OPEN + (Math.PI - 2 * OPEN) * leaf.p;
    const curl = Math.sin(Math.PI * leaf.p) * 1.05;
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG;
      const a = turn + curl * (0.32 - u * 0.85);
      const along = W * 0.97 * u;
      const up = arch(u) * (1 - 2 * leaf.p);
      const x = Math.cos(a) * along - Math.sin(a) * up;
      const z = Math.sin(a) * along + Math.cos(a) * up;
      for (const k of [j, j + SEG + 1]) {
        pos.setX(k, x);
        pos.setZ(k, z);
      }
    }
    pos.needsUpdate = true;
    leaf.geo.computeVertexNormals();
  };
  leaves.forEach(bend);
  const flip = gsap.timeline({ repeat: -1, repeatDelay: 1.1, paused: stage.still });
  leaves.forEach((leaf, i) =>
    flip.to(leaf, { p: 1, duration: 1.6, ease: "power2.inOut" }, i * 0.34)
  );
  [...leaves]
    .reverse()
    .forEach((leaf, i) =>
      flip.to(leaf, { p: 0, duration: 1.6, ease: "power2.inOut" }, 3.6 + i * 0.34)
    );

  // script that lifts off the page and drifts up, letter by letter
  const LETTERS = "aegkRnstwy&?;".split("");
  const script = LETTERS.map((char, i) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glyph(char),
        transparent: true,
        depthWrite: false,
        clippingPlanes,
      })
    );
    root.add(sprite);
    return {
      sprite,
      phase: i / LETTERS.length,
      seed: (i * 0.618) % 1,
      speed: 0.07 + ((i * 37) % 10) * 0.004,
    };
  });

  // a folded paper bird that glides across now and then (founder: "the occasional gliding bird")
  const birdMat = new THREE.MeshStandardMaterial({
    color: 0xfff3dd,
    roughness: 0.7,
    side: THREE.DoubleSide,
    flatShading: true,
    clippingPlanes,
  });
  const birds = Array.from({ length: 2 }, (_, i) => {
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
    root.add(mesh);
    return { mesh, geo, phase: 0.3 + i * 0.5, seed: (i * 0.41) % 1 };
  });

  const rush = { v: 1 };
  if (!stage.still) {
    gsap.from(book.scale, { x: 0.5, y: 0.5, z: 0.5, duration: 1.4, ease: "elastic.out(1, 0.65)" });
    gsap.from(book.rotation, { y: book.rotation.y - 1.2, duration: 1.6, ease: "power3.out" });
    gsap.to(book.position, { y: 0.09, duration: 3.1, ease: "sine.inOut", repeat: -1, yoyo: true });
  }

  stage.onFrame((t, dt) => {
    leaves.forEach(bend);
    // the ribbon: pinned at the top, swinging more the lower it hangs
    const rp = ribbonGeo.attributes.position;
    for (let i = 0; i <= 12; i++) {
      const v = i / 12;
      const sway = Math.sin(t * 1.5 + v * 2.6) * 0.07 * v;
      for (const k of [i * 2, i * 2 + 1]) {
        rp.setX(k, (k % 2 ? 0.05 : -0.05) + sway);
        rp.setY(k, -v * 0.72);
        rp.setZ(k, -v * v * 0.35);
      }
    }
    rp.needsUpdate = true;
    ribbonGeo.computeVertexNormals();

    script.forEach((s) => {
      s.phase = (s.phase + dt * s.speed * rush.v) % 1;
      const k = s.phase;
      s.sprite.position.set(
        (s.seed * 2 - 1) * 1.25 + Math.sin(k * 6 + s.seed * 20) * 0.28,
        -0.25 + k * 3.1,
        0.75
      );
      const size = 0.16 + k * 0.16;
      s.sprite.scale.set(size, size, 1);
      s.sprite.material.opacity = Math.sin(Math.PI * k) ** 0.7 * 0.95;
      s.sprite.material.rotation = Math.sin(k * 5 + s.seed * 9) * 0.5;
    });
    birds.forEach((b, i) => {
      // each crosses once, slowly, then waits out of sight for most of its turn
      b.phase = (b.phase + dt * 0.035) % 1;
      const k = b.phase / 0.42;
      b.mesh.visible = k < 1;
      const dir = i % 2 ? -1 : 1;
      b.mesh.position.set(
        dir * (k * 2 - 1) * 4.2,
        1.5 + i * 0.5 + Math.sin(k * 5 + b.seed * 9) * 0.35,
        0.4
      );
      b.mesh.rotation.set(0.2, (dir * Math.PI) / 2, Math.sin(t * 1.3 + b.seed * 9) * 0.3);
      b.mesh.scale.setScalar(1.1);
      const flap = Math.sin(t * 6 + b.seed * 40) * 0.1;
      const bp = b.geo.attributes.position;
      bp.setY(2, 0.03 + flap);
      bp.setY(4, 0.03 + flap);
      bp.needsUpdate = true;
      b.geo.computeVertexNormals();
    });
  });

  return {
    root,
    lively(on) {
      const s = on ? 1.07 : 1;
      gsap.to(book.scale, {
        x: s,
        y: s,
        z: s,
        duration: 1,
        ease: "elastic.out(1, 0.5)",
        overwrite: "auto",
      });
      gsap.to(book.rotation, {
        x: on ? -0.6 : -0.76,
        duration: 1,
        ease: "elastic.out(1, 0.6)",
        overwrite: "auto",
      });
      gsap.to(flip, { timeScale: on ? 3.4 : 1, duration: 0.4 });
      gsap.to(rush, { v: on ? 3.2 : 1, duration: 0.5 });
    },
    leave(rise) {
      return gsap
        .timeline()
        .to(flip, { timeScale: 6, duration: 0.3 }, 0)
        .to(rush, { v: 5, duration: 0.3 }, 0)
        .to(book.rotation, { x: -0.3, y: 0, z: 0, duration: 0.8, ease: "power2.inOut" }, 0)
        .to(book.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.8, ease: "power2.inOut" }, 0)
        .to(root.position, { y: `+=${rise}`, duration: 0.75, ease: "power2.in" }, 0.75);
    },
  };
}
