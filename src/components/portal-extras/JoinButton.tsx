"use client";
/*
 * "Join" for a session's Zoom meeting. It appears 10 minutes before the start and goes away at
 * the end, checking the clock every 20 seconds so nobody has to reload the page.
 */
import { useEffect, useState } from "react";
import { joinOpen } from "@/lib/parent/join-window";

export function JoinButton({
  joinUrl,
  startsAt,
  endsAt,
  label = "Join",
}: {
  joinUrl: string;
  startsAt: string;
  endsAt: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => setOpen(joinOpen(startsAt, endsAt));
    check();
    const timer = window.setInterval(check, 20_000);
    return () => window.clearInterval(timer);
  }, [startsAt, endsAt]);
  if (!open) return null;
  return (
    <a className="kp-link kp-join" href={joinUrl} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
