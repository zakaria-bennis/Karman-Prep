"use client";

/*
 * Sends the student their own link to a paid seat: the phone's share sheet where there is one, or
 * the link is copied. The same as the reservation's landing page. If neither works the link is
 * shown, to copy by hand. The words come from the page, so the copy file stays on the server.
 */
import { useState } from "react";
import { Cta } from "@/components/portal";

export function SendStudentLink({
  path,
  label,
  copiedLabel,
  shareText,
}: {
  path: string;
  label: string;
  copiedLabel: string;
  shareText: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const send = async () => {
    const url = new URL(path, window.location.origin).href;
    try {
      if (navigator.share) return await navigator.share({ text: `${shareText} ${url}` });
    } catch {
      // the share sheet was closed: fall through to copying
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setShown(url);
    }
  };
  return (
    <>
      <div>
        <Cta type="button" onClick={() => void send()}>
          <span aria-live="polite">{copied ? copiedLabel : label}</span>
        </Cta>
      </div>
      {shown && <p className="kp-linkbox">{shown}</p>}
    </>
  );
}
