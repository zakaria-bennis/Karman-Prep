// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (194 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-linear-functions-04ab043dbc.m4a",
  durations: [
    10.63, 13.244, 7.546, 9.805, 12.006, 2.805, 6.688, 4.54, 3.645, 4.74, 7.766, 4.784, 8.612,
    7.579, 2.321, 13.199, 5.258, 6.036, 5.256, 7.696, 2.637, 13.396, 27.221, 6.747,
  ],
  narration: "29342287",
};

export default timing;
