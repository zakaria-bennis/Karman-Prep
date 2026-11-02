/**
 * The stored 3D model of a solid part: vertices, edges and faces, so
 * rotating it or unfolding it into a net can come later without redrawing
 * it. Curved sides are sampled HOUSE.circleSamples times around; drawing
 * them uses the exact circles instead (solid-draw.ts).
 *
 * The base of every solid sits on y = 0, centered on the y axis for the
 * curved solids. Dims use the SAT's words (SOLID_DIMS in spec.ts).
 */
import { onCircle, type V3 } from "./solid-camera";
import { HOUSE } from "./house";
import type { Part, SolidShape } from "./spec";

export type SolidPart = Extract<Part, { kind: "solid" }>;

export type SolidDim = {
  /** The two vertices the dimension runs between. */
  ends: [number, number];
  /** An inner line, drawn only when it is labeled or shown. */
  guide: boolean;
};

export type SolidModel = {
  id: string;
  shape: SolidShape;
  vertices: V3[];
  /** Hard edges, always drawn (solid or dashed). */
  edges: [number, number][];
  /** Flat faces, each a cycle of vertex indices. */
  faces: number[][];
  dims: Record<string, SolidDim>;
};

/** Bands from pole to pole on a sphere, so each meridian is a full circle of samples. */
const SPHERE_BANDS = HOUSE.circleSamples / 2;

/** HOUSE.circleSamples points of a level circle, starting at +x. */
function ring(y: number, r: number): V3[] {
  const n = HOUSE.circleSamples;
  return Array.from({ length: n }, (_, i) => onCircle([0, y, 0], r, (2 * Math.PI * i) / n));
}

const ringFace = (start: number, n = HOUSE.circleSamples) =>
  Array.from({ length: n }, (_, i) => start + i);

const dim = (a: number, b: number, guide = false): SolidDim => ({ ends: [a, b], guide });

