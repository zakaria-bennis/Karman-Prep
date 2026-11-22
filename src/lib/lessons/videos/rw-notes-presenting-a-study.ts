// Made by scripts/lessons/build-videos.ts: the narrator, the narration's address and each scene's
// length (249 seconds in all). The scenes come from the lesson (videoScript.ts).
import type { VideoTiming } from "../videoScript";

const timing: VideoTiming = {
  voice: {
    name: "Heart",
    gender: "female",
    engine: "Kokoro 82M in VoiceStudio",
    license: "Apache-2.0",
  },
  audio:
    "https://pub-53937525e14a4862b821ca2035ea1bd1.r2.dev/lessons/audio/rw-notes-presenting-a-study-40c7cd7c38.m4a",
  durations: [
    9.764, 11.596, 10.145, 11.264, 9.226, 2.563, 6.114, 3.466, 5.099, 2.381, 28.552, 4.626, 4.836,
    7.58, 5.236, 10.88, 28.402, 5.46, 5.762, 4.818, 4.883, 7.543, 33.783, 19.197, 6.321,
  ],
  narration: "a4134f9f",
};

export default timing;
