import { useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { GlassToggle } from "@/design-system/glass/GlassToggle";
import { Sheet } from "@/design-system/components/Sheet";
import { useToast } from "@/design-system/components/Toast";
import { Icon } from "@/design-system/icons";
import type { SchoolClass, Staff } from "../mock";
import { addClass, issueKey, makeCode } from "../store";
import { field } from "../screens/common";

/**
 * The admin's and the teacher's forms, each a sheet asking three or four
 * things with sensible defaults (Tesler: the system fills what it can). A
 * class gets its seat key with it; a key defaults to the class's size plus
 * two; practice defaults to ten questions due in a week.
 */
export function ClassSheet({
  open,
  onClose,
  teachers,
  me,
  today,
  onCreated,
}: {
  open: boolean;
  onClose(): void;
  teachers: Staff[];
  me: Staff;
  today: string;
  onCreated?(c: SchoolClass): void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState(teachers[0]?.id ?? me.id);
  const [withKey, setWithKey] = useState(true);
  const create = () => {
    const n = name.trim();
    if (!n) {
      toast.push({
        title: "Give the class a name",
        detail: "Period 4, or AP Lang, or Ms. Rivera's SAT prep.",
        kind: "error",
      });
      return;
    }
    const id = `c${Date.now()}`;
    const c = { id, name: n, teacher, created: today };
    addClass(c);
    if (withKey)
      issueKey({
        id: `k${Date.now()}`,
        code: makeCode(
          n
            .replace(/[^A-Za-z0-9]/g, "")
            .slice(0, 3)
            .toUpperCase() || "CLS",
          Date.now() % 100000
        ),
        label: n,
        classId: id,
        uses: 32,
        issued: today,
        issuedBy: me.id,
        revoked: null,
      });
    toast.push({
      title: `${n} added`,
      detail: withKey ? "Its seat key is on the Seat keys screen, ready to share." : undefined,
      kind: "success",
    });
    setName("");
    onClose();
    onCreated?.(c);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add a class">
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-dense font-medium">
          Class name
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Period 4"
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1.5 text-dense font-medium">
          Teacher
          <select className={field} value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.signedIn ? "" : " (invited)"}
              </option>
            ))}
            {teachers.some((t) => t.id === me.id) ? null : (
              <option value={me.id}>{me.name} (me)</option>
            )}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body font-medium">Issue its seat key now</p>
            <p className="text-dense text-muted">One code for the whole class, 32 uses.</p>
          </div>
          <GlassToggle
            checked={withKey}
            onChange={setWithKey}
            label="Issue a seat key with the class"
          />
        </div>
        <GlassButton variant="primary" onClick={create} className="w-full">
          Add the class
        </GlassButton>
      </div>
    </Sheet>
  );
}

export function KeySheet({
  open,
  onClose,
  classes,
  me,
  today,
  preset,
  onIssued,
}: {
  open: boolean;
  onClose(): void;
  classes: SchoolClass[];
  me: Staff;
  today: string;
  preset?: string;
  onIssued(id: string): void;
}) {
  const toast = useToast();
  const [scope, setScope] = useState<"class" | "student" | "any">("class");
  const [classId, setClassId] = useState(preset ?? classes[0]?.id ?? "");
  const [student, setStudent] = useState("");
  const [uses, setUses] = useState("32");
  const issue = () => {
    const cls = classes.find((c) => c.id === classId) ?? null;
    if (scope === "student" && !student.trim()) {
      toast.push({ title: "Name the student the key is for", kind: "error" });
      return;
    }
    const id = `k${Date.now()}`;
    const label =
      scope === "student"
        ? `${student.trim()}${cls ? `, ${cls.name}` : ""}`
        : scope === "any"
          ? "Any class"
          : (cls?.name ?? "Class");
    const short =
      scope === "student"
        ? "ST"
        : scope === "any"
          ? "ALL"
          : (cls?.name ?? "CLS")
              .replace(/[^A-Za-z0-9]/g, "")
              .slice(0, 3)
              .toUpperCase();
    issueKey({
      id,
      code: makeCode(short, Date.now() % 100000),
      label,
      classId: scope === "any" ? null : (cls?.id ?? null),
      uses: scope === "student" ? 1 : Number(uses),
      issued: today,
      issuedBy: me.id,
      revoked: null,
    });
    onIssued(id);
    onClose();
    setStudent("");
  };
  return (
    <Sheet open={open} onClose={onClose} title="Issue a seat key">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <p className="text-dense font-medium">Who it is for</p>
          <GlassSegmented
            label="Who the key is for"
            fill
            value={scope}
            onChange={(v) => setScope(v as "class" | "student" | "any")}
            options={[
              { value: "class", label: "A class" },
              { value: "student", label: "One student" },
              { value: "any", label: "Any class" },
            ]}
          />
        </div>
        {scope === "student" ? (
          <label className="grid gap-1.5 text-dense font-medium">
            Student
            <input
              className={field}
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              placeholder="First name"
              autoComplete="off"
            />
          </label>
        ) : null}
        {scope !== "any" ? (
          <label className="grid gap-1.5 text-dense font-medium">
            Class
            <select className={field} value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {scope === "student" ? (
          <p className="text-dense text-muted">
            A student key works once and puts them straight in the class.
          </p>
        ) : (
          <div className="grid gap-1.5">
            <p className="text-dense font-medium">Uses</p>
            <GlassSegmented
              label="How many students can use it"
              fill
              value={uses}
              onChange={setUses}
              options={[
                { value: "10", label: "10" },
                { value: "32", label: "32" },
                { value: "40", label: "40" },
              ]}
            />
          </div>
        )}
        <GlassButton
          variant="primary"
          onClick={issue}
          className="w-full"
          icon={<Icon name="keys" size={20} />}
        >
          Issue the key
        </GlassButton>
      </div>
    </Sheet>
  );
}
