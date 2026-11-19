"use client";
// The card flip. The question card lifts toward you and turns over in 3D (three.js, with depth), a
// turn and a half, while it flies to where the ending's left pane is and takes on its size; its back
// is that pane. A band of light sweeps across it as it turns. It lands exactly on the pane, which takes
// over, and the ending's answers then fan out of it like a hand of cards (HomeworkEnd).
import { chime, drawCard, stageOn, whoosh, type Run } from "./introKit";
import gsap from "gsap";

export const flip: Run = ({ card, canvas, side, onLanded, onGone }) => {
  let stop = false;
  let frame = 0;
  let cleanup = () => {};
  const tweens: gsap.core.Timeline[] = [];
  void (async () => {
    const stage = await stageOn(canvas, true);
    if (stop) return;
    if (!stage) {
      onLanded();
      onGone();
      return;
    }
    const { THREE, renderer, scene, camera, dpr, at } = stage;
    const from = card.getBoundingClientRect();
    const to = side?.getBoundingClientRect() ?? from;
    const frontTex = new THREE.CanvasTexture(drawCard(card, dpr));
    frontTex.colorSpace = THREE.SRGBColorSpace;
    // the back: the ending's left pane as it will be (its words and its glass)
    const backCanvas = side ? drawCard(side, dpr, true) : drawCard(card, dpr);
    const backTex = new THREE.CanvasTexture(backCanvas);
    backTex.colorSpace = THREE.SRGBColorSpace;
    const unit = new THREE.PlaneGeometry(1, 1);
    const front = new THREE.Mesh(
      unit,
      new THREE.MeshBasicMaterial({ map: frontTex, transparent: true, side: THREE.FrontSide })
    );
    const back = new THREE.Mesh(
      unit,
      new THREE.MeshBasicMaterial({ map: backTex, transparent: true, side: THREE.FrontSide })
    );
    back.rotation.y = Math.PI;
    // the sweep of light across the face as it turns
    const sheen = new THREE.Mesh(
      unit,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    sheen.position.z = 0.5;
    const cardGroup = new THREE.Group();
    cardGroup.add(front, back, sheen);
    scene.add(cardGroup);

    const a = at(from.left + from.width / 2, from.top + from.height / 2);
    const b = at(to.left + to.width / 2, to.top + to.height / 2);
    const s = {
      x: a.x,
      y: a.y,
      z: 0,
      w: from.width,
      h: from.height,
      turn: 0,
      tilt: 0,
    };
    const pose = () => {
      cardGroup.position.set(s.x, s.y, s.z);
      cardGroup.scale.set(s.w, s.h, 1);
      cardGroup.rotation.set(s.tilt, s.turn, 0);
      (sheen.material as import("three").MeshBasicMaterial).opacity =
        0.35 * Math.pow(Math.abs(Math.sin(s.turn)), 3);
    };
    pose();
    card.style.visibility = "hidden";
    const tick = () => {
      if (stop) return;
      pose();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const line = gsap.timeline({
      onComplete: () => {
        onLanded();
        // the pane is there now, exactly under it: the card goes at once, not over it
        gsap.set(canvas, { opacity: 0, delay: 0.05, onComplete: onGone });
      },
    });
    tweens.push(line);
    line
      .add(() => whoosh(0.9), 0)
      // up toward you, turning over a turn and a half
      .to(s, { z: 260, duration: 0.6, ease: "power2.out" }, 0)
      .to(s, { z: 0, duration: 0.7, ease: "power2.in" }, 0.6)
      .to(s, { turn: Math.PI * 3, duration: 1.3, ease: "power2.inOut" }, 0)
      .to(s, { tilt: -0.25, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0)
      // to the pane's place and size
      .to(s, { x: b.x, y: b.y, w: to.width, h: to.height, duration: 1.3, ease: "power3.inOut" }, 0)
      .add(() => chime([784, 1046.5, 1568]), 1.15);
    cleanup = () => {
      tweens.forEach((t) => t.kill());
      unit.dispose();
      frontTex.dispose();
      backTex.dispose();
      renderer.dispose();
    };
  })();
  return () => {
    stop = true;
    cancelAnimationFrame(frame);
    cleanup();
  };
};
