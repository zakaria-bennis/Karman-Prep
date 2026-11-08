/*
 * The four lights every Karman painting comes in. The same scene is relit for the hour:
 * dawn, day, sunset and night. Ported from prototypes/today-directions/landscapes.js.
 */

export type TimeOfDay = "dawn" | "day" | "sunset" | "night";
export const TIMES_OF_DAY: readonly TimeOfDay[] = ["dawn", "day", "sunset", "night"];

export interface Light {
  top: string;
  low: string;
  haze: string;
  sun: string;
  glow: string;
  sunAt: [number, number];
  lit: string;
  shade: string;
  land: string;
  deep: string;
  water: string;
  snow: string;
  cloud: string;
  cloudShade: string;
  stars: number;
  dark: number;
}

export const LIGHT: Record<TimeOfDay, Light> = {
  dawn: {
    top: "#5d6da6",
    low: "#f7c6a5",
    haze: "#e9c3bb",
    sun: "#ffe0b0",
    glow: "#ffb98a",
    sunAt: [0.3, 0.52],
    lit: "#f7c9b0",
    shade: "#4e4a68",
    land: "#4c5a4a",
    deep: "#26302c",
    water: "#b9a8b8",
    snow: "#fbe9e0",
    cloud: "#fbd8c8",
    cloudShade: "#9d8aa6",
    stars: 0,
    dark: 0.15,
  },
  day: {
    top: "#2f6db3",
    low: "#cfe6f4",
    haze: "#c9dcea",
    sun: "#ffffff",
    glow: "#ffffff",
    sunAt: [0.55, 0.12],
    lit: "#e9eef2",
    shade: "#55657a",
    land: "#4d7a35",
    deep: "#1e3a24",
    water: "#5b97bd",
    snow: "#ffffff",
    cloud: "#ffffff",
    cloudShade: "#aebccd",
    stars: 0,
    dark: 0,
  },
  sunset: {
    top: "#3b2d6b",
    low: "#f8984a",
    haze: "#e99a7a",
    sun: "#ffd89a",
    glow: "#ff9a4a",
    sunAt: [0.62, 0.5],
    lit: "#ffb07a",
    shade: "#3e2b4e",
    land: "#3d3a2e",
    deep: "#1c1620",
    water: "#d98a64",
    snow: "#ffd2b0",
    cloud: "#ffb27a",
    cloudShade: "#9a4c6e",
    stars: 0,
    dark: 0.25,
  },
  night: {
    top: "#050a1c",
    low: "#22345e",
    haze: "#2b3d66",
    sun: "#f2eedc",
    glow: "#9fb3e6",
    sunAt: [0.8, 0.16],
    lit: "#9fb2d8",
    shade: "#121a33",
    land: "#0f1a28",
    deep: "#060b14",
    water: "#1c2c52",
    snow: "#c9d6ee",
    cloud: "#3e5079",
    cloudShade: "#16203d",
    stars: 1,
    dark: 0.6,
  },
};
