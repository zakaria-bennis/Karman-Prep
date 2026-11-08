import { useState } from "react";
import { Welcome } from "@/design-system/components/Welcome";
import { Stepper } from "@/design-system/components/Stepper";
import { Dropzone } from "@/design-system/components/Dropzone";
import { Panel } from "@/design-system/glass/Panel";
import { Section } from "./System";
import { Sub } from "./System";

/** The kitchen sink's welcome lines and the onboarding stepper with its photo upload. */
export function SystemForms() {
  const [step, setStep] = useState(0);
  return (
    <Section
      id="forms"
      title="Welcome and onboarding"
      intro="One welcome line above the student dashboard, chosen by the moment and never repeated twice in a row. Onboarding in steps: segments, not numbers; Back is a text link; Continue is the one highlighted action."
    >
      <div className="grid gap-10">
        <Sub title="Welcome">
          <Panel className="grid gap-2 p-4">
            <Welcome name="Maya" context={{ hour: 9, weekday: 6, seed: 3 }} />
            <Welcome name="Ava" context={{ hour: 18, weekday: 2, classDay: true, seed: 5 }} />
            <Welcome context={{ hour: 23, weekday: 3, seed: 8 }} />
            <Welcome name="Lin" context={{ hour: 8, weekday: 1, toughSet: true, seed: 2 }} />
          </Panel>
        </Sub>
        <Sub title="Stepper">
          <Panel className="p-4">
            <Stepper
              current={step}
              onChange={setStep}
              onFinish={() => setStep(0)}
              finishLabel="Start"
              steps={[
                {
                  id: "test",
                  title: "Which SAT are you aiming for?",
                  content: (
                    <p className="text-body text-muted">
                      March 6, May 1 or June 5, 2027. The plan counts back from it.
                    </p>
                  ),
                },
                { id: "score", title: "Add a score report", content: <Dropzone /> },
                {
                  id: "done",
                  title: "Your desk is ready",
                  content: (
                    <p className="text-body text-muted">
                      Your Daily 10 starts tomorrow at the level the report suggests.
                    </p>
                  ),
                },
              ]}
            />
          </Panel>
        </Sub>
      </div>
    </Section>
  );
}
