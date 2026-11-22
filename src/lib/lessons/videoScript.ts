// A skill's video, made from its written lesson so the two always agree: the skill, the idea, the
// strategy, then three questions worked on the board (the lesson's two examples and its quick check).
// Each scene is one line of narration: the caption shows it as written, the narrator says it aloud
// (speech.ts). A video's file (videos/<id>.ts) holds only the narrator, the audio's address and how
// long each scene runs; the scenes themselves are built here.
import { speak } from "./speech";
import type { Lesson, LessonVideo, Rich, VideoScene } from "./types";

export type DraftScene = Omit<VideoScene, "start" | "end"> & { spoken: string };

/** What a video file holds: everything but the scenes. */
export interface VideoTiming {
  voice: LessonVideo["voice"];
  audio: string | null;
  /** Each scene's length in seconds, narration and the pause after it, in order. */
  durations: number[];
}

const ORDINAL = ["one", "two", "three"];

function scene(
  say: Rich,
  rest: Omit<DraftScene, "say" | "spoken"> = {},
  spoken?: string
): DraftScene {
  return { say, spoken: spoken ?? speak(say), ...rest };
}

/** The scenes, in order, with what the narrator says in each. */
export function draftScenes(lesson: Lesson, name: string): DraftScene[] {
  const out: DraftScene[] = [];
  const fig = lesson.figure;
  out.push(scene(`This is ${name}. ${lesson.tests}`, { title: name, figure: fig }));
  out.push(scene(`How to spot one: ${lesson.spot}`, { title: name, figure: fig }));

  lesson.idea.forEach((p, i) =>
    out.push(
      scene(p, {
        title: "The idea",
        figure: fig,
        board: i === lesson.idea.length - 1 && lesson.rules ? lesson.rules : undefined,
      })
    )
  );

  const steps: Rich[] = [];
  out.push(scene(`The strategy: ${lesson.strategy.name}.`, { title: "Strategy", board: [] }));
  lesson.strategy.steps.forEach((s, i) => {
    steps.push(`${i + 1}. ${s}`);
    out.push(scene(s, { title: "Strategy", board: [...steps] }));
  });

  lesson.examples.slice(0, 2).forEach((e, q) => {
    const problem = e.passage ? `${e.passage}\n\n${e.problem}` : e.problem;
    const base = { title: `Question ${q + 1}`, problem, choices: e.choices, figure: e.figure };
    const read = e.passage ? `${e.passage} ${e.problem}` : e.problem;
    out.push(scene(read, base, `Question ${ORDINAL[q]}. ${speak(read)}`));
    const board: Rich[] = [];
    for (const step of e.steps) {
      board.push(step.show ?? step.say);
      out.push(
        scene(step.show ? `${step.say} ${step.show}` : step.say, { ...base, board: [...board] })
      );
    }
    out.push(
      scene(
        `The answer: ${e.answer}`,
        { ...base, board: [...board], pick: e.right },
        `So the answer is ${speak(e.answer)}.`
      )
    );
  });

  const c = lesson.check;
  const problem = c.passage ? `${c.passage}\n\n${c.text}` : c.text;
  const base = { title: "Question 3", problem, choices: c.choices };
  const read = c.passage ? `${c.passage} ${c.text}` : c.text;
  out.push(
    scene(
      read,
      base,
      `Question three. Try this one yourself first. ${speak(read)} Pause the video if you want more time.`
    )
  );
  out.push(scene(c.why, { ...base, pick: c.right }));
  out.push(
    scene(
      `Now try the strategy quiz at the end of the written lesson: five questions on ${lesson.strategy.name.toLowerCase()}.`,
      { title: "Your turn" }
    )
  );
  return out;
}

/** The finished video: the scenes with their times. Null when the timings do not fit the scenes. */
export function videoOf(
  id: string,
  lesson: Lesson,
  name: string,
  timing: VideoTiming
): LessonVideo | null {
  const drafts = draftScenes(lesson, name);
  if (drafts.length !== timing.durations.length) return null;
  let t = 0;
  const scenes: VideoScene[] = drafts.map((d, i) => {
    const { spoken, ...shown } = d;
    void spoken;
    const start = t;
    t += timing.durations[i];
    return { ...shown, start, end: t };
  });
  return { id, voice: timing.voice, audio: timing.audio, duration: t, scenes };
}
