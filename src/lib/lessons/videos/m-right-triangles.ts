// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (183 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-right-triangles-cb79103a6d.m4a",
  durations: [
    8.744, 11.719, 8.054, 10.36, 12.633, 2.465, 4.354, 5.974, 4.153, 3.395, 9.612, 7.056, 11.653,
    2.723, 2.184, 11.064, 9.749, 5.476, 7.147, 3.094, 13.371, 22.197, 6.195,
  ],
  narration: "75be0340",
};

export default timing;
