"use client";

// ============================================================
// TextbookEditor — markdown editor + live KaTeX preview.
// ============================================================

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Save, Eye, Edit3, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import TextbookContent from "@/components/learn/TextbookContent";
import { actionSaveTextbook } from "@/app/admin/actions";

interface Props {
  nodeId: string;
  initial: string;
}

export default function TextbookEditor({ nodeId, initial }: Props) {
  const [markdown, setMarkdown] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [pending, startTransition] = useTransition();
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [pasteUploading, setPasteUploading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pastedThisSession, setPastedThisSession] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(v: string) {
    setMarkdown(v);
    setSaved(false);
  }

  /** Insert text at the textarea's current selection, replacing any
   *  selected range. Restores focus + caret to the position right
   *  after the inserted text. */
  function insertAtCursor(insert: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setMarkdown((prev) => prev + insert);
      setSaved(false);
      return;
    }
    const start = ta.selectionStart ?? markdown.length;
    const end = ta.selectionEnd ?? markdown.length;
    const next = markdown.slice(0, start) + insert + markdown.slice(end);
    setMarkdown(next);
    setSaved(false);
    // Restore caret on next tick.
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + insert.length;
      ta.setSelectionRange(caret, caret);
    });
  }

  /** When the user pastes one or more clipboard images (Cmd+V from a
   *  screenshot, Snipping Tool, etc.), upload each to R2, inject markdown
   *  at cursor, and append to the session thumbnail strip. Falls through
   *  to default paste behavior for plain-text pastes. */
  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItems = items.filter((it) => it.type.startsWith("image/"));
    if (imageItems.length === 0) return; // not an image — let default paste happen

    e.preventDefault();
    setPasteError(null);
    setPasteUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const fd = new FormData();
        fd.append("nodeId", nodeId);
        fd.append("image", file, file.name || `pasted-${Date.now()}.png`);
        const res = await fetch("/api/admin/upload-textbook-image", {
          method: "POST",
          body: fd,
        });
        const json = (await res.json().catch(() => ({}))) as {
          publicUrl?: string;
          error?: string;
        };
        if (!res.ok || !json.publicUrl) {
          throw new Error(json.error ?? `Upload failed (${res.status})`);
        }
        uploadedUrls.push(json.publicUrl);
      }
      if (uploadedUrls.length === 0) return;
      // Drop the markdown image(s) at cursor in one go. Surrounding
      // newlines so each sits on its own paragraph.
      const md = uploadedUrls.map((u) => `\n\n![Pasted image](${u})\n\n`).join("");
      insertAtCursor(md);
      setPastedThisSession((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[textbook] paste-image upload failed:", msg);
      setPasteError(msg);
    } finally {
      setPasteUploading(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await actionSaveTextbook(nodeId, markdown);
        setSaved(true);
      } catch (err) {
        console.error(err);
        alert("Save failed — check console.");
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Textbook page</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Markdown + KaTeX. Use{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">$…$</code> for inline
            math and <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">$$…$$</code>{" "}
            for block math.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile view toggle */}
          <div className="flex overflow-hidden rounded-lg border border-slate-800 bg-slate-900 text-xs md:hidden">
            <button
              onClick={() => setMobileView("edit")}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 font-semibold",
                mobileView === "edit" ? "bg-slate-800 text-white" : "text-slate-400"
              )}
            >
              <Edit3 className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={() => setMobileView("preview")}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 font-semibold",
                mobileView === "preview" ? "bg-slate-800 text-white" : "text-slate-400"
              )}
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saved || pending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold",
              saved
                ? "cursor-default bg-emerald-500/20 text-emerald-300"
                : "bg-indigo-500 text-white hover:bg-indigo-400",
              pending && "cursor-wait opacity-60"
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Editor pane */}
        <div className={cn("md:block", mobileView === "edit" ? "block" : "hidden")}>
          <Header icon={Edit3} label="Markdown" />
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => handleChange(e.target.value)}
            onPaste={handlePaste}
            rows={30}
            className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-100 focus:border-indigo-500 focus:outline-none"
            style={{ minHeight: "32rem" }}
            placeholder="# Section heading

Plain paragraph text. **Bold**, *italic*, `code`.

- bullet
- bullet

1. numbered
2. numbered

Inline math: $x^2 + 3x = 10$

Block math:
$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Paste a screenshot anywhere in this editor — it auto-uploads
and drops a markdown image at your cursor."
          />
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <Info className="h-3 w-3 shrink-0" />
            <span>
              KaTeX backslashes need to be escaped once: write{" "}
              <code className="mx-1 rounded bg-slate-800 px-1 text-slate-400">\\frac</code> not{" "}
              <code className="mx-1 rounded bg-slate-800 px-1 text-slate-400">\frac</code>. Paste an
              image (Cmd+V) to upload it inline.
            </span>
          </div>
          {pasteUploading && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-indigo-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading pasted image…
            </div>
          )}
          {pasteError && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-300">
              <Info className="h-3 w-3 shrink-0" />
              Paste-upload failed: {pasteError}
            </div>
          )}
          {pastedThisSession.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pasted this session ({pastedThisSession.length}) — click to re-insert at cursor
              </div>
              <div className="flex flex-wrap gap-2">
                {pastedThisSession.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => insertAtCursor(`\n\n![Pasted image](${url})\n\n`)}
                    title="Click to re-insert markdown reference at cursor"
                    className="overflow-hidden rounded border border-slate-800 bg-slate-900 transition-colors hover:border-indigo-500"
                  >
                    <Image
                      src={url}
                      alt={`Pasted image ${i + 1}`}
                      width={128}
                      height={64}
                      className="block h-16 w-auto"
                      style={{ height: 64, width: "auto" }}
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live preview pane */}
        <div className={cn("md:block", mobileView === "preview" ? "block" : "hidden")}>
          <Header icon={Eye} label="Live preview" />
          <div
            className="overflow-y-auto rounded-lg border border-slate-800 bg-white px-6 py-6 text-slate-900"
            style={{ minHeight: "32rem", maxHeight: "60rem" }}
          >
            {markdown.trim().length === 0 ? (
              <p className="text-sm italic text-slate-400">Preview appears here as you type.</p>
            ) : (
              <TextbookContent markdown={markdown} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}
