// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (233 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-circle-equations-9a5a5cf9bc.m4a",
  durations: [
    10.473, 11.283, 9.422, 17.481, 12.547, 2.924, 5.026, 4.943, 2.577, 3.506, 11.581, 10.306,
    20.347, 7.411, 7.815, 2.06, 12.769, 9.606, 13.829, 5.838, 2.988, 13.892, 26.895, 7.079,
  ],
  narration: "4bfd8a7a",
};

export default timing;
