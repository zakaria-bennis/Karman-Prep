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
| garden-sunrise.jpg | Super Bloom 2017 at Carrizo Plain National Monument (34128252015).jpg | Public domain |
| garden-day.jpg | Wildflower Meadow (6997737191).jpg | Public domain |
| garden-sunset.jpg | Coconino National Forest (20170823-FS-Coconino-DLS-011).jpg | Public domain |
| garden-night.jpg | Flowers and Milky Way (19928301093).jpg | Public domain |
| mountains-sunrise.jpg | Seiser Alm meadow (Unsplash).jpg | CC0 |
| mountains-day.jpg | Valley near beautiful lake (Unsplash).jpg | CC0 |
| mountains-sunset.jpg | Idyllic Seiser Alm meadow (Unsplash).jpg | CC0 |
| mountains-night.jpg | Yosemite cliff under stars (Unsplash).jpg | CC0 |
| orchard-day.jpg | Pretty Blossoms All in a Row (50326184663).jpg | Public domain |
| orchard-sunset.jpg | Plum tree blossoming, Ehrenbach, to south.jpg | CC0 |
| sakura-day.jpg | Cherry tree and Mount Iwate in spring 2025.jpg | CC0 |
| sakura-sunset.jpg | Washington Monument (19854e5d-cc0c-4418-aaee-f80b9237d4a4).jpg | Public domain |

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
