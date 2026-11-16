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
/* dark enough to read from the page (founder, 2026-11-15: "somewhat readable") */
const INK = "rgba(34, 22, 14, 0.95)";

/* The pages carry the opening of the Odyssey, Book I, in Samuel Butler's translation of 1900 (out of
   copyright), set to be read from the page, with a glow rising off it (founder, 2026-11-15).
   Typed from memory: check it against a printed Butler before this ships. */
const ODYSSEY =
  "Tell me, O Muse, of that ingenious hero who travelled far and wide after he had sacked the famous town of Troy. " +
  "Many cities did he visit, and many were the nations with whose manners and customs he was acquainted; moreover " +
  "he suffered much by sea while trying to save his own life and bring his men safely home; but do what he might he " +
  "could not save his men, for they perished through their own sheer folly in eating the cattle of the Sun-god " +
  "Hyperion; so the god prevented them from ever reaching home. Tell me, too, about all these things, oh daughter " +
  "of Jove, from whatsoever source you may know them. So now all who escaped death in battle or by shipwreck had " +
  "got safely home except Ulysses, and he, though he was longing to return to his wife and country, was detained by " +
  "the goddess Calypso, who had got him into a large cave and wanted to marry him. But as years went by, there came " +
  "a time when the gods settled that he should go back to Ithaca; even then, however, when he was among his own " +
  "people, his troubles were not yet over; nevertheless all the gods had now begun to pity him except Neptune, who " +
  "still persecuted him without ceasing and would not let him get home.";
const WORDS = ODYSSEY.split(" ");

/** One printed page of the Odyssey, drawn on a canvas. Each page number begins further into the text,
 *  so every leaf that turns shows a different page. Page 0 carries the heading. */
