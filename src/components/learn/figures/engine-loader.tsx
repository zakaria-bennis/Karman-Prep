"use client";

// ============================================================
// The figure engine loads lazily: its builders, Zod schemas and views
// (engine-views.ts) are one chunk that quiz routes fetch only when a question
// has a figure, so they stay out of every page's eager JS (AR-33).
//
// - lazyView wraps one engine view for a wrapper component (FigureFrame,
//   ChartFigure, QuestionTable, FigureChoices). The server renders the real
//   figure; hydration keeps that HTML until the chunk arrives; a client-only
//   mount shows the wrapper's same-size placeholder until then. Once the
//   chunk is loaded every later figure renders at once, with no placeholder.
// - useFigureEngine gives screens parseFigureSpecs once the chunk is loaded
//   (null on the server and during hydration, so both pick the same figure
//   path); drawnFigure, hasFigureChoices and withSpecTables take it.
// ============================================================

import {
  lazy,
  Suspense,
  useEffect,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
// The views' theme roles, loaded with the page so a server-rendered figure is never unstyled
// while the engine chunk downloads.
import "./figure-roles.css";

export type FigureEngine = typeof import("./engine-views");

let engine: FigureEngine | null = null;
let pending: Promise<FigureEngine> | null = null;
const listeners = new Set<() => void>();

/** Loads the engine chunk once; every caller shares the one request. */
export function loadFigureEngine(): Promise<FigureEngine> {
  pending ??= import("./engine-views").then((loaded) => {
    engine = loaded;
    for (const listener of listeners) listener();
    return loaded;
  });
  return pending;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The loaded engine, or null until it has loaded. `needed` starts the load (a question with
 * a figure_spec or a choice_figure_spec). Always null on the server and while hydrating, so
 * the first client render matches the server's.
 */
export function useFigureEngine(needed: boolean): FigureEngine | null {
  const loaded = useSyncExternalStore(
    subscribe,
    () => engine,
    () => null
  );
  useEffect(() => {
    if (needed && !engine) {
      void loadFigureEngine().catch(() => {
        /* The figure path stays the shape-based pick; the views show their placeholders. */
      });
    }
  }, [needed]);
  return loaded;
}

/**
 * A component that renders the engine view `pick` returns, inside Suspense with `placeholder`
 * (given the same props) until the engine chunk has loaded. A view of an already loaded
 * engine renders synchronously: React.lazy resolves a thenable that settles at once.
 */
export function lazyView<P extends object>(
  pick: (engine: FigureEngine) => ComponentType<P>,
  placeholder: (props: P) => ReactNode
): ComponentType<P> {
  // Cast: lazy's props type wraps P in ref attributes; the view takes exactly P.
  const View = lazy<ComponentType<P>>(() => {
    if (engine) {
      const ready = { default: pick(engine) };
      return { then: (resolve: (m: typeof ready) => void) => resolve(ready) } as Promise<
        typeof ready
      >;
    }
    return loadFigureEngine().then((loaded) => ({ default: pick(loaded) }));
  }) as unknown as ComponentType<P>;
  function LazyFigureView(props: P) {
    return (
      <Suspense fallback={placeholder(props)}>
        <View {...props} />
      </Suspense>
    );
  }
  return LazyFigureView;
}

type SpecFields = {
  figure_spec?: unknown;
  answer_choices?: readonly { choice_figure_spec?: unknown }[];
};

/**
 * parseFigureSpecs once the engine has loaded, for a question with a figure_spec or a
 * choice_figure_spec (which starts the load); null before then. Screens pass it to
 * drawnFigure, hasFigureChoices and withSpecTables.
 */
export function useSpecParser(q: SpecFields): FigureEngine["parseFigureSpecs"] | null {
  const needed =
    (q.figure_spec !== null && q.figure_spec !== undefined) ||
    !!q.answer_choices?.some((c) => c.choice_figure_spec != null);
  return useFigureEngine(needed)?.parseFigureSpecs ?? null;
}
