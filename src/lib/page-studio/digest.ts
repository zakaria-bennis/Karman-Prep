// The founder's notes as one Markdown brief for Claude: what to change, where, and what was already
// said. Used by the "Copy for Claude" button and by `npm run studio -- list`.
import { pageById } from "./inventory";
import type { StudioNote } from "./types";

const KIND: Record<string, string> = {
  copy: "Copy edit",
  visual: "Visual",
  functional: "How it works",
  other: "Comment",
};

function quote(text: string | null): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t ? `"${t}"` : "(empty)";
}

function noteLines(n: StudioNote, i: number): string[] {
  const label = n.kind === "copy" ? KIND.copy : `${KIND[n.category] ?? KIND.other} comment`;
  const where = n.elementLabel || n.selector || "the whole page";
  const lines = [`${i + 1}. **${label}** on ${where} · note \`${n.id}\` · ${n.status}`];
  if (n.selector) lines.push(`   - Element: \`${n.selector}\``);
  if (n.kind === "copy") {
    lines.push(`   - Before: ${quote(n.oldText)}`, `   - After: ${quote(n.newText)}`);
  } else if (n.elementText) {
    lines.push(`   - Element text: ${quote(n.elementText.slice(0, 200))}`);
  }
  if (n.body.trim()) lines.push(`   - Founder: ${n.body.trim()}`);
  for (const m of n.messages) {
    lines.push(
      `   - ${m.author === "claude" ? "Claude asked" : "Founder answered"}: ${m.body.trim()}`
    );
  }
  return lines;
}

/** Group notes by page and write the brief. */
export function digest(notes: readonly StudioNote[]): string {
  if (!notes.length) return "No notes to send.";
  const byPage = new Map<string, StudioNote[]>();
  for (const n of notes) {
    const key = `${n.pageKey}|${n.pagePath}|${n.persona}|${n.viewport}`;
    byPage.set(key, [...(byPage.get(key) ?? []), n]);
  }
  const out = [
    `# Page Studio notes (${notes.length})`,
    "",
    "From the founder's review in /studio. Copy edits: change the words in the code (search for the",
    "Before text) and open one pull request for him to merge. A visual or how-it-works comment you",
    'can\'t act on without a choice: ask him first with `npm run studio -- ask <note id> "question"`.',
    "When a pull request is open: `npm run studio -- pr <url> <note ids…>`. Read docs/page-studio.md.",
  ];
  for (const group of byPage.values()) {
    const first = group[0];
    const page = pageById(first.pageKey);
    out.push(
      "",
      `## ${page?.title ?? first.pageKey}: \`${first.pagePath}\``,
      `File: \`${page?.file ?? "unknown"}\` · seen as ${first.persona} · ${first.viewport}`,
      ""
    );
    group.forEach((n, i) => out.push(...noteLines(n, i)));
  }
  return out.join("\n");
}
