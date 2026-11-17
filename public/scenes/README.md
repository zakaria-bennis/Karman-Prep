# Scene photographs

Real photographs behind the Schedule tab's next-session card: each place in the light of an hour.
Every one is in the public domain (CC0 or Public domain), taken from Wikimedia Commons; most were
imported there from Unsplash's CC0 collection. 1280 pixels wide. No credit is required; the
sources are kept here so each can be traced (the title is the file's name on Wikimedia Commons).

| File | Title on Wikimedia Commons | Licence |
| --- | --- | --- |
| lake-day.jpg | Mehran Babaee 2015 (Unsplash).jpg | CC0 |
| lake-sunset.jpg | Gander Bay lake sunset. (Unsplash).jpg | CC0 |
| lake-sunrise.jpg | Purple shoreline sunset. (Unsplash).jpg | CC0 |
| lake-night.jpg | Sunset North Bend Park (Unsplash).jpg | CC0 |
| beach-sunrise.jpg | Sunset beach 1 (Unsplash).jpg | CC0 |
| beach-day.jpg | Palm trees at noon (Unsplash).jpg | CC0 |
| beach-sunset.jpg | Sand beach at sunset 1 (Unsplash).jpg | CC0 |
| cottage-sunrise.jpg | Shack at sunset (Unsplash).jpg | CC0 |
| cottage-day.jpg | Cabins in the woods (52477884748).jpg | CC0 |
| cottage-sunset.jpg | Fawn Pass Patrol Cabin- Sunset over Fawn Pass (52339263640).jpg | Public domain |
| cottage-night.jpg | Eldrige Guard Station under stars Custer Gallatin NF 5 (54148952683).jpg | Public domain |
| desert-sunrise.jpg | Sahara Desert (Unsplash c5X870PwmRE).jpg | CC0 |
| desert-day.jpg | Arid Desolation (Unsplash).jpg | CC0 |
| desert-sunset.jpg | Sandscape (Unsplash).jpg | CC0 |
| desert-night.jpg | Milky Way over a Dune Ridge (53908885943).jpg | Public domain |
| mountains-sunrise.jpg | Seiser Alm meadow (Unsplash).jpg | CC0 |
| mountains-day.jpg | Valley near beautiful lake (Unsplash).jpg | CC0 |
| mountains-sunset.jpg | Idyllic Seiser Alm meadow (Unsplash).jpg | CC0 |
| mountains-night.jpg | Yosemite cliff under stars (Unsplash).jpg | CC0 |

## Painted twins

Each `*-painted.jpg` is its photograph laid down in soft brush strokes with storybook color: the
halfway between a photograph and a painting that the founder asked for on 2026-11-17. The card
shows the painted one; the plain photograph is the backup (`?photo=real` on the Schedule page).
They are made by `node scripts/dev/paint-scenes.cjs` with the dev server running. Run it again
after adding a photograph. A place with a photograph of its day and none of its night gets a
`-night-painted.jpg` made from the day (the same place under moonlight). Nothing here is
AI-generated.

To add a place: put `<place>-<light>.jpg` here (light is sunrise, day, sunset or night), add its
row above, run the script, and list it in `src/app/dev/shell/scenes/photos.ts`.
