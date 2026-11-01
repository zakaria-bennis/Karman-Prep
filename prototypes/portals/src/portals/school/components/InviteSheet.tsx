import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { Sheet } from "@/design-system/components/Sheet";
import { Pill } from "@/design-system/components/Pill";
import { Icon } from "@/design-system/icons";
import { useToast } from "@/design-system/components/Toast";
import { SCHOOL, fmtDate } from "@/mock";
import { Initials } from "@/portals/tutor/shared";
import type { Staff } from "../mock";
import { inviteTeacher } from "../store";
import { field } from "../screens/common";

/*
 * InviteSheet: add a teacher or another admin. Ported from Team Invite Sheet
 * (21st.dev 26144, cnippet): the email field, the role as a row of choices,
 * one Send, and the pending list under it. Base UI, Radix and the three
 * role colours were left out; the role is the design system's segmented
 * control, the pending rows are initials and a neutral pill, and the
 * invitation's state is the row's second line (rule 51).
 */
export function InviteSheet({
  open,
  onClose,
  pending,
  today,
}: {
  open: boolean;
  onClose(): void;
  pending: Staff[];
  today: string;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const send = () => {
    const n = name.trim();
    const e = email.trim();
    if (!n || !e) {
      toast.push({ title: "A name and a school email are needed", kind: "error" });
      return;
    }
    const id = `t${Date.now()}`;
    inviteTeacher({
      id,
      name: n,
      initials: n.replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/, "")[0]?.toUpperCase() ?? "T",
      hue: (pending.length * 60 + 20) % 360,
      role,
      school: SCHOOL.id,
      classes: [],
      email: e,
      signedIn: false,
      invited: today,
    });
    toast.push({
      title: `Invitation sent to ${n}`,
      detail: `${e}. They sign in with their school email.`,
      kind: "success",
    });
    setName("");
    setEmail("");
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add a teacher">
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-dense font-medium">
          Name
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ms. Rivera"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1.5 text-dense font-medium">
          School email
          <input
            className={field}
            type="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@school.example"
            autoComplete="off"
          />
        </label>
        <div className="grid gap-1.5">
          <p className="text-dense font-medium">Role</p>
          <GlassSegmented
            label="Role"
            fill
            value={role}
            onChange={(v) => setRole(v as "teacher" | "admin")}
            options={[
              { value: "teacher", label: "Teacher" },
              { value: "admin", label: "School admin" },
            ]}
          />
          <p className="text-dense text-muted">
            {role === "teacher"
              ? "Sees their own classes and students."
              : "Sees everything, buys seats and issues keys."}
          </p>
        </div>
        <GlassButton variant="primary" onClick={send} className="w-full">
          Send the invitation
        </GlassButton>
        {pending.length ? (
          <div className="grid gap-2">
            <p className="text-dense text-muted">Waiting to sign in</p>
            <ul className="divide-y divide-line">
              {pending.map((t) => (
                <li key={t.id} className="flex min-h-12 items-center gap-3 py-2">
                  <Initials initial={t.initials} hue={t.hue} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-medium">{t.name}</span>
                    <span className="block truncate text-dense text-muted">
                      Invited {t.invited ? fmtDate(t.invited) : ""}, not signed in yet
                    </span>
                  </span>
                  <Pill>{t.role === "admin" ? "Admin" : "Teacher"}</Pill>
                  <button
                    type="button"
                    aria-label={`Resend the invitation to ${t.name}`}
                    onClick={() => toast.push({ title: `Invitation sent again to ${t.name}` })}
                    className="grid h-11 w-11 place-items-center rounded-card text-muted"
                  >
                    <Icon name="share" size={20} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
