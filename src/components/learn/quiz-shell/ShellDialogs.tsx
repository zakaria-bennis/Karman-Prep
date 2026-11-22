"use client";
// The pop-ups over the question screen: the question picker, the reference sheet, the keyboard
// shortcuts and "Leave this section?". One at a time; each dims the screen behind it.
import nav from "./nav.module.css";
import styles from "./quiz-shell.module.css";
import { ShortcutsList } from "./MoreMenu";
import { NavigatorDialog, NavigatorGrid, type SquareInfo } from "./Navigator";
import { ReferenceSheet } from "./ReferenceSheet";

export type ShellDialog = "nav" | "reference" | "shortcuts" | "exit" | null;

export function ShellDialogs({
  dialog,
  compact,
  section,
  squares,
  index,
  markForReview,
  math,
  onClose,
  onJump,
  onLeave,
}: {
  dialog: ShellDialog;
  compact: boolean;
  section: string;
  squares: SquareInfo[];
  index: number;
  markForReview: boolean;
  math: boolean;
  onClose(): void;
  onJump(index: number): void;
  onLeave(): void;
}) {
  if (dialog === "nav")
    return (
      <NavigatorDialog compact={compact} title={section} onClose={onClose}>
        <NavigatorGrid squares={squares} current={index} onJump={onJump} />
        {markForReview && (
          <div className={nav.legend}>
            <span>Tag: marked for review</span>
          </div>
        )}
      </NavigatorDialog>
    );
  if (dialog === "reference")
    return (
      <NavigatorDialog compact={compact} title="Reference" onClose={onClose}>
        <ReferenceSheet />
      </NavigatorDialog>
    );
  if (dialog === "shortcuts")
    return (
      <NavigatorDialog compact={compact} title="Keyboard shortcuts" onClose={onClose}>
        <ShortcutsList math={math} />
      </NavigatorDialog>
    );
  if (dialog === "exit")
    return (
      <NavigatorDialog compact={compact} title="Leave this section?" onClose={onClose}>
        <p>The timer keeps running while you are away.</p>
        <div className={nav.checkActions}>
          <button type="button" className={styles.tool} onClick={onClose}>
            Stay
          </button>
          <button type="button" className={styles.tool} onClick={onLeave}>
            Leave
          </button>
        </div>
      </NavigatorDialog>
    );
  return null;
}

/** "Check your work": every question of a timed section as a square, before it is submitted. */
export function CheckPage({
  squares,
  onJump,
}: {
  squares: SquareInfo[];
  onJump(index: number): void;
}) {
  return (
    <div className={nav.check}>
      <h2 className={nav.checkTitle}>Check your work</h2>
      <p>Go back to any question before you submit this section.</p>
      <NavigatorGrid squares={squares} current={-1} checkPage onJump={onJump} />
    </div>
  );
}
