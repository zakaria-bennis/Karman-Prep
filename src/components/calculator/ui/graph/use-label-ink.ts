// The ink that label placement avoids (GP-38), drawn as Desmos draws its label mask: the grid, every
// row as if none were selected (no heavier curve) and the points, without the point-of-interest
// and trace dots, on a renderer of its own that is never attached; plus the graph controls as solid
// blocks. Rebuilt only when what it draws changes.

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { EngineSnapshot } from "@/lib/calculator/core/api/engine";
import type { ViewSpec } from "@/lib/calculator/plot/viewport";
import { pickGrid } from "@/lib/calculator/render/grid-plan";
import { GraphRenderer, readRenderTheme } from "@/lib/calculator/render/renderer";
import type { SkinId } from "@/lib/calculator/theme/skins";
import { readInk } from "./label-ink";
import type { InkSampler } from "./label-placement";
import { buildRenderRows, type RegionCache } from "./render-rows";
import type { GraphSize } from "./use-graph-size";

export interface InkInputs {
  snapshot: EngineSnapshot;
  skin: SkinId;
  size: GraphSize | null;
  cache: RegionCache;
}

/** A reader of the label ink for the latest inputs in `inputsRef`, drawn on first use after each change. */
export function useLabelInk(
  inputsRef: MutableRefObject<InkInputs>,
  panelRef: RefObject<HTMLElement | null>,
  layersRef: RefObject<HTMLElement | null>,
  host: Element
): () => InkSampler | null {
  const renderer = useRef<{ container: HTMLElement; renderer: GraphRenderer } | null>(null);
  const memo = useRef<{ key: readonly unknown[]; ink: InkSampler | null } | null>(null);
  useEffect(
    () => () => {
      renderer.current?.renderer.destroy();
      renderer.current = null;
    },
    []
  );
  return useCallback(() => {
    const { snapshot, skin, size, cache } = inputsRef.current;
    const graph = layersRef.current;
    if (size === null || graph === null) return null;
    const key = [snapshot, skin, size, cache];
    if (memo.current !== null && memo.current.key.every((k, i) => k === key[i]))
      return memo.current.ink;
    if (renderer.current === null) {
      const container = graph.ownerDocument.createElement("div");
      renderer.current = { container, renderer: new GraphRenderer(container) };
    }
    const view: ViewSpec = { viewport: snapshot.viewport, size: size.size, dpr: 1 };
    const rows = buildRenderRows(snapshot, skin, view, cache).map((r) => ({
      ...r,
      selected: false,
    }));
    renderer.current.renderer.render({
      view,
      grid: pickGrid(snapshot.settings),
      rows,
      theme: readRenderTheme(host),
    });
    const origin = graph.getBoundingClientRect();
    const blocks = [...(panelRef.current?.querySelectorAll(".kc-graph-controls > *") ?? [])].map(
      (e) => {
        const r = e.getBoundingClientRect();
        return {
          left: r.left - origin.left,
          top: r.top - origin.top,
          right: r.right - origin.left,
          bottom: r.bottom - origin.top,
        };
      }
    );
    const canvases = [...renderer.current.container.querySelectorAll("canvas")];
    const ink = readInk(canvases, blocks, size.size);
    memo.current = { key, ink };
    return ink;
  }, [inputsRef, panelRef, layersRef, host]);
}
