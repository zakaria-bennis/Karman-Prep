import { StudentWelcome } from "./welcome";
import { Icon } from "@/design-system/icons";
import { StudentShell, withStudent } from "./Shell";
import { NextUp, RewardsStrip } from "./HomeNext";
import { TodaySetBlock, ScoreBlock, SkillsBlock, CohortBlock, BestsBlock } from "./HomeStats";
import { useStudentView } from "./view";
import { goTo } from "./nav";

/*
 * Home. The one question: what do I do next? The answer is the biggest block
 * and comes first (Hick: one step, then rows). Then the stats the end screen
 * leaves out, the predicted score with the trend, the skills, the cohort, the
 * bests and the rewards. Two columns from 768px (the iPad is 834); one below.
 */
function Home() {
  const v = useStudentView();
  const context = {
    hour: v.now.getHours(),
    weekday: v.now.getDay(),
    classDay: v.has("liveClasses") && [1, 3].includes(v.now.getDay()),
    testSeason: v.days <= 14,
    comingBack: v.empty,
    toughSet: Boolean(v.set && v.set.right < v.set.total / 2),
    seed: 3,
  };
  return (
    <StudentShell
      screen="home"
      title="Home"
      action={
        <button
          type="button"
          aria-label="Settings"
          onClick={() => goTo("settings")}
          className="grid h-11 w-11 place-items-center rounded-card text-text md:hidden"
        >
          <Icon name="settings" size={24} />
        </button>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_340px] md:items-start lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-5">
          <StudentWelcome name={v.student.name} context={context} />
          <NextUp v={v} />
          <TodaySetBlock v={v} />
          <ScoreBlock v={v} />
        </div>
        <div className="grid gap-5 md:pt-7">
          <RewardsStrip v={v} />
          <SkillsBlock v={v} />
          <CohortBlock v={v} />
          <BestsBlock v={v} />
        </div>
      </div>
    </StudentShell>
  );
}

export default withStudent(Home);