function page(n: number, mirrored = false): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 704;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f5ead6";
  g.fillRect(0, 0, c.width, c.height);
  // the paper's tooth, and the shade that falls into the gutter
  let seed = 5 + n * 4;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(120, 92, 60, ${0.02 + rnd() * 0.05})`;
    g.fillRect(rnd() * c.width, rnd() * c.height, 1.4, 1.4);
  }
  const left = n % 2 === 0;
  const gutter = g.createLinearGradient(left ? c.width : 0, 0, left ? c.width - 150 : 150, 0);
  gutter.addColorStop(0, "rgba(96, 66, 40, 0.38)");
  gutter.addColorStop(1, "rgba(96, 66, 40, 0)");
  g.fillStyle = gutter;
  g.fillRect(0, 0, c.width, c.height);

  const x0 = left ? 50 : 60;
  const width = c.width - 110;
  let y = 64;
  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  if (n === 0) {
    g.textAlign = "center";
    g.font = "600 12px Georgia, 'Times New Roman', serif";
    g.fillText("T H E   O D Y S S E Y", c.width / 2 - 5, y);
    y += 30;
    g.font = "italic 22px Georgia, 'Times New Roman', serif";
    g.fillText("Book I", c.width / 2 - 5, y);
    y += 18;
    g.fillRect(c.width / 2 - 45, y, 80, 1);
    y += 34;
  }
  // the text runs on from page to page, and comes round again when it ends
  g.textAlign = "left";
  g.font = "600 16px Georgia, 'Times New Roman', serif";
  // a warm glow under every word, as if the ink were lit from the page
  g.shadowColor = "rgba(255, 176, 60, 0.9)";
  g.shadowBlur = 7;
  let at = (n * 97) % WORDS.length;
  let line = "";
  while (y < c.height - 62) {
    const word = WORDS[at % WORDS.length];
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > width && line) {
      g.fillText(line, x0, y);
      y += 24;
      line = "";
    } else {
      line = next;
      at++;
    }
  }
  g.font = "12px Georgia, 'Times New Roman', serif";
  g.textAlign = "center";
  g.fillText(String(1 + n), c.width / 2, c.height - 34);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (mirrored) {
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
  }
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
  leave(station: THREE.Group): gsap.core.Timeline;
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
  const texLeft = page(0);
  const texRight = page(1);
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
  const hinges: { hinge: THREE.Group; side: number }[] = [];

  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.rotation.y = -side * OPEN;
    hinges.push({ hinge, side });
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

  // the light of the book: a warm glow that lies on the open pages and breathes
  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 226, 150, 0.75)");
    grad.addColorStop(0.5, "rgba(255, 196, 96, 0.25)");
    grad.addColorStop(1, "rgba(255, 180, 80, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      clippingPlanes,
    })
  );
  aura.position.set(0, 0.35, 0.9);
  aura.scale.set(6.4, 4.6, 1);
  root.add(aura);

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
  const leafMat = (map: THREE.CanvasTexture, side: THREE.Side) =>
    new THREE.MeshStandardMaterial({ map, roughness: 0.92, side, clippingPlanes });
  const leaves = [0, 1, 2, 3, 4].map((i) => {
    const geo = new THREE.PlaneGeometry(W * 0.97, H * 0.975, SEG, 1);
    const group = new THREE.Group();
    group.add(
      shaded(new THREE.Mesh(geo, leafMat(page(3 + i * 2), THREE.FrontSide))),
      shaded(new THREE.Mesh(geo, leafMat(page(2 + i * 2, true), THREE.BackSide)))
    );
    group.position.z = z0 + 0.012 + i * 0.005;
    book.add(group);
    return { geo, p: 0, group };
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
  const doveMat = new THREE.MeshStandardMaterial({
    color: 0xfff3dd,
    roughness: 0.7,
    side: THREE.DoubleSide,
    flatShading: true,
    clippingPlanes,
  });
  const LETTERS = "aegkRnstwy&?;QmfbdhAxz".split("");
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
    const doveGeo = new THREE.BufferGeometry();
    doveGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          0, 0, 0.17, 0, 0, -0.13, -0.22, 0.05, -0.03, 0, 0, 0.17, 0.22, 0.05, -0.03, 0, 0, -0.13,
        ]),
        3
      )
    );
    const dove = new THREE.Mesh(doveGeo, doveMat);
    dove.visible = false;
    root.add(dove);
    return {
      sprite,
      dove,
      doveGeo,
      phase: i / LETTERS.length,
      seed: (i * 0.618) % 1,
      speed: 0.09 + ((i * 37) % 10) * 0.006,
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
    gsap.from(book.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 0.55,
      ease: "back.out(1.4)",
      delay: 0.3,
    });
    gsap.to(book.position, { y: 0.09, duration: 3.1, ease: "sine.inOut", repeat: -1, yoyo: true });
  }

  stage.onFrame((t, dt) => {
    leaves.forEach(bend);
    aura.material.opacity = 0.2 + Math.sin(t * 1.4) * 0.06 + (rush.v - 1) * 0.06;
    // the ribbon: pinned at the top, swinging more the lower it hangs
    const rp = ribbonGeo.attributes.position;
    for (let i = 0; i <= 12; i++) {
      const v = i / 12;
      const sway =
        (Math.sin(t * 1.3 + v * 3.4) * 0.12 + Math.sin(t * 2.9 + v * 6.0) * 0.04) * v * v;
      for (const k of [i * 2, i * 2 + 1]) {
        rp.setX(k, (k % 2 ? 0.05 : -0.05) + sway);
        rp.setY(k, -v * 0.5);
        rp.setZ(k, -v * v * 0.35);
      }
    }
    rp.needsUpdate = true;
    ribbonGeo.computeVertexNormals();

    // each letter lifts off the page glowing; at the top of its rise it folds into a paper bird (a dove,
    // a crane or a swan, by its size and wing), which flies off towards the low sun and dwindles
    script.forEach((s) => {
      s.phase = (s.phase + dt * s.speed * rush.v) % 1;
      const k = s.phase;
      const side = s.seed * 2 - 1;
      const rise = Math.min(1, k / 0.4);
      const up = 1 - (1 - rise) ** 2;
      const x = side * 0.6 + side * up * 0.9 + Math.sin(k * 7 + s.seed * 20) * 0.1;
      const y = 0.1 + up * 1.5;
      s.sprite.position.set(x, y, 0.8);
      const size = 0.16 + up * 0.2;
      s.sprite.scale.set(size, size, 1);
      const folded = Math.max(0, Math.min(1, (k - 0.4) / 0.08));
      s.sprite.material.opacity = Math.min(1, k / 0.06) * (1 - folded);
      s.sprite.material.rotation = Math.sin(k * 5 + s.seed * 9) * 0.5;
      const fly = Math.max(0, (k - 0.4) / 0.6);
      s.dove.visible = fly > 0;
      // each bird leaves on its own heading (up, down, left, right, and between) and keeps going
      // until it is off the stage; it is never seen coming back
      const heading = s.seed * Math.PI * 2 + 0.6;
      const far = fly * (0.4 + fly) * 9;
      const hx = Math.cos(heading);
      const hy = Math.sin(heading);
      s.dove.position.set(x + hx * far, y + hy * far + Math.sin(fly * 12 + s.seed * 6) * 0.12, 0.8);
      s.dove.rotation.set(0.3, hx >= 0 ? Math.PI / 2 : -Math.PI / 2, (hx >= 0 ? 1 : -1) * hy * 0.7);
      const kind = 0.6 + s.seed * 0.6;
      s.dove.scale.set(kind, kind, kind * (1 + s.seed * 0.8));
      s.dove.scale.multiplyScalar(Math.min(1, fly / 0.08));
      const beat = Math.sin(t * 11 + s.seed * 40) * 0.14;
      const dp = s.doveGeo.attributes.position;
      dp.setY(2, 0.03 + beat);
      dp.setY(4, 0.03 + beat);
      dp.needsUpdate = true;
      s.doveGeo.computeVertexNormals();
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
    leave(station) {
      // the book comes to the middle and shuts, its two halves folding together with the pages inside;
      // only once it is shut does it turn its front cover to you, and the page arrives then
      leaves.forEach((leaf) => (leaf.group.visible = false));
      flip.pause();
      const tl = gsap
        .timeline()
        .to(rush, { v: 0.2, duration: 0.3 }, 0)
        .to(station.position, { x: 0, y: 0, duration: 0.5, ease: "power3.inOut" }, 0)
        .to(book.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.5, ease: "power3.inOut" }, 0)
        .to(aura.scale, { x: 0.01, y: 0.01, duration: 0.35 }, 0.15);
      hinges.forEach(({ hinge, side }) => {
        tl.to(
          hinge.rotation,
          { y: -side * (Math.PI / 2 - 0.015), duration: 0.55, ease: "power2.inOut" },
          0.25
        );
        // each half stands the thickness of its pages away from the middle, as a spine holds them, so
        // the two blocks of pages meet face to face and neither passes through the other
        tl.to(hinge.position, { x: side * (T + 0.05), duration: 0.55, ease: "power2.inOut" }, 0.25);
      });
      return tl
        .to(
          book.rotation,
          { x: -0.1, y: -Math.PI / 2 + 0.3, z: 0, duration: 0.55, ease: "power2.inOut" },
          0.7
        )
        .to(book.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.3, ease: "power2.in" }, 1.5);
    },
  };
}
