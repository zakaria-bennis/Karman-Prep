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

function renderInline(text: string): string {
  // Extract inline math first so markdown/HTML escaping doesn't mangle it
  const mathPlaceholders: string[] = [];
  text = text.replace(/\$([^$\n]+)\$/g, (_m, expr) => {
    try {
      const html = katex.renderToString(expr, {
        throwOnError: false,
        displayMode: false,
        output: "htmlAndMathml",
      });
      mathPlaceholders.push(html);
      return `\u0001MATH${mathPlaceholders.length - 1}\u0001`;
    } catch {
      return expr;
    }
  });

  // Escape HTML
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Inline formatting — ORDER MATTERS: bold before italic
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono">$1</code>');

  // Put math back
  text = text.replace(/\u0001MATH(\d+)\u0001/g, (_m, i) => mathPlaceholders[Number(i)] ?? "");

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
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: "htmlAndMathml",
    });
  } catch {
    return `<pre>${latex}</pre>`;
  }
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
          return <h2 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3" dangerouslySetInnerHTML={{ __html: renderInline(t.text) }} />;
        }
        if (t.type === "heading" && t.level === 3) {
          return <h3 key={idx} className="text-base font-semibold text-slate-900 dark:text-white mt-6 mb-2" dangerouslySetInnerHTML={{ __html: renderInline(t.text) }} />;
        }
        if (t.type === "bullet") {
          return (
            <ul key={idx} className="mb-4 list-disc pl-6 space-y-1.5">
              {t.items.map((it, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
              ))}
            </ul>
          );
        }
        if (t.type === "number") {
          return (
            <ol key={idx} className="mb-4 list-decimal pl-6 space-y-1.5">
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
