import { useId, useRef, useState } from "react";
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
import { FieldError, field, invalid } from "../screens/common";

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
  const [errs, setErrs] = useState<{ name?: string; email?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const nameErr = useId();
  const emailErr = useId();
  const close = () => {
    setErrs({});
    onClose();
  };
  const send = () => {
    const n = name.trim();
    const e = email.trim();
    const found = {
      name: n ? undefined : "Write the teacher's name.",
      email: !e
        ? "Add their school email; they sign in with it."
        : /^\S+@\S+\.\S+$/.test(e)
          ? undefined
          : "Write the whole email, like name@school.example.",
    };
    if (found.name || found.email) {
      setErrs(found);
      (found.name ? nameRef : emailRef).current?.focus();
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
    close();
  };
  return (
    <Sheet open={open} onClose={close} title="Add a teacher">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label className="grid gap-1.5 text-dense font-medium">
            Name
            <input
              ref={nameRef}
              className={field}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrs((x) => ({ ...x, name: undefined }));
              }}
              placeholder="Ms. Rivera"
              autoComplete="off"
              {...invalid(nameErr, errs.name)}
            />
          </label>
          <FieldError id={nameErr} message={errs.name} />
        </div>
        <div className="grid gap-1.5">
          <label className="grid gap-1.5 text-dense font-medium">
            School email
            <input
              ref={emailRef}
              className={field}
              type="email"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrs((x) => ({ ...x, email: undefined }));
              }}
              placeholder="name@school.example"
              autoComplete="off"
              {...invalid(emailErr, errs.email)}
            />
          </label>
          <FieldError id={emailErr} message={errs.email} />
        </div>
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
                      Invited {fmtDate(t.invited ?? today)}
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
