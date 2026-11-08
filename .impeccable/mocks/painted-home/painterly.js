/*
 * Paints a picture onto a canvas stroke by stroke, the way Bob Ross paints:
 *   1. One coat of color goes on first, wet and even, never a black canvas.
 *   2. The sky goes in with big criss-cross strokes.
 *   3. Shapes are painted back to front: far away first, then nearer, then the foreground.
 *   4. Smaller strokes add texture and depth on top.
 *   5. The brightest highlights are tapped on last.
 * Stroke colors come from the picture and their direction follows its edges (after
 * Hertzmann, "Painterly Rendering with Curved Brush Strokes of Multiple Sizes", 1998).
 * Karman's landscapes take 3.8 seconds, use a fine fourth brush, and end as brushwork.
 */
(() => {
  let DUR = 2000;
  /* Draws the source into a canvas of size w x h, cropped to cover like object-fit, focused at fx, fy. */
  function cover(src, w, h, fx = 0.7, fy = 0.4) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height, k = Math.max(w / sw, h / sh);
    const dw = sw * k, dh = sh * k;
    c.getContext("2d").drawImage(src, (w - dw) * fx, (h - dh) * fy, dw, dh);
    return c;
  }
  function plan(src, scale, fine) {
    const w = fine ? 480 : 300, h = Math.round((w * innerHeight) / innerWidth), base = cover(src, w, h);
    const px = base.getContext("2d").getImageData(0, 0, w, h).data;
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) lum[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
    const at = (x, y) => { const X = Math.max(0, Math.min(w - 1, x | 0)), Y = Math.max(0, Math.min(h - 1, y | 0)); return X + Y * w; };
    const grad = (x, y) => [lum[at(x + 1, y)] - lum[at(x - 1, y)], lum[at(x, y + 1)] - lum[at(x, y - 1)]];
    const color = (x, y, r) => { let R = 0, G = 0, B = 0, n = 0; const st = Math.max(1, r >> 1); for (let j = -r; j <= r; j += st) for (let i = -r; i <= r; i += st) { const k = at(x + i, y + j) * 4; R += px[k]; G += px[k + 1]; B += px[k + 2]; n++; } return [R / n, G / n, B / n]; };
    const rgb = (c, j = 8) => `rgb(${c.map((v) => Math.round(v + (Math.random() - 0.5) * j)).join(",")})`;
    const S = (pts) => pts.map(([a, b]) => [a * scale, b * scale]);
    /* 1. The base coat: the picture's colors, row by row, laid on in wide sweeps. */
    const rows = 7, coat = [];
    for (let i = 0; i < rows; i++) {
      const y = ((i + 0.5) / rows) * h, c = color(w / 2, y, Math.round(h / rows));
      coat.push({ pts: S(Array.from({ length: 13 }, (_, k) => [(-0.05 + (k / 12) * 1.1) * w, y + Math.sin(k * 0.9 + i) * 3])), w: (h / rows) * scale * 1.5, c: rgb(c, 4), t0: i * 40, dur: 260 });
    }
    const first = color(w / 2, h * 0.05, 6);
    /* 2 to 4. Strokes in three brush sizes, painted back to front: top of the picture first. */
    /* Stroke times are written for a 2-second painting and stretched to the real length. */
    const strokes = [], layers = fine ? [[12, 200, 760], [6, 560, 1200], [3, 1000, 1600], [1.6, 1350, 1800]] : [[8, 220, 1050], [4, 650, 1500], [2, 1100, 1780]];
    for (const [R, t0, t1] of layers) {
      const list = [];
      for (let y = R / 2; y < h; y += R) for (let x = R / 2; x < w; x += R) {
        const sx = x + (Math.random() - 0.5) * R, sy = y + (Math.random() - 0.5) * R, c = color(sx, sy, Math.max(1, Math.round(R / 2)));
        /* The finest brush only goes where there is detail to paint. */
        if (fine && R < 2 && Math.hypot(...grad(sx, sy)) < 6) continue;
        const [gx0, gy0] = grad(sx, sy), flat = Math.hypot(gx0, gy0) < 1.5;
        /* Flat areas like sky get Bob Ross's criss-cross: short strokes on alternating diagonals. */
        if (flat && R > 2) {
          const a = (Math.random() < 0.5 ? 0.7 : -0.7) + (Math.random() - 0.5) * 0.3, l = R * 1.4;
          list.push({ pts: S([[sx - Math.cos(a) * l, sy - Math.sin(a) * l], [sx, sy], [sx + Math.cos(a) * l, sy + Math.sin(a) * l]]), w: R * scale * 1.5, c: rgb(c), y: sy, L: lum[at(sx, sy)] });
          continue;
        }
        const pts = [[sx, sy]]; let dx = 0, dy = 0, cx = sx, cy = sy;
        for (let i = 0; i < 6; i++) {
          const [gx, gy] = grad(cx, cy), m = Math.hypot(gx, gy);
          if (m < 1.5 && i > 1) break;
          let nx = -gy / (m || 1), ny = gx / (m || 1);
          if (m < 1.5) { nx = 1; ny = 0.15; }
          if (nx * dx + ny * dy < 0) { nx = -nx; ny = -ny; }
          if (i) { nx = 0.6 * nx + 0.4 * dx; ny = 0.6 * ny + 0.4 * dy; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; }
          cx += nx * R; cy += ny * R; dx = nx; dy = ny;
          const k = at(cx, cy) * 4, diff = Math.abs(px[k] - c[0]) + Math.abs(px[k + 1] - c[1]) + Math.abs(px[k + 2] - c[2]);
          if (i > 1 && diff > 70) break;
          pts.push([cx, cy]);
        }
        list.push({ pts: S(pts), w: R * scale * (1.5 + Math.random() * 0.4), c: rgb(c), y: sy, L: lum[at(sx, sy)] });
      }
      /* Back to front: far away (higher up) before near (lower down), with a little looseness. */
      list.sort((a, b) => a.y + Math.random() * h * 0.18 - (b.y + Math.random() * h * 0.18));
      list.forEach((s, i) => { s.t0 = t0 + ((t1 - t0 - 140) * i) / list.length; s.dur = 140; strokes.push(s); });
    }
    /* 5. Highlights: the brightest spots, tapped on last with a small brush. */
    const lights = [];
    for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = Math.random() * h, k = at(x, y); if (lum[k] > 175) lights.push(x, y); }
    for (let i = 0; i < lights.length; i += 2) { const x = lights[i], y = lights[i + 1], c = color(x, y, 1), a = Math.random() * 6.28; strokes.push({ pts: S([[x, y], [x + Math.cos(a) * 2, y + Math.sin(a) * 2]]), w: 2 * scale, c: rgb(c, 4), t0: 1600 + Math.random() * 180, dur: 60 }); }
    return { first: rgb(first, 0), coat, strokes };
  }
  function drawSeg(ctx, s, i0, i1) {
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(...s.pts[i0]);
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(...s.pts[i]);
    if (i1 === i0) ctx.lineTo(s.pts[i0][0] + 0.1, s.pts[i0][1]);
    ctx.stroke();
  }
  /* Paints `src` (an image or canvas) into `canvas`. Animated unless told otherwise. */
  /* ms: how long the painting takes. It ends as brushwork, never as the smooth source picture. */
  /* One hue per painting (founder, 2026-11-08). The skill levels, rings and main button all take
     their color from the day's picture. The hue is the most common strongly colored hue in it. */
  function pictureColors(pic) {
    try {
      const w = pic.width, h = pic.height, d = pic.getContext("2d").getImageData(0, 0, w, h).data, bins = new Array(36).fill(0), sat = new Array(36).fill(0);
      for (let i = 0; i < d.length; i += 4 * 53) {
        const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), c = mx - mn, l = (mx + mn) / 2;
        if (c < 0.08 || l < 0.1 || l > 0.94) continue;
        let hh = mx === r ? ((gg - b) / c) % 6 : mx === gg ? (b - r) / c + 2 : (r - gg) / c + 4;
        hh = (hh * 60 + 360) % 360;
        const k = Math.floor(hh / 10) % 36; bins[k] += c; sat[k] += c / (1 - Math.abs(2 * l - 1) || 1);
      }
      let best = 0; bins.forEach((v, i) => { if (v > bins[best]) best = i; });
      if (!bins[best]) return;
      const hue = best * 10 + 5, s = Math.round(Math.min(72, Math.max(38, (sat[best] / bins[best]) * 100)));
      const root = document.documentElement.style;
      root.setProperty("--hue", hue); root.setProperty("--hs", s + "%");
      /* The main button keeps white text, so its shade is darkened until the text passes 4.5 to 1. */
      root.setProperty("--accent", `hsl(${hue} ${s}% ${buttonLightness(hue, s)}%)`);
    } catch { /* keep the last colors */ }
  }
  function buttonLightness(h, s) {
    const lum = (L) => {
      const a = (s / 100) * Math.min(L / 100, 1 - L / 100), f = (n) => { const k = (n + h / 30) % 12, v = L / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
    };
    for (let L = 46; L > 15; L--) if (1.05 / (lum(L) + 0.05) >= 4.6) return L;
    return 16;
  }
  window.paintPicture = (canvas, src, { animate = true, nearlyDone, done, focus, ms = 3800 } = {}) => {
    const dpr = Math.min(devicePixelRatio, 1.5), W = (canvas.width = Math.round(innerWidth * dpr)), H = (canvas.height = Math.round(innerHeight * dpr));
    const ctx = canvas.getContext("2d"), final = cover(src, W, H, ...(focus || []));
    /* Is the picture light or dark where the greeting and menus sit? The page picks its text color from this. */
    try {
      const d = final.getContext("2d").getImageData(0, 0, Math.round(W * 0.45), Math.round(H * 0.14)).data; let L = 0, n = 0;
      for (let i = 0; i < d.length; i += 64) { L += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; n++; }
      document.documentElement.dataset.picture = L / n > 150 ? "light" : "dark";
    } catch { /* keep the current text color */ }
    pictureColors(final);
    const { first, coat, strokes } = plan(src, W / 480, true), all = [...coat, ...strokes];
    const paintAll = () => { ctx.fillStyle = first; ctx.fillRect(0, 0, W, H); ctx.lineCap = "round"; ctx.lineJoin = "round"; all.forEach((s) => drawSeg(ctx, s, 0, s.pts.length - 1)); };
    if (!animate) { paintAll(); if (done) done(); return { stop() {} }; }
    const k = ms / 2000; DUR = ms; all.forEach((s) => { s.t0 *= k; s.dur *= k; });
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.fillStyle = first; ctx.fillRect(0, 0, W, H);
    const start = performance.now(), prog = new Map(); let raf = 0, told = false;
    const frame = (now) => {
      const t = now - start;
      for (const s of all) {
        if (t < s.t0) continue;
        const n = s.pts.length - 1, to = Math.min(n, Math.ceil(((t - s.t0) / s.dur) * n)), was = prog.has(s) ? prog.get(s) : -1;
        if (to > was) { drawSeg(ctx, s, Math.max(0, was), to); prog.set(s, to); }
      }
      if (!told && t > ms * 0.75) { told = true; if (nearlyDone) nearlyDone(); }
      if (t < DUR) raf = requestAnimationFrame(frame);
      else if (done) done();
    };
    raf = requestAnimationFrame(frame);
    return { stop() { cancelAnimationFrame(raf); } };
  };
})();
