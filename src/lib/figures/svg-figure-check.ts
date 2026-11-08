// ============================================================
// svg-figure-check — server-side validation of a hand-drawn,
// founder-approved figure SVG before the importer stores it in
// quiz_questions.figure_svg.
//
// It never rewrites the markup (the founder approved exact bytes);
// it only accepts or refuses. The accepted language is a strict,
// well-formed subset of SVG that src/lib/figures/inline-svg.ts
// (the quiz's sanitizer) also accepts, and that the figure lane's
// check (scripts/import-tools/kimport/figure_gate.py svg_problems)
// asks for at submit time:
//   · one <svg xmlns="http://www.w3.org/2000/svg"> root with
//     data-figure-theme="karman-v1" and a positive viewBox
//   · only the inert drawing tags and attributes of that sanitizer
//   · no DOCTYPE, ENTITY, comment, CDATA, processing instruction,
//     style, script, namespaced attribute, URL, data: or javascript:
//   · plain paints only; <text> in the figure serif
//   · at most 400,000 characters and 8,000 elements
// Pure string parsing, so it runs in the CLI importer, the admin
// upload and vitest without a DOM.
// ============================================================

export const SVG_FIGURE_MAX_CHARS = 400_000;
export const SVG_FIGURE_MAX_ELEMENTS = 8000;
export const SVG_FIGURE_THEME = "karman-v1";
export const SVG_FIGURE_FONT = "STIX Two Text";
const SVG_NS = "http://www.w3.org/2000/svg";

