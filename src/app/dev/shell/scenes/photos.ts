// Real photographs of each place, one for each light (see public/scenes/README.md for where each
// came from; all are in the public domain). `water` is where the water begins in the photo.
import type { Photo } from "../SchedulePhoto";
import type { Sky } from "../scheduleData";

export const PHOTOS: Record<"lake", Record<Sky, Photo>> = {
  lake: {
    day: { src: "/scenes/lake-day.jpg", water: 0.42, bank: 0.7 },
    sunset: { src: "/scenes/lake-sunset.jpg", water: 0.63 },
    sunrise: { src: "/scenes/lake-sunrise.jpg", water: 0.51 },
    night: { src: "/scenes/lake-night.jpg", water: 0.66 },
  },
};
