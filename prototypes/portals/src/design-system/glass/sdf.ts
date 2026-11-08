/**
 * Signed distance and outward normal of a rounded rectangle, centred at the
 * origin. The reference (21st.dev 12460) tessellates a Lissé squircle; Karman's
 * controls are pills and round-rects, so the analytic rounded-box field is
 * exact and needs no tessellation.
 */
export interface Field {
  d: number;
  nx: number;
  ny: number;
}

export function roundedBoxField(px: number, py: number, w: number, h: number, r: number): Field {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw, hh);
  const qx = Math.abs(px) - (hw - rr);
  const qy = Math.abs(py) - (hh - rr);
  if (qx > 0 && qy > 0) {
    const len = Math.hypot(qx, qy) || 1e-6;
    return {
      d: len - rr,
      nx: (qx / len) * Math.sign(px || 1),
      ny: (qy / len) * Math.sign(py || 1),
    };
  }
  if (qx > qy) return { d: qx - rr, nx: Math.sign(px || 1), ny: 0 };
  return { d: qy - rr, nx: 0, ny: Math.sign(py || 1) };
}

export const sat = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
