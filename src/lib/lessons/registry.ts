// Made by scripts/lessons/build-registry.mjs from the files in skills/ and videos/. Do not edit by hand.
import type { Lesson, LessonVideo } from "./types";

export const LESSON_LOADERS: Record<string, () => Promise<{ default: Lesson }>> = {
  "rw-transitions-contrast": () => import("./skills/rw-transitions-contrast"),
  "m-circles": () => import("./skills/m-circles"),
};

export const VIDEO_LOADERS: Record<string, () => Promise<{ default: LessonVideo }>> = {};
