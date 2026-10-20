// TH-3 (OI-34): calculator stylesheets and canvas code take every colour from a role. The scans run
// on synthetic sources first, then on the real files they find at run time, so files that later
// packages add under the scanned folders are covered without editing this test.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import postcss, { type Declaration, type Node as CssNode, type Rule } from "postcss";
import ts from "typescript";
import { expect, it } from "vitest";
import { GENERATED_FILES } from "../../../../scripts/calculator/generate-skin-colors";
import { CHROME_VARS, CURVE_VARS, FILL_ALPHA_VARS, ROLE_VARS, TONE_VARS } from "./vars";

const ROOT = resolve(__dirname, "../../../..");
const MQ_CSS = "vendor/mathquill/mathquill.css";
const SHADOW_TS = "src/components/calculator/styles/generated.ts";
const STYLES_DIR = "src/components/calculator/styles";

/** The folders TH-3 scans and the files inside them it leaves out (generated files, the hand-written
 * Desmos palette and the quiz trigger stylesheet, whose focus ring predates the --kcc-* tokens). */
const SCAN_ROOTS: readonly { dir: string; except: readonly string[] }[] = [
  {
    dir: "src/components/calculator",
    except: [
      SHADOW_TS,
      "src/components/calculator/calculator.module.css",
      GENERATED_FILES.chromeCss,
    ],
  },
  { dir: "src/lib/calculator/render", except: [] },
  {
    dir: "src/lib/calculator/theme",
    // desmos-palette.ts is the one hand-written source of Desmos's six curve colours (F-A1).
    except: [GENERATED_FILES.skinColors, "src/lib/calculator/theme/desmos-palette.ts"],
  },
];

const HEX = /(?<![\w&.#-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;

/** The named colours the stylesheet scan flags as whole words in colour property values. */
const CSS_SCAN_NAMES = (
  "white black red green blue gray grey silver yellow orange purple pink navy teal maroon olive " +
  "lime aqua fuchsia"
).split(" ");
const CSS_SCAN_PROPERTY =
  /^(?:color|background.*|border.*|outline.*|fill|stroke|box-shadow|caret-color|text-decoration-color|accent-color)$/i;

/** The 148 named colours of CSS Color 4. */
const NAMED_COLOURS = (
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet " +
  "brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan " +
  "darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta " +
  "darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue " +
  "darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey " +
  "dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray " +
  "green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush " +
  "lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray " +
  "lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
  "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon " +
  "mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue " +
  "mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin " +
  "navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen " +
  "paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
  "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna " +
  "silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle " +
  "tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
).split(" ");

/** CSS system colours, current (CSS Color 4) and deprecated. */
const SYSTEM_COLOURS = (
  "AccentColor AccentColorText ActiveText ButtonBorder ButtonFace ButtonText Canvas CanvasText " +
  "Field FieldText GrayText Highlight HighlightText LinkText Mark MarkText SelectedItem " +
  "SelectedItemText VisitedText ActiveBorder ActiveCaption AppWorkspace Background " +
  "ButtonHighlight ButtonShadow CaptionText InactiveBorder InactiveCaption InactiveCaptionText " +
  "InfoBackground InfoText Menu MenuText Scrollbar ThreeDDarkShadow ThreeDFace ThreeDHighlight " +
  "ThreeDLightShadow ThreeDShadow Window WindowFrame WindowText"
).split(" ");

const VENDOR_COLOUR_PROPERTY =
  /^(?:color|background.*|border.*|outline.*|box-shadow|-webkit-box-shadow|text-shadow|caret-color|text-decoration-color|fill|stroke)$/i;

/** The canvas and style properties whose whole-string named colour the TS scan flags. */
const TS_COLOUR_TARGETS = new Set([
  "fillStyle",
  "strokeStyle",
  "shadowColor",
  "color",
  "background",
  "backgroundColor",
  "borderColor",
  "outlineColor",
]);

const BORDER_SIDES = ["top", "right", "bottom", "left"];

/** The properties whose role value replaces a vendored declaration of the key property. */
const COVERS: Readonly<Record<string, readonly string[]>> = {
  background: ["background", "background-color"],
  "background-color": ["background", "background-color"],
  border: ["border", "border-color"],
  "border-color": ["border", "border-color"],
  outline: ["outline", "outline-color"],
  "outline-color": ["outline", "outline-color"],
  "box-shadow": ["box-shadow", "-webkit-box-shadow"],
  "-webkit-box-shadow": ["box-shadow", "-webkit-box-shadow"],
  ...Object.fromEntries(
    BORDER_SIDES.flatMap((side) => {
      const own = [`border-${side}`, `border-${side}-color`, "border", "border-color"];
      return [
        [`border-${side}`, own],
        [`border-${side}-color`, own],
      ];
    })
  ),
};

/** Every `--kc-`/`--kcc-` property a theme map declares on `:host` or in the chrome sheet. */
const THEME_VARS: ReadonlySet<string> = new Set(
  [ROLE_VARS, TONE_VARS, CURVE_VARS, FILL_ALPHA_VARS, CHROME_VARS].flatMap((map) =>
    Object.values(map)
  )
);

type VendorColour = { selector: string; property: string; value: string; important: boolean };
type Found = { at: number; match: string };

function wholeWords(words: readonly string[]): RegExp {
  return new RegExp(`(?<![\\w-])(?:${words.join("|")})(?![\\w-])`, "gi");
}

const CSS_SCAN_NAME = wholeWords(CSS_SCAN_NAMES);
const COLOUR_KEYWORD = wholeWords([...NAMED_COLOURS, ...SYSTEM_COLOURS]);
const NAMED_COLOUR_SET: ReadonlySet<string> = new Set(NAMED_COLOURS);

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function collapse(selector: string): string {
  return selector.replace(/\s+/g, " ").trim();
}

function isTypeScript(path: string): boolean {
  return /\.tsx?$/.test(path);
}

/** Hex colours and colour functions in `text`, positioned from `offset`. */
function patternMatches(text: string, offset: number): Found[] {
  return [HEX, COLOUR_FUNCTION].flatMap((pattern) =>
    [...text.matchAll(pattern)].map((m) => ({ at: offset + m.index, match: m[0] }))
  );
}

function cssRawColours(source: string): Found[] {
  const css = stripCssComments(source);
  const found = patternMatches(css, 0);
  postcss.parse(css).walkDecls((decl) => {
    if (!CSS_SCAN_PROPERTY.test(decl.prop)) return;
    const start =
      (decl.source?.start?.offset ?? 0) + decl.prop.length + (decl.raws.between?.length ?? 0);
    for (const m of decl.value.matchAll(CSS_SCAN_NAME)) {
      found.push({ at: start + m.index, match: m[0] });
    }
  });
  return found;
}

function parseTypeScript(path: string, source: string): ts.SourceFile {
  const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
}

/** The text of a string literal or template literal part; undefined for any other node. */
function literalText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
    return node.text;
  }
  return undefined;
}

