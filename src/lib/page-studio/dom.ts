// DOM helpers the Page Studio runs on the page inside its frame: a selector that finds an element
// again, a readable name for it, the words it holds, and a preview of new words that never breaks
// React (only text node data changes; no node is added or removed). The frame is another window,
// so nothing here uses `instanceof`.

const STABLE_ID = /^[A-Za-z][\w-]*$/;

function isElement(n: Node | null | undefined): n is Element {
  return Boolean(n) && (n as Node).nodeType === 1;
}

function quoteAttr(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** A CSS selector for `el`: from the nearest stable id or test id, else from <body>. */
export function cssPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.tagName !== "HTML") {
    const tag = node.tagName.toLowerCase();
    if (node.id && STABLE_ID.test(node.id)) {
      parts.unshift(`#${node.id}`);
      break;
    }
    const testId = node.getAttribute("data-testid");
    if (testId) {
      parts.unshift(`[data-testid=${quoteAttr(testId)}]`);
      break;
    }
    const parent: Element | null = node.parentElement;
    if (!parent || tag === "body") {
      parts.unshift(tag);
      break;
    }
    const same = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(node) + 1})` : tag);
    node = parent;
  }
  return parts.join(" > ");
}

export function squash(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function short(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const KIND_BY_TAG: Record<string, string> = {
  a: "link",
  button: "button",
  img: "image",
  svg: "drawing",
  input: "field",
  textarea: "field",
  select: "menu",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  p: "paragraph",
  li: "list item",
  label: "label",
  nav: "menu bar",
  header: "header",
  footer: "footer",
  section: "section",
  canvas: "animation",
  video: "video",
  article: "card",
  aside: "side panel",
  form: "form",
  table: "table",
  dialog: "dialog",
  main: "main area",
  ul: "list",
  ol: "list",
};

/** Words that sit inside a line of text get called "text" rather than by their tag. */
const INLINE = new Set([
  "span",
  "b",
  "strong",
  "em",
  "i",
  "small",
  "mark",
  "sup",
  "sub",
  "u",
  "s",
  "time",
  "abbr",
  "code",
]);

/** A short readable name: `button "Start set"`, `image "Maya's tutor"`, `section`. */
export function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role");
  const kind =
    (role && role !== "presentation" ? role : null) ??
    KIND_BY_TAG[tag] ??
    (INLINE.has(tag) ? "text" : "box");
  const name = squash(
    el.getAttribute("aria-label") ??
      el.getAttribute("alt") ??
      el.getAttribute("placeholder") ??
      el.getAttribute("title") ??
      el.textContent
  );
  return name ? `${kind} "${short(name)}"` : kind;
}

/** The element's markup, cut short, for Claude to find it in the code. */
export function snippet(el: Element, max = 1500): string {
  const html = el.outerHTML.replace(/\s+/g, " ");
  return html.length > max ? `${html.slice(0, max)}…` : html;
}

function hasOwnText(el: Element): boolean {
  return Array.from(el.childNodes).some((n) => n.nodeType === 3 && squash(n.textContent) !== "");
}

const NOT_WORDS = new Set([
  "SCRIPT",
  "STYLE",
  "SVG",
  "CANVAS",
  "IMG",
  "VIDEO",
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

/** The element whose words a click means: the clicked one, a close parent, or its first child with words. */
export function textTarget(start: Element): Element | null {
  let node: Element | null = start;
  for (let i = 0; node && i < 4; i++, node = node.parentElement) {
    if (NOT_WORDS.has(node.tagName.toUpperCase())) continue;
    if (hasOwnText(node)) return node;
  }
  const walker = start.ownerDocument.createTreeWalker(start, 1);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (isElement(n) && !NOT_WORDS.has(n.tagName.toUpperCase()) && hasOwnText(n)) return n;
  }
  return null;
}

function textNodes(el: Element): Text[] {
  const out: Text[] = [];
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

const ORIGINAL = new WeakMap<Text, string>();

/** Show `text` in `el` by changing only text node data (React keeps every node it made). */
export function previewText(el: Element, text: string): boolean {
  const nodes = textNodes(el);
  if (!nodes.length) return false;
  nodes.forEach((n, i) => {
    if (!ORIGINAL.has(n)) ORIGINAL.set(n, n.data);
    n.data = i === 0 ? text : "";
  });
  return true;
}

/** Undo `previewText`. */
export function restoreText(el: Element): void {
  for (const n of textNodes(el)) {
    const was = ORIGINAL.get(n);
    if (was !== undefined) n.data = was;
  }
}

/** Snapshot an element's children, so typing in it can be undone node for node. */
export function snapshotChildren(el: Element): () => void {
  const kids = Array.from(el.childNodes);
  const data = kids.map((k) => (k.nodeType === 3 ? (k as Text).data : null));
  const deep = textNodes(el).map((t) => [t, t.data] as const);
  return () => {
    el.replaceChildren(...kids);
    kids.forEach((k, i) => {
      if (data[i] !== null) (k as Text).data = data[i]!;
    });
    for (const [t, d] of deep) t.data = d;
  };
}

/** Find a saved element again; null when the page no longer has it. */
export function findElement(doc: Document, selector: string): Element | null {
  if (!selector) return null;
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}
