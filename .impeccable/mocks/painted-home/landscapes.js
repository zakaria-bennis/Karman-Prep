/*
 * Karman's landscapes, rendered in detail: layered mountain ranges with lit and shaded faces,
 * snow, mist, forests of single trees, water that reflects everything above it, and a
 * foreground. Each comes in four lights: dawn, day, sunset and night. The finished picture is
 * then broken into brush strokes by painterly.js, which paints it in on opening.
 */
(() => {
  /* ---------- Noise ---------- */
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const smooth = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; }
  function fbm(x, y, s, o = 5) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f, s + i * 17); f *= 2.03; a *= 0.5; } return v; }
  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c, a = 1) => `rgba(${c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")},${a})`;

  /* ---------- Light for four times of day ---------- */
  const LIGHT = {
    dawn: { top: "#5d6da6", low: "#f7c6a5", haze: "#e9c3bb", sun: "#ffe0b0", glow: "#ffb98a", sunAt: [0.3, 0.52], lit: "#f7c9b0", shade: "#4e4a68", land: "#4c5a4a", deep: "#26302c", water: "#b9a8b8", snow: "#fbe9e0", cloud: "#fbd8c8", cloudShade: "#9d8aa6", stars: 0, dark: 0.15 },
    day: { top: "#2f6db3", low: "#cfe6f4", haze: "#c9dcea", sun: "#ffffff", glow: "#ffffff", sunAt: [0.55, 0.12], lit: "#e9eef2", shade: "#55657a", land: "#4d7a35", deep: "#1e3a24", water: "#5b97bd", snow: "#ffffff", cloud: "#ffffff", cloudShade: "#aebccd", stars: 0, dark: 0 },
    sunset: { top: "#3b2d6b", low: "#f8984a", haze: "#e99a7a", sun: "#ffd89a", glow: "#ff9a4a", sunAt: [0.62, 0.5], lit: "#ffb07a", shade: "#3e2b4e", land: "#3d3a2e", deep: "#1c1620", water: "#d98a64", snow: "#ffd2b0", cloud: "#ffb27a", cloudShade: "#9a4c6e", stars: 0, dark: 0.25 },
    night: { top: "#050a1c", low: "#22345e", haze: "#2b3d66", sun: "#f2eedc", glow: "#9fb3e6", sunAt: [0.8, 0.16], lit: "#9fb2d8", shade: "#121a33", land: "#0f1a28", deep: "#060b14", water: "#1c2c52", snow: "#c9d6ee", cloud: "#3e5079", cloudShade: "#16203d", stars: 1, dark: 0.6 },
  };

  /* ---------- Painting primitives on a 2D canvas ---------- */
  function studio(W, H, L, seed) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"), r = rng(seed), C = Object.fromEntries(Object.entries(L).map(([k, v]) => [k, typeof v === "string" ? hex(v) : v]));
    const k = {
      c, g, r, C, W, H,
      sky(horizon) {
        const gr = g.createLinearGradient(0, 0, 0, H * horizon); gr.addColorStop(0, rgb(C.top)); gr.addColorStop(1, rgb(C.low)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const [sx, sy] = [C.sunAt[0] * W, C.sunAt[1] * H], gl = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.45);
        gl.addColorStop(0, rgb(C.glow, L === LIGHT.night ? 0.25 : 0.55)); gl.addColorStop(1, rgb(C.glow, 0)); g.fillStyle = gl; g.fillRect(0, 0, W, H);
        if (C.stars) for (let i = 0; i < 260; i++) { g.fillStyle = rgb([235, 238, 250], 0.4 + r() * 0.6); const s = r() < 0.08 ? 1.6 : 0.8; g.fillRect(r() * W, r() * H * horizon * 0.85, s, s); }
      },
      clouds(n, v0, v1) {
        for (let i = 0; i < n; i++) {
          const cx = r() * W, cy = H * (v0 + r() * (v1 - v0)), w = W * (0.12 + r() * 0.22);
          for (let j = 0; j < 14; j++) { const x = cx + (r() - 0.5) * w, y = cy + (r() - 0.5) * w * 0.12, rr = w * (0.06 + r() * 0.1); const gr = g.createRadialGradient(x, y - rr * 0.3, 0, x, y, rr); gr.addColorStop(0, rgb(C.cloud, 0.9)); gr.addColorStop(0.7, rgb(mix(C.cloud, C.cloudShade, 0.5), 0.6)); gr.addColorStop(1, rgb(C.cloudShade, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr * 1.6, rr, 0, 0, 6.283); g.fill(); }
        }
      },
      sun(size = 0.035) { const [sx, sy] = [C.sunAt[0] * W, C.sunAt[1] * H]; g.fillStyle = rgb(C.sun); g.beginPath(); g.arc(sx, sy, W * size, 0, 6.283); g.fill(); },
      /* A mountain range: ridge from noise, each column lit or shaded by its slope, with snow and striations. */
      range({ base, top, amp = 0.2, freq = 2.2, s = 1, far = 0, snow = 0, x0 = 0, x1 = 1, peak = null, tint = null }) {
        const ridge = new Float32Array(W);
        /* Ridged noise makes sharp peaks and saddles instead of a flat wall. */
        const ridgedN = (u) => { let v = 0, a2 = 0.6, f = 1; for (let i = 0; i < 5; i++) { v += a2 * (1 - Math.abs(2 * vnoise(u * freq * f, 0.5 + i, s + i * 7) - 1)) ** 2; f *= 2.1; a2 *= 0.45; } return v; };
        for (let x = 0; x < W; x++) {
          const u = x / W;
          let v = base - (base - top) * (0.25 + 0.75 * ridgedN(u)) - amp * 0.5 * (fbm(u * 3, 1, s) - 0.5);
          if (peak) v = Math.min(v, peak[1] + Math.abs(u - peak[0]) * peak[2] * (0.85 + 0.3 * vnoise(u * 20, 3, s)));
          const edge = Math.min(1, Math.max(0, Math.min((u - x0) / 0.05, (x1 - u) / 0.05)));
          ridge[x] = H * (base + (v - base) * edge);
        }
        /* Inside the range, a height field gives rock faces: the sunward ones lit, the rest in shade. */
        const hf = (x, y) => fbm(x * 0.018, y * 0.03, s + 5, 5) + 0.6 * vnoise(x * 0.06, y * 0.05, s + 11);
        const sunRight = C.sunAt[0] * W > W * 0.5 ? 1 : -1, hazeK = 0.06 + far * 0.7, T = tint ? hex(tint) : null;
        for (let x = 0; x < W; x += 1) {
          const y0 = ridge[x], span = H * base - y0; if (span <= 0) continue;
          const slope = (ridge[Math.min(W - 1, x + 3)] - ridge[Math.max(0, x - 3)]) / 6;
          for (let y = Math.floor(y0); y < H * base; y += 2) {
            const d = (y - y0) / span, gx = hf(x + 2, y) - hf(x - 2, y), face = d < 0.12 ? -slope * 0.5 : gx * 6;
            const light = Math.max(0, Math.min(1, 0.5 + face * sunRight * 1.6));
            let col = mix(C.shade, C.lit, light * (1 - d * 0.55));
            col = mix(col, C.deep, d * 0.35);
            if (T) col = mix(col, mix(T, C.deep, L.dark * 0.7), 0.45);
            if (snow) { const sn = snow * (0.55 + hf(x, y) * 0.6) - d; if (sn > 0) col = mix(col, light > 0.45 ? C.snow : mix(C.snow, C.shade, 0.5), Math.min(0.9, sn * 6)); }
            col = mix(col, C.haze, hazeK * (0.55 + d * 0.45));
            g.fillStyle = rgb(col); g.fillRect(x, y, 1, 2);
          }
        }
        return ridge;
      },
      mist(v, h = 0.06, a = 0.55) { for (let i = 0; i < 40; i++) { const x = r() * W, y = H * (v + (r() - 0.5) * h), w = W * (0.1 + r() * 0.2), gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, rgb(mix(C.haze, [255, 255, 255], 0.3), a * 0.35)); gr.addColorStop(1, rgb(C.haze, 0)); g.fillStyle = gr; g.fillRect(x - w, y - w, w * 2, w * 2); } },
      /* A band of trees: many single evergreens or round trees, smaller and hazier when far. */
      forest(v, { height = 0.05, from = 0, to = 1, density = 1, kind = "pine", far = 0, colors = null, rowH = 0.02 }) {
        const n = Math.round(W * (to - from) * density / 6), base = colors ? colors.map(hex) : [C.deep, C.land];
        for (let row = 0; row < 3; row++) for (let i = 0; i < n; i++) {
          const x = W * (from + r() * (to - from)), y = H * (v + row * rowH + (r() - 0.5) * 0.01), h = H * height * (0.6 + r() * 0.7) * (1 + row * 0.15);
          let col = mix(base[Math.floor(r() * base.length)], C.deep, 0.2 + row * 0.15); col = mix(col, C.haze, far * 0.7);
          const litc = mix(col, C.lit, 0.35 * (1 - far));
          if (kind === "pine") { g.fillStyle = rgb(col); g.beginPath(); g.moveTo(x, y - h); for (let t = 0; t <= 6; t++) { const yy = y - h + (h * t) / 6, w = (h * 0.32 * t) / 6; g.lineTo(x + w, yy + h * 0.06); g.lineTo(x + w * 0.55, yy + h * 0.06); } g.lineTo(x, y); for (let t = 6; t >= 0; t--) { const yy = y - h + (h * t) / 6, w = (h * 0.32 * t) / 6; g.lineTo(x - w * 0.55, yy + h * 0.06); g.lineTo(x - w, yy + h * 0.06); } g.fill(); g.fillStyle = rgb(litc, 0.6); g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.18, y - h * 0.3); g.lineTo(x + h * 0.04, y - h * 0.3); g.fill(); }
          else { for (let j = 0; j < 5; j++) { g.fillStyle = rgb(j < 3 ? col : litc); g.beginPath(); g.arc(x + (r() - 0.5) * h * 0.6, y - h * 0.55 + (r() - 0.5) * h * 0.4, h * (0.22 + r() * 0.14), 0, 6.283); g.fill(); } }
        }
      },
      /* Water: everything above the waterline, mirrored, darkened and rippled, then a sheen. */
      lake(v, tint = 0.35) {
        const y0 = Math.round(H * v), src = document.createElement("canvas"); src.width = W; src.height = y0; src.getContext("2d").drawImage(c, 0, 0, W, y0, 0, 0, W, y0);
        for (let y = y0; y < H; y++) { const d = y - y0, sy = y0 - 1 - d * 1.0; if (sy < 0) break; const off = Math.sin(y * 0.6) * (1 + d * 0.01) + (fbm(y * 0.2, 1, 3) - 0.5) * 6; g.drawImage(src, 0, sy, W, 1, off, y, W, 1); }
        const gr = g.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, rgb(C.water, tint)); gr.addColorStop(1, rgb(C.water, Math.min(0.9, tint + 0.35))); g.fillStyle = gr; g.fillRect(0, y0, W, H - y0);
        g.fillStyle = rgb(mix(C.sun, [255, 255, 255], 0.3), 0.25); for (let i = 0; i < 70; i++) { const y = y0 + Math.pow(r(), 1.6) * (H - y0), x = C.sunAt[0] * W + (r() - 0.5) * W * 0.25, w = 8 + r() * 50; g.fillRect(x - w / 2, y, w, 1); }
        g.fillStyle = rgb(mix(C.haze, [255, 255, 255], 0.4), 0.5); g.fillRect(0, y0, W, 1.5);
      },
      ground(v, colA, colB, rough = 1) {
        for (let y = Math.floor(H * v); y < H; y += 2) for (let x = 0; x < W; x += 2) { const n = fbm(x * 0.02, y * 0.05, 31, 4), t = (y - H * v) / (H * (1 - v)); g.fillStyle = rgb(mix(mix(hex(colA), hex(colB), n * rough), C.deep, t * 0.35 + L.dark * 0.6)); g.fillRect(x, y, 2, 2); }
      },
      hill(v, amp, freq, s, colA, colB, x0 = 0, x1 = 1) {
        g.beginPath(); g.moveTo(W * x0, H); for (let x = W * x0; x <= W * x1; x += 4) g.lineTo(x, H * (v - amp * fbm(x / W * freq, 3, s))); g.lineTo(W * x1, H); g.closePath();
        const gr = g.createLinearGradient(0, H * (v - amp), 0, H); gr.addColorStop(0, rgb(mix(mix(hex(colA), C.lit, 0.2), C.deep, L.dark * 0.6))); gr.addColorStop(1, rgb(mix(hex(colB), C.deep, 0.3 + L.dark * 0.5))); g.fillStyle = gr; g.fill();
      },
      pine(x, y, h, snowy = 0) { const X = x * W, Y = y * H, HH = h * H; g.fillStyle = rgb(mix(C.deep, [0, 0, 0], 0.2)); g.beginPath(); g.moveTo(X, Y - HH); for (let t = 0; t <= 9; t++) { const yy = Y - HH + (HH * t) / 9, w = (HH * 0.3 * t) / 9 * (0.8 + r() * 0.4); g.lineTo(X + w, yy + HH * 0.05); g.lineTo(X + w * 0.5, yy + HH * 0.05); } g.lineTo(X, Y); for (let t = 9; t >= 0; t--) { const yy = Y - HH + (HH * t) / 9, w = (HH * 0.3 * t) / 9 * (0.8 + r() * 0.4); g.lineTo(X - w * 0.5, yy + HH * 0.05); g.lineTo(X - w, yy + HH * 0.05); } g.fill();
        g.fillStyle = rgb(mix(C.land, C.lit, 0.35 - L.dark * 0.3), 0.8); for (let t = 2; t <= 8; t++) { const yy = Y - HH + (HH * t) / 9, w = (HH * 0.3 * t) / 9; g.fillRect(X + w * 0.15, yy, w * 0.6, HH * 0.02); }
        if (snowy) { g.fillStyle = rgb(C.snow, 0.9); for (let t = 1; t <= 8; t++) { const yy = Y - HH + (HH * t) / 9, w = (HH * 0.3 * t) / 9; g.fillRect(X - w * 0.8, yy + HH * 0.02, w * 1.4, HH * 0.018); } } },
      tree(x, y, h, colors) { const X = x * W, Y = y * H, HH = h * H; g.strokeStyle = rgb(mix(C.deep, [60, 40, 30], 0.4)); g.lineWidth = HH * 0.04; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X - HH * 0.04, Y - HH * 0.4, X, Y - HH * 0.7); g.stroke(); const cs = colors.map(hex); for (let i = 0; i < 60; i++) { const a = r() * 6.283, d = Math.sqrt(r()), px = X + Math.cos(a) * d * HH * 0.38, py = Y - HH * 0.72 + Math.sin(a) * d * HH * 0.26, lit = (px - X) * (C.sunAt[0] > x ? 1 : -1) > 0; g.fillStyle = rgb(mix(mix(cs[i % cs.length], lit ? C.lit : C.deep, 0.3), C.deep, L.dark * 0.6)); g.beginPath(); g.arc(px, py, HH * (0.04 + r() * 0.05), 0, 6.283); g.fill(); } },
      grass(v, from = 0, to = 1, colors = ["#7a9a4a", "#b8c46a"]) { const cs = colors.map(hex); for (let i = 0; i < W * (to - from) * 1.5; i++) { const x = W * (from + r() * (to - from)), y = H * (v + r() * (1 - v)), h = 4 + r() * 12 * (y / H); g.strokeStyle = rgb(mix(mix(cs[i % cs.length], C.deep, 0.2), C.deep, L.dark * 0.7), 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - h); g.stroke(); } },
      /* A rock: a lumpy shape, lit on the sun side, dark underneath. */
      rock(x, y, size, col = null) { const X = x * W, Y = y * H, R = size * H, base = col ? hex(col) : mix(C.shade, C.land, 0.3); g.beginPath(); for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI, rr = R * (0.75 + r() * 0.35); g.lineTo(X + Math.cos(a) * rr * 1.3, Y + Math.sin(a) * rr * 0.8); } g.closePath(); const sunRight = C.sunAt[0] > x ? 1 : -1, gr = g.createLinearGradient(X - sunRight * R, Y - R, X + sunRight * R, Y); gr.addColorStop(0, rgb(mix(base, C.deep, 0.5 + L.dark * 0.3))); gr.addColorStop(1, rgb(mix(base, C.lit, 0.45 * (1 - L.dark)))); g.fillStyle = gr; g.fill(); g.fillStyle = rgb(C.deep, 0.5); g.fillRect(X - R * 1.3, Y - 1, R * 2.6, 3); },
      /* A bush: many leaves, dark inside, lit on top toward the sun. */
      bush(x, y, size, colors = ["#3f6a2e", "#6d9a3e"]) { const X = x * W, Y = y * H, R = size * H, cs = colors.map(hex), sunRight = C.sunAt[0] > x ? 1 : -1; for (let i = 0; i < 70; i++) { const a = Math.PI + r() * Math.PI, d = Math.sqrt(r()), px = X + Math.cos(a) * d * R * 1.4, py = Y + Math.sin(a) * d * R * 0.9, lit = (px - X) * sunRight > 0 && py < Y - R * 0.3; g.fillStyle = rgb(mix(mix(cs[i % cs.length], lit ? C.lit : C.deep, lit ? 0.35 : 0.3), C.deep, L.dark * 0.65)); g.beginPath(); g.ellipse(px, py, R * (0.06 + r() * 0.06), R * (0.04 + r() * 0.04), r() * 3, 0, 6.283); g.fill(); } },
      flowers(v, from, to, n, colors) { const cs = colors.map(hex); for (let i = 0; i < n; i++) { const x = W * (from + r() * (to - from)), y = H * (v + r() * (1 - v)), s2 = 1 + (y / H) * 2.5; g.fillStyle = rgb(mix(cs[i % cs.length], C.deep, L.dark * 0.7), 0.95); g.beginPath(); g.arc(x, y, s2, 0, 6.283); g.fill(); } },
      /* Dark bushes and grass in the lower corners frame the picture, as Bob Ross often did. */
      frame(colors = ["#1f3322", "#2f4a2a"]) { for (let i = 0; i < 6; i++) k.bush(0.6 + r() * 0.1 + i * 0.07, 1.0 + r() * 0.02, 0.07 + r() * 0.05, colors); },
      /* A flat-topped mesa with horizontal rock bands, for canyon country. */
      mesa(base, top, x0, x1, colA, colB) { const A = hex(colA), B = hex(colB), sunRight = C.sunAt[0] > (x0 + x1) / 2 ? 1 : -1; for (let x = Math.floor(W * x0); x < W * x1; x++) { const u = (x - W * x0) / (W * (x1 - x0)), edge = Math.min(1, u / 0.12, (1 - u) / 0.12), cliff = edge < 1 ? Math.min(1, 0.15 + Math.pow(edge, 0.35) * 0.9) : 1, y0 = H * (base - (base - top) * cliff + (vnoise(x * 0.04, 1, 7) - 0.5) * 0.02 + (edge < 1 ? (vnoise(x * 0.2, 2, 9) - 0.5) * 0.03 : 0)); for (let y = Math.floor(y0); y < H * base; y += 2) { const band = Math.sin((y / H) * 90 + vnoise(x * 0.01, y * 0.02, 3) * 4), facing = edge < 1 ? (u < 0.5 ? -1 : 1) : 0, light = facing ? (facing === sunRight ? 0.75 : 0.15) : 0.5; let col = mix(A, B, 0.5 + band * 0.25); col = mix(col, light > 0.5 ? C.lit : C.shade, Math.abs(light - 0.5) * 0.9); col = mix(col, C.deep, ((y - y0) / (H * base - y0)) * 0.3 + L.dark * 0.55); g.fillStyle = rgb(col); g.fillRect(x, y, 1, 2); } } },
      /* A river seen in perspective: narrow far away, wide near, reflecting the sky. */
      river(path, w0, w1) { const pts = path.map(([u, v]) => [u * W, v * H]); for (let i = 0; i < pts.length - 1; i++) { const t = i / (pts.length - 1), wa = H * (w0 + (w1 - w0) * t), wb = H * (w0 + (w1 - w0) * ((i + 1) / (pts.length - 1))), [ax, ay] = pts[i], [bx, by] = pts[i + 1]; g.beginPath(); g.moveTo(ax - wa, ay); g.lineTo(bx - wb, by); g.lineTo(bx + wb, by); g.lineTo(ax + wa, ay); g.closePath(); const gr = g.createLinearGradient(0, ay, 0, by); gr.addColorStop(0, rgb(mix(C.low, C.water, 0.4))); gr.addColorStop(1, rgb(mix(C.water, C.deep, 0.15 + L.dark * 0.4))); g.fillStyle = gr; g.fill(); g.fillStyle = rgb(mix(C.sun, [255, 255, 255], 0.4), 0.5); for (let j = 0; j < 6; j++) { const y = ay + r() * (by - ay), x = ax + (bx - ax) * ((y - ay) / (by - ay || 1)); g.fillRect(x - wa * 0.6 * r(), y, wa * 0.8 * r() + 3, 1.2); } } },
    };
    return k;
  }

  /* ---------- Ten compositions. Same scene at every hour; only the light changes. ---------- */
  const SCENES = [
    { title: "Evergreens by the mountain lake", paint(k) { k.sky(0.6); k.clouds(4, 0.05, 0.3); k.sun(); k.range({ base: 0.6, top: 0.32, amp: 0.22, s: 3, far: 0.5 }); k.range({ base: 0.6, top: 0.4, amp: 0.14, freq: 3, s: 7, snow: 0.35, peak: [0.72, 0.18, 0.9], x0: 0.35 }); k.mist(0.58, 0.04); k.forest(0.6, { height: 0.035, from: 0.2, to: 1, density: 2, far: 0.3 }); k.lake(0.61); k.ground(0.9, "#3f5a35", "#6d8a45"); k.rock(0.6, 0.93, 0.03); k.rock(0.66, 0.95, 0.045); k.grass(0.9, 0.55, 1); [[0.72, 0.97, 0.36], [0.8, 0.98, 0.5], [0.88, 0.96, 0.44], [0.95, 1, 0.62]].forEach(([x, y, h]) => k.pine(x, y, h)); k.bush(0.76, 0.99, 0.06); k.flowers(0.93, 0.55, 0.75, 40, ["#f4e3a0", "#e8a0b8"]); k.frame(); } },
    { title: "River through the misty valley", paint(k) { k.sky(0.5); k.clouds(5, 0.05, 0.28); k.sun(); k.range({ base: 0.58, top: 0.26, amp: 0.2, s: 11, far: 0.3, snow: 0.3 }); k.mist(0.55, 0.05, 0.35); k.range({ base: 0.68, top: 0.44, amp: 0.16, freq: 2.6, s: 13, far: 0.15 }); k.mist(0.65, 0.04, 0.35); k.forest(0.66, { height: 0.04, from: 0, to: 1, density: 1.6, far: 0.3 }); k.hill(0.8, 0.14, 2, 5, "#6d8a45", "#2f4a28"); k.river([[0.63, 0.67], [0.6, 0.72], [0.66, 0.79], [0.58, 0.88], [0.5, 1.02]], 0.004, 0.06); k.rock(0.55, 0.9, 0.025); k.rock(0.6, 0.97, 0.035); k.grass(0.82, 0.3, 1); k.tree(0.84, 0.94, 0.48, ["#4f7a35", "#7aa045", "#355a28"]); k.tree(0.94, 0.97, 0.38, ["#5a8038", "#8aa84a"]); k.bush(0.74, 0.97, 0.07); k.flowers(0.86, 0.3, 0.75, 60, ["#f6e08a", "#f0f0f0"]); k.frame(); } },
    { title: "Cabin in the winter woods", paint(k) { k.sky(0.55); k.clouds(3, 0.05, 0.22); k.sun(); k.range({ base: 0.6, top: 0.3, amp: 0.22, s: 21, snow: 0.8, far: 0.3 }); k.mist(0.58, 0.05); k.forest(0.62, { height: 0.04, from: 0, to: 1, density: 1.6, far: 0.35 }); k.ground(0.62, "#e9eef4", "#c3cedb", 0.6); const g = k.g, W = k.W, H = k.H, X = W * 0.64, Y = H * 0.8; g.fillStyle = "#4a3326"; g.fillRect(X, Y - H * 0.08, W * 0.09, H * 0.08); g.fillStyle = "#5a3a2a"; g.fillRect(X + W * 0.07, Y - H * 0.135, W * 0.012, H * 0.045); g.fillStyle = `rgb(${k.C.snow.map(Math.round)})`; g.beginPath(); g.moveTo(X - W * 0.012, Y - H * 0.075); g.lineTo(X + W * 0.045, Y - H * 0.14); g.lineTo(X + W * 0.102, Y - H * 0.075); g.fill(); g.fillStyle = "#f6c56b"; g.fillRect(X + W * 0.02, Y - H * 0.055, W * 0.018, H * 0.025); g.fillRect(X + W * 0.055, Y - H * 0.055, W * 0.018, H * 0.025); [[0.52, 0.86, 0.32], [0.8, 0.9, 0.48], [0.9, 0.95, 0.6], [0.98, 0.99, 0.7], [0.58, 0.95, 0.4]].forEach(([x, y, h]) => k.pine(x, y, h, 1)); } },
    { title: "Autumn forest on the lake", paint(k) { k.sky(0.55); k.clouds(4, 0.06, 0.3); k.sun(); k.range({ base: 0.56, top: 0.38, amp: 0.15, s: 31, far: 0.7 }); k.mist(0.55, 0.04); k.forest(0.58, { height: 0.08, from: 0, to: 1, density: 2.2, kind: "round", colors: ["#c8642c", "#e0a03a", "#a83a24", "#6d7a2c"], rowH: 0.012 }); k.forest(0.59, { height: 0.09, from: 0.1, to: 0.9, density: 0.4, colors: ["#23402e"] }); k.lake(0.6, 0.25); k.ground(0.93, "#5a4a2a", "#8a6a3a"); k.tree(0.86, 0.96, 0.5, ["#d0702e", "#eab048", "#b8452a"]); k.grass(0.92, 0.6, 1, ["#9a7a3a", "#c8a050"]); } },
    { title: "Waves on the rocky shore", paint(k) { k.sky(0.52); k.clouds(6, 0.05, 0.35); k.sun(0.04); const g = k.g, W = k.W, H = k.H, C = k.C; for (let y = H * 0.52; y < H * 0.86; y += 2) { const t = (y - H * 0.52) / (H * 0.34); g.fillStyle = `rgb(${C.water.map((v, i) => Math.round(v * (1 - t * 0.35) + C.deep[i] * t * 0.35)).join(",")})`; g.fillRect(0, y, W, 2); } for (let i = 0; i < 260; i++) { const y = H * (0.53 + Math.pow(k.r(), 1.4) * 0.3), x = k.r() * W, w = 6 + k.r() * 40 * (y / H); g.fillStyle = `rgba(255,255,255,${0.12 + k.r() * 0.3})`; g.fillRect(x, y, w, 1.5); } for (let j = 0; j < 3; j++) { const y0 = H * (0.7 + j * 0.06); g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2 + j; g.beginPath(); for (let x = 0; x < W * 0.7; x += 6) g.lineTo(x, y0 + Math.sin(x * 0.02 + j) * 4); g.stroke(); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + k.r() * 0.5})`; g.beginPath(); g.arc(k.r() * W * 0.7, y0 + (k.r() - 0.2) * 10, 2 + k.r() * 6, 0, 6.283); g.fill(); } } k.range({ base: 0.95, top: 0.5, amp: 0.2, freq: 3, s: 41, x0: 0.6, x1: 1.02, peak: [0.8, 0.42, 1.2] }); k.forest(0.5, { height: 0.05, from: 0.66, to: 0.95, density: 1, far: 0.1 }); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.5 + k.r() * 0.4})`; g.beginPath(); g.arc(W * (0.55 + k.r() * 0.12), H * (0.82 + k.r() * 0.08), 4 + k.r() * 14, 0, 6.283); g.fill(); } k.ground(0.88, "#d6c08a", "#a8946a", 0.5); g.fillStyle = `rgba(${C.water.map(Math.round).join(",")},.35)`; g.fillRect(0, H * 0.88, W * 0.6, H * 0.03); [[0.62, 0.95, 0.04], [0.7, 0.98, 0.06], [0.52, 0.93, 0.025]].forEach(([x, y, s2]) => k.rock(x, y, s2)); k.bush(0.92, 1, 0.1, ["#4a5a35", "#7a8a45"]); } },
    { title: "The old oak in the meadow", paint(k) { k.sky(0.58); k.clouds(7, 0.05, 0.36); k.sun(); k.range({ base: 0.58, top: 0.44, amp: 0.1, s: 51, far: 0.85 }); k.mist(0.56, 0.04); k.hill(0.66, 0.08, 1.6, 52, "#6d8a3e", "#3f5a2e"); k.forest(0.62, { height: 0.04, from: 0, to: 0.5, density: 1.2, kind: "round", far: 0.3 }); k.forest(0.64, { height: 0.05, from: 0.55, to: 0.75, density: 0.8, kind: "round", far: 0.2 }); k.hill(0.78, 0.1, 1.2, 53, "#9aae4e", "#5a7a35"); k.ground(0.85, "#8aa045", "#c2b65a"); const g = k.g, W = k.W, H = k.H; g.fillStyle = rgb(mix([210, 190, 140], k.C.deep, k.C.dark * 0.75), 0.75); g.beginPath(); g.moveTo(W * 0.5, H); g.quadraticCurveTo(W * 0.6, H * 0.85, W * 0.7, H * 0.74); g.lineTo(W * 0.715, H * 0.74); g.quadraticCurveTo(W * 0.66, H * 0.86, W * 0.62, H); g.fill(); k.tree(0.8, 0.88, 0.62, ["#3f6a2e", "#6d9a3e", "#2f5226"]); k.grass(0.8, 0, 1, ["#9ab050", "#d0c060", "#6a8a3a"]); k.flowers(0.82, 0.3, 1, 220, ["#f4d24a", "#ffffff", "#c86ab0", "#e86a4a"]); k.bush(0.95, 0.99, 0.08); k.rock(0.42, 0.93, 0.03); } },
    { title: "Waterfall in the deep forest", paint(k) { k.sky(0.4); k.sun(0.025); k.forest(0.42, { height: 0.12, from: 0, to: 1, density: 2, far: 0.6 }); k.hill(0.8, 0.36, 3, 62, "#2f4a2a", "#1e3020"); k.forest(0.5, { height: 0.1, from: 0, to: 1, density: 2, far: 0.35 }); k.range({ base: 0.85, top: 0.4, amp: 0.1, freq: 4, s: 61, x0: 0.5, x1: 0.85, peak: [0.67, 0.34, 0.6] }); const g = k.g, W = k.W, H = k.H; for (let i = 0; i < 120; i++) { const x = W * (0.645 + k.r() * 0.05), y = H * (0.36 + k.r() * 0.42), h = 20 + k.r() * 60; g.fillStyle = `rgba(255,255,255,${0.4 + k.r() * 0.5})`; g.fillRect(x, y, 1.5 + k.r() * 2, h); } k.forest(0.62, { height: 0.18, from: 0, to: 0.48, density: 1.5 }); k.forest(0.62, { height: 0.2, from: 0.86, to: 1, density: 1.5 }); k.lake(0.78, 0.45); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + k.r() * 0.5})`; g.beginPath(); g.arc(W * (0.62 + k.r() * 0.1), H * (0.78 + k.r() * 0.03), 3 + k.r() * 10, 0, 6.283); g.fill(); } [[0.55, 0.98, 0.5], [0.93, 1, 0.66]].forEach(([x, y, h]) => k.pine(x, y, h)); } },
    { title: "Twin peaks over the glacier lake", paint(k) { k.sky(0.55); k.clouds(3, 0.04, 0.2); k.sun(); k.range({ base: 0.58, top: 0.36, amp: 0.15, s: 71, far: 0.6 }); k.range({ base: 0.58, top: 0.3, amp: 0.08, s: 72, snow: 0.6, peak: [0.58, 0.14, 1.3], x0: 0.3, x1: 0.72 }); k.range({ base: 0.58, top: 0.3, amp: 0.08, s: 73, snow: 0.6, peak: [0.8, 0.2, 1.2], x0: 0.62, x1: 1.02 }); k.mist(0.56, 0.03); k.forest(0.59, { height: 0.03, from: 0, to: 1, density: 1.8, far: 0.2 }); k.lake(0.6, 0.45); const g = k.g; g.fillStyle = "rgba(60,170,170,.18)"; g.fillRect(0, k.H * 0.6, k.W, k.H * 0.4); k.ground(0.94, "#4a5a3a", "#7a7a55"); [[0.68, 0.98, 0.34], [0.94, 1, 0.5]].forEach(([x, y, h]) => k.pine(x, y, h)); } },
    { title: "Birches at the edge of the marsh", paint(k) { k.sky(0.6); k.clouds(5, 0.06, 0.32); k.sun(); k.range({ base: 0.6, top: 0.48, amp: 0.08, s: 81, far: 0.85 }); k.mist(0.6, 0.05); k.forest(0.62, { height: 0.06, from: 0, to: 1, density: 1.5, kind: "round", far: 0.25 }); k.lake(0.63, 0.35); const g = k.g, W = k.W, H = k.H; k.ground(0.86, "#5a6a35", "#8a8a45"); for (let i = 0; i < 500; i++) { const x = W * (0.25 + k.r() * 0.75), y = H * (0.8 + k.r() * 0.2), h = H * (0.03 + k.r() * 0.09); g.strokeStyle = `rgba(${k.C.deep.map((v, j) => Math.round(v + [70, 60, 30][j] * (1 - k.C.dark))).join(",")},.9)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k.r() - 0.4) * 8, y - h); g.stroke(); } [[0.76, 0.92], [0.82, 0.95], [0.9, 0.91]].forEach(([x, y]) => { g.fillStyle = "#ece6da"; g.fillRect(W * x, H * 0.2, W * 0.008, H * (y - 0.2)); for (let j = 0; j < 14; j++) { g.fillStyle = "#2a2422"; g.fillRect(W * x, H * (0.22 + j * 0.05 + k.r() * 0.02), W * (0.003 + k.r() * 0.005), H * 0.006); } }); k.tree(0.84, 0.5, 0.5, ["#c9b44a", "#e0cc6a", "#8aa04a"]); k.flowers(0.86, 0.4, 1, 60, ["#f6e08a", "#c88ad0"]); k.frame(["#2a3a22", "#4a5a2e"]); } },
    { title: "Path through the pine forest", paint(k) { k.sky(0.5); k.clouds(4, 0.04, 0.22); k.sun(); k.range({ base: 0.55, top: 0.34, amp: 0.15, s: 101, far: 0.55, snow: 0.3 }); k.mist(0.52, 0.04, 0.5); k.forest(0.56, { height: 0.06, from: 0, to: 1, density: 2, far: 0.35 }); k.hill(0.62, 0.04, 2, 102, "#5d7a3e", "#2f4a28"); k.ground(0.6, "#4f6a35", "#7a8a45"); const g = k.g, W = k.W, H = k.H; g.fillStyle = rgb(mix([200, 175, 120], k.C.deep, k.C.dark * 0.75), 0.85); g.beginPath(); g.moveTo(W * 0.48, H); g.quadraticCurveTo(W * 0.56, H * 0.75, W * 0.6, H * 0.6); g.lineTo(W * 0.615, H * 0.6); g.quadraticCurveTo(W * 0.64, H * 0.78, W * 0.72, H); g.fill(); k.grass(0.62, 0, 1); k.flowers(0.7, 0.3, 1, 90, ["#f6e08a", "#ffffff", "#c88ad0"]); [[0.42, 0.72, 0.28], [0.46, 0.8, 0.4], [0.38, 0.9, 0.55], [0.3, 1, 0.75], [0.74, 0.72, 0.3], [0.79, 0.8, 0.42], [0.86, 0.9, 0.58], [0.95, 1, 0.8]].forEach(([x, y, h]) => k.pine(x, y, h)); k.rock(0.66, 0.94, 0.03); k.bush(0.56, 0.99, 0.05); } },
  ];
  const cache = new Map();
  window.LANDSCAPES = {
    titles: SCENES.map((s) => s.title),
    /* Renders scene i at a time of day. Cached, since each takes a moment. */
    render(i, time, W = 960, H = 600) {
      const key = `${i}:${time}:${W}`;
      if (cache.has(key)) return cache.get(key);
      const n = ((i % SCENES.length) + SCENES.length) % SCENES.length, k = studio(W, H, LIGHT[time] || LIGHT.day, 1000 + n * 97);
      SCENES[n].paint(k);
      cache.set(key, k.c);
      return k.c;
    },
  };
})();