/** Every string and template literal text of a TS or TSX file, in source order. */
function tsLiterals(path: string, source: string): { node: ts.Node; text: string; at: number }[] {
  const file = parseTypeScript(path, source);
  const out: { node: ts.Node; text: string; at: number }[] = [];
  const visit = (node: ts.Node): void => {
    const text = literalText(node);
    if (text !== undefined) out.push({ node, text, at: node.getStart(file) });
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

function nameOf(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return node.argumentExpression.text;
  }
  return undefined;
}

/** Whether the whole literal is the value assigned (or given as a property) to a colour target. */
function givenToColourTarget(literal: ts.Node): boolean {
  let child = literal;
  let parent = literal.parent;
  while (
    parent &&
    (ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isSatisfiesExpression(parent) ||
      ts.isJsxExpression(parent) ||
      (ts.isConditionalExpression(parent) && parent.condition !== child))
  ) {
    child = parent;
    parent = parent.parent;
  }
  if (!parent) return false;
  let target: ts.Node | undefined;
  if (
    ts.isBinaryExpression(parent) &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    parent.right === child
  ) {
    target = parent.left;
  } else if (ts.isPropertyAssignment(parent) && parent.initializer === child) {
    target = parent.name;
  } else if (ts.isJsxAttribute(parent) && parent.initializer === child) {
    target = parent.name;
  }
  const name = target && nameOf(target);
  return name !== undefined && TS_COLOUR_TARGETS.has(name);
}

function tsRawColours(path: string, source: string): Found[] {
  return tsLiterals(path, source).flatMap(({ node, text, at }) => {
    const found = patternMatches(text, at);
    const whole = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
    if (whole && NAMED_COLOUR_SET.has(text.toLowerCase()) && givenToColourTarget(node)) {
      found.push({ at, match: text });
    }
    return found;
  });
}

/** Each raw colour of `source` as `"<path>: <match>"`, in source order. */
function rawColourFindings(path: string, source: string): string[] {
  const found = isTypeScript(path) ? tsRawColours(path, source) : cssRawColours(source);
  return found.sort((a, b) => a.at - b.at).map((f) => `${path}: ${f.match}`);
}

/** The repo-relative calculator stylesheets and canvas code TH-3 scans, sorted. */
function scannedFiles(root: string): string[] {
  const files: string[] = [];
  for (const { dir, except } of SCAN_ROOTS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const path = relative(root, join(entry.parentPath, entry.name)).split(sep).join("/");
      if (!/\.(?:css|tsx?)$/.test(path) || /\.test\.tsx?$/.test(path)) continue;
      if (path.split("/").includes("__fixtures__") || except.includes(path)) continue;
      files.push(path);
    }
  }
  return files.sort();
}

