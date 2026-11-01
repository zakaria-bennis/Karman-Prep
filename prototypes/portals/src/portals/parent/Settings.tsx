import { useState, type ReactNode } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Sheet } from "@/design-system/components/Sheet";
import { useToast } from "@/design-system/components/Toast";
import { useTheme } from "@/design-system/theme";
import { usePlan } from "@/plans/PlanProvider";
import { PLANS } from "@/plans/plans";
import { THEMES, LIGHT_FALLBACK, DARK_FALLBACK } from "@/design-system/themes";
import { cn } from "@/design-system/cn";
import { Shell, useDesktop } from "./Shell";
import { ParentProvider, useParent } from "./view";
import { LockedPanel } from "./LockedPanel";
import { Recipients, type Recipient } from "./Recipients";

/*
 * Settings: "Who gets the update?" One view, each section a row: the label
 * and a line of help beside its panel (the app rules' settings layout),
 * stacked on a phone. Light or dark follows the device unless the parent
 * picks one, and the pick is remembered (rule 33); the 12 account themes sit
 * under it. Every control saves itself. Destructive things come last.
 */
const mask = (name: string) => `${name.slice(0, 1).toLowerCase()}•••@gmail.com`;

export default function Settings() {
  return (
    <ParentProvider lock="parent">
      <SettingsScreen />
    </ParentProvider>
  );
}

function Section({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  const desktop = useDesktop();
  return (
    <section
      className={cn(
        "grid gap-3 border-t border-line py-6 first:border-t-0 first:pt-0",
        desktop && "grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8"
      )}
    >
      <div>
        <h2 className="text-section">{title}</h2>
        <p className="mt-1 text-dense text-muted">{help}</p>
      </div>
      <Panel className="px-4 py-3">{children}</Panel>
    </section>
  );
}

function SettingsScreen() {
  const v = useParent();
  const { has, upgradeFor } = usePlan();
  const theme = useTheme();
  const toast = useToast();
  const desktop = useDesktop();
  const [sheet, setSheet] = useState(false);
  const gate = upgradeFor("parent");
  const [email, setEmail] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>(() => {
    const you = { id: v.parent.id, name: v.parent.name, you: true, on: true };
    return v.parent.id === "dana"
      ? [
          you,
          v.firstDay
            ? { id: "sam", name: "Sam", state: "Invited today, not accepted yet", on: true }
            : { id: "sam", name: "Sam", on: true },
        ]
      : [you];
  });
  const mode = theme.theme === null ? "device" : theme.dark ? "dark" : "light";
  const finding = `Every Sunday, ${recipients.filter((r) => r.on).length === 1 ? "you get" : `${recipients.filter((r) => r.on).length} people get`} ${v.student.name}’s update by email.`;
  const invite = () => {
    const name = email.split("@")[0] || "them";
    setRecipients((r) => [
      ...r,
      { id: `r${r.length}`, name, state: "Invited just now, not accepted yet", on: true },
    ]);
    setEmail("");
    setSheet(false);
    toast.push({ title: `Invitation sent to ${email || "them"}`, kind: "success" });
  };
  return (
    <Shell
      screen="settings"
      title="Settings"
      finding={finding}
      primary={
        has("parent")
          ? { label: "Add a recipient", onClick: () => setSheet(true) }
          : gate
            ? { label: `See ${PLANS[gate].name}`, onClick: () => v.go("plan") }
            : null
      }
    >
      <div className="grid">
        <LockedPanel bundle="parent" onUpgrade={() => v.go("plan")}>
          <Section
            title="Weekly update"
            help="Who gets it by email every Sunday. Each person can turn theirs off."
          >
            <Recipients
              items={recipients}
              onToggle={(id, on) =>
                setRecipients((r) => r.map((x) => (x.id === id ? { ...x, on } : x)))
              }
            />
          </Section>
        </LockedPanel>
        <Section
          title="Appearance"
          help="Light or dark follows your device. Pick one to keep it, on every device you sign in on."
        >
          <GlassSegmented
            fill
            label="Light or dark"
            value={mode}
            onChange={(val) =>
              theme.set(
                {
                  theme: val === "device" ? null : val === "light" ? LIGHT_FALLBACK : DARK_FALLBACK,
                },
                true
              )
            }
            options={[
              { value: "device", label: "Device" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <p className="mt-4 text-dense text-muted">Theme: {theme.resolved.name}</p>
          <div role="radiogroup" aria-label="Theme" className="mt-2 flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={theme.resolved.id === t.id}
                aria-label={`${t.name}, ${t.accentName}`}
                onClick={() => theme.set({ theme: t.id }, true)}
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  theme.resolved.id === t.id ? "border-text" : "border-border/60"
                )}
                style={{ background: t.canvas }}
              >
                <span
                  aria-hidden="true"
                  className="block h-4 w-4 rounded-full"
                  style={{ background: t.accent }}
                />
              </button>
            ))}
          </div>
        </Section>
        <Section title="Account" help={`Signed in as ${v.parent.name}.`}>
          <dl className="divide-y divide-line text-body">
            <div className="flex min-h-11 items-center justify-between gap-3 py-2">
              <dt className="text-muted">Name</dt>
              <dd>{v.parent.name}</dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 py-2">
              <dt className="text-muted">Email</dt>
              <dd className="truncate">{mask(v.parent.name)}</dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 py-2">
              <dt className="text-muted">Students</dt>
              <dd>{v.students.map((s) => s.name).join(", ")}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => toast.push({ title: "Signed out", detail: "See you Sunday." })}
            className="mt-1 min-h-tap text-dense font-semibold text-accent hover:underline"
          >
            Sign out
          </button>
        </Section>
        <Section title="Help" help="A person answers within a day.">
          <ul className="divide-y divide-line text-body">
            <li className="py-2">
              <a
                href="mailto:support@karmanprep.com"
                className="inline-flex min-h-tap items-center font-semibold text-accent hover:underline"
              >
                support@karmanprep.com
              </a>
            </li>
            <li className="flex flex-wrap gap-x-6 py-2">
              <a
                href="https://karmanprep.com/terms"
                className="inline-flex min-h-tap items-center text-muted hover:underline"
              >
                Terms
              </a>
              <a
                href="https://karmanprep.com/privacy"
                className="inline-flex min-h-tap items-center text-muted hover:underline"
              >
                Privacy
              </a>
            </li>
          </ul>
        </Section>
      </div>
      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Add a recipient"
        side={desktop ? "right" : "bottom"}
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            invite();
          }}
        >
          <label className="grid gap-2 text-dense font-medium">
            Email
            <input
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-tap rounded-control border border-border/70 bg-raised px-3 text-body font-normal text-text placeholder:text-muted"
            />
          </label>
          <p className="text-dense text-muted">
            They get {v.student.name}’s update every Sunday, and nothing else.
          </p>
          <GlassButton variant="primary" type="submit" onClick={() => undefined}>
            Send the invitation
          </GlassButton>
        </form>
      </Sheet>
    </Shell>
  );
}
