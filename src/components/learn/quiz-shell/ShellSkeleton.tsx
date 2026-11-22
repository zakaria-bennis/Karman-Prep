"use client";
// What the question screen shows while its questions load: the bars and grey bars where the
// question and answers will be.
import styles from "./quiz-shell.module.css";

export function ShellSkeleton({ layout }: { layout: string }) {
  return (
    <div
      data-quiz-shell
      data-layout={layout}
      aria-busy="true"
      className={`${styles.shell} ${styles[layout] ?? ""}`}
    >
      <header data-quiz-bar="top" className={`${styles.topBar} ${styles.glass}`}>
        <div className={styles.skeleton} style={{ width: 160, height: 28 }} />
      </header>
      <div className={styles.body}>
        <div className={styles.area}>
          <div className={styles.pane} style={{ position: "absolute", inset: 0 }}>
            <div className={styles.column}>
              {[90, 75, 60, 100, 100, 100, 100].map((w, i) => (
                <div
                  key={i}
                  className={styles.skeleton}
                  style={{ width: `${w}%`, height: i < 3 ? 18 : 52, marginBottom: 14 }}
                />
              ))}
            </div>
          </div>
        </div>
        <footer data-quiz-bar="bottom" className={`${styles.bottomBar} ${styles.glass}`}>
          <div className={styles.skeleton} style={{ width: 96, height: 44 }} />
        </footer>
      </div>
    </div>
  );
}
