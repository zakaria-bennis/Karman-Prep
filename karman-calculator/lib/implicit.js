Object.assign(KarmanViewport.prototype, {
  resolvedColor(name) {
    if (!this.swatch) {
      this.swatch = document.createElement("span");
      this.swatch.hidden = true;
      this.root.append(this.swatch);
    }
    this.swatch.style.color = `var(--karman-${name})`;
    return getComputedStyle(this.swatch).color;
  },
  // Marching squares, with bounded samples and bisection to reject pole crossings.
  drawImplicit(plot, ctx) {
    const nx = Math.min(180, Math.max(20, Math.ceil(this.width / 7))),
      ny = Math.min(160, Math.max(20, Math.ceil(this.height / 7)));
    const dx = (this.xMax - this.xMin) / nx,
      dy = (this.yMax - this.yMin) / ny;
    const values = new Float64Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j++)
      for (let i = 0; i <= nx; i++)
        values[j * (nx + 1) + i] = plot.fn(this.xMin + i * dx, this.yMax - j * dy);
    const inequality = plot.operator !== "=";
    const interpolate = (a, b) => {
      if (a.v === 0) return a;
      if (b.v === 0) return b;
      if (!Number.isFinite(a.v) || !Number.isFinite(b.v) || Math.sign(a.v) === Math.sign(b.v))
        return null;
      let left = a,
        right = b;
      for (let k = 0; k < 9; k++) {
        const t = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
        t.v = plot.fn(t.x, t.y);
        if (!Number.isFinite(t.v)) return null;
        if (Math.sign(t.v) === Math.sign(left.v)) left = t;
        else right = t;
      }
      const point = Math.abs(left.v) < Math.abs(right.v) ? left : right;
      return Math.abs(point.v) <= Math.max(1e-10, Math.max(Math.abs(a.v), Math.abs(b.v)) * 0.03)
        ? point
        : null;
    };
    const segment = (a, b) => {
      if (!a || !b) return;
      const p = this.project(a.x, a.y),
        q = this.project(b.x, b.y);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    };
    ctx.beginPath();
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const x = this.xMin + i * dx,
          y = this.yMax - j * dy;
        const v = [
          values[j * (nx + 1) + i],
          values[j * (nx + 1) + i + 1],
          values[(j + 1) * (nx + 1) + i + 1],
          values[(j + 1) * (nx + 1) + i],
        ];
        if (v.some((n) => !Number.isFinite(n))) continue;
        if (inequality) {
          const center = plot.fn(x + dx / 2, y - dy / 2),
            inside = plot.operator.startsWith("<") ? center <= 0 : center >= 0;
          if (inside) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillRect(
              (i * this.width) / nx,
              (j * this.height) / ny,
              this.width / nx + 0.5,
              this.height / ny + 0.5
            );
            ctx.restore();
          }
        }
        const corners = [
          { x, y, v: v[0] },
          { x: x + dx, y, v: v[1] },
          { x: x + dx, y: y - dy, v: v[2] },
          { x, y: y - dy, v: v[3] },
        ];
        const edges = corners.map((a, k) => interpolate(a, corners[(k + 1) % 4]));
        // Two adjacent edges may meet the contour at the same exact vertex.
        // Deduplicate that endpoint so a three-hit cell still draws its segment.
        const hits = edges.filter(
          (point, index, all) =>
            point &&
            all.findIndex((other) => other && other.x === point.x && other.y === point.y) === index
        );
        if (hits.length === 2) segment(hits[0], hits[1]);
        else if (hits.length === 4) {
          const same = Math.sign(plot.fn(x + dx / 2, y - dy / 2)) === Math.sign(v[0]);
          if (same) {
            segment(edges[0], edges[1]);
            segment(edges[2], edges[3]);
          } else {
            segment(edges[0], edges[3]);
            segment(edges[1], edges[2]);
          }
        }
      }
    ctx.stroke();
  },
});
