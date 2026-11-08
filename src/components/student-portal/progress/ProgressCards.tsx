/*
 * The cards of the student's Progress tab (founder, 2026-11-07, prototype
 * prototypes/today-directions/screens.js). Server-safe: the page hands in plain numbers.
 * One predicted score (never a range, never a goal), skills by level in a ring, what moved,
 * time and effort as rings, personal bests, and streak and rewards at the bottom. Tokens
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
  type WeekEffort,
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
          points={g.path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {g.points.map((p, i) => (
        <g key={i}>
          <circle className={styles.dot} cx={p.x} cy={p.y} r={4.5} />
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
            <Num>{strongCount(levels)}</Num> of <Num>{levels.length}</Num> at Understanding or above
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
  weeks,
  questions,
  paceSeconds,
}: {
  weeks: WeekEffort[];
  questions: number;
  paceSeconds: number | null;
}) {
  return (
    <Card>
      <SectionHeader title="Time and effort" note="Active time per week" />
      <ul className={styles.weeks}>
        {weeks.map((w) => (
          <li key={w.start}>
            <Ring
              value={w.share}
              size={46}
              width={5}
              label={`${w.label}: ${formatEffort(w.seconds)} of active time`}
            />
            <small>{w.label}</small>
            <span className={styles.hours}>
              <Num>{formatEffort(w.seconds)}</Num>
            </span>
          </li>
        ))}
      </ul>
      <div className={styles.stats}>
        <div>
          <b>
            <Num>{questions}</Num>
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
              <Num>{b.value}</Num>
            </b>
            <span>{b.label}</span>
          </div>
        ))}
      </div>
    </Card>
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
            <b>
              <Num>{current}</Num>
            </b>
            <span>{current === 1 ? "day" : "days"} in a row</span>
          </div>
          <div>
            <b>
              <Num>{longest}</Num>
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
