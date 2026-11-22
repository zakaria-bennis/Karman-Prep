// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (274 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Michael",
    gender: "male",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-comparing-two-texts-95357efce0.m4a",
  durations: [
    8.425, 11.095, 13.308, 9.24, 9.256, 2.882, 3.282, 3.172, 5.744, 3.58, 30.814, 4.127, 4.486,
    6.222, 11.647, 5.124, 36.783, 3.586, 4.153, 10.95, 10.625, 9.585, 36.546, 22.168, 7.142,
  ],
  narration: "0902e3f3",
};

export default timing;
