"use client";

// A skill's video walk-through (src/lib/lessons, videoFor): drawn in code, not filmed. Each scene is one
// line of narration, shown as the caption, with what the board holds while it is said: a heading, the
// question being worked, the lines written so far, a picture, and the choice that turns out right. The
// narration's audio drives the clock; with no audio yet, the scenes play silently on their own timings.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { LessonVideo } from "@/lib/lessons/types";
import { Figure } from "./figures/Figure";
import { LessonText } from "./LessonText";
import styles from "./video.module.css";

const LETTERS = ["A", "B", "C", "D"];

function clock(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {playing ? (
        <>
          <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" />
          <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" />
        </>
      ) : (
        <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z" />
      )}
    </svg>
  );
}

/** The video, or a note that it is on its way. */
export function LessonVideoPlayer({ video, name }: { video: LessonVideo | null; name: string }) {
  if (!video) {
    return (
      <div className={styles.soon}>
        <p>
          <b>Video lesson</b>
          <span>The walk-through for {name} is on its way.</span>
        </p>
      </div>
    );
  }
  return <Player video={video} />;
}

function Player({ video }: { video: LessonVideo }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [captions, setCaptions] = useState(true);
  const started = useRef<{ at: number; from: number } | null>(null);

  // with no audio, a clock of its own
  useEffect(() => {
    if (video.audio || !playing) return;
    let raf = 0;
    started.current = { at: performance.now(), from: t };
    const tick = () => {
      const s = started.current!;
      const now = s.from + (performance.now() - s.at) / 1000;
      if (now >= video.duration) {
        setT(video.duration);
        setPlaying(false);
        return;
      }
      setT(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // the clock restarts from the current time whenever play is pressed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, video]);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (video.audio && el) {
      if (el.paused) void el.play().catch(() => setPlaying(false));
      else el.pause();
      return;
    }
    if (t >= video.duration) setT(0);
    setPlaying((p) => !p);
  }, [t, video]);

  const seek = (to: number) => {
    const at = Math.min(video.duration, Math.max(0, to));
    if (video.audio && audio.current) audio.current.currentTime = at;
    started.current = { at: performance.now(), from: at };
    setT(at);
  };

  const scene =
    video.scenes.find((s) => t >= s.start && t < s.end) ?? video.scenes[video.scenes.length - 1];
  const index = video.scenes.indexOf(scene);

  return (
    <div className={styles.player}>
      <div
        className={styles.stage}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "k") {
            e.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={playing ? "Pause the video" : "Play the video"}
      >
        <div className={styles.board} key={scene.title ?? index}>
          {scene.title && <p className={styles.title}>{scene.title}</p>}
          <div className={styles.work} data-wide={scene.figure ? undefined : true}>
            <div className={styles.lines}>
              {scene.problem && (
                <p className={styles.problem}>
                  <LessonText text={scene.problem} />
                </p>
              )}
              {scene.choices && (
                <ul className={styles.choices}>
                  {scene.choices.map((c, i) => (
                    <li key={i} data-pick={scene.pick === i || undefined}>
                      <i>{LETTERS[i]}</i>
                      <LessonText text={c} />
                    </li>
                  ))}
                </ul>
              )}
              {scene.board?.map((line, i) => (
                <p key={`${i}${line}`} className={styles.line}>
                  <LessonText text={line} />
                </p>
              ))}
            </div>
            {scene.figure && <Figure fig={scene.figure} className={styles.figure} />}
          </div>
        </div>
        {!playing && t === 0 && (
          <span className={styles.big} aria-hidden="true">
            <PlayIcon playing={false} />
          </span>
        )}
        {captions && (
          <p className={styles.caption} aria-live="off">
            <LessonText text={scene.say} />
          </p>
        )}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.play}
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
        >
          <PlayIcon playing={playing} />
        </button>
        <input
          className={styles.scrub}
          type="range"
          min={0}
          max={video.duration}
          step={0.1}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Position in the video"
          style={{ "--at": `${(t / video.duration) * 100}%` } as CSSProperties}
        />
        <span className={styles.time}>
          {clock(t)} / {clock(video.duration)}
        </span>
        <button
          type="button"
          className={styles.cc}
          aria-pressed={captions}
          onClick={() => setCaptions((c) => !c)}
          aria-label="Captions"
        >
          CC
        </button>
      </div>
      <p className={styles.voice}>
        Narrated by {video.voice.name}, a computer voice ({video.voice.engine}).
      </p>

      {video.audio && (
        <audio
          ref={audio}
          src={video.audio}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        />
      )}
    </div>
  );
}
