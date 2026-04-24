"use client";

// ============================================================
// TextbookEditor — markdown editor + live KaTeX preview.
// ============================================================

import { useState, useTransition } from "react";
import { Save, Eye, Edit3, Info } from "lucide-react";
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

  function handleChange(v: string) {
    setMarkdown(v);
    setSaved(false);
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Textbook page</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Markdown + KaTeX. Use <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">$…$</code> for inline math and <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">$$…$$</code> for block math.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile view toggle */}
          <div className="md:hidden flex rounded-lg border border-slate-800 bg-slate-900 text-xs overflow-hidden">
            <button
              onClick={() => setMobileView("edit")}
              className={cn("px-3 py-1.5 font-semibold flex items-center gap-1", mobileView === "edit" ? "bg-slate-800 text-white" : "text-slate-500")}
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => setMobileView("preview")}
              className={cn("px-3 py-1.5 font-semibold flex items-center gap-1", mobileView === "preview" ? "bg-slate-800 text-white" : "text-slate-500")}
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saved || pending}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold",
              saved
                ? "bg-emerald-500/20 text-emerald-300 cursor-default"
                : "bg-indigo-500 hover:bg-indigo-400 text-white",
              pending && "opacity-60 cursor-wait"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            {pending ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Editor pane */}
        <div className={cn("md:block", mobileView === "edit" ? "block" : "hidden")}>
          <Header icon={Edit3} label="Markdown" />
          <textarea
            value={markdown}
            onChange={(e) => handleChange(e.target.value)}
            rows={30}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 text-slate-100 font-mono text-[13px] px-4 py-3 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
            style={{ minHeight: "32rem" }}
            placeholder="# Section heading

Plain paragraph text. **Bold**, *italic*, `code`.

- bullet
- bullet

1. numbered
2. numbered

Inline math: $x^2 + 3x = 10$

Block math:
$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"
          />
          <p className="mt-2 text-[11px] text-slate-600 flex items-center gap-1">
            <Info className="w-3 h-3" />
            KaTeX backslashes need to be escaped once: write <code className="mx-1 text-slate-400 bg-slate-800 px-1 rounded">\\frac</code> not <code className="mx-1 text-slate-400 bg-slate-800 px-1 rounded">\frac</code>.
          </p>
        </div>

        {/* Live preview pane */}
        <div className={cn("md:block", mobileView === "preview" ? "block" : "hidden")}>
          <Header icon={Eye} label="Live preview" />
          <div className="rounded-lg border border-slate-800 bg-white text-slate-900 px-6 py-6 overflow-y-auto" style={{ minHeight: "32rem", maxHeight: "60rem" }}>
            {markdown.trim().length === 0 ? (
              <p className="text-slate-400 italic text-sm">Preview appears here as you type.</p>
            ) : (
              <TextbookContent markdown={markdown} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}
