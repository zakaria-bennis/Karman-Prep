/*
 * iPhone 17 Pro Max, drawn by hand for Karman (no Apple images or logos).
 *
 * Geometry, in iOS points (1 pt = 3 device pixels = 0.1657 mm at 460 ppi):
 *   screen          440 x 956 pt (2868 x 1320 px), display corner radius 62 pt
 *   body            471 x 986 pt  (Apple: 78.0 x 163.4 mm)
 *   screen inset    15.5 pt left/right, 15 pt top/bottom (even bezel + edge)
 *   outer radius    77.5 pt (62 + 15.5, concentric with the screen)
 *   metal band      4 pt seen from the front, then 11.5 pt of black bezel
 *   Dynamic Island  126 x 37 pt, 11 pt below the top of the screen
 *   side buttons    3 pt proud of the body; left: Action, volume up, volume down;
 *                   right: side button, Camera Control (positions approximate, from
 *                   published side-view drawings, not an Apple drawing)
 * The SVG adds a 4 pt margin on every side for the buttons: viewBox 0 0 479 994.
 * No drop shadow (rule 5): depth comes from the edge highlight only.
 *
 * Use in a page:
 *   <link rel="stylesheet" href="device/device.css">
 *   <script type="module" src="device/device.js"></script>
 *   <k-iphone finish="orange" src="shots/student-home-cohort-phone-dark.webp"></k-iphone>
 *   <k-iphone finish="blue" src="clip.mp4" video></k-iphone>   (muted, inline, looping)
 * Size it with CSS width (height follows): k-iphone { width: 320px }.
 * Or call iphoneSVG("silver") for the frame markup alone.
 */

export const GEOMETRY = {
  viewW: 479,
  viewH: 994,
  pad: 4,
  bodyW: 471,
  bodyH: 986,
  screenX: 19.5, // pad + 15.5
  screenY: 19, // pad + 15
  screenW: 440,
  screenH: 956,
  screenR: 62,
  outerR: 77.5,
  band: 4,
  island: { w: 126, h: 37, top: 11 },
};

export const FINISHES = {
  // base, light (edge highlight), dark (edge shade), button
  orange: { name: "Cosmic orange", base: "#E2702A", light: "#F7A469", dark: "#A9481A"},
  blue: { name: "Deep blue", base: "#2F3B54", light: "#5D6C8C", dark: "#1A2233" },
  silver: { name: "Silver", base: "#D3D4D2", light: "#F4F4F2", dark: "#9C9D9B" },
};

const BUTTONS = [
  // side, top (pt from body top), length (pt)
  ["left", 181, 42], // Action button
  ["left", 253, 66], // volume up
  ["left", 336, 66], // volume down
  ["right", 262, 103], // side button
  ["right", 640, 80], // Camera Control
];

/** The frame as SVG markup. The screen is a hole, so whatever sits under it shows through. */
export function iphoneSVG(finish = "orange", { id = finish } = {}) {
  const f = FINISHES[finish] ?? FINISHES.orange;
  const g = GEOMETRY;
  const p = g.pad;
  const rr = (x, y, w, h, r) =>
    `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
  const body = rr(p, p, g.bodyW, g.bodyH, g.outerR);
  const b = g.band;
  const bezel = rr(p + b, p + b, g.bodyW - 2 * b, g.bodyH - 2 * b, g.outerR - b);
  const screen = rr(g.screenX, g.screenY, g.screenW, g.screenH, g.screenR);
  const buttons = BUTTONS.map(([side, top, len]) => {
    const x = side === "left" ? p - 3 : p + g.bodyW - 3;
    return `<rect x="${x}" y="${p + top}" width="6" height="${len}" rx="2.5" fill="url(#k-btn-${id})"/>`;
  }).join("");
  const iw = g.island.w;
  const ix = g.screenX + (g.screenW - iw) / 2;
  const iy = g.screenY + g.island.top;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.viewW} ${g.viewH}" width="${g.viewW}" height="${g.viewH}" role="img" aria-label="iPhone 17 Pro Max, ${f.name}">
<defs>
<linearGradient id="k-metal-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${f.light}"/><stop offset="0.18" stop-color="${f.base}"/><stop offset="0.82" stop-color="${f.base}"/><stop offset="1" stop-color="${f.dark}"/></linearGradient>
<linearGradient id="k-edge-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.65" stop-color="#000" stop-opacity="0.05"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>
<linearGradient id="k-btn-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${f.dark}"/><stop offset="0.5" stop-color="${f.light}"/><stop offset="1" stop-color="${f.dark}"/></linearGradient>
</defs>
${buttons}
<path d="${body}${bezel}" fill="url(#k-metal-${id})" fill-rule="evenodd"/>
<clipPath id="k-clip-${id}"><path d="${body}"/></clipPath>
<path d="${body}" fill="none" stroke="url(#k-edge-${id})" stroke-width="3" clip-path="url(#k-clip-${id})"/>
<path d="${bezel}${screen}" fill="#050506" fill-rule="evenodd"/>
<path d="${bezel}" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="0.75"/>
<rect x="${ix}" y="${iy}" width="${iw}" height="${g.island.h}" rx="${g.island.h / 2}" fill="#000"/>
<circle cx="${ix + iw - 22}" cy="${iy + g.island.h / 2}" r="5.5" fill="#0b0d14"/>
<circle cx="${ix + iw - 22}" cy="${iy + g.island.h / 2}" r="2.4" fill="#141a2a"/>
</svg>`;
}

/** Percentages that place a picture exactly inside the screen of a box sized like the frame. */
export const SCREEN_BOX = {
  left: `${(GEOMETRY.screenX / GEOMETRY.viewW) * 100}%`,
  top: `${(GEOMETRY.screenY / GEOMETRY.viewH) * 100}%`,
  width: `${(GEOMETRY.screenW / GEOMETRY.viewW) * 100}%`,
  height: `${(GEOMETRY.screenH / GEOMETRY.viewH) * 100}%`,
  radius: `${(GEOMETRY.screenR / GEOMETRY.screenW) * 100}% / ${(GEOMETRY.screenR / GEOMETRY.screenH) * 100}%`,
};

if (typeof customElements !== "undefined" && !customElements.get("k-iphone")) {
  class KIPhone extends HTMLElement {
    static observedAttributes = ["finish", "src", "video", "alt"];
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const finish = this.getAttribute("finish") || "orange";
      const src = this.getAttribute("src") || "";
      const alt = this.getAttribute("alt") || "";
      const media = !src
        ? ""
        : this.hasAttribute("video")
          ? `<video class="k-iphone__media" src="${src}" muted autoplay loop playsinline aria-label="${alt}"></video>`
          : `<img class="k-iphone__media" src="${src}" alt="${alt}" decoding="async">`;
      this.innerHTML = `<div class="k-iphone__screen">${media}</div><div class="k-iphone__frame">${iphoneSVG(finish, { id: `${finish}-${Math.random().toString(36).slice(2, 7)}` })}</div>`;
      const video = this.querySelector("video");
      if (video && matchMedia("(prefers-reduced-motion: reduce)").matches) { video.removeAttribute("autoplay"); video.pause(); }
    }
  }
  customElements.define("k-iphone", KIPhone);
}
