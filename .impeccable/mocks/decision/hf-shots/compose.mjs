// Finds the blank white screen in a photo and fits a rendered Karman screen onto it with a perspective transform.
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
// [shot, [[screen, kind, hintX, hintY], ...]] hints are where the device sits, as fractions of the photo
const JOBS = [
  [
    "c1-bus",
    [
      [
        "daily10-dark",
        "phone",
        0.7,
        0.66,
        [
          [1871, 801],
          [2064, 816],
          [1927, 1292],
          [1738, 1266],
        ],
      ],
    ],
    200,
  ],
  [
    "c2-music",
    [
      [
        "challenge-dark",
        "phone",
        0.54,
        0.61,
        [
          [1545, 860],
          [1624, 929],
          [1409, 1088],
          [1330, 1021],
        ],
      ],
    ],
    205,
  ],
  [
    "c3-bench",
    [
      [
        "word-game-dark",
        "phone",
        0.66,
        0.78,
        [
          [1859, 1143],
          [1925, 1213],
          [1682, 1362],
          [1612, 1286],
        ],
      ],
    ],
    190,
  ],
  ["c4-studio", [["quiz-dark", "laptop", 0.64, 0.67]]],
  ["c5-dusk", [["zoom-class-dark", "laptop", 0.17, 0.69]]],
  ["c6-oneonone", [["zoom-1on1-dark", "laptop", 0.36, 0.7]]],
  ["c9-pickup", [["parent-update-dark", "phone", 0.72, 0.72]]],
  ["c10-lunch", [["parent-update-light", "phone", 0.3, 0.7]], 225],
  ["c12-walkout", [["texts-light", "phone", 0.39, 0.54]]],
  [
    "c8-tutor",
    [
      [
        "review-dark",
        "laptop",
        0.7,
        0.48,
        [
          [1766, 260],
          [2176, 206],
          [2078, 1260],
          [1662, 1170],
        ],
      ],
      [
        "zoom-1on1-dark",
        "laptop",
        0.89,
        0.6,
        [
          [2182, 410],
          [2952, 260],
          [2952, 1730],
          [2116, 1090],
        ],
      ],
    ],
  ],
];
const only = process.argv[2];
const b = await chromium.launch();
for (const [shot, screens, thr = 214] of JOBS) {
  if (only && !only.split(",").includes(shot)) continue;
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto("http://localhost:8765/hf-shots/blank.html");
  const ok = await p.evaluate(
    async ({ shot, screens, thr }) => {
      const load = (src) =>
        new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = src;
        });
      let img;
      try {
        img = await load(`/hf-shots/${shot}.png`);
      } catch {
        return "missing";
      }
      const W = img.naturalWidth,
        H = img.naturalHeight,
        A = 700,
        h = Math.round((H * A) / W),
        k = W / A;
      const c = document.createElement("canvas");
      c.width = A;
      c.height = h;
      const x = c.getContext("2d");
      x.drawImage(img, 0, 0, A, h);
      const d = x.getImageData(0, 0, A, h).data,
        white = new Uint8Array(A * h);
      for (let i = 0; i < A * h; i++) {
        const r = d[i * 4],
          g = d[i * 4 + 1],
          bb = d[i * 4 + 2];
        white[i] =
          r > thr && g > thr && bb > thr && Math.max(r, g, bb) - Math.min(r, g, bb) < 26 ? 1 : 0;
      }
      // connected components of white
      const lab = new Int32Array(A * h),
        comps = [];
      let id = 0;
      for (let s = 0; s < A * h; s++) {
        if (!white[s] || lab[s]) continue;
        id++;
        const st = [s];
        lab[s] = id;
        const pts = [];
        while (st.length) {
          const q = st.pop();
          pts.push(q);
          const qx = q % A,
            qy = (q / A) | 0;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nx = qx + dx,
              ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= A || ny >= h) continue;
            const n = ny * A + nx;
            if (white[n] && !lab[n]) {
              lab[n] = id;
              st.push(n);
            }
          }
        }
        comps.push(pts);
      }
      // a screen is a large, compact, roughly rectangular white blob
      const cand = comps
        .filter((pts) => pts.length > A * h * 0.004)
        .map((pts) => {
          let minx = 1e9,
            maxx = 0,
            miny = 1e9,
            maxy = 0;
          for (const q of pts) {
            const px = q % A,
              py = (q / A) | 0;
            if (px < minx) minx = px;
            if (px > maxx) maxx = px;
            if (py < miny) miny = py;
            if (py > maxy) maxy = py;
          }
          return {
            pts,
            area: pts.length,
            fill: pts.length / ((maxx - minx + 1) * (maxy - miny + 1)),
            cx: (minx + maxx) / 2 / A,
            cy: (miny + maxy) / 2 / h,
            box: [minx, miny, maxx, maxy],
          };
        })
        .filter((cn) => cn.fill > 0.4);
      const pick = screens.map(([, , hx, hy]) => {
        const inside = cand.filter(
          (cn) =>
            hx * A >= cn.box[0] - 8 &&
            hx * A <= cn.box[2] + 8 &&
            hy * h >= cn.box[1] - 8 &&
            hy * h <= cn.box[3] + 8
        );
        const pool = inside.length ? inside : cand;
        return pool.sort(
          (a, b) => Math.hypot(a.cx - hx, a.cy - hy) - Math.hypot(b.cx - hx, b.cy - hy)
        )[0];
      });
      if (pick.some((x, i) => !x && !screens[i][4])) return "no screen found";
      const out = document.createElement("div");
      out.id = "out";
      out.style.cssText = `position:relative;width:${W}px;height:${H}px;overflow:hidden`;
      img.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;max-width:none`;
      out.appendChild(img);
      const solve = (src, dst) => {
        // homography: 8 unknowns
        const M = [],
          v = [];
        for (let i = 0; i < 4; i++) {
          const [sx, sy] = src[i],
            [dx, dy] = dst[i];
          M.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
          v.push(dx);
          M.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
          v.push(dy);
        }
        for (let col = 0; col < 8; col++) {
          let piv = col;
          for (let r = col + 1; r < 8; r++)
            if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
          [M[col], M[piv]] = [M[piv], M[col]];
          [v[col], v[piv]] = [v[piv], v[col]];
          for (let r = 0; r < 8; r++)
            if (r !== col) {
              const f = M[r][col] / M[col][col];
              for (let cc = col; cc < 8; cc++) M[r][cc] -= f * M[col][cc];
              v[r] -= f * v[col];
            }
        }
        const hh = v.map((vv, i) => vv / M[i][i]);
        return hh;
      };
      for (let si = 0; si < screens.length; si++) {
        const [scr, kind, , , manual] = screens[si];
        let quad;
        if (manual) quad = manual;
        else {
          const pts = pick[si].pts;
          // corners: points that are extreme for the most directions, clustered into four
          let cx = 0,
            cy = 0;
          for (const q of pts) {
            cx += q % A;
            cy += (q / A) | 0;
          }
          cx /= pts.length;
          cy /= pts.length;
          const votes = new Map();
          for (let a = 0; a < 360; a += 2) {
            const ux = Math.cos((a * Math.PI) / 180),
              uy = Math.sin((a * Math.PI) / 180);
            let best = -1e9,
              bq = 0;
            for (let j = 0; j < pts.length; j += 1) {
              const q = pts[j],
                px = q % A,
                py = (q / A) | 0,
                s = px * ux + py * uy;
              if (s > best) {
                best = s;
                bq = q;
              }
            }
            votes.set(bq, (votes.get(bq) || 0) + 1);
          }
          const span = Math.sqrt(pts.length);
          // corner = direction-diagonal extreme (rounded corners spread votes), so take extremes along 4 rotated diagonals instead when votes are flat
          const ranked = [...votes.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([q]) => [q % A, (q / A) | 0]);
          const corners = [];
          for (const pnt of ranked) {
            if (corners.every((cc) => Math.hypot(cc[0] - pnt[0], cc[1] - pnt[1]) > span * 0.35))
              corners.push(pnt);
            if (corners.length === 4) break;
          }
          if (corners.length < 4) return "corners " + corners.length;
          corners.sort(
            (p1, p2) => Math.atan2(p1[1] - cy, p1[0] - cx) - Math.atan2(p2[1] - cy, p2[0] - cx)
          ); // clockwise on screen
          const len = (i) =>
            Math.hypot(
              corners[i][0] - corners[(i + 1) % 4][0],
              corners[i][1] - corners[(i + 1) % 4][1]
            );
          const edges = [0, 1, 2, 3].map((i) => ({
            i,
            l: len(i),
            y: (corners[i][1] + corners[(i + 1) % 4][1]) / 2,
          }));
          const wantShort = kind === "phone";
          // phones: the top is the higher of the two short edges; laptops: the top is simply the highest edge
          const pair = wantShort
            ? edges.filter((e) => e.l <= [...edges].sort((a, b) => a.l - b.l)[1].l)
            : edges;
          const top = pair.sort((a, b) => a.y - b.y)[0].i;
          const ord = [0, 1, 2, 3]
            .map((j) => corners[(top + j) % 4])
            .map(([px, py]) => [px * k, py * k]);
          // push each corner 1.2% outward from the centre so no white rim shows
          const ccx = cx * k,
            ccy = cy * k;
          quad = ord.map(([px, py]) => [px + (px - ccx) * 0.012, py + (py - ccy) * 0.012]);
        }
        const s = await load(`/screens/v2-${scr}.png`);
        const sw = s.naturalWidth,
          sh = s.naturalHeight;
        const hh = solve(
          [
            [0, 0],
            [sw, 0],
            [sw, sh],
            [0, sh],
          ],
          quad
        );
        const m = [hh[0], hh[3], 0, hh[6], hh[1], hh[4], 0, hh[7], 0, 0, 1, 0, hh[2], hh[5], 0, 1];
        s.style.cssText = `position:absolute;left:0;top:0;width:${sw}px;height:${sh}px;max-width:none;transform-origin:0 0;transform:matrix3d(${m.join(",")});border-radius:${kind === "phone" ? sw * 0.09 : 0}px;filter:brightness(.93) contrast(.97) saturate(.95)`;
        // mask: inside the quad, keep only pixels that were screen-white, so fingers stay in front
        const xs = quad.map((q) => q[0]),
          ys = quad.map((q) => q[1]);
        const bx0 = Math.max(0, Math.floor(Math.min(...xs)) - 4),
          by0 = Math.max(0, Math.floor(Math.min(...ys)) - 4),
          bx1 = Math.min(W, Math.ceil(Math.max(...xs)) + 4),
          by1 = Math.min(H, Math.ceil(Math.max(...ys)) + 4);
        const fc = document.createElement("canvas");
        fc.width = W;
        fc.height = H;
        const fx = fc.getContext("2d");
        fx.drawImage(img, 0, 0);
        const src = fx.getImageData(bx0, by0, bx1 - bx0, by1 - by0),
          md = fx.createImageData(bx1 - bx0, by1 - by0);
        const inQuad = (px, py) => {
          let sign = 0;
          for (let e = 0; e < 4; e++) {
            const [ax, ay] = quad[e],
              [bx2, by2] = quad[(e + 1) % 4];
            const cr = (bx2 - ax) * (py - ay) - (by2 - ay) * (px - ax);
            if (cr !== 0) {
              if (sign === 0) sign = Math.sign(cr);
              else if (Math.sign(cr) !== sign) return false;
            }
          }
          return true;
        };
        for (let yy = 0; yy < md.height; yy++)
          for (let xx = 0; xx < md.width; xx++) {
            const o = (yy * md.width + xx) * 4;
            const r = src.data[o],
              g = src.data[o + 1],
              bl = src.data[o + 2];
            if (!inQuad(xx + bx0, yy + by0)) continue;
            const lum = Math.min(r, g, bl),
              sat = Math.max(r, g, bl) - Math.min(r, g, bl);
            let a =
              Math.min(1, Math.max(0, (lum - (thr - 64)) / 50)) *
              Math.min(1, Math.max(0, (60 - sat) / 30));
            md.data[o] = md.data[o + 1] = md.data[o + 2] = 255;
            md.data[o + 3] = Math.round(a * 255);
          }
        const mc = document.createElement("canvas");
        mc.width = W;
        mc.height = H;
        mc.getContext("2d").putImageData(md, bx0, by0);
        const layer = document.createElement("div");
        layer.style.cssText = `position:absolute;inset:0;-webkit-mask:url(${mc.toDataURL()}) 0 0/100% 100% no-repeat;mask:url(${mc.toDataURL()}) 0 0/100% 100% no-repeat`;
        layer.appendChild(s);
        out.appendChild(layer);
      }
      document.body.style.margin = "0";
      document.body.innerHTML = "";
      document.body.appendChild(out);
      return [W, H];
    },
    { shot, screens, thr }
  );
  if (typeof ok === "string") {
    console.log(shot, ok);
    await p.close();
    continue;
  }
  await p.setViewportSize({ width: ok[0], height: ok[1] });
  await p.waitForTimeout(300);
  await p.locator("#out").screenshot({
    path: `/Users/zakariabennis/Karman-Prep/.impeccable/mocks/decision/hf-shots/final-${shot}.png`,
  });
  console.log(shot, "ok");
  await p.close();
}
await b.close();