/** Each `var(--kc…)` that names neither a theme map value nor a `--kc-…` a stylesheet declares. */
function varFindings(files: readonly { path: string; source: string }[]): string[] {
  const declared = new Set(THEME_VARS);
  for (const { path, source } of files) {
    if (isTypeScript(path)) continue;
    postcss.parse(stripCssComments(source)).walkDecls((decl) => {
      if (decl.prop.startsWith("--kc")) declared.add(decl.prop);
    });
  }
  const findings: string[] = [];
  for (const { path, source } of files) {
    const texts = isTypeScript(path)
      ? tsLiterals(path, source).map((l) => l.text)
      : [stripCssComments(source)];
    for (const text of texts) {
      for (const m of text.matchAll(/var\(\s*(--kc[\w-]*)/g)) {
        if (!declared.has(m[1])) findings.push(`${path}: ${m[1]}`);
      }
    }
  }
  return findings;
}

/** One entry per selector of each rule, in source order, for every colour declaration of `css`. */
function vendorColourDecls(css: string): VendorColour[] {
  const out: VendorColour[] = [];
  postcss.parse(css).walkDecls((decl) => {
    if (decl.parent?.type !== "rule") return;
    const { prop, value } = decl;
    if (prop.toLowerCase() === "-moz-box-shadow" || /progid:/i.test(value)) return;
    const raw = value.search(HEX) >= 0 || value.search(COLOUR_FUNCTION) >= 0;
    const named = VENDOR_COLOUR_PROPERTY.test(prop) && value.search(COLOUR_KEYWORD) >= 0;
    if (!raw && !named) return;
    for (const selector of (decl.parent as Rule).selectors) {
      out.push({
        selector: collapse(selector),
        property: prop,
        value,
        important: !!decl.important,
      });
    }
  });
  return out;
}

/** The non-test stylesheets of `src/components/calculator/styles/`, sorted by path. */
function styleSheets(root: string): { path: string; source: string }[] {
  const abs = join(root, STYLES_DIR);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => `${STYLES_DIR}/${entry.name}`)
    .sort()
    .map((path) => ({ path, source: readFileSync(join(root, path), "utf8") }));
}

function insideAtRule(node: CssNode): boolean {
  for (let p = node.parent as CssNode | undefined; p; p = p.parent as CssNode | undefined) {
    if (p.type === "atrule") return true;
  }
  return false;
}

function fromRole(decl: Declaration): boolean {
  const value = decl.value.trim().toLowerCase();
  return value.includes("var(--kc-") || value === "none" || value === "transparent";
}

