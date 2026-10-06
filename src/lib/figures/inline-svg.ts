/** Strict inert SVG subset for reviewed exam diagrams. No HTML, scripts, CSS, references or URLs. */
const TAGS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
  "metadata",
]);
const ATTRS = new Set([
  "xmlns",
  "width",
  "height",
  "viewBox",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "transform",
  "fill",
  "stroke",
  "stroke-width",
  "fill-opacity",
  "stroke-opacity",
  "opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "paint-order",
  "id",
  "role",
  "aria-labelledby",
  "data-figure-role",
  "data-figure-theme",
]);
const COLORS: Record<string, string> = {
  "#070605": "background",
  "#171611": "surface",
  "#222018": "shade",
  "#f3ecdd": "text",
  "#ede5d7": "text",
  "#ddd4c1": "text",
  "#b8b0a1": "axis",
  "#3b3426": "grid",
  "#2fa8ff": "math",
  "#d84f73": "reading",
  "#c8ab6a": "gold",
};
const SERIES = [
  "#30302c",
  "#777568",
  "#66645f",
  "#111719",
  "#69675f",
  "#647460",
  "#c7d9bd",
  "#777777",
  "#c7c7c7",
  "#555555",
  "#77736a",
  "#777",
  "#3f3e39",
];
const ROLES = new Set([
  "background",
  "surface",
  "shade",
  "text",
  "axis",
  "grid",
  "math",
  "reading",
  "gold",
  "series-1",
  "series-2",
  "series-3",
  "series-4",
  "series-5",
  "series-6",
]);

const CF_ROLES: Record<string, [string, string]> = {
  background: ["background", "#070605"],
  surface: ["surface", "#171611"],
  shade: ["shade", "#222018"],
  ink: ["text", "#f3ecdd"],
  axis: ["axis", "#b8b0a1"],
  grid: ["cf-grid", "#d7be89"],
  "data-1": ["series-1", "#2fa8ff"],
  "data-2": ["series-2", "#d84f73"],
  "data-3": ["series-3", "#c8ab6a"],
  "data-4": ["series-4", "#8ba86a"],
  "data-5": ["series-5", "#c6adf0"],
  "data-6": ["series-6", "#b8b0a1"],
};

export function sanitizeThemedSvg(source: string, alt: string): string | null {
  if (source.length > 400_000 || /<!DOCTYPE|<!ENTITY/i.test(source)) return null;
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = doc.documentElement;
  if (
    doc.querySelector("parsererror") ||
    root.localName !== "svg" ||
    root.namespaceURI !== "http://www.w3.org/2000/svg"
  )
    return null;
  // Never insert an asset stylesheet, including CF's OS-theme fallback sheet.
  // Its paint attributes are adapted through the strictly allowlisted role contract below.
  root.querySelectorAll("style").forEach((element) => element.remove());
  const elements = [root, ...root.querySelectorAll("*")];
  if (
    elements.length > 8000 ||
    elements.some(
      (element) => element.namespaceURI !== root.namespaceURI || !TAGS.has(element.localName)
    )
  )
    return null;
  let reviewed = root.getAttribute("data-figure-theme") === "karman-v1";
  try {
    const metadata = JSON.parse(root.querySelector("metadata")?.textContent ?? "{}");
    reviewed ||=
      typeof metadata.question_id === "string" &&
      /^[a-f0-9]{64}$/.test(metadata.source_version) &&
      typeof metadata.B_output_version === "string";
  } catch {
    /* Unreviewed assets are still sanitized, but never recolored. */
  }
  const seriesColors = [
    ...new Set(
      elements
        .flatMap((element) => [element.getAttribute("fill"), element.getAttribute("stroke")])
        .filter((color): color is string => !!color && SERIES.includes(color.toLowerCase()))
        .map((color) => color.toLowerCase())
    ),
  ];
  // More than six series cannot retain a distinct palette; keep their authored colors.
  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      if (["fill", "stroke"].includes(attribute.name)) {
        const cf = attribute.value.match(
          /^var\(--karman-figure-([a-z0-9-]+),\s*var\(--cf-fallback-\1\)\)$/
        );
        if (cf && CF_ROLES[cf[1]]) {
          const [role, fallback] = CF_ROLES[cf[1]];
          element.setAttribute(
            attribute.name,
            reviewed ? `var(--figure-${role}, ${fallback})` : fallback
          );
        }
      }
      if (["opacity", "stroke-opacity", "fill-opacity"].includes(attribute.name)) {
        const opacity = attribute.value.match(
          /^var\(--karman-figure-grid-opacity,\s*(0(?:\.\d+)?|1(?:\.0+)?)\)$/
        );
        if (opacity) element.setAttribute(attribute.name, opacity[1]);
      }
      const currentValue = element.getAttribute(attribute.name)!;
      if (
        !ATTRS.has(attribute.name) ||
        (/url\s*\(|javascript:|data:|https?:|[<>]/i.test(currentValue) &&
          attribute.name !== "xmlns")
      )
        return null;
      if (
        ["fill", "stroke"].includes(attribute.name) &&
        !/^(?:none|currentColor|#[\da-fA-F]{3,8}|var\(--figure-[a-z0-9-]+(?:,\s*#[\da-fA-F]{3,8})?\))$/.test(
          attribute.value
        )
      )
        return null;
    }
    element.removeAttribute("id");
    element.removeAttribute("aria-labelledby");
    if (reviewed)
      for (const name of ["fill", "stroke"]) {
        const paint = element.getAttribute(name);
        if (!paint || paint === "none" || paint.startsWith("var(")) continue;
        const explicit = element.getAttribute("data-figure-role");
        const series = seriesColors.indexOf(paint.toLowerCase());
        const role =
          explicit && ROLES.has(explicit)
            ? explicit
            : (COLORS[paint.toLowerCase()] ??
              (series >= 0 && seriesColors.length <= 6 ? `series-${series + 1}` : null));
        if (role) element.setAttribute(name, `var(--figure-${role}, ${paint})`);
      }
  }
  root.querySelectorAll("metadata, title, desc").forEach((element) => element.remove());
  if (
    !/^\s*-?[\d.]+[ ,]+-?[\d.]+[ ,]+[\d.]+[ ,]+[\d.]+\s*$/.test(root.getAttribute("viewBox") ?? "")
  )
    return null;
  const bounds = root.getAttribute("viewBox")!.trim().split(/[ ,]+/).map(Number);
  if (bounds.length !== 4 || !bounds.every(Number.isFinite) || bounds[2] <= 0 || bounds[3] <= 0)
    return null;
  root.removeAttribute("width");
  root.removeAttribute("height");
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", alt);
  return new XMLSerializer().serializeToString(root);
}
