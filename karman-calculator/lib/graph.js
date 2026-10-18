class KarmanViewport {
  home() {
    this.resize();
    const rect = this.canvas.getBoundingClientRect(),
      ratio = rect.height > 0 ? rect.height / Math.max(1, rect.width) : 1;
    this.setViewport({ xMin: -10, xMax: 10, yMin: -10 * ratio, yMax: 10 * ratio });
  }
  setViewport(bounds) {
    const { xMin, xMax, yMin, yMax } = bounds;
    if (
      ![xMin, xMax, yMin, yMax].every(Number.isFinite) ||
      xMax - xMin < 1e-6 ||
      yMax - yMin < 1e-6 ||
      Math.max(xMax - xMin, yMax - yMin) > 1e10 ||
      Math.max(...Object.values(bounds).map(Math.abs)) > 1e12
    )
      return false;
    Object.assign(this, { xMin, xMax, yMin, yMax });
    this.scheduleDraw();
    return true;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const oldWidth = this.width,
      oldHeight = this.height;
    this.width = rect.width;
    this.height = rect.height;
    const scale = Math.min(window.devicePixelRatio || 1, 3);
    const pixelWidth = Math.round(this.width * scale),
      pixelHeight = Math.round(this.height * scale);
    // Reassigning either canvas dimension erases it, even when the size is unchanged.
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    if (oldWidth && oldHeight) {
      const cx = (this.xMax + this.xMin) / 2,
        cy = (this.yMax + this.yMin) / 2;
      const sx = ((this.xMax - this.xMin) * this.width) / oldWidth / 2,
        sy = ((this.yMax - this.yMin) * this.height) / oldHeight / 2;
      this.setViewport({ xMin: cx - sx, xMax: cx + sx, yMin: cy - sy, yMax: cy + sy });
    }
    this.scheduleDraw();
  }
  project(x, y) {
    return {
      x: ((x - this.xMin) / (this.xMax - this.xMin)) * this.width,
      y: ((this.yMax - y) / (this.yMax - this.yMin)) * this.height,
    };
  }
  unproject(x, y) {
    return {
      x: this.xMin + (x / this.width) * (this.xMax - this.xMin),
      y: this.yMax - (y / this.height) * (this.yMax - this.yMin),
    };
  }
  position(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  pan(dx, dy) {
    this.setViewport({
      xMin: this.xMin + dx,
      xMax: this.xMax + dx,
      yMin: this.yMin + dy,
      yMax: this.yMax + dy,
    });
  }
  zoom(factor, px = this.width / 2, py = this.height / 2) {
    if (!this.width || !this.height) return;
    const point = this.unproject(px, py);
    this.setViewport({
      xMin: point.x + (this.xMin - point.x) * factor,
      xMax: point.x + (this.xMax - point.x) * factor,
      yMin: point.y + (this.yMin - point.y) * factor,
      yMax: point.y + (this.yMax - point.y) * factor,
    });
  }
  movePointer(event) {
    if (this.dragPoint && this.pointers.has(event.pointerId)) {
      const point = this.position(event),
        world = this.unproject(point.x, point.y),
        row = this.dragPoint;
      row.text = `(${format(world.x)},${format(world.y)})`;
      row.input.value = row.text;
      this.record();
      this.compute();
      return;
    }
    const next = this.position(event),
      previous = this.pointers.get(event.pointerId);
    if (previous) {
      const other = [...this.pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y),
          after = Math.hypot(next.x - other.x, next.y - other.y);
        if (before > 4 && after > 4)
          this.zoom(
            clamp(before / after, 0.5, 2),
            (previous.x + other.x) / 2,
            (previous.y + other.y) / 2
          );
      }
      const divisor = other ? 2 : 1;
      this.pan(
        (((previous.x - next.x) / this.width) * (this.xMax - this.xMin)) / divisor,
        (((next.y - previous.y) / this.height) * (this.yMax - this.yMin)) / divisor
      );
      this.pointers.set(event.pointerId, next);
    }
    const p = this.unproject(next.x, next.y);
    this.get("graph-coordinates").textContent = `(${format(p.x)}, ${format(p.y)})`;
  }
  scheduleDraw() {
    if (!this.frame && !this.destroyed)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.draw();
      });
  }
  draw() {
    if (!this.width || !this.height) return;
    const ctx = this.context,
      color = (name) => this.resolvedColor(name);
    ctx.fillStyle = color("primary-bg");
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();
    this.drawGrid(ctx, color);
    this.rows.forEach((row, index) => {
      const plot = row.plot;
      if (!row.visible || !plot || plot.kind === "scalar") return;
      ctx.strokeStyle = ctx.fillStyle = color(`plot-${(index % 6) + 1}`);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      if (plot.kind === "implicit") {
        this.drawImplicit(plot, ctx);
      } else if (plot.kind === "points") {
        for (const point of plot.points) {
          const p = this.project(...point);
          ctx.moveTo(p.x + 4, p.y);
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        }
        ctx.fill();
      } else if (plot.kind === "point") {
        const p = this.project(...plot.point);
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (plot.kind === "vertical") {
        const p = this.project(plot.value, 0);
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, this.height);
        ctx.stroke();
      } else {
        const samples = Math.min(2048, Math.ceil(this.width));
        let previous = null;
        for (let i = 0; i <= samples; i++) {
          const x = this.xMin + (i / samples) * (this.xMax - this.xMin),
            y = plot.fn(x),
            p = this.project(x, y);
          if (!Number.isFinite(y) || Math.abs(p.y) > this.height * 100) {
            previous = null;
            continue;
          }
          const mid = previous
            ? this.project((previous.x + x) / 2, plot.fn((previous.x + x) / 2))
            : p;
          const continuous =
            previous &&
            Number.isFinite(mid.y) &&
            Math.abs(p.y - previous.py) < this.height * 1.5 &&
            Math.abs(mid.y - (p.y + previous.py) / 2) < this.height * 0.1;
          if (continuous) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
          previous = { x, py: p.y };
        }
        ctx.stroke();
      }
    });
    ctx.restore();
    this.canvas.setAttribute(
      "aria-label",
      `Graph from x=${format(this.xMin)} to ${format(this.xMax)}, y=${format(this.yMin)} to ${format(this.yMax)}. ${this.rows.filter((row) => row.visible && row.plot && row.plot.kind !== "scalar").length} plots. Arrow keys pan; plus and minus zoom; Home resets.`
    );
  }
  drawGrid(ctx, color) {
    const stepFor = (span, pixels) => {
      const raw = span / Math.max(2, pixels / 70),
        base = 10 ** Math.floor(Math.log10(raw));
      return [1, 2, 5, 10].find((n) => n * base >= raw) * base;
    };
    const sx = stepFor(this.xMax - this.xMin, this.width),
      sy = stepFor(this.yMax - this.yMin, this.height),
      origin = this.project(0, 0);
    const line = (x1, y1, x2, y2) => {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    };
    ctx.strokeStyle = color("grid");
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (this.gridMode === "square") {
      for (let x = Math.ceil(this.xMin / sx) * sx, n = 0; x <= this.xMax && n++ < 200; x += sx) {
        const p = this.project(x, 0);
        line(p.x, 0, p.x, this.height);
      }
      for (let y = Math.ceil(this.yMin / sy) * sy, n = 0; y <= this.yMax && n++ < 200; y += sy) {
        const p = this.project(0, y);
        line(0, p.y, this.width, p.y);
      }
    } else if (this.gridMode === "radial") {
      const maxR = Math.hypot(
        Math.max(Math.abs(this.xMin), Math.abs(this.xMax)),
        Math.max(Math.abs(this.yMin), Math.abs(this.yMax))
      );
      const nearX = this.xMin > 0 ? this.xMin : this.xMax < 0 ? this.xMax : 0,
        nearY = this.yMin > 0 ? this.yMin : this.yMax < 0 ? this.yMax : 0;
      const step = Math.max(sx, sy, stepFor(maxR - Math.hypot(nearX, nearY), 700));
      for (
        let r = Math.max(step, Math.floor(Math.hypot(nearX, nearY) / step) * step), n = 0;
        r <= maxR && n++ < 120;
        r += step
      ) {
        const rx = (r / (this.xMax - this.xMin)) * this.width,
          ry = (r / (this.yMax - this.yMin)) * this.height;
        ctx.moveTo(origin.x + rx, origin.y);
        ctx.ellipse(origin.x, origin.y, rx, ry, 0, 0, 2 * Math.PI);
      }
      for (let i = 0; i < 12; i++) {
        const p = this.project(
          maxR * Math.cos((i * Math.PI) / 6),
          maxR * Math.sin((i * Math.PI) / 6)
        );
        line(origin.x, origin.y, p.x, p.y);
      }
    }
    ctx.stroke();
    if (!this.showAxes) return;
    ctx.strokeStyle = color("axis");
    ctx.beginPath();
    line(origin.x, 0, origin.x, this.height);
    line(0, origin.y, this.width, origin.y);
    ctx.stroke();
    ctx.fillStyle = color("muted");
    ctx.font = `11px ${getComputedStyle(this.root).fontFamily}`;
    ctx.textAlign = "center";
    for (let x = Math.ceil(this.xMin / sx) * sx, n = 0; x <= this.xMax && n++ < 100; x += sx) {
      const p = this.project(x, 0);
      if (Math.abs(x) > sx * 1e-8)
        ctx.fillText(
          format(x),
          clamp(p.x, 22, this.width - 22),
          clamp(origin.y + 17, 15, this.height - 8)
        );
    }
    ctx.textAlign = "right";
    for (let y = Math.ceil(this.yMin / sy) * sy, n = 0; y <= this.yMax && n++ < 100; y += sy) {
      const p = this.project(0, y);
      if (Math.abs(y) > sy * 1e-8)
        ctx.fillText(
          format(y),
          clamp(origin.x - 7, 42, this.width - 8),
          clamp(p.y + 4, 14, this.height - 8)
        );
    }
  }
}
