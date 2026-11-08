import { useState, type ReactNode } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassSegmented } from "@/design-system/glass/GlassSegmented";
import { GlassToggle } from "@/design-system/glass/GlassToggle";
import { Row, List } from "@/design-system/components/Row";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useToast } from "@/design-system/components/Toast";
import { useTheme, type Mode } from "@/design-system/theme";
import { Icon } from "@/design-system/icons";
import { PARENTS, tutorById } from "@/mock";
import { PLANS } from "@/plans/plans";
import { StudentShell, TextLink, withStudent } from "./Shell";
import { PlanLocked, usePlanSheet } from "./PlanSheet";
import { ThemePicker } from "./ThemePicker";
import { WhatWeSave } from "./WhatWeSave";
import { readPref, writePref } from "./nav";
import { useStudentView } from "./view";

/*
 * Settings: the theme picker for the 12 themes, the mode, sound, the timer,
 * the account and plan, and the "what we save" panel. Each switch row pairs a
 * title and the control, split by hairlines: the shape of Notification
 * Settings Field (21st.dev 26523, shadcnspace) with its description line left
 * out (rule 51: the toggle carries the state), and the design system's glass
 * toggle in place of its Radix switch. Every control saves itself; nothing
 * has a Save button.
 */
function SwitchRow({ title, control }: { title: string; control: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <p className="min-w-0 text-body font-medium">{title}</p>
      {control}
    </div>
  );
}

function Settings() {
  const v = useStudentView();
  const theme = useTheme();
  const toast = useToast();
  const { open } = usePlanSheet();
  const [sound, setSound] = useState(() => readPref("karman-sound", ["on", "off"], "off") === "on");
  const [timer, setTimer] = useState(
    () => readPref("karman-timer", ["shown", "hidden"], "shown") === "shown"
  );
  const parent = PARENTS.find((p) => p.students.includes(v.student.id));
  const tutor = tutorById(v.student.tutor);
  const plan = PLANS[v.plan];

  return (
    <StudentShell screen="settings" title="Settings">
      {v.loading ? (
        <Panel className="grid gap-4 p-4">
          <Skeleton.Block height={44} />
          <Skeleton.Row sub />
          <Skeleton.Row sub />
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="grid gap-5">
            <Panel as="section" aria-label="Appearance" className="grid gap-5 p-4 sm:p-5">
              <ThemePicker />
              <div className="grid gap-2">
                <p className="text-dense text-muted">Mode</p>
                <GlassSegmented
                  label="Mode"
                  value={theme.theme ? (theme.dark ? "dark" : "light") : theme.mode}
                  onChange={(m) => theme.set({ mode: m as Mode, theme: null }, true)}
                  options={[
                    { value: "device", label: "Device" },
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />
                <p className="text-dense text-muted">
                  Device follows your phone or computer; dark when it has no preference.
                </p>
              </div>
            </Panel>
            <Panel as="section" aria-label="Practice" className="divide-y divide-line px-4 sm:px-5">
              <SwitchRow
                title="Sounds"
                control={
                  <GlassToggle
                    checked={sound}
                    label="Sounds"
                    onChange={(on) => {
                      setSound(on);
                      writePref("karman-sound", on ? "on" : "off");
                    }}
                    icons={{
                      off: <Icon name="pause" size={20} />,
                      on: <Icon name="play" size={20} />,
                    }}
                  />
                }
              />
              <SwitchRow
                title="Timer shown"
                control={
                  <GlassToggle
                    checked={timer}
                    label="Timer shown"
                    onChange={(on) => {
                      setTimer(on);
                      writePref("karman-timer", on ? "shown" : "hidden");
                    }}
                    icons={{
                      off: <Icon name="eyeOff" size={20} />,
                      on: <Icon name="eye" size={20} />,
                    }}
                  />
                }
              />
            </Panel>
            <Panel as="section" aria-label="Account" className="px-4 py-2 sm:px-5">
              <List>
                <Row title={v.student.name} leading={<Icon name="students" size={20} />} />
                <Row
                  title={plan.name}
                  sub={{ kind: "state", text: plan.priceLabel || "Free" }}
                  leading={<Icon name="upgrade" size={20} />}
                  onPress={() => open(v.plan)}
                />
                {tutor ? (
                  <Row
                    title={`${tutor.name}, your tutor`}
                    leading={<Icon name="tutor" size={20} />}
                  />
                ) : null}
              </List>
              <PlanLocked bundle="parent" className="my-2">
                <List>
                  <Row
                    title={parent ? `${parent.name}, parent account` : "Parent account"}
                    sub={{ kind: "state", text: "Weekly update on" }}
                    leading={<Icon name="parent" size={20} />}
                  />
                </List>
              </PlanLocked>
              <div className="py-2">
                <TextLink
                  className="text-dense"
                  onClick={() =>
                    toast.push({
                      title: "Signed out",
                      detail: "In the app this returns to the sign-in page.",
                      kind: "status",
                    })
                  }
                >
                  Sign out
                </TextLink>
              </div>
            </Panel>
          </div>
          <WhatWeSave />
        </div>
      )}
    </StudentShell>
  );
}

export default withStudent(Settings);
