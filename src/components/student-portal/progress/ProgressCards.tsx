/*
 * The cards of the student's Progress tab (founder, 2026-11-07, prototype
 * prototypes/today-directions/screens.js). Server-safe: the page hands in plain numbers.
 * One predicted score (never a range, never a goal), skills by level in a ring, what moved,
 * time and effort as one bar per day, personal bests, and streak and rewards at the bottom. Tokens
 * appear here and on Rewards only.
 */
import {
  Card,
  Cta,
  Fox,
  LevelRing,
  MoreLink,
  Num,
  Ring,
  Row,
  SectionHeader,
  SKILL_LEVELS,
  SkillSquares,
  levelName,
} from "@/components/portal";
import type { CSSProperties } from "react";
import { practiceHref } from "@/lib/student/course";
import { levelCounts, strongCount, type SkillLevel } from "@/lib/student/levels";
import {
  MYSTERY_BOX_TOKENS,
  formatEffort,
  mysteryBox,
  scoreChange,
  trendGeometry,
  type PersonalBest,
  type ScorePoint,
  type SkillMove,
  type DayEffort,
} from "@/lib/student/progress";
import styles from "./progress.module.css";

/** The history line: the last six scores, numbers in Hanken Grotesk. */
function ScoreTrend({ history }: { history: ScorePoint[] }) {
  const g = trendGeometry(history.slice(-6));
  const first = g.points[0];
  const last = g.points[g.points.length - 1];
  const spoken =
    g.points.length > 1
      ? `Predicted score from ${first.score} on ${first.label} to ${last.score} on ${last.label}`
      : `Predicted score ${last.score} on ${last.label}`;
  return (
    <svg
      className={styles.trend}
      viewBox={`0 0 ${g.width} ${g.height + 20}`}
      role="img"
      aria-label={spoken}
    >
      {g.points.length > 1 && (
        <polyline
          className={styles.line}
          pathLength={1}
          points={g.path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {g.points.map((p, i) => (
        // The line draws left to right; each score lands as the line reaches it.
        <g
          key={i}
          className={styles.point}
          style={{ "--at": g.points.length > 1 ? i / (g.points.length - 1) : 0 } as CSSProperties}
        >
          <circle
            className={styles.dot}
            cx={p.x}
            cy={p.y}
            r={4.5}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          />
          <text className={styles.value} x={p.x} y={p.y - 10} textAnchor="middle">
            {p.score}
          </text>
          <text x={p.x} y={g.height + 16} textAnchor="middle">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ScoreCard({ history, testHref }: { history: ScorePoint[]; testHref: string }) {
  if (history.length === 0) {
    return (
      <Card>
        <SectionHeader title="Karman predicted score" />
        <p className="kp-meta">
          Your predicted score appears after your first diagnostic. It shows where you stand today,
          as one number.
        </p>
        <Cta href={testHref}>Take the diagnostic</Cta>
      </Card>
    );
  }
  const latest = history[history.length - 1];
  const change = scoreChange(history);
  return (
    <Card>
      <SectionHeader title="Karman predicted score" />
      <div className={styles.scoreRow}>
        <Num big>{latest.score}</Num>
        {change && <p className="kp-meta">{change}</p>}
      </div>
      <ScoreTrend history={history} />
    </Card>
  );
}

const LEGEND_ORDER: SkillLevel[] = [4, 3, 2, 1, 0];

export function SkillsCard({ levels, href }: { levels: SkillLevel[]; href: string }) {
  const counts = levelCounts(levels);
  return (
    <Card>
      <SectionHeader
        title="Skills"
        note={
          <>
            <Num count>{strongCount(levels)}</Num> of <Num>{levels.length}</Num> at Understanding or
            above
          </>
        }
      />
      <div className="kp-ring-row">
        <LevelRing counts={counts}>
          <Num>{levels.length}</Num>
          <small>skills</small>
        </LevelRing>
        <ul className={`kp-legend ${styles.legendColumn}`}>
          {LEGEND_ORDER.map((l) => (
            <li key={l}>
              <i className="kp-sq" data-level={l} aria-hidden="true" />
              {SKILL_LEVELS[l].name}
              <b>
                <Num>{counts[l]}</Num>
              </b>
            </li>
          ))}
        </ul>
      </div>
      <MoreLink href={href}>See every skill</MoreLink>
    </Card>
  );
}

const MOVES_SHOWN = 8;

/** Each moved skill opens its practice set. */
export function MovedCard({ moves }: { moves: SkillMove[] }) {
  return (
    <Card>
      <SectionHeader title="What moved this week" />
      {moves.length === 0 ? (
        <p className="kp-meta">No skill changed level this week.</p>
      ) : (
        moves.slice(0, MOVES_SHOWN).map((m) => (
          <Row
            key={m.skillId}
            href={practiceHref(m.skillId)}
            title={m.label}
            sub={`${levelName(m.from)} to ${levelName(m.to)}`}
            right={m.to > m.from ? "Up" : "Down"}
            leading={
              <span className={styles.moveSquare}>
                <SkillSquares
                  skills={[{ level: m.to, name: m.label }]}
                  label={`${m.label}: ${levelName(m.to)}`}
                />
              </span>
            }
          />
        ))
      )}
      {moves.length > MOVES_SHOWN && (
        <p className="kp-meta">
          And <Num>{moves.length - MOVES_SHOWN}</Num> more.
        </p>
      )}
    </Card>
  );
}

export function TimeCard({
  days,
  questions,
  paceSeconds,
}: {
  days: DayEffort[];
  questions: number;
  paceSeconds: number | null;
}) {
  return (
    <Card>
      <SectionHeader title="Time and effort" note="Last 7 days" />
      <ul className={styles.days}>
        {days.map((d, i) => (
          <li
            key={d.day}
            style={{ "--i": i } as CSSProperties}
            aria-label={`${d.label}: ${formatEffort(d.seconds)} of active time`}
          >
            <span className={styles.amount}>
              <Num>{d.seconds > 0 ? formatEffort(d.seconds) : "–"}</Num>
            </span>
            <span className={styles.track}>
              <span
                className={styles.bar}
                data-today={d.label === "Today" ? "" : undefined}
                style={{ height: `${d.seconds > 0 ? Math.max(4, Math.round(d.share * 100)) : 0}%` }}
              />
            </span>
            <small>{d.label}</small>
          </li>
        ))}
      </ul>
      <div className={styles.stats}>
        <div>
          <b>
            <Num count>{questions}</Num>
          </b>
          <span>{questions === 1 ? "question" : "questions"} this month</span>
        </div>
        {paceSeconds !== null && (
          <div>
            <b>
              <Num>{paceSeconds} s</Num>
            </b>
            <span>average pace</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function BestsCard({ bests }: { bests: PersonalBest[] }) {
  return (
    <Card>
      <SectionHeader title="Personal bests" />
      <div className={styles.bests}>
        {bests.map((b) => (
          <div key={b.key}>
            <b>
              <Num count>{b.value}</Num>
            </b>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** The streak's flame: it catches as the count lands, flickers a moment, then burns still. */
function Flame() {
  return (
    <svg className={styles.flame} viewBox="0 0 24 30" aria-hidden="true">
      <path
        className={styles.flameOuter}
        d="M12 1.5c1.2 4.6 6.8 8 8.6 13.4 2 6-1.9 13.6-8.6 13.6S1.4 21.6 3.6 15.4c1.1-3.1 3.5-4.6 4.2-7.7.9 2 1.2 3.6 2.7 4.8C11.8 9.6 11 5.4 12 1.5Z"
      />
      <path
        className={styles.flameInner}
        d="M12 13.2c.6 2.6 4.4 4.6 4.4 8.6 0 3-2 5-4.4 5s-4.4-2-4.4-5c0-2.3 1.4-3.3 2-5 .6 1 .9 1.9 1.7 2.4.4-2 .2-4 .7-6Z"
      />
    </svg>
  );
}

function foxLine(days: number): string {
  if (days === 0) return "Your fox is ready when you are.";
  if (days < 3) return "Your fox noticed. Come back tomorrow to keep it going.";
  return `Day ${days}. Your fox is impressed.`;
}

export function RewardsCard({
  current,
  longest,
  tokens,
}: {
  current: number;
  longest: number;
  tokens: number;
}) {
  const box = mysteryBox(tokens);
  const into = MYSTERY_BOX_TOKENS - box.toGo;
  return (
    <div id="streak" className={styles.anchor}>
      <Card>
        <SectionHeader title="Streak and rewards" />
        <div className={styles.streaks}>
          <div>
            <b className={styles.streakNow}>
              <Num count>{current}</Num>
              {current > 0 && <Flame />}
            </b>
            <span>{current === 1 ? "day" : "days"} in a row</span>
          </div>
          <div>
            <b>
              <Num count>{longest}</Num>
            </b>
            <span>longest streak</span>
          </div>
        </div>
        <p className="kp-meta">One rest day a week keeps it going.</p>
        <div className={styles.reward}>
          <Ring
            value={box.share}
            size={48}
            width={5}
            label={`Mystery box: ${into} of ${MYSTERY_BOX_TOKENS} tokens`}
          >
            <Num>{Math.round(box.share * 100)}%</Num>
          </Ring>
          <span>
            <b>Next mystery box</b>
            <small>
              <Num>{box.toGo}</Num> tokens to go. You have <Num>{tokens}</Num>.
            </small>
          </span>
        </div>
        <div className={styles.reward}>
          <Fox size={48} />
          <span>
            <b>Your fox</b>
            <small>{foxLine(current)}</small>
          </span>
        </div>
      </Card>
    </div>
  );
}
