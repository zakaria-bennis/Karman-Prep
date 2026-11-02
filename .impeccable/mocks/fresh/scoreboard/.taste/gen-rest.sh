#!/bin/zsh
# Generates the remaining scoreboard stills one at a time, spaced out, at most 2 tries each.
cd /Users/zakariabennis/Karman-Prep
RAW=.impeccable/mocks/fresh/scoreboard/raw/stills
for id in "$@"; do
  for try in 1 2; do
    if ls $RAW/scoreboard-$id-*.png >/dev/null 2>&1; then break; fi
    echo "== $id try $try"
    node scripts/generate-assets.mjs --manifest assets/fresh/scoreboard.manifest.json \
      --state assets/fresh/scoreboard.state.json --out .impeccable/mocks/fresh/scoreboard/raw \
      --budget 0.2 --only scoreboard-$id --run 2>&1 | grep -iv "^$" | tail -3
    /bin/sleep 25
  done
done
ls $RAW
