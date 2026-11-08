import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { Sheet } from "@/design-system/components/Sheet";
import { WeekCalendar } from "@/design-system/components/Calendar";
import { Icon } from "@/design-system/icons";
import { WEEK_DATES, TODAY_INDEX, fmtDate } from "@/mock";
import { TextLink } from "./Shell";
import { GuaranteeBlock, TestsBlock } from "./ClassesParts";
import { HOMEWORK, CHAT, nextClassDate, CLASS_TIME } from "./mock-schedule";
import { goTo } from "./nav";
import { hoursOf } from "./mock";
import type { StudentView } from "./view";

/*
 * The cohort's screen: the next live class with David named, the homework
 * due before it as the one action, this week's calendar, the tests, the chat
 * and the guarantee status. The chat opens as a sheet with the last lines.
 */
export function Cohort({ v }: { v: StudentView }) {
  const [chat, setChat] = useState(false);
  const first = HOMEWORK[0];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="grid gap-5">
        <Panel as="section" aria-label="Next class" className="grid gap-3 p-4 sm:p-5">
          <p className="text-body font-semibold">
            Live class with David, {fmtDate(nextClassDate(), "long")}, {CLASS_TIME}. {first.title}{" "}
            is due before it.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <GlassButton
              variant="primary"
              className="k-sheen"
              onClick={() => goTo("practice", { skill: first.skill })}
            >
              Start {first.title.toLowerCase()}
            </GlassButton>
            <TextLink onClick={() => setChat(true)}>Cohort chat</TextLink>
          </div>
        </Panel>
        <Panel as="section" aria-label="This week" className="p-4">
          <h2 className="pb-3 text-section">This week</h2>
          <WeekCalendar
            events={v.events}
            dates={WEEK_DATES}
            today={TODAY_INDEX}
            {...hoursOf(v.events)}
          />
        </Panel>
      </div>
      <div className="grid gap-5">
        <Panel as="section" aria-label="Homework" className="px-4 py-2">
          <h2 className="pb-1 pt-2 text-section">Homework</h2>
          <List>
            {HOMEWORK.map((h) => (
              <Row
                key={h.id}
                title={h.title}
                sub={{ kind: "due", text: `Due ${fmtDate(h.due)}` }}
                leading={<Icon name="practice" size={20} />}
                onPress={() => goTo("practice", { skill: h.skill })}
              />
            ))}
          </List>
        </Panel>
        <TestsBlock v={v} />
        <GuaranteeBlock v={v} />
      </div>
      <Sheet open={chat} onClose={() => setChat(false)} title="March cohort chat">
        <ul className="grid gap-3">
          {CHAT.map((m) => (
            <li key={m.id} className="grid gap-0.5">
              <p className="text-dense text-muted">
                <span className="font-semibold text-text">{m.who}</span> {m.when}
              </p>
              <p className="text-body">{m.text}</p>
            </li>
          ))}
        </ul>
        <p className="pt-4 text-dense text-muted">
          Messages are written in the app. David reads every one.
        </p>
      </Sheet>
    </div>
  );
}
