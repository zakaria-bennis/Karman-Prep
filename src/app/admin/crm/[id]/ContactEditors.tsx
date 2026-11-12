"use client";

// ============================================================
// The contact page's editors: stage (a springy switch), owner,
// tags, notes and follow-ups. Each one saves through a CRM server
// action, which refreshes the page, so what shows is what the
// database holds. Errors are said where they happened.
// ============================================================

import { motion, MotionConfig } from "framer-motion";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Cta } from "@/components/portal";
import { prefersStill } from "@/lib/painting/motion";
import { dayLabel } from "@/lib/admin/crm/format";
import { STAGES, STAGE_HINT, STAGE_LABEL, type Stage } from "@/lib/admin/crm/types";
import {
  crmAddNote,
  crmAddTag,
  crmAddTask,
  crmDeleteNote,
  crmRemoveTag,
  crmSetOwner,
  crmSetStage,
  crmSetTaskDone,
  type CrmResult,
} from "../actions";

function useSave() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (work: () => Promise<CrmResult>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await work();
      if (res.ok) after?.();
      else setError(res.error);
    });
  return { pending, error, save };
}

function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => setStill(prefersStill()), []);
  return still;
}

function Problem({ error }: { error: string | null }) {
  return error ? (
    <p className="crm-error" role="alert">
      {error}
    </p>
  ) : null;
}

export function StagePicker({
  contactKey,
  stage,
  derived,
}: {
  contactKey: string;
  stage: Stage;
  derived: Stage;
}) {
  const [current, setCurrent] = useState(stage);
  const { pending, error, save } = useSave();
  const still = useStill();
  useEffect(() => setCurrent(stage), [stage]);

  const pick = (s: Stage) => {
    if (s === current) return;
    const before = current;
    setCurrent(s);
    save(async () => {
      const res = await crmSetStage({ key: contactKey, stage: s === derived ? null : s });
      if (!res.ok) setCurrent(before);
      return res;
    });
  };

  return (
    <MotionConfig reducedMotion={still ? "always" : "user"}>
      <div className="crm-switch" role="radiogroup" aria-label="Stage" aria-busy={pending}>
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={current === s}
            data-stage={s}
            title={STAGE_HINT[s]}
            onClick={() => pick(s)}
            onKeyDown={(e) => {
              const i = STAGES.indexOf(current);
              const step =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;
              if (!step) return;
              e.preventDefault();
              const next = STAGES[(i + step + STAGES.length) % STAGES.length];
              pick(next);
              (
                e.currentTarget.parentElement?.querySelector(
                  `[data-stage="${next}"]`
                ) as HTMLElement | null
              )?.focus();
            }}
            tabIndex={current === s ? 0 : -1}
          >
            {current === s && (
              <motion.span
                layoutId="crm-stage-pill"
                className="crm-switch-pill"
                data-stage={s}
                transition={{ type: "spring", stiffness: 560, damping: 34 }}
              />
            )}
            <span className="crm-switch-label">{STAGE_LABEL[s]}</span>
          </button>
        ))}
      </div>
      <p className="crm-hint">
        {current === derived ? (
          <>Worked out from purchases and subscriptions.</>
        ) : (
          <>
            Set by hand. From purchases it would be {STAGE_LABEL[derived]}.{" "}
            <button type="button" className="kp-link" onClick={() => pick(derived)}>
              Go back to automatic
            </button>
          </>
        )}
      </p>
      <Problem error={error} />
    </MotionConfig>
  );
}

export function OwnerPicker({
  contactKey,
  owner,
  owners,
}: {
  contactKey: string;
  owner: string | null;
  owners: Array<{ id: string; name: string }>;
}) {
  const { pending, error, save } = useSave();
  return (
    <>
      <label className="crm-field">
        <span>Owner</span>
        <select
          defaultValue={owner ?? ""}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value || null;
            save(() => crmSetOwner({ key: contactKey, ownerUserId: v }));
          }}
        >
          <option value="">No one yet</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <Problem error={error} />
    </>
  );
}