/** The stored 3D model of a solid part, in its own units. */
export function solidModel(part: SolidPart): SolidModel {
  const d = part.dims;
  const n = HOUSE.circleSamples;
  const base = { id: part.id, shape: part.shape };
  switch (part.shape) {
    case "prism": {
      // Vertex i has x, y, z set by bits 1, 2 and 4.
      const vertices = Array.from(
        { length: 8 },
        (_, i): V3 => [i & 1 ? d.length : 0, i & 2 ? d.height : 0, i & 4 ? d.width : 0]
      );
      const edges: [number, number][] = [];
      for (let i = 0; i < 8; i++)
        for (const bit of [1, 2, 4]) if (!(i & bit)) edges.push([i, i | bit]);
      const faces = [
        [0, 2, 6, 4],
        [1, 3, 7, 5],
        [0, 1, 5, 4],
        [2, 3, 7, 6],
        [0, 1, 3, 2],
        [4, 5, 7, 6],
      ];
      // Length along the front bottom, width receding at the bottom right,
      // height up the front left.
      const dims = { length: dim(0, 1), width: dim(1, 5), height: dim(0, 2) };
      return { ...base, vertices, edges, faces, dims };
    }
    case "cylinder": {
      const vertices = [...ring(0, d.radius), ...ring(d.height, d.radius)];
      vertices.push([0, 0, 0], [0, d.height, 0]);
      const sides = Array.from({ length: n }, (_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i]);
      return {
        ...base,
        vertices,
        edges: [],
        faces: [ringFace(0), ringFace(n), ...sides],
        // The radius runs across the top; the height is labeled beside the right side.
        dims: { radius: dim(2 * n + 1, n, true), height: dim(0, n) },
      };
    }
    case "cone": {
      const vertices = [...ring(0, d.radius), [0, 0, 0] as V3, [0, d.height, 0] as V3];
      const center = n;
      const apex = n + 1;
      const sides = Array.from({ length: n }, (_, i) => [apex, i, (i + 1) % n]);
      return {
        ...base,
        vertices,
        edges: [],
        faces: [ringFace(0), ...sides],
        dims: { radius: dim(center, 0, true), height: dim(apex, center, true) },
      };
    }
    case "pyramid": {
      const { baseLength: l, baseWidth: w, height: h } = d;
      const vertices: V3[] = [
        [0, 0, 0],
        [l, 0, 0],
        [l, 0, w],
        [0, 0, w],
        [l / 2, h, w / 2],
        [l / 2, 0, w / 2],
      ];
      const edges: [number, number][] = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [0, 4],
        [1, 4],
        [2, 4],
        [3, 4],
      ];
      const faces = [
        [0, 1, 2, 3],
        [0, 1, 4],
        [1, 2, 4],
        [2, 3, 4],
        [3, 0, 4],
      ];
      // In the Bluebook view vertex 1 is the front corner: length runs from
      // it up to the left, width up to the right.
      const dims = { baseLength: dim(0, 1), baseWidth: dim(1, 2), height: dim(4, 5, true) };
      return { ...base, vertices, edges, faces, dims };
    }
    case "sphere": {
      const r = d.radius;
      // North pole, SPHERE_BANDS - 1 rings of samples, south pole, center.
      const vertices: V3[] = [[0, r, 0]];
      for (let k = 1; k < SPHERE_BANDS; k++) {
        const phi = Math.PI / 2 - (Math.PI * k) / SPHERE_BANDS;
        vertices.push(...ring(r * Math.sin(phi), r * Math.cos(phi)));
      }
      const south = vertices.length;
      vertices.push([0, -r, 0]);
      const center = vertices.length;
      vertices.push([0, 0, 0]);
      const ringStart = (k: number) => 1 + (k - 1) * n;
      const faces: number[][] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push([0, ringStart(1) + i, ringStart(1) + j]);
        for (let k = 1; k < SPHERE_BANDS - 1; k++) {
          const a = ringStart(k);
          const b = ringStart(k + 1);
          faces.push([a + i, a + j, b + j, b + i]);
        }
        const last = ringStart(SPHERE_BANDS - 1);
        faces.push([south, last + j, last + i]);
      }
      const equator = ringStart(SPHERE_BANDS / 2);
      return { ...base, vertices, edges: [], faces, dims: { radius: dim(center, equator, true) } };
    }
  }
}

/** Where a radius starts, by shape: the cylinder's top center, otherwise the base (or sphere) center. */
export function radiusCircle(part: SolidPart): { center: V3; r: number } {
  const { radius = 0, height = 0 } = part.dims;
  return { center: part.shape === "cylinder" ? [0, height, 0] : [0, 0, 0], r: radius };
}

/**
 * The default direction of a radius, from Bluebook: back and to the right
 * across a cylinder's top (2024-08_US_V5_MATH_M1_Q19, 65°), straight left
 * along a cone's base (2026-06_US_V3_MATH_M2_Q06), straight right in a sphere.
 */
export const RADIUS_ANGLE: Partial<Record<SolidShape, number>> = {
  cylinder: 65,
  cone: 180,
  sphere: 0,
};

/** The world position of a named point of a solid. */
export function pointPosition(
  part: SolidPart,
  at: "apex" | "center" | "top" | "rim" | "topRim",
  angleDeg = 0
): V3 {
  const { radius = 0, height = 0, baseLength = 0, baseWidth = 0 } = part.dims;
  const a = (angleDeg * Math.PI) / 180;
  const mid: V3 = part.shape === "pyramid" ? [baseLength / 2, 0, baseWidth / 2] : [0, 0, 0];
  switch (at) {
    case "apex":
      return [mid[0], height, mid[2]];
    case "center":
      return mid;
    case "top":
      return [0, height, 0];
    case "rim":
      return onCircle([0, 0, 0], radius, a);
    case "topRim":
      return onCircle([0, height, 0], radius, a);
  }
}
