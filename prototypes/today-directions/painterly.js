/*
 * Paints a picture onto a canvas stroke by stroke, the way Bob Ross paints:
 *   1. One coat of color goes on first, wet and even, never a black canvas.
 *   2. The sky goes in with big criss-cross strokes.
 *   3. Shapes are painted back to front: far away first, then nearer, then the foreground.
 *   4. Smaller strokes add texture and depth on top, and the finest brush follows every edge.
 *   5. The brightest highlights are tapped on last.
 * Stroke colors come from the picture and their direction follows its edges (after
 * Hertzmann, "Painterly Rendering with Curved Brush Strokes of Multiple Sizes", 1998).
 * Large strokes carry bristle streaks, colors drift gently warm and cool across the picture,
 * and a soft canvas grain sits over the finished painting.
 * Karman's landscapes take 3.8 seconds, use five brushes, and end as brushwork.
 * Kept in step with src/lib/painting/painterly.ts (detail pass, 2026-11-08).
 */
(() => {
  /* The picture is read at 960 pixels wide. Brush sizes below are in 480-wide units (U each). */
  const PLAN_W = 960, U = PLAN_W / 480;
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const smooth = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; }
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  /* Draws the source into a canvas of size w x h, cropped to cover like object-fit, focused at fx, fy. */
  function cover(src, w, h, fx = 0.7, fy = 0.4) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height, k = Math.max(w / sw, h / sh);
    const dw = sw * k, dh = sh * k;
    c.getContext("2d").drawImage(src, (w - dw) * fx, (h - dh) * fy, dw, dh);
    return c;
  }
  const byStart = (a, b) => a.t0 - b.t0;
  /* Plans every stroke. Times are written for a 2-second painting and stretched later.
     A generator in two halves: it first yields the coat and the two big brushes ({ first, all }),
     then plans the three small brushes and the highlights a row at a time (yielding null between
     rows, so the caller can pause it) and returns them. The 3-pixel brush starts 0.96 s into the
     2-second plan, so on a slow computer they are planned while the big ones are painted. */
  function* plan(src, scale) {
    const w = PLAN_W, h = Math.max(1, Math.round((w * innerHeight) / innerWidth)), base = cover(src, w, h);
    const px = base.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) lum[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
    const at = (x, y) => { const X = Math.max(0, Math.min(w - 1, x | 0)), Y = Math.max(0, Math.min(h - 1, y | 0)); return X + Y * w; };
    const grad = (x, y, d = U) => [lum[at(x + d, y)] - lum[at(x - d, y)], lum[at(x, y + d)] - lum[at(x, y - d)]];
    const color = (x, y, r) => { let R = 0, G = 0, B = 0, n = 0; const st = Math.max(1, r); for (let j = -r; j <= r; j += st) for (let i = -r; i <= r; i += st) { const k = at(x + i, y + j) * 4; R += px[k]; G += px[k + 1]; B += px[k + 2]; n++; } return [R / n, G / n, B / n]; };
    /* Paint is never mixed perfectly: broad patches drift a little warm or cool, smaller ones a
       little lighter or darker, and every stroke differs slightly from its neighbour. */
    const tone = (c, x, y, j = 8) => { const warm = vnoise(x / 70, y / 70, 41) - 0.5, val = (vnoise(x / 16, y / 16, 43) - 0.5) * 10, r = (Math.random() - 0.5) * j; return [c[0] + warm * 16 + val + r, c[1] + warm * 5 + val + r, c[2] - warm * 12 + val + r]; };
    const css = (c, a = 1) => (a < 1 ? `rgba(${c.map(clamp).join(",")},${a})` : `rgb(${c.map(clamp).join(",")})`);
    const S = (pts) => pts.map(([a, b]) => [a * scale, b * scale]);
    const stroke = (pts, width, c, t0 = 0, dur = 0) => ({ pts: S(pts), w: width, c, t0, dur, done: -1 });
    /* A gentle direction field, so strokes in open areas are not all laid the same way. */
    const drift = (x, y) => (vnoise(x / 120, y / 120, 47) - 0.5) * 0.9;
    /* Big brushes leave streaks: a lighter and a darker bristle line inside the stroke. */
    const bristles = (s, c, R) => {
      if (R < 6 || s.pts.length < 2) return [];
      const out = [];
      for (let b = 0; b < (2); b++) {
        const side = (b === 0 ? 1 : -1) * (0.18 + Math.random() * 0.16) * s.w, lift = b === 0 ? 16 : -14;
        const pts = s.pts.map((p, i) => { const a = s.pts[Math.max(0, i - 1)], z = s.pts[Math.min(s.pts.length - 1, i + 1)], tx = z[0] - a[0], ty = z[1] - a[1], l = Math.hypot(tx, ty) || 1; return [p[0] - (ty / l) * side, p[1] + (tx / l) * side]; });
        out.push({ pts, w: s.w * (0.1 + Math.random() * 0.08), c: css([c[0] + lift, c[1] + lift, c[2] + lift], 0.24), t0: 0, dur: 0, done: -1 });
      }
      return out;
    };
    /* 1. The base coat: the picture's colors, row by row, laid on in wide sweeps. */
    const rows = 7, coat = [];
    for (let i = 0; i < rows; i++) {
      const y = ((i + 0.5) / rows) * h, c = color(w / 2, y, Math.round(h / rows));
      coat.push(stroke(Array.from({ length: 13 }, (_, k) => [(-0.05 + (k / 12) * 1.1) * w, y + Math.sin(k * 0.9 + i) * 3 * U]), (h / rows) * scale * 1.5, css(tone(c, w / 2, y, 4)), i * 40, 260));
    }
    const first = color(w / 2, h * 0.05, 6 * U);
    /* 2 to 4. Strokes in five brush sizes, painted back to front: top of the picture first.
       [radius, start, end, edge threshold (0 paints everywhere), share of flat areas painted] */
    const strokes = [], layers = [[12, 200, 760, 0, 1], [6, 560, 1180, 0, 1], [3, 960, 1520, 0, 1], [1.6, 1260, 1760, 6, 0.15], [0.9, 1480, 1900, 11, 0]];
    let coarseSent = false;
    for (const [R, t0, t1, edge, flatShare] of layers) {
      if (R < 4 && !coarseSent) { coarseSent = true; const coarse = [...coat, ...strokes].sort(byStart); strokes.length = 0; yield { first: css(first), all: coarse }; }
      const list = [], fine = R < 1, step = R * U, d = fine ? 1 : U;
      for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        const sx = x + (Math.random() - 0.5) * step, sy = y + (Math.random() - 0.5) * step, [gx0, gy0] = grad(sx, sy, d), g0 = Math.hypot(gx0, gy0);
        /* The small brushes go where there is detail to paint, plus a little texture elsewhere. */
        if (edge && g0 < edge && Math.random() >= flatShare) continue;
        const c = color(sx, sy, Math.max(1, Math.round(step / 2)));
        /* Flat areas like sky get Bob Ross's criss-cross: short strokes on alternating diagonals. */
        if (g0 < 1.5 && R > 2) {
          const a = (Math.random() < 0.5 ? 0.7 : -0.7) + drift(sx, sy) + (Math.random() - 0.5) * 0.3, l = step * 1.4;
          const s = stroke([[sx - Math.cos(a) * l, sy - Math.sin(a) * l], [sx, sy], [sx + Math.cos(a) * l, sy + Math.sin(a) * l]], step * scale * 1.5, css(tone(c, sx, sy)));
          list.push({ s, y: sy, kids: bristles(s, c, R) });
          continue;
        }
        const pts = [[sx, sy]]; let dx = 0, dy = 0, cx = sx, cy = sy;
        for (let i = 0; i < (fine ? 5 : 6); i++) {
          const [gx, gy] = grad(cx, cy, d), m = Math.hypot(gx, gy);
          if (m < 1.5 && i > 1) break;
          let nx = -gy / (m || 1), ny = gx / (m || 1);
          if (m < 1.5) { const a = drift(cx, cy); nx = Math.cos(a); ny = Math.sin(a); }
          if (nx * dx + ny * dy < 0) { nx = -nx; ny = -ny; }
          if (i) { nx = 0.6 * nx + 0.4 * dx; ny = 0.6 * ny + 0.4 * dy; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; }
          cx += nx * step; cy += ny * step; dx = nx; dy = ny;
          const k = at(cx, cy) * 4, diff = Math.abs(px[k] - c[0]) + Math.abs(px[k + 1] - c[1]) + Math.abs(px[k + 2] - c[2]);
          /* Fine strokes stop sooner at a color change, so edges stay clean. */
          if (i > 1 && diff > (fine ? 45 : 70)) break;
          pts.push([cx, cy]);
        }
        const s = stroke(pts, step * scale * (fine ? 1.3 + Math.random() * 0.3 : 1.5 + Math.random() * 0.4), css(tone(c, sx, sy, fine ? 5 : 8)));
        list.push({ s, y: sy, kids: bristles(s, c, R) });
      }
      if (R < 4) yield null;
      }
      /* Back to front: far away (higher up) before near (lower down), with a little looseness. */
      const keyed = list.map((e) => ({ e, k: e.y + Math.random() * h * 0.18 }));
      keyed.sort((a, b) => a.k - b.k);
      keyed.forEach(({ e }, i) => { e.s.t0 = t0 + ((t1 - t0 - 140) * i) / keyed.length; e.s.dur = 140; strokes.push(e.s); for (const kid of e.kids) { kid.t0 = e.s.t0; kid.dur = 140; strokes.push(kid); } });
    }
    /* 5. Highlights: the brightest spots, tapped on last with a small brush along the edge. */
    let lights = 0;
    for (let i = 0; i < 3000 && lights < 800; i++) {
      const x = Math.random() * w, y = Math.random() * h, L = lum[at(x, y)];
      if (L <= 175) continue;
      const near = (lum[at(x - 3, y)] + lum[at(x + 3, y)] + lum[at(x, y - 3)] + lum[at(x, y + 3)]) / 4;
      if (L < 215 && L < near + 6) continue;
      const [gx, gy] = grad(x, y, 1), a = Math.hypot(gx, gy) > 2 ? Math.atan2(gx, -gy) : Math.random() * 6.28, l = 1.2 * U;
      const lit = color(x, y, 1).map((v) => v + (255 - v) * 0.25);
      strokes.push(stroke([[x - Math.cos(a) * l, y - Math.sin(a) * l], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 1.1 * U * scale, css(lit), 1780 + Math.random() * 150, 60));
      lights++;
    }
    /* Stable sort: strokes start in time order, and a stroke's bristles follow it. */
    return strokes.sort(byStart);
  }
  /* Runs the rest of a plan in short slices between frames, then hands over the strokes. */
  function planLater(rest, ready) {
    let id = 0;
    const slice = () => { const end = performance.now() + 8; while (performance.now() < end) { const r = rest.next(); if (r.done) { ready(r.value); return; } } id = setTimeout(slice, 0); };
    id = setTimeout(slice, 0);
    return () => clearTimeout(id);
  }
  function drawSeg(ctx, s, i0, i1) {
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(...s.pts[i0]);
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(...s.pts[i]);
    if (i1 === i0) ctx.lineTo(s.pts[i0][0] + 0.1, s.pts[i0][1]);
    ctx.stroke();
  }
  /* A soft canvas grain: fine noise with a faint woven thread, laid over the finished paint. */
  let grainTile = null;
  function canvasGrain(ctx, W, H) {
    if (!grainTile) {
      const n = 192; grainTile = document.createElement("canvas"); grainTile.width = grainTile.height = n;
      const g = grainTile.getContext("2d"), img = g.createImageData(n, n);
      const rowT = Array.from({ length: n }, () => (Math.random() - 0.5) * 18), colT = Array.from({ length: n }, () => (Math.random() - 0.5) * 18);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const v = 128 + (Math.random() - 0.5) * 46 + Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2) * 10 + (rowT[y] + colT[x]) / 2, i = (x + y * n) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v); img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    const pattern = ctx.createPattern(grainTile, "repeat");
    if (!pattern) return;
    ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.28; ctx.fillStyle = pattern; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
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
  /* Without the opening, the big brushes go on at once and the small ones in short slices after,
     so the page never waits long for the painting. A new paint on the same canvas stops the old. */
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 120 }) : setTimeout(f, 16));
  const cancelIdle = (id) => (window.cancelIdleCallback ? cancelIdleCallback(id) : clearTimeout(id));
  const running = new WeakMap();
  /* Paints `src` (an image or canvas) into `canvas`. Animated unless told otherwise.
     ms: how long the painting takes. It ends as brushwork, never as the smooth source picture. */
  window.paintPicture = (canvas, src, { animate = true, nearlyDone, done, focus, ms = 3800 } = {}) => {
    if (running.has(canvas)) { running.get(canvas)(); running.delete(canvas); }
    const dpr = Math.min(devicePixelRatio, 1.5), W = (canvas.width = Math.round(innerWidth * dpr)), H = (canvas.height = Math.round(innerHeight * dpr));
    const ctx = canvas.getContext("2d"), final = cover(src, W, H, ...(focus || []));
    /* Is the picture light or dark where the greeting and menus sit? The page picks its text color from this. */
    try {
      const d = final.getContext("2d").getImageData(0, 0, Math.round(W * 0.45), Math.round(H * 0.14)).data; let L = 0, n = 0;
      for (let i = 0; i < d.length; i += 64) { L += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; n++; }
      document.documentElement.dataset.picture = L / n > 150 ? "light" : "dark";
    } catch { /* keep the current text color */ }
    pictureColors(final);
    const steps = plan(src, W / PLAN_W);
    let r = steps.next();
    while (!r.done && r.value === null) r = steps.next();
    const { first, all } = r.value;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.fillStyle = first; ctx.fillRect(0, 0, W, H);
    let fine = null, stopped = false;
    const k = animate ? ms / 2000 : 1;
    const cancelPlan = planLater(steps, (list) => { list.forEach((s) => { s.t0 *= k; s.dur *= k; }); fine = list; });
    if (!animate) {
      let i = 0, id = 0, queue = all;
      while (i < all.length && all[i].t0 < 960) { drawSeg(ctx, all[i], 0, all[i].pts.length - 1); i++; }
      const slice = () => {
        if (stopped) return;
        const end = performance.now() + 8;
        while (performance.now() < end) {
          if (i >= queue.length) { if (queue === all && fine) { queue = fine; i = 0; continue; } break; }
          for (let n = 0; n < 200 && i < queue.length; n++, i++) drawSeg(ctx, queue[i], 0, queue[i].pts.length - 1);
        }
        if (i < queue.length || queue === all) { id = idle(slice); return; }
        canvasGrain(ctx, W, H); running.delete(canvas);
        if (done) done();
      };
      id = idle(slice);
      const stop = () => { stopped = true; cancelIdle(id); cancelPlan(); };
      running.set(canvas, stop);
      return { stop };
    }
    all.forEach((s) => { s.t0 *= k; s.dur *= k; });
    const start = performance.now(), lists = [all], lows = [0]; let raf = 0, told = false;
    const frame = (now) => {
      const t = Math.min(now - start, ms);
      if (fine && lists.length === 1) { lists.push(fine); lows.push(0); }
      /* Each list is in start order: everything before its low mark is finished. */
      lists.forEach((list, j) => {
        let lo = lows[j];
        for (let i = lo; i < list.length; i++) {
          const s = list[i];
          if (t < s.t0) break;
          const n = s.pts.length - 1, to = Math.min(n, Math.ceil(((t - s.t0) / (s.dur || 1)) * n));
          if (to > s.done) { drawSeg(ctx, s, Math.max(0, s.done), to); s.done = to; }
        }
        while (lo < list.length && list[lo].done >= list[lo].pts.length - 1) lo++;
        lows[j] = lo;
      });
      if (!told && t > ms * 0.75) { told = true; if (nearlyDone) nearlyDone(); }
      /* A slow computer may still be planning the small brushes; they go on as soon as ready. */
      if (now - start < ms || lists.length === 1) raf = requestAnimationFrame(frame);
      else { canvasGrain(ctx, W, H); if (done) done(); }
    };
    raf = requestAnimationFrame(frame);
    return { stop() { cancelAnimationFrame(raf); cancelPlan(); } };
  };
})();
