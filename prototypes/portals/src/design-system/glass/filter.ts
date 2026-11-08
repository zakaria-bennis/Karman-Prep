/**
 * One shared SVG <filter> per geometry and tone, in a document-level defs
 * host, so a row of identical buttons costs one filter (21st.dev 12460,
 * "shared filter host"). The chain: bend the backdrop through the field map,
 * tone it, optionally tint it like pigmented glass, and clip to the field.
 */
let host: SVGSVGElement | null = null;
const refs = new Map<string, { el: SVGFilterElement; count: number }>();

function getHost(): SVGSVGElement {
  if (host) return host;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none";
  document.body.appendChild(svg);
  host = svg;
  return svg;
}

export function acquireFilter(id: string, markup: string) {
  const hit = refs.get(id);
  if (hit) {
    hit.count++;
    return;
  }
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("color-interpolation-filters", "sRGB");
  filter.innerHTML = markup;
  getHost().appendChild(filter);
  refs.set(id, { el: filter, count: 1 });
}

export function releaseFilter(id: string) {
  const hit = refs.get(id);
  if (!hit) return;
  if (--hit.count <= 0) {
    hit.el.remove();
    refs.delete(id);
  }
}

const toneCache = new Map<string, string>();
/** The clear material's tone curve (12460 MATERIALS.clear): a lift in the shadows, a roll-off up top on dark. */
export function toneTable(dark: boolean): string {
  const key = dark ? "d" : "l";
  const hit = toneCache.get(key);
  if (hit) return hit;
  const lift = dark ? 0.15 : 0.18;
  const rolloff = dark ? 0.2 : 0;
  const values = Array.from({ length: 33 }, (_, n) => {
    const v = n / 32;
    const tone = v + lift * (1 - v) ** 3 - rolloff * v ** 3;
    const tinted = dark ? 0.38 * v + 0.2 : 0.78 * v + 0.26;
    const tw = dark ? 0.14 : 0.06;
    return Math.max(0, Math.min(1, (1 - tw) * tone + tw * tinted)).toFixed(5);
  });
  const table = values.join(" ");
  toneCache.set(key, table);
  return table;
}

export interface FilterSpec {
  w: number;
  h: number;
  field: string;
  dark: boolean;
  refraction: number;
  /** [r, g, b] in 0..1: the glass is pigmented with this colour (the accent for the one highlighted action). */
  tint?: [number, number, number];
  /** How much of the tint is solid pigment (0.8) against transmitted light (0.2). */
  body?: number;
}

export function filterMarkup({
  w,
  h,
  field,
  dark,
  refraction,
  tint,
  body = 0.8,
}: FilterSpec): string {
  const table = toneTable(dark);
  const parts = [
    `<feImage href="${field}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="field"/>`,
    `<feDisplacementMap in="SourceGraphic" in2="field" scale="${refraction * 2}" xChannelSelector="R" yChannelSelector="G" result="refracted"/>`,
    `<feComponentTransfer in="refracted" result="tone"><feFuncR type="table" tableValues="${table}"/><feFuncG type="table" tableValues="${table}"/><feFuncB type="table" tableValues="${table}"/></feComponentTransfer>`,
  ];
  let color = "tone";
  if (tint) {
    const rest = 1 - body;
    parts.push(
      `<feColorMatrix in="tone" type="saturate" values="0" result="lum"/>`,
      `<feComponentTransfer in="lum" result="tinted">`,
      `<feFuncR type="linear" slope="${tint[0] * rest}" intercept="${tint[0] * body}"/>`,
      `<feFuncG type="linear" slope="${tint[1] * rest}" intercept="${tint[1] * body}"/>`,
      `<feFuncB type="linear" slope="${tint[2] * rest}" intercept="${tint[2] * body}"/>`,
      `<feFuncA type="linear" slope="${rest}" intercept="${body}"/>`,
      `</feComponentTransfer>`
    );
    color = "tinted";
  }
  parts.push(`<feComposite in="${color}" in2="field" operator="in"/>`);
  return parts.join("");
}

export function filterId(spec: FilterSpec): string {
  const t = spec.tint ? spec.tint.map((c) => Math.round(c * 255)).join("-") : "";
  return `kglass${spec.w}x${spec.h}${spec.dark ? "d" : "l"}r${Math.round(spec.refraction * 10)}t${t}b${Math.round((spec.body ?? 0.8) * 100)}`.replace(
    /[^a-zA-Z0-9-]/g,
    ""
  );
}

/** Chromium renders SVG filters in backdrop-filter; WebKit and Gecko frost instead. */
export function canRefract(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } })
    .userAgentData?.brands;
  if (brands?.length)
    return brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
  return /(Chrome|Chromium|Edg|SamsungBrowser)\/\d+/.test(ua);
}