const TAGS = new Set(
  "svg g path rect circle ellipse line polyline polygon text tspan title desc metadata".split(" ")
);
const ATTRS = new Set(
  (
    "xmlns width height viewBox x y x1 y1 x2 y2 cx cy r rx ry d points transform fill stroke " +
    "stroke-width fill-opacity stroke-opacity opacity stroke-dasharray stroke-linecap " +
    "stroke-linejoin fill-rule font-family font-size font-weight font-style text-anchor " +
    "dominant-baseline paint-order id role aria-labelledby data-figure-role data-figure-theme"
  ).split(" ")
);
const BAD_VALUE = /url\s*\(|javascript:|data:|https?:|[<>]/i;
const PAINT =
  /^(?:none|currentColor|#[\da-fA-F]{3,8}|var\(--figure-[a-z0-9-]+(?:,\s*#[\da-fA-F]{3,8})?\))$/;
const VIEWBOX = /^\s*-?[\d.]+[ ,]+-?[\d.]+[ ,]+[\d.]+[ ,]+[\d.]+\s*$/;
const ENTITY = /&(?:lt|gt|amp|quot|apos|#\d{1,7}|#x[\da-fA-F]{1,6});/y;
const OPEN = /<([A-Za-z][\w.:-]*)((?:\s+[^\s=/>"']+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/y;
const CLOSE = /<\/([A-Za-z][\w.:-]*)\s*>/y;
const ATTR = /\s+([^\s=/>"']+)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/g;
const NAMED: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

/** Every `&` must start one of the five XML entities or a character reference. */
function entitiesOk(text: string): boolean {
  for (let at = text.indexOf("&"); at !== -1; at = text.indexOf("&", at + 1)) {
    ENTITY.lastIndex = at;
    if (!ENTITY.test(text)) return false;
  }
  return true;
}

function decode(text: string): string {
  return text.replace(/&(#x[\da-fA-F]+|#\d+|[a-z]+);/g, (_, ref: string) =>
    ref.startsWith("#x")
      ? String.fromCodePoint(parseInt(ref.slice(2), 16))
      : ref.startsWith("#")
        ? String.fromCodePoint(parseInt(ref.slice(1), 10))
        : NAMED[ref]
  );
}

function attributeProblems(tag: string, raw: string, root: boolean, out: Set<string>) {
  const seen = new Map<string, string>();
  for (const match of raw.matchAll(ATTR)) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? "";
    if (seen.has(name)) out.add(`figure_svg <${tag}> repeats attribute ${name}`);
    if (!entitiesOk(value)) out.add(`figure_svg <${tag}> ${name} has a bare & or unknown entity`);
    const decoded = decode(value);
    seen.set(name, decoded);
    if (name.includes(":")) out.add(`figure_svg <${tag}> has a namespaced attribute ${name}`);
    else if (!ATTRS.has(name))
      out.add(`figure_svg <${tag}> has attribute ${name}, which the quiz does not allow`);
    else if (name === "xmlns") {
      if (!root || decoded !== SVG_NS)
        out.add(`figure_svg <${tag}> xmlns must be ${SVG_NS} on the root only`);
    } else if (BAD_VALUE.test(decoded))
      out.add(`figure_svg <${tag}> ${name} has a URL or markup in it`);
    else if ((name === "fill" || name === "stroke") && !PAINT.test(decoded))
      out.add(`figure_svg <${tag}> ${name}=${JSON.stringify(decoded)} is not a plain colour`);
  }
  return seen;
}

function rootProblems(attrs: Map<string, string>, out: Set<string>) {
  if (attrs.get("xmlns") !== SVG_NS) out.add(`figure_svg root must be <svg xmlns="${SVG_NS}">`);
  if (attrs.get("data-figure-theme") !== SVG_FIGURE_THEME)
    out.add(`figure_svg root needs data-figure-theme="${SVG_FIGURE_THEME}"`);
  const box = attrs.get("viewBox") ?? "";
  const nums = box.trim().split(/[ ,]+/).map(Number);
  if (
    !VIEWBOX.test(box) ||
    nums.length !== 4 ||
    !nums.every(Number.isFinite) ||
    nums[2] <= 0 ||
    nums[3] <= 0
  )
    out.add("figure_svg root needs a viewBox of four numbers with a positive width and height");
}

/** Why the importer may not store `svg` as a figure ([] = it may). Never edits it. */
export function svgFigureProblems(svg: unknown): string[] {
  if (typeof svg !== "string" || !svg.trimStart().startsWith("<svg"))
    return ["figure_svg must be SVG markup starting with <svg"];
  if (svg.length > SVG_FIGURE_MAX_CHARS)
    return [`figure_svg is over ${SVG_FIGURE_MAX_CHARS.toLocaleString("en-US")} characters`];
  if (/<!|<\?/.test(svg))
    return [
      "figure_svg may not contain a DOCTYPE, ENTITY, comment, CDATA or processing instruction",
    ];
  const out = new Set<string>();
  const stack: string[] = [];
  let elements = 0;
  let closedRoot = false;
  let at = svg.length - svg.trimStart().length;
  while (at < svg.length) {
    const lt = svg.indexOf("<", at);
    const text = svg.slice(at, lt === -1 ? svg.length : lt);
    if (text) {
      if ((closedRoot || stack.length === 0) && text.trim())
        return ["figure_svg has text outside the <svg> root"];
      if (!entitiesOk(text)) out.add("figure_svg text has a bare & or unknown entity");
    }
    if (lt === -1) break;
    CLOSE.lastIndex = lt;
    const close = CLOSE.exec(svg);
    if (close) {
      if (stack.pop() !== close[1]) return [`figure_svg has a mismatched </${close[1]}>`];
      if (stack.length === 0) closedRoot = true;
      at = CLOSE.lastIndex;
      continue;
    }
    OPEN.lastIndex = lt;
    const open = OPEN.exec(svg);
    if (!open) return ["figure_svg is not well-formed markup"];
    const [, tag, raw, selfClosing] = open;
    if (closedRoot) return ["figure_svg has more than one root element"];
    const root = stack.length === 0;
    if (root && tag !== "svg") return ["figure_svg root must be <svg>"];
    if (++elements > SVG_FIGURE_MAX_ELEMENTS)
      return [`figure_svg has more than ${SVG_FIGURE_MAX_ELEMENTS} elements`];
    if (!TAGS.has(tag)) out.add(`figure_svg uses <${tag}>, which the quiz does not allow`);
    const attrs = attributeProblems(tag, raw, root, out);
    if (root) rootProblems(attrs, out);
    if (tag === "text" && !(attrs.get("font-family") ?? "").includes(SVG_FIGURE_FONT))
      out.add(`figure_svg <text> needs font-family "${SVG_FIGURE_FONT}, Times New Roman, serif"`);
    if (selfClosing) {
      if (root) closedRoot = true;
    } else stack.push(tag);
    at = OPEN.lastIndex;
  }
  if (!closedRoot || stack.length) return ["figure_svg is not closed"];
  return [...out].sort();
}
