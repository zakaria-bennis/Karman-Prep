import raw from '../../shots/geometry.json';

/** Measured by scripts/capture-screens.mjs, CSS px of each capture. */
export type Geom = {mainTop: number | null; mainBottom: number | null; navTop?: number | null; h: number; extra?: number};
export const GEOM = raw as unknown as Record<string, Geom>;
