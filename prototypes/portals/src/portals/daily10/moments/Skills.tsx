import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { Skeleton } from "@/design-system/components/Skeleton";
import { BANDS, LevelBar, LevelMark } from "@/design-system/marks";
import type { MockState } from "@/mock";
import { SkillBar, type SkillBarHandle } from "../pieces/SkillBar";
import { fadeIn, type Run } from "../run";
import type { Daily10Data } from "../mock";

/*
 * The skills that moved: the three biggest movers play one after another, then
 * "See all" opens the sheet (always there: the 39 skills are always worth a
 * look). Empty keeps the frame with one sentence; an error stays inside the
 * block; loading is the final layout with flat bars.
 */
export interface SkillsHandle {
  play(run: Run, onMood: (m: "o" | "k") => void): Promise<void>;
}

export const Skills = forwardRef<
  SkillsHandle,
  { data: Daily10Data; mode: MockState; still: boolean; onSeeAll(): void }
>(function Skills({ data, mode, still, onSeeAll }, ref) {
  const bars = useRef<(SkillBarHandle | null)[]>([]);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const more = useRef<HTMLButtonElement>(null);
  const mood = useRef<(m: "o" | "k") => void>(() => {});
  const hidden = still ? undefined : { opacity: 0 };
  const first = data.first;
  // a retry asks again and shows the skeleton while it waits; the gallery's state keeps the answer
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 900);
  };

  useImperativeHandle(ref, () => ({
    async play(run, onMood) {
      mood.current = onMood;
      for (let i = 0; i < data.top.length; i++) {
        fadeIn(run, rows.current[i]);
        await run.wait(150);
        await bars.current[i]?.play(run);
      }
      fadeIn(run, more.current);
      await run.wait(200);
    },
  }));

  let body: React.ReactNode;
  if (mode === "loading" || retrying)
    body = (
      <div className="grid gap-4" role="status" aria-busy="true" aria-label="Loading skills">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-2">
            <Skeleton.Block width="62%" height={14} />
            <Skeleton.Block height={6} />
          </div>
        ))}
      </div>
    );
  else if (mode === "error")
    body = <ErrorBlock what="today’s skills" lastGood="9:41" onRetry={retry} />;
  else if (!data.top.length)
    body = (
      <Empty
        title="Nothing moved today"
        detail="Every skill you practiced held its level. See all keeps the full list."
      />
    );
  else
    body = (
      <div className="grid gap-[14px]">
        {data.top.map((s, i) =>
          still ? (
            <div key={s.id} className="grid gap-[6px]">
              <div className="flex items-baseline gap-2 text-dense">
                <LevelMark
                  level={s.band}
                  size={20}
                  className="relative top-[3px] shrink-0 self-start"
                />
                <span className="min-w-0 flex-1 leading-[1.3]">{s.label}</span>
                <span className="shrink-0 text-[13px] text-muted">{BANDS[s.band]}</span>
              </div>
              <LevelBar value={s.now} was={s.was} size="sm" />
            </div>
          ) : (
            <div
              key={s.id}
              ref={(n) => {
                rows.current[i] = n;
              }}
              style={hidden}
            >
              <SkillBar
                ref={(h) => {
                  bars.current[i] = h;
                }}
                skill={s}
                size="sm"
                onMood={(m) => mood.current(m)}
              />
            </div>
          )
        )}
      </div>
    );

  return (
    <section className="grid content-start gap-[14px]" style={{ gridArea: "sk" }}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[12.5px] font-medium tracking-[0.01em] text-muted">
          {first ? "Skills you started" : "Skills that moved"}
        </h2>
        {mode !== "loading" && mode !== "error" && data.levels.length ? (
          <button
            ref={more}
            type="button"
            onClick={onSeeAll}
            className="inline-flex min-h-tap items-center gap-1 text-[14px] font-semibold text-accent underline-offset-4 hover:underline"
            style={hidden}
          >
            See all
            {data.moved.length ? (
              <span className="font-medium text-muted">
                {data.moved.length} {first ? "started" : "moved"} today
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
      {body}
    </section>
  );
});
