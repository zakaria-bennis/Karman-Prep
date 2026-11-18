# Library opening: Shinkai-style stills for approval

Still frames only, nothing animated yet. Each is 1440x900, painted in code with Karman's brush
engine, with a smooth glow layer on top for the sun, rays, lens glows and lamplight. One world, two
places: the opening looks out over a sea of cloud, split on a diagonal. Math (cool, upper left)
looks toward a hilltop observatory; Reading and Writing (warm, lower right) toward a lantern-lit
reading house. Percents appear only on hover.

Files are in `docs/overnight/reports/library-shinkai/`.

1. `01-sky-day.png`: the opening by day, sun low over the cloud sea, rays and a soft light along the
   diagonal, the observatory and the reading house on islands in the clouds.
2. `02-sky-sunset.png`: the same at sunset, rose and gold clouds, Math's side cooler violet.
3. `03-sky-night.png`: the same at night, moon and Milky Way, both places' windows lit.
4. `04-sky-day-hover-math.png`: Math pointed at: its side lifts and brightens, the observatory's
   windows glow, birds circle, "6% done" appears; Reading and Writing dims.
5. `05-sky-day-hover-reading.png`: Reading and Writing pointed at: lanterns brighten, leaves drift,
   birds fly by, "8% done" appears; Math dims.
6. `06-descent-sunset.png`: halfway down at sunset, between great glowing cloud walls, the
   observatory's hill in the gap below.
7. `07-observatory-day.png`: landed at the observatory by day: hilltop, lamp-lit path, lone tree,
   wildflowers, the valley below.
8. `08-observatory-night.png`: the observatory at night: dome open with the telescope out, windows
   and path lamps glowing, stars over the valley lights.
9. `09-library-day.png`: landed at the reading house by day: tall windows full of books, lanterns on
   the eaves and posts, stepping stones, a big tree.
10. `10-library-night.png`: the reading house at night, every window and lantern glowing warm.
11. `11-box-observatory-day.png`: the end state: the Library box open over the observatory by day.

## How they were made

- Dev page `/dev/library-shinkai?frame=sky|descent|observatory|library|box&time=day|sunset|night`
  (`&hover=math|rw` on the sky). No database, no sign-in, a 404 on the live site.
- `node scripts/dev/library-shinkai-stills.mjs` renders all eleven (one dev server on port 3163,
  one headless browser, one page at a time). No Docker.
- Painting code: `src/lib/painting/library/shinkai/` (palette, clouds, places, sky, glow).

## Notes for the founder

- These are stills to agree the look. The ten earlier intros and the switcher are untouched.
- The clouds are built from many round billows; if you'd like them softer and more streaked, that's
  the next thing to tune.
