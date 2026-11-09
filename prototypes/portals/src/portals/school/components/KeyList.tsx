import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/design-system/cn";
import { Icon } from "@/design-system/icons";
import { fmtDate } from "@/mock";
import { SIcon } from "../icons";
import type { SeatKey } from "../mock";

/*
 * KeyList and ShareStrip: the school's seat keys. Ported from API Key Manager
 * (21st.dev 27018, laziekiki): the row of name, code, dates and uses, the
 * Copy button whose icon turns into a check, the inline Revoke that asks
 * once (Cancel or Revoke) before it acts, and the strip for a key just
 * issued. The masking, the one-time secret reveal and the scopes were left
 * out: a seat key is shared with a class, not kept secret. Lucide icons
 * became the design system's and the school's own copy glyph; no shadows.
 */
export function CopyButton({
  value,
  onCopied,
  label = "Copy",
}: {
  value: string;
  onCopied?(): void;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      /* the prototype still shows the copied state */
    }
    setCopied(true);
    onCopied?.();
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label} ${value}`}
      className="inline-flex min-h-tap items-center gap-1.5 rounded-control px-2 text-dense font-semibold text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? "check" : "copy"}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.13 }}
          className="grid place-items-center"
        >
          {copied ? <Icon name="check" size={20} /> : <SIcon name="copy" size={20} />}
        </motion.span>
      </AnimatePresence>
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function Revoke({ onConfirm, disabled }: { onConfirm(): void; disabled?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (disabled) return null;
  return asking ? (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="min-h-tap rounded-control px-2 text-dense text-muted"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className="min-h-tap rounded-control px-2 text-dense font-semibold text-negative"
      >
        Revoke
      </button>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setAsking(true)}
      className="min-h-tap rounded-control px-2 text-dense text-muted hover:text-text"
    >
      Revoke
    </button>
  );
}

export const Code = ({ code, className }: { code: string; className?: string }) => (
  <span className={cn("tabular whitespace-nowrap text-body", className)}>{code}</span>
);

export function KeyList({
  keys,
  usedOf,
  classNameOf,
  onRevoke,
  paused,
  phone,
}: {
  keys: SeatKey[];
  usedOf(id: string): number;
  classNameOf(id: string | null): string;
  onRevoke(k: SeatKey): void;
  paused?: boolean;
  phone: boolean;
}) {
  if (!keys.length) return null;
  const state = (k: SeatKey) =>
    k.revoked
      ? `Revoked ${fmtDate(k.revoked)}`
      : paused
        ? "Paused"
        : `${usedOf(k.id)} of ${k.uses} used`;
  if (phone)
    return (
      <ul className="divide-y divide-line">
        {keys.map((k) => (
          <li key={k.id} className={cn("grid gap-1 py-3", k.revoked && "text-muted")}>
            <div className="flex items-center justify-between gap-3">
              <span className={cn("truncate text-body font-medium", k.revoked && "line-through")}>
                {k.label}
              </span>
              {k.revoked ? null : <CopyButton value={k.code} />}
            </div>
            <Code code={k.code} className="text-dense" />
            <div className="flex items-center justify-between gap-3 text-dense text-muted">
              <span className="tabular">
                {state(k)} · {classNameOf(k.classId)} · issued {fmtDate(k.issued)}
              </span>
              <Revoke onConfirm={() => onRevoke(k)} disabled={!!k.revoked || paused} />
            </div>
          </li>
        ))}
      </ul>
    );
  return (
    <table className="w-full border-collapse text-dense">
      <caption className="sr-only">Seat keys</caption>
      <thead>
        <tr className="text-left text-small font-normal text-muted">
          <th scope="col" className="h-9 pr-3 font-normal">
            Key
          </th>
          <th scope="col" className="h-9 pr-3 font-normal">
            Code
          </th>
          <th scope="col" className="h-9 pr-3 font-normal">
            Class
          </th>
          <th scope="col" className="h-9 pr-3 font-normal">
            Issued
          </th>
          <th scope="col" className="h-9 pr-3 text-right font-normal">
            Used
          </th>
          <th scope="col" className="h-9 text-right font-normal">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {keys.map((k) => (
          <tr key={k.id} className={cn(k.revoked && "text-muted")}>
            <td className={cn("h-12 pr-3 font-medium", k.revoked && "line-through")}>{k.label}</td>
            <td className="h-12 pr-3">
              <Code code={k.code} />
            </td>
            <td className="h-12 pr-3 text-muted">{classNameOf(k.classId)}</td>
            <td className="tabular h-12 pr-3 text-muted">{fmtDate(k.issued)}</td>
            <td className="tabular h-12 pr-3 text-right">
              {k.revoked ? (
                <span className="text-muted">{state(k)}</span>
              ) : paused ? (
                "Paused"
              ) : (
                <>
                  {usedOf(k.id)} <span className="text-muted">of {k.uses}</span>
                </>
              )}
            </td>
            <td className="h-12 text-right">
              <span className="inline-flex items-center justify-end gap-1">
                {k.revoked ? null : <CopyButton value={k.code} />}
                <Revoke onConfirm={() => onRevoke(k)} disabled={!!k.revoked || paused} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The key just issued, ready to share: the code large, one Copy, and where it goes. */
export function ShareStrip({
  k,
  classNameOf,
  onClose,
}: {
  k: SeatKey;
  classNameOf(id: string | null): string;
  onClose(): void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-raised px-4 py-3"
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="text-dense font-semibold">Share this key with {classNameOf(k.classId)}</p>
        <p className="text-dense text-muted">
          Students enter it on their first sign-in. It works{" "}
          {k.uses === 1 ? "once" : `${k.uses} times`}.
        </p>
      </div>
      <Code code={k.code} className="text-section" />
      <CopyButton value={k.code} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="grid h-11 w-11 place-items-center rounded-card text-muted"
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}
