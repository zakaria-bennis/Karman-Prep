// AR-52: a render error inside the calculator shows a fallback in place of the UI, never in the
// quiz's own content. Retry remounts the children from the engine's state (the Fragment key
// changes); Reset asks the facade to blank this question's calculator, then remounts. AR-57:
// componentDidCatch hands the error to onError, which the facade guards against throwing.
// React's update-depth guard can also fire when fast input (a held Enter, Backspace or undo key)
// keeps lower-priority updates waiting for 50 commits in a row; that is no real loop and the
// engine's rows are intact, so it remounts at once and onRecover puts focus back, at most
// RECOVERY_LIMIT times in RECOVERY_WINDOW_MS before the fallback shows.

import { Component, Fragment, createRef, type ReactNode } from "react";

export const ERROR_COPY = {
  message: "The calculator hit a problem.",
  retry: "Retry",
  reset: "Reset this question's calculator",
} as const;

/** React's "Maximum update depth exceeded" (error #185 in production builds). */
export function isUpdateDepthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Maximum update depth exceeded|Minified React error #185\b/.test(error.message);
}

const RECOVERY_LIMIT = 3;
const RECOVERY_WINDOW_MS = 2000;

export interface ErrorBoundaryProps {
  host: HTMLElement;
  onError(error: Error): void;
  onReset(): void;
  onRecover?(): void; // after a silent update-depth remount
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  generation: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, generation: 0 };
  private readonly retryRef = createRef<HTMLButtonElement>();
  private recoveries: number[] = [];
  private recovered = false;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error): void {
    this.props.onError(error);
    if (!isUpdateDepthError(error)) return;
    const now = Date.now();
    this.recoveries = this.recoveries.filter((t) => now - t < RECOVERY_WINDOW_MS);
    if (this.recoveries.length >= RECOVERY_LIMIT) return;
    this.recoveries.push(now);
    this.recovered = true;
    this.retry();
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps, previous: ErrorBoundaryState): void {
    if (this.recovered && this.state.error === null) {
      this.recovered = false;
      this.props.onRecover?.();
      return;
    }
    // Focus stays where the student left it unless it was on the host itself.
    if (previous.error === null && this.state.error !== null) {
      if (document.activeElement === this.props.host) this.retryRef.current?.focus();
    }
  }

  private readonly retry = () => {
    this.setState(({ generation }) => ({ error: null, generation: generation + 1 }));
  };

  private readonly reset = () => {
    this.props.onReset();
    this.retry();
  };

  render(): ReactNode {
    const { error, generation } = this.state;
    if (error !== null) {
      return (
        <div className="kc-error">
          <p>{ERROR_COPY.message}</p>
          <button type="button" ref={this.retryRef} onClick={this.retry}>
            {ERROR_COPY.retry}
          </button>
          <button type="button" onClick={this.reset}>
            {ERROR_COPY.reset}
          </button>
        </div>
      );
    }
    return <Fragment key={generation}>{this.props.children}</Fragment>;
  }
}
