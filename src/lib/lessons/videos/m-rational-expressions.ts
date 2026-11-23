// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (207 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-rational-expressions-ffea5a1ae0.m4a",
  durations: [
    9.327, 10.248, 7.506, 10.284, 13.53, 2.834, 2.665, 3.513, 6.97, 4.955, 9.564, 7.557, 9.36,
    9.926, 4.873, 4.483, 10.223, 9.01, 8.965, 8.312, 3.127, 15.986, 27.206, 6.632,
  ],
  narration: "ae5fed9f",
};

export default timing;