/** `"<selector> { <property> }"` for each vendored colour no later role rule replaces. */
function overrideFindings(
  vendor: readonly VendorColour[],
  sheets: readonly { path: string; source: string }[]
): string[] {
  const rules: { selectors: string[]; decls: Declaration[] }[] = [];
  for (const { source } of sheets) {
    postcss.parse(source).walkRules((rule) => {
      if (insideAtRule(rule)) return;
      const decls = rule.nodes.filter((n): n is Declaration => n.type === "decl");
      rules.push({ selectors: rule.selectors.map(collapse), decls });
    });
  }
  const findings = new Set<string>();
  for (const entry of vendor) {
    const property = entry.property.toLowerCase();
    const covering = COVERS[property] ?? [property];
    const targets = [entry.selector, `:host ${entry.selector}`];
    const covered = rules.some(
      (rule) =>
        rule.selectors.some((s) => targets.includes(s)) &&
        rule.decls.some(
          (d) =>
            covering.includes(d.prop.toLowerCase()) &&
            fromRole(d) &&
            (!entry.important || !!d.important)
        )
    );
    if (!covered) findings.add(`${entry.selector} { ${entry.property} }`);
  }
  return [...findings];
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

it("TH-3 the scan flags hex, colour functions and named colours in synthetic sources", () => {
  expect(rawColourFindings("a.css", ".a{color:#2f72dc}")).toEqual(["a.css: #2f72dc"]);
  expect(rawColourFindings("a.css", ".a{background:white;border:1px solid rgb(0 0 0)}")).toEqual([
    "a.css: white",
    "a.css: rgb(",
  ]);
  expect(
    rawColourFindings("a.css", "/* #fff */ .a{color:var(--kc-text);outline-color:currentColor}")
  ).toEqual([]);
  expect(rawColourFindings("a.ts", 'ctx.fillStyle = "#fff";')).toEqual(["a.ts: #fff"]);
  expect(rawColourFindings("a.ts", 'ctx.strokeStyle = "black"; el.style.color = "red";')).toEqual([
    "a.ts: black",
    "a.ts: red",
  ]);
  expect(
    rawColourFindings("a.tsx", 'const label = "Colour 1, blue"; ctx.fillStyle = theme.paper;')
  ).toEqual([]);
  expect(rawColourFindings("a.tsx", '<div style={{ color: "black" }} />')).toEqual([
    "a.tsx: black",
  ]);
});

it("TH-3 calculator stylesheets and canvas code contain no raw colours outside the two generated files", () => {
  const files = scannedFiles(ROOT);
  expect(files).toContain("src/lib/calculator/theme/roles.ts");
  expect(files.flatMap((path) => rawColourFindings(path, read(path)))).toEqual([]);
});

it("TH-3 the reference blue #2f72dc appears only in the quiz trigger, the hand-set classic palette and the generated skin table", () => {
  const allowed = new Set([
    "src/lib/calculator/theme/desmos-palette.ts",
    GENERATED_FILES.skinColors,
  ]);
  const paths = [...scannedFiles(ROOT), ...Object.values(GENERATED_FILES), SHADOW_TS, MQ_CSS];
  expect(read("src/lib/calculator/theme/desmos-palette.ts").includes("#2f72dc")).toBe(true);
  for (const path of paths) {
    if (!existsSync(join(ROOT, path)) || allowed.has(path)) continue;
    expect(read(path).toLowerCase().includes("2f72dc"), path).toBe(false);
  }
});

it("TH-3 every --kc- and --kcc- variable a calculator stylesheet reads is a declared role or token", () => {
  expect(varFindings([{ path: "a.css", source: ".a{color:var(--kc-txt)}" }])).toEqual([
    "a.css: --kc-txt",
  ]);
  const files = scannedFiles(ROOT).map((path) => ({ path, source: read(path) }));
  expect(varFindings(files)).toEqual([]);
});

it("TH-3 the override check lists each vendored colour declaration no later role rule replaces", () => {
  const V =
    ".mq-editable-field .mq-cursor{border-left:1px solid black}" +
    ".mq-math-mode .mq-empty{background:#ccc}" +
    ".mq-math-mode .mq-selection,.mq-editable-field .mq-selection{background:#B4D5FE !important;background:Highlight !important;color:HighlightText}" +
    ".mq-x{filter:progid:DXImageTransform.Microsoft.Chroma(color='#3399FF');-moz-box-shadow:#8bd 0 0 1px}" +
    ".mq-math-mode{font-size:115%}";
  const S = [
    {
      path: "src/components/calculator/styles/math-field.css",
      source:
        ":host .mq-editable-field .mq-cursor{border-left-color:var(--kc-text)}" +
        ".mq-math-mode .mq-selection{background:var(--kc-focus-bar)}" +
        ".mq-editable-field .mq-selection{background:var(--kc-focus-bar)!important;color:var(--kc-focus-bar-label)}" +
        "@media (min-width:1px){.mq-math-mode .mq-empty{background:var(--kc-chrome)}}",
    },
  ];
  const decls = vendorColourDecls(V);
  expect(decls).toHaveLength(8);
  expect(decls.map((d) => d.property)).not.toContain("filter");
  expect(decls.map((d) => d.property)).not.toContain("-moz-box-shadow");
  expect(overrideFindings(decls, S)).toEqual([
    ".mq-math-mode .mq-empty { background }",
    ".mq-math-mode .mq-selection { background }",
    ".mq-math-mode .mq-selection { color }",
  ]);
  expect(overrideFindings(decls, [])).toHaveLength(6);
});

it("TH-3, OI-34 every colour declaration of the vendored MathQuill sheet is overridden from a role by a later calculator stylesheet", () => {
  const vendored = existsSync(join(ROOT, MQ_CSS));
  const decls = vendored ? vendorColourDecls(read(MQ_CSS)) : [];
  if (vendored) {
    const tokens = new Set(decls.flatMap((d) => d.value.toLowerCase().split(/[\s,()]+/)));
    for (const colour of [
      "#b4d5fe",
      "rgba",
      "black",
      "#8bd",
      "#6ae",
      "#709ac0",
      "gray",
      "#d4d4d4",
      "darkgray",
      "activeborder",
    ]) {
      expect(tokens.has(colour), colour).toBe(true);
    }
  }
  expect(overrideFindings(decls, styleSheets(ROOT))).toEqual([]);
});

it("TH-3 the composed shadow CSS is built only from the vendored sheet and scanned stylesheets", () => {
  const known = new Set([MQ_CSS, ...scannedFiles(ROOT)]);
  if (!existsSync(join(ROOT, SHADOW_TS))) return;
  const paths = [...read(SHADOW_TS).matchAll(/\/\* ([\w./-]+\.css) \*\//g)].map((m) => m[1]);
  expect(paths.length).toBeGreaterThan(0);
  expect(paths).toContain(MQ_CSS);
  for (const path of paths) expect(known.has(path), path).toBe(true);
});
