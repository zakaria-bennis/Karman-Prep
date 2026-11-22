"use client";

// Settings: Plan and billing. A signed-in student's plan is their own, and their card and receipts
// are managed on the billing page (Stripe's own); the design page shows made-up ones.
import { useRouter } from "next/navigation";
import { PLANS } from "./plans";
import { usePortalData } from "./portalData";
import { hours, hoursText } from "./scheduleData";
import { Row } from "./settingsControls";
import { Group, type PaneProps } from "./SettingsPanes";
import styles from "./settings.module.css";

export function PlanPane({ plan, onGo }: PaneProps) {
  const real = usePortalData();
  const router = useRouter();
  // a real student's plan, card and receipts are managed on the billing page (Stripe's own)
  if (real) {
    const h = real.schedule ? hours(real.schedule.account).left : null;
    const billing = () => router.push("/billing");
    return (
      <>
        <Group title="Plan">
          <Row name={PLANS[plan].name}>
            {plan !== "private" && (
              <button type="button" className={styles.go} onClick={billing}>
                Upgrade
              </button>
            )}
          </Row>
          {h !== null && (
            <Row name={`${hoursText(h)} hours left`}>
              <button type="button" className={styles.go} onClick={() => onGo("schedule")}>
                Add hours
              </button>
            </Row>
          )}
        </Group>
        <Group title="Payment method">
          <Row name="Card and billing">
            <button type="button" className={styles.soft} onClick={billing}>
              Change
            </button>
          </Row>
        </Group>
        <Group title="Receipts">
          <Row name="Every receipt">
            <button type="button" className={styles.soft} onClick={billing}>
              View
            </button>
          </Row>
        </Group>
      </>
    );
  }
  return (
    <>
      <Group title="Plan">
        <Row name={PLANS[plan].name} note={plan === "private" ? "20 hours" : undefined}>
          {plan !== "private" && (
            <button type="button" className={styles.go}>
              Upgrade
            </button>
          )}
        </Row>
        {plan === "private" && (
          <Row name="12 hours left">
            <button type="button" className={styles.go} onClick={() => onGo("schedule")}>
              Add hours
            </button>
          </Row>
        )}
      </Group>
      <Group title="Payment method">
        <Row name="Visa ending 4242">
          <button type="button" className={styles.soft}>
            Change
          </button>
        </Row>
      </Group>
      <Group title="Receipts">
        {["November 3, 2026", "October 3, 2026"].map((day) => (
          <Row key={day} name={day}>
            <button type="button" className={styles.soft}>
              View
            </button>
          </Row>
        ))}
      </Group>
    </>
  );
}
