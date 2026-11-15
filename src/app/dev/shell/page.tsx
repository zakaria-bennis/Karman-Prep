"use client";

// /dev/shell: step 2 of the portal rebuild, the menu, on the endless world (step 1, /dev/world).
// The sheet is left empty on purpose: each screen's layout is a later step.
// The menu follows the plan (prototypes/HANDOVER-portal-2026-11-14.md), five items at most.
//   ?plan=practice|cohort|private   whose menu to show
//   ?night=1                        dark mode
//   ?demo=0                         hide the demo switches (for pictures)
// Production builds return 404.
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import "@/components/portal/portal.css";
import "@/components/portal/portal-lit.css";
import PortalFlight from "@/components/portal/PortalFlight";
import { portalFontVars } from "@/components/portal/fonts";
import styles from "./shell.module.css";

type Item =
  | "homework"
  | "library"
  | "practice"
  | "class"
  | "schedule"
  | "progress"
  | "rewards"
  | "more";

const LABEL: Record<Item, string> = {
  homework: "Homework",
  library: "Library",
  practice: "Practice",
  class: "Class",
  schedule: "Schedule",
  progress: "Progress",
  rewards: "Rewards",
  more: "More",
};

/** The founder's menus, in his order. The first item is where that student lands. */
const PLANS = {
  practice: {
    label: "Free, Practice, Pro",
    items: ["library", "practice", "progress", "rewards", "more"],
  },
  cohort: { label: "Cohort", items: ["homework", "library", "class", "progress", "more"] },
  private: { label: "Private", items: ["homework", "library", "schedule", "progress", "more"] },
} as const satisfies Record<string, { label: string; items: readonly Item[] }>;
type Plan = keyof typeof PLANS;

/* One icon family: a 24 grid, 1.75 strokes, round ends. */
const ICON: Record<Item, ReactNode> = {
  homework: (
    <>
      <rect x="4.5" y="4" width="15" height="16.5" rx="3" />
      <path d="M9 3.5h6v2.5H9zM8.5 12.5l2.2 2.2 4.8-4.8" />
    </>
  ),
  library: (
    <path d="M12 6.5c-1.8-1.3-4.3-1.9-7.5-1.8v13c3.2-.1 5.7.5 7.5 1.8m0-13c1.8-1.3 4.3-1.9 7.5-1.8v13c-3.2-.1-5.7.5-7.5 1.8m0-13v13" />
  ),
  practice: (
    <>
      <path d="M5 19l.9-4.1L16.4 4.4a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L9.1 18.1z" />
      <path d="M14.5 6.3l3.2 3.2" />
    </>
  ),
  class: (
    <>
      <rect x="3.5" y="6.5" width="12" height="11" rx="3" />
      <path d="M15.5 10.5l5-2.7v8.4l-5-2.7" />
    </>
  ),
  schedule: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  progress: <path d="M4 19.5h16M6.5 15.5l4-4.5 3 2.5 5-6.5M14.5 7h4v4" />,
  rewards: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6l1.3 2.8 3 .4-2.2 2.1.6 3-2.7-1.5-2.7 1.5.6-3-2.2-2.1 3-.4z" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="18" cy="12" r="1.3" />
    </>
  ),
};

function Icon({ name }: { name: Item }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON[name]}
    </svg>
  );
}

function Shell() {
  const q = useSearchParams();
  const planQ = q.get("plan");
  const [plan, setPlan] = useState<Plan>(
    planQ !== null && planQ in PLANS ? (planQ as Plan) : "practice"
  );
  const [dark, setDark] = useState(q.get("night") === "1");
  const items: readonly Item[] = PLANS[plan].items;
  const [page, setPage] = useState<Item>(items[0]);
  const at = Math.max(0, items.indexOf(page));
  const [world] = useState(() => ({}));

  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [dark]);

  const choosePlan = (next: Plan) => {
    setPlan(next);
    setPage(PLANS[next].items[0]);
  };

  return (
    <div
      className={`kp-shell ${portalFontVars} ${styles.shell}`}
      data-mode={dark ? "dark" : "light"}
    >
      <PortalFlight world={world} />

      <nav className={styles.nav} aria-label="Portal">
        <span className={styles.brand}>Karman</span>
        <ul className={styles.items} style={{ "--at": at, "--n": items.length } as CSSProperties}>
          <li className={styles.here} aria-hidden="true" />
          {items.map((item) => (
            <li key={item}>
              <button
                type="button"
                className={styles.item}
                aria-current={item === page ? "page" : undefined}
                onClick={() => setPage(item)}
              >
                <Icon name={item} />
                <span>{LABEL[item]}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.who} onClick={() => setPage("more")}>
          <span className={styles.face} aria-hidden="true">
            M
          </span>
          <span className={styles.name}>
            Maya Okafor
            <small>{plan === "practice" ? "Practice" : PLANS[plan].label}</small>
          </span>
        </button>
      </nav>

      <main className={styles.main}>
        <h1 className={styles.title} key={page}>
          {LABEL[page]}
        </h1>
        <section className={styles.sheet} aria-label={LABEL[page]}>
          <p className={styles.note}>
            This sheet is empty on purpose. The {LABEL[page]} layout is the next step.
          </p>
        </section>
      </main>

      {q.get("demo") !== "0" && (
        <div className={styles.demo} role="group" aria-label="Demo switches">
          {(Object.keys(PLANS) as Plan[]).map((k) => (
            <button key={k} type="button" aria-pressed={plan === k} onClick={() => choosePlan(k)}>
              {PLANS[k].label}
            </button>
          ))}
          <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)}>
            Night
          </button>
        </div>
      )}
    </div>
  );
}

export default function ShellDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Shell />
    </Suspense>
  );
}