export function TagEditor({ contactKey, tags }: { contactKey: string; tags: string[] }) {
  const [draft, setDraft] = useState("");
  const { pending, error, save } = useSave();
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    save(
      () => crmAddTag({ key: contactKey, tag: draft }),
      () => setDraft("")
    );
  };
  return (
    <div className="crm-tags">
      <ul className="crm-chips" aria-label="Tags">
        {tags.map((t) => (
          <li key={t} className="crm-chip crm-chip-x">
            {t}
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              disabled={pending}
              onClick={() => save(() => crmRemoveTag({ key: contactKey, tag: t }))}
            >
              ×
            </button>
          </li>
        ))}
        {tags.length === 0 && <li className="crm-hint">No tags yet.</li>}
      </ul>
      <form onSubmit={add} className="crm-inline">
        <label className="crm-sr" htmlFor="crm-tag">
          New tag
        </label>
        <input
          id="crm-tag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a tag, e.g. hot or fall-1200"
          maxLength={30}
        />
        <button type="submit" className="kp-link" disabled={pending}>
          Add
        </button>
      </form>
      <Problem error={error} />
    </div>
  );
}

export function NoteComposer({ contactKey }: { contactKey: string }) {
  const [body, setBody] = useState("");
  const { pending, error, save } = useSave();
  return (
    <form
      className="crm-compose"
      onSubmit={(e) => {
        e.preventDefault();
        save(
          () => crmAddNote({ key: contactKey, body }),
          () => setBody("")
        );
      }}
    >
      <label className="crm-sr" htmlFor="crm-note">
        New note
      </label>
      <textarea
        id="crm-note"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="What did you talk about? What do they want?"
      />
      <div className="crm-compose-row">
        <small className="crm-hint">
          Only admins see notes. Keep them to what you need to follow up.
        </small>
        <Cta type="submit" disabled={pending || !body.trim()}>
          {pending ? "Saving" : "Save note"}
        </Cta>
      </div>
      <Problem error={error} />
    </form>
  );
}

export function NoteDelete({ contactKey, id }: { contactKey: string; id: string }) {
  const { pending, error, save } = useSave();
  return (
    <>
      <button
        type="button"
        className="kp-link crm-quiet"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Delete this note?"))
            save(() => crmDeleteNote({ key: contactKey, id }));
        }}
      >
        Delete
      </button>
      <Problem error={error} />
    </>
  );
}

export function TaskList({
  contactKey,
  tasks,
  today,
}: {
  contactKey: string;
  tasks: Array<{ id: string; title: string; dueOn: string; doneAt: string | null }>;
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(today);
  const { pending, error, save } = useSave();
  return (
    <div className="crm-tasks">
      <ul>
        {tasks.map((t) => {
          const late = !t.doneAt && t.dueOn < today;
          return (
            <li key={t.id} data-done={t.doneAt ? "" : undefined} data-late={late ? "" : undefined}>
              <label>
                <input
                  type="checkbox"
                  checked={!!t.doneAt}
                  disabled={pending}
                  onChange={(e) =>
                    save(() =>
                      crmSetTaskDone({ key: contactKey, id: t.id, done: e.target.checked })
                    )
                  }
                />
                <span className="crm-task-title">{t.title}</span>
              </label>
              <small>
                {late
                  ? `Overdue, due ${dayLabel(t.dueOn)}`
                  : t.doneAt
                    ? "Done"
                    : `Due ${dayLabel(t.dueOn)}`}
              </small>
            </li>
          );
        })}
        {tasks.length === 0 && <li className="crm-hint">No follow-ups yet.</li>}
      </ul>
      <form
        className="crm-inline"
        onSubmit={(e) => {
          e.preventDefault();
          save(
            () => crmAddTask({ key: contactKey, title, dueOn: due }),
            () => setTitle("")
          );
        }}
      >
        <label className="crm-sr" htmlFor="crm-task">
          Follow-up
        </label>
        <input
          id="crm-task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Call back about the March cohort"
          maxLength={200}
        />
        <label className="crm-sr" htmlFor="crm-due">
          Due on
        </label>
        <input
          id="crm-due"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          required
        />
        <button type="submit" className="kp-link" disabled={pending || !title.trim()}>
          Add
        </button>
      </form>
      <Problem error={error} />
    </div>
  );
}
