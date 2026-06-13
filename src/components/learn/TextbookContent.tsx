"use client";

// ============================================================
// TextbookContent — renders Markdown + KaTeX for lesson notes.
// Uses `katex` directly (no react-katex dependency) to keep bundle
// small and work cleanly with React 19.
// Supports:
//   • **bold**, *italic*, `code`
//   • - / 1. lists
//   • paragraphs (blank-line separated)
//   • $inline$ and $$block$$ KaTeX formulas
//   • bare fractions like "1/2" auto-rendered as KaTeX (no $...$
//     wrapping required) — see renderInline for guards.
// ============================================================

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  markdown: string;
  className?: string;
}

type Token =
  | { type: "para"; html: string }
  | { type: "bullet"; items: string[] }
  | { type: "number"; items: string[] }
  | { type: "block-math"; latex: string }
  | { type: "heading"; level: 2 | 3; text: string };

/** Render a LaTeX string with KaTeX. Returns the rendered HTML, or
 *  the raw input untouched if KaTeX can't parse it. */
function renderToKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      output: "htmlAndMathml",
    });
  } catch {
    return latex;
  }
}

function renderInline(text: string): string {
  // ── 1. Pull out inline code first ────────────────────────
  // Code stays literal — bare fractions or backslash sequences
  // inside backticks must not be touched. Re-inserted with a
  // safe HTML escape at the end.
  const codePlaceholders: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_m, code) => {
    codePlaceholders.push(code);
    return `CODE${codePlaceholders.length - 1}`;
  });

  // ── 1.5. Pull out image markdown ![alt](url) ─────────────
  // Done BEFORE math + bare-fraction passes so URLs containing
  // "/" or "$" (signed-URL params) survive intact. Pre-build
  // the <img> tag with HTML-escaped alt + URL so it drops back
  // in safely at the end.
  const imagePlaceholders: string[] = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => {
    const safeAlt = String(alt)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const safeUrl = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    imagePlaceholders.push(
      `<img src="${safeUrl}" alt="${safeAlt}" class="my-4 max-w-full h-auto rounded-lg block" />`
    );
    return `IMG${imagePlaceholders.length - 1}`;
  });

  // ── 2. Pull out existing $...$ math ──────────────────────
  // Anything between user-supplied dollars they meant as math.
  // Done BEFORE the bare-fraction pass so a user-written "$5/9$"
  // stays as their intended inline math and isn't promoted to a
  // stacked fraction.
  const mathPlaceholders: string[] = [];
  text = text.replace(/\$([^$\n]+)\$/g, (_m, expr) => {
    mathPlaceholders.push(renderToKatex(expr, false));
    return `MATH${mathPlaceholders.length - 1}`;
  });

  // ── 3. Auto-convert bare fractions like "1/2", "5/9", "11/6"
  //       into rendered KaTeX fractions WITHOUT requiring $...$.
  //   · `(?<![\/\\\d.])` so we don't restart a match mid-number
  //     (e.g. "12/25" matches as 12/25, not 2/25) and decimals
  //     like "1.5/2.5" don't fragment into "5/2".
  //   · 1-4 digits per side keeps phone numbers etc. out.
  //   · `(?![\d.])` so the ratio isn't followed by "." or another
  //     digit — protects "1/2.5" and "1/22000" patterns.
  text = text.replace(/(?<![\/\\\d.])\b(\d{1,4})\/(\d{1,4})\b(?![\d.])/g, (m, num, den) => {
    const html = renderToKatex(`\\frac{${num}}{${den}}`, false);
    // Bail if KaTeX couldn't render — leave the original "1/2".
    if (html === `\\frac{${num}}{${den}}`) return m;
    mathPlaceholders.push(html);
    return `MATH${mathPlaceholders.length - 1}`;
  });

  // ── 4. HTML-escape the remaining prose ───────────────────
  text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // ── 5. Inline formatting — ORDER MATTERS: bold before italic
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // ── 6. Put code back, with its own HTML escape ───────────
  text = text.replace(/CODE(\d+)/g, (_m, i) => {
    const c = codePlaceholders[Number(i)] ?? "";
    const safe = c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<code class="px-1 py-0.5 rounded bg-surface dark:bg-surface-raised text-xs font-mono">${safe}</code>`;
  });

  // ── 7. Put math back ─────────────────────────────────────
  text = text.replace(/MATH(\d+)/g, (_m, i) => mathPlaceholders[Number(i)] ?? "");

  // ── 8. Put images back (already HTML-safe) ─────────────
  text = text.replace(/IMG(\d+)/g, (_m, i) => imagePlaceholders[Number(i)] ?? "");

  return text;
}

function tokenize(markdown: string): Token[] {
  const tokens: Token[] = [];
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Block math: $$...$$
    if (line.trim().startsWith("$$")) {
      const rest = line.trim().slice(2);
      let latex = "";
      if (rest.endsWith("$$") && rest.length > 2) {
        latex = rest.slice(0, -2);
        tokens.push({ type: "block-math", latex });
        i++;
        continue;
      }
      if (rest) latex = rest;
      i++;
      while (i < lines.length && !lines[i].trim().endsWith("$$")) {
        latex += "\n" + lines[i];
        i++;
      }
      if (i < lines.length) {
        latex += "\n" + lines[i].trim().replace(/\$\$$/, "");
        i++;
      }
      tokens.push({ type: "block-math", latex: latex.trim() });
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      tokens.push({ type: "heading", level: 3, text: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      tokens.push({ type: "heading", level: 2, text: line.slice(3) });
      i++;
      continue;
    }

    // Bulleted list
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, ""));
        i++;
      }
      tokens.push({ type: "bullet", items });
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      tokens.push({ type: "number", items });
      continue;
    }

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — gather until blank line
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") &&
      !lines[i].trim().startsWith("$$")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    tokens.push({ type: "para", html: renderInline(paraLines.join(" ")) });
  }

  return tokens;
}

function renderBlockMath(latex: string): string {
  return renderToKatex(latex, true);
}

export default function TextbookContent({ markdown, className = "" }: Props) {
  const tokens = useMemo(() => tokenize(markdown), [markdown]);

  return (
    <div
      className={`prose prose-slate dark:prose-invert max-w-none leading-[1.75] ${className}`}
      style={{ fontSize: "0.95rem" }}
    >
      {tokens.map((t, idx) => {
        if (t.type === "para") {
          return <p key={idx} className="mb-4" dangerouslySetInnerHTML={{ __html: t.html }} />;
        }
        if (t.type === "heading" && t.level === 2) {
          return (
            <h2
              key={idx}
              className="mb-3 mt-8 text-xl font-bold text-night dark:text-ivory"
              dangerouslySetInnerHTML={{ __html: renderInline(t.text) }}
            />
          );
        }
        if (t.type === "heading" && t.level === 3) {
          return (
            <h3
              key={idx}
              className="mb-2 mt-6 text-base font-semibold text-night dark:text-ivory"
              dangerouslySetInnerHTML={{ __html: renderInline(t.text) }}
            />
          );
        }
        if (t.type === "bullet") {
          return (
            <ul key={idx} className="mb-4 list-disc space-y-1.5 pl-6">
              {t.items.map((it, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
              ))}
            </ul>
          );
        }
        if (t.type === "number") {
          return (
            <ol key={idx} className="mb-4 list-decimal space-y-1.5 pl-6">
              {t.items.map((it, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
              ))}
            </ol>
          );
        }
        if (t.type === "block-math") {
          return (
            <div
              key={idx}
              className="my-6 overflow-x-auto text-center"
              dangerouslySetInnerHTML={{ __html: renderBlockMath(t.latex) }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
