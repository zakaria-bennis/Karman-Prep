// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (193 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/m-solving-quadratics-dec7142a3c.m4a",
  durations: [
    10.429, 9.697, 7.623, 8.041, 5.622, 10.747, 2.688, 3.486, 4.475, 2.903, 3.499, 5.002, 6.952,
    7.517, 10.57, 8.455, 2.643, 2.469, 7.587, 10.106, 10.939, 6.392, 2.616, 13.638, 22.436, 6.439,
  ],
  narration: "8a68bedc",
};

export default timing;
