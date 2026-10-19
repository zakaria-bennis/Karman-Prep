// AR-52: a render error inside the calculator shows a fallback in place of the UI, never in the
// quiz's own content. Retry remounts the children from the engine's state (the Fragment key
// changes); Reset asks the facade to blank this question's calculator, then remounts. AR-57:
// componentDidCatch hands the error to onError, which the facade guards against throwing.

import { Component, Fragment, createRef, type ReactNode } from "react";

export const ERROR_COPY = {
  message: "The calculator hit a problem.",
  retry: "Retry",
  reset: "Reset this question's calculator",
} as const;

export interface ErrorBoundaryProps {
  host: HTMLElement;
  onError(error: Error): void;
  onReset(): void;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  generation: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, generation: 0 };
  private readonly retryRef = createRef<HTMLButtonElement>();

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps, previous: ErrorBoundaryState): void {
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
