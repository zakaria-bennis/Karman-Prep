// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (260 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-reading-tables-925f9db8cc.m4a",
  durations: [
    7.826, 8.931, 5.769, 5.824, 7.87, 2.841, 4.5, 3.351, 3.585, 5.129, 22.8, 8.585, 5.772, 11.594,
    13.931, 13.752, 20.414, 5.495, 5.547, 6.669, 14.978, 11.757, 32.718, 23.901, 6.94,
  ],
  narration: "4f54d4a6",
};

export default timing;
