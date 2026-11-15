"use client";

// The two objects on the Library's doors, drawn live with three.js and moved with GSAP: a book whose
// pages turn for Reading and Writing, and a faceted solid with two orbiting rings for Math. Both are
// built from plain shapes here (no model file, no image). three.js and GSAP load only when a door is on
// screen. Reduced motion holds one still frame.
import { useEffect, useRef } from "react";

export type SubjectKind = "reading" | "math";

const CREAM = 0xfff6e8;
const CLAY = 0xcf8257;
const HONEY = 0xe9b24a;
const SAGE = 0x74ad8c;
const PINE = 0x3f7f5e;

export default function SubjectModel({
  kind,
  lively,
  still,
}: {
  kind: SubjectKind;
  /** The door is hovered, focused or pressed: the object leans in. */
  lively: boolean;
  still: boolean;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const lean = useRef<(on: boolean) => void>(() => {});

  useEffect(() => {
    const box = host.current;
    if (!box) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { gsap }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("gsap"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      // the canvas fills its box; setSize below only sets how many pixels it draws
      Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });
      box.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0, 7.4);
      const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
      sun.position.set(-3, 4, 5);
      scene.add(sun, new THREE.HemisphereLight(0xfff4e6, 0xb9896a, 0.7));

      const glossy = (color: number, roughness = 0.28) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.25,
        });

      const root = new THREE.Group();
      scene.add(root);
      const ctx = gsap.context(() => {});
      const loops: (() => void)[] = [];

      if (kind === "reading") {
        root.rotation.set(-0.62, 0.42, 0.06);
        const paper = glossy(CREAM, 0.6);
        for (const side of [-1, 1]) {
          const hinge = new THREE.Group();
          hinge.rotation.y = -side * 0.3;
          const cover = new THREE.Mesh(
            new THREE.BoxGeometry(1.62, 2.16, 0.09),
            glossy(side < 0 ? CLAY : 0xc0764c)
          );
          cover.position.set(side * 0.81, 0, 0);
          const block = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.02, 0.2), paper);
          block.position.set(side * 0.77, 0, 0.14);
          hinge.add(cover, block);
          root.add(hinge);
        }
        const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.03), glossy(HONEY));
        ribbon.position.set(0.35, -1.35, 0.2);
        root.add(ribbon);
        // three loose pages that turn from the right block to the left and back
        for (let i = 0; i < 3; i++) {
          const hinge = new THREE.Group();
          const page = new THREE.Mesh(
            new THREE.PlaneGeometry(1.46, 1.98),
            new THREE.MeshPhysicalMaterial({ color: CREAM, roughness: 0.7, side: THREE.DoubleSide })
          );
          page.position.set(0.74, 0, 0);
          hinge.add(page);
          hinge.position.z = 0.26 + i * 0.012;
          hinge.rotation.y = -0.34 - i * 0.05;
          root.add(hinge);
          loops.push(() =>
            ctx.add(() => {
              gsap.to(hinge.rotation, {
                y: -(Math.PI - 0.34 - i * 0.05),
                duration: 1.5,
                ease: "power2.inOut",
                delay: 0.6 + i * 0.45,
                repeat: -1,
                yoyo: true,
                repeatDelay: 1.6,
              });
            })
          );
        }
      } else {
        root.rotation.set(0.35, 0.3, 0);
        const solid = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.12, 0),
          new THREE.MeshPhysicalMaterial({
            color: SAGE,
            roughness: 0.3,
            clearcoat: 1,
            clearcoatRoughness: 0.2,
            flatShading: true,
          })
        );
        const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.035, 12, 96), glossy(HONEY));
        ringA.rotation.x = 1.25;
        const moon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), glossy(CLAY));
        moon.position.set(1.72, 0, 0);
        ringA.add(moon);
        const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.025, 12, 96), glossy(PINE));
        ringB.rotation.set(0.5, 0.9, 0);
        root.add(solid, ringA, ringB);
        loops.push(() =>
          ctx.add(() => {
            gsap.to(solid.rotation, {
              y: Math.PI * 2,
              x: Math.PI * 2,
              duration: 22,
              ease: "none",
              repeat: -1,
            });
            gsap.to(ringA.rotation, { z: Math.PI * 2, duration: 9, ease: "none", repeat: -1 });
            gsap.to(ringB.rotation, { z: -Math.PI * 2, duration: 14, ease: "none", repeat: -1 });
          })
        );
      }

      const size = () => {
        const w = box.clientWidth || 1;
        const h = box.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // a narrow box sees the same object from further back, so it is never cropped
        camera.position.z = 7.4 * Math.max(1, 1.05 / camera.aspect);
        camera.updateProjectionMatrix();
      };
      const draw = () => renderer.render(scene, camera);
      const sized = new ResizeObserver(() => {
        size();
        draw();
      });
      sized.observe(box);
      size();

      if (still) {
        draw();
      } else {
        loops.forEach((start) => start());
        ctx.add(() => {
          // it rises into place, then floats
          gsap.from(root.scale, {
            x: 0.6,
            y: 0.6,
            z: 0.6,
            duration: 1.2,
            ease: "elastic.out(1, 0.6)",
          });
          gsap.from(root.rotation, { y: root.rotation.y - 1.4, duration: 1.4, ease: "power3.out" });
          gsap.to(root.position, {
            y: 0.09,
            duration: 2.6,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        });
        gsap.ticker.add(draw);
        lean.current = (on) =>
          ctx.add(() => {
            gsap.to(root.scale, {
              x: on ? 1.13 : 1,
              y: on ? 1.13 : 1,
              z: on ? 1.13 : 1,
              duration: 0.9,
              ease: "elastic.out(1, 0.5)",
              overwrite: "auto",
            });
            if (on)
              gsap.to(root.rotation, {
                z: root.rotation.z + (kind === "math" ? 0.5 : 0.12),
                duration: 1.1,
                ease: "power3.out",
              });
          });
      }

      cleanup = () => {
        gsap.ticker.remove(draw);
        ctx.revert();
        sized.disconnect();
        pmrem.dispose();
        scene.traverse((o) => {
          const mesh = o as { geometry?: { dispose(): void }; material?: { dispose(): void } };
          mesh.geometry?.dispose();
          mesh.material?.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [kind, still]);

  useEffect(() => {
    lean.current(lively);
  }, [lively]);

  return (
    <span
      ref={host}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
