#!/bin/bash
# Exports the finished shots and cast as web-sized JPGs and builds the review page.
cd "$(dirname "$0")"
for f in final-c1-bus final-c2-music final-c3-bench final-c4-studio final-c5-dusk final-c6-oneonone final-c8-tutor final-c9-pickup final-c10-lunch final-c12-walkout c11-walkin; do
  [ -f $f.png ] && ffmpeg -y -loglevel error -i $f.png -vf "scale=2000:-1" -q:v 3 web/${f#final-}.jpg
done
for f in cast/*.png; do n=$(basename $f .png); ffmpeg -y -loglevel error -i $f -vf "scale=600:-1" -q:v 3 web/cast-$n.jpg; done
# the cohort tiles as they appear in the live class: cropped above each laptop
ffmpeg -y -loglevel error $(for i in 1 2 3 4 5 6; do echo -i ../screens/assets/tiles/t$i.jpg; done) -filter_complex "[0][1][2]hstack=3[a];[3][4][5]hstack=3[b];[a][b]vstack" -q:v 3 web/c7-zoomtiles.jpg
