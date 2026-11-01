import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Tabs } from "@/design-system/components/Tabs";
import { Empty } from "@/design-system/components/Empty";
import { useToast } from "@/design-system/components/Toast";
import { fmtDate } from "@/mock";
import { SchoolShell, useLayout } from "../shell";
import { useSchoolData } from "../data";
import { KeyList, ShareStrip } from "../components/KeyList";
import { KeySheet } from "../components/Sheets";
import { revokeKey } from "../store";
import { Block, Lapsed } from "./common";

/**
 * Seat keys. The question: which keys are out, and how many seats are left
 * on each? One row per key with its code, class, date and uses; Copy on
 * every live key; Revoke that asks once. A key just issued sits at the top
 * ready to share (Peak-End: issuing ends with the code in hand).
 */
export default function Keys() {
  const d = useSchoolData();
  const toast = useToast();
  const [tab, setTab] = useState("live");
  const [open, setOpen] = useState(false);
  const [justIssued, setJustIssued] = useState<string | null>(null);
  const live = d.keys.filter((k) => !k.revoked);
  const revoked = d.keys.filter((k) => k.revoked);
  const used = live.reduce((a, k) => a + d.usedOf(k.id), 0);
  const any = live.find((k) => k.classId === null);
  const shown = tab === "live" ? live : revoked;
  const fresh = justIssued ? d.keys.find((k) => k.id === justIssued) : null;
  const className = (id: string | null) =>
    id ? (d.classById(id)?.name ?? "A class") : "Any class";
  const finding = !d.keys.length
    ? "No keys yet. A key for a class lets each student in that class take a seat; a key for one student works once."
    : d.setup
      ? `${live.length} ${live.length === 1 ? "key" : "keys"} issued ${fmtDate(live[0].issued)}, none used yet. Share each class's code with its students; they enter it on their first sign-in.`
      : d.ended
        ? `${live.length} ${live.length === 1 ? "key" : "keys"} paused with the licence on ${fmtDate(d.licence.ends)}. They work again the day the renewal is paid.`
        : `${live.length} ${live.length === 1 ? "key" : "keys"} in use, ${used} of ${d.seats} seats taken.${any ? ` The ${any.label} key has ${any.uses - d.usedOf(any.id)} of ${any.uses} uses left.` : ""}`;

  return (
    <SchoolShell
      screen="keys"
      title="Seat keys"
      finding={finding}
      primary={
        d.ended ? null : (
          <GlassButton variant="primary" onClick={() => setOpen(true)}>
            Issue a key
          </GlassButton>
        )
      }
    >
      <Body
        d={d}
        shown={shown}
        tab={tab}
        setTab={setTab}
        live={live}
        revoked={revoked}
        fresh={fresh}
        onDismiss={() => setJustIssued(null)}
        className={className}
        onRevoke={(k) => {
          revokeKey(k.id, d.today);
          toast.push({
            title: `${k.code} revoked`,
            detail: `${k.label}. Students who already used it keep their seats.`,
            kind: "status",
          });
        }}
        onIssue={() => setOpen(true)}
      />
      <KeySheet
        open={open}
        onClose={() => setOpen(false)}
        classes={d.classes}
        me={d.me}
        today={d.today}
        onIssued={(id) => {
          setJustIssued(id);
          setTab("live");
        }}
      />
    </SchoolShell>
  );
}

function Body({
  d,
  shown,
  tab,
  setTab,
  live,
  revoked,
  fresh,
  onDismiss,
  className,
  onRevoke,
  onIssue,
}: {
  d: ReturnType<typeof useSchoolData>;
  shown: typeof d.keys;
  tab: string;
  setTab(id: string): void;
  live: typeof d.keys;
  revoked: typeof d.keys;
  fresh: (typeof d.keys)[number] | null | undefined;
  onDismiss(): void;
  className(id: string | null): string;
  onRevoke(k: (typeof d.keys)[number]): void;
  onIssue(): void;
}) {
  const { phone } = useLayout();
  if (!d.keys.length)
    return (
      <Empty
        title="No keys yet"
        detail="Issue one key per class and share its code; or one key per student, which works once. Revoking a key stops new sign-ins and keeps the seats already taken."
        action={
          d.classes.length ? <GlassButton onClick={onIssue}>Issue a key</GlassButton> : undefined
        }
      />
    );
  return (
    <Lapsed ended={d.ended} seats={d.seats} what="every key">
      {fresh ? (
        <div className="mb-4">
          <ShareStrip k={fresh} classNameOf={className} onClose={onDismiss} />
        </div>
      ) : null}
      <Tabs
        label="Keys"
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "live", label: d.ended ? "Paused" : "In use", count: live.length },
          { id: "revoked", label: "Revoked", count: revoked.length },
        ]}
      />
      <Block
        title={tab === "live" ? "Keys" : "Revoked keys"}
        loading={d.loading}
        error={d.error}
        what="the keys"
        padded={false}
        aside={`${shown.length}`}
      >
        <div className="px-4 pb-2">
          {shown.length ? (
            <KeyList
              keys={shown}
              usedOf={d.usedOf}
              classNameOf={className}
              onRevoke={onRevoke}
              paused={d.ended}
              phone={phone}
            />
          ) : (
            <p className="py-3 text-dense text-muted">No key has been revoked.</p>
          )}
        </div>
      </Block>
    </Lapsed>
  );
}
