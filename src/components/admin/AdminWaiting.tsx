import { WbMix } from "@/components/admin/workbench";

/**
 * The day's work at a glance: the three queues that wait on an admin (family messages, scholarship
 * claims, flagged imports) as one share bar, so the size of each pile reads at a glance. Built from the counts the
 * page already reads; a count that could not be read is left out and said so.
 */
export default function AdminWaiting({
  messages,
  claims,
  flags,
}: {
  messages: number | null;
  claims: number | null;
  flags: number | null;
}) {
  const parts = [
    { label: "Family messages", value: messages },
    { label: "Scholarship claims", value: claims },
    { label: "Flagged imports", value: flags },
  ];
  const known = parts.filter((p): p is { label: string; value: number } => p.value !== null);
  const total = known.reduce((n, p) => n + p.value, 0);
  const missing = parts.length - known.length;
  const note = missing
    ? `${missing} ${missing === 1 ? "count" : "counts"} could not be read`
    : `${total.toLocaleString("en-US")} in all`;
  if (total === 0)
    return <p className="wb-note">Nothing is waiting on you{missing ? ` (${note})` : ""}.</p>;
  return <WbMix title="What is waiting on you" note={note} parts={known} />;
}
