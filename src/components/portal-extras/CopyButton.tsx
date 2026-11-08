"use client";
/* Copies a code or link and says so, for join codes and parent invite links. */
import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="kp-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
          window.prompt("Copy this:", text);
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
