import { roundedBoxField, sat } from "./sdf";

/**
 * The two map planes of the liquid glass, ported from 21st.dev 12460
 * (gpu/maps.wgsl via its canvas port): the field plane bends the backdrop at
 * the lip (a displacement map read by feDisplacementMap), the overlay plane
 * paints the rim light and the side shade with its own alpha as the mask.
 */
export interface Planes {
  field: string;
  overlay: string;
  w: number;
  h: number;
}

const COS_SPREAD = Math.cos(1.08);
const COS_DIFFUSE = Math.cos(1.08 * 0.65);
const COS_SIDE = Math.cos(0.98);
const PAD = 2;

const scaleFor = (w: number, h: number) =>
  w * h > 250_000 ? 0.5 : Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);

function plane(
  w: number,
  h: number,
  pad: number,
  paint: (px: number, py: number, o: number, data: Uint8ClampedArray) => void
) {
  const k = scaleFor(w + pad * 2, h + pad * 2);
  const mw = Math.max(1, Math.round((w + pad * 2) * k));
  const mh = Math.max(1, Math.round((h + pad * 2) * k));
  const canvas = document.createElement("canvas");
  canvas.width = mw;
  canvas.height = mh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(mw, mh);
  for (let j = 0; j < mh; j++) {
    const py = (j + 0.5) / k - (h + pad * 2) / 2;
    for (let i = 0; i < mw; i++) {
      const px = (i + 0.5) / k - (w + pad * 2) / 2;
      paint(px, py, (j * mw + i) * 4, img.data);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export function renderPlanes(
  w: number,
  h: number,
  radius: number,
  bezel: number,
  dark: boolean
): Planes {
  const bz = Math.max(1, Math.min(bezel, w / 2, h / 2));
  const field = plane(w, h, 0, (px, py, o, data) => {
    const { d, nx, ny } = roundedBoxField(px, py, w, h, radius);
    const coverage = sat(0.5 - d);
    if (d < -(bz + 4)) {
      data[o] = data[o + 1] = data[o + 2] = 128;
      data[o + 3] = 255;
      return;
    }
    const depth = sat(-d / bz);
    const edge = 1 - sat(Math.sqrt((2 - depth) * depth));
    data[o] = Math.round(255 * (0.5 - nx * edge * 0.5));
    data[o + 1] = Math.round(255 * (0.5 - ny * edge * 0.5));
    data[o + 2] = 128;
    data[o + 3] = Math.round(255 * coverage);
  });
  const overlay = plane(w, h, PAD, (px, py, o, data) => {
    const { d, nx, ny } = roundedBoxField(px, py, w, h, radius);
    if (d > PAD + 6) return;
    const coverage = sat(0.5 - d);
    const directional = Math.pow(sat((Math.abs(ny) - COS_SPREAD) / (1 - COS_SPREAD)), 1.25);
    const diffuseDir = Math.pow(sat((Math.abs(ny) - COS_DIFFUSE) / (1 - COS_DIFFUSE)), 1.25);
    const stroke = sat(d + 0.9 + 0.5) * sat(0.5 - d);
    let specular = directional * stroke;
    specular = specular / (1 + 0.5 * (1 - specular));
    const diffuse = diffuseDir * 0.18 * Math.pow(1 - sat(-d / 4.5), 2) * coverage;
    const highlight = sat(specular * (dark ? 0.82 : 1) + diffuse * (dark ? 0.4 : 1));
    const adjusted = d - 0.5;
    const falloff = 1 - sat(-adjusted / 0.5);
    const ramp = (falloff > 0 ? 1 : 0) * 0.25 + falloff * 0.75;
    const band = ramp * sat(adjusted + 0.5 + 0.5) * sat(-adjusted + 0.5);
    const wx = sat((nx - COS_SIDE) / (1 - COS_SIDE)) * band;
    const wy = sat((-nx - COS_SIDE) / (1 - COS_SIDE)) * band;
    const shade = (wx / (1 + 0.4 * (1 - wx)) + wy / (1 + 0.4 * (1 - wy))) * (dark ? 0.6 : 0.48);
    const alpha = highlight + shade * (1 - highlight);
    if (alpha <= 0.002) return;
    const light = ((dark ? 0.82 : 1) * highlight) / Math.max(alpha, 1e-5);
    data[o] = data[o + 1] = data[o + 2] = Math.round(255 * Math.min(1, light));
    data[o + 3] = Math.round(255 * alpha);
  });
  return { field, overlay, w, h };
}

const cache = new Map<string, Planes>();
const LIMIT = 48;

export function planesFor(
  w: number,
  h: number,
  radius: number,
  bezel: number,
  dark: boolean
): Planes {
  const key = `${w}x${h}r${radius}b${bezel}${dark ? "d" : "l"}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = renderPlanes(w, h, radius, bezel, dark);
  cache.set(key, p);
  if (cache.size > LIMIT) cache.delete(cache.keys().next().value as string);
  return p;
}
