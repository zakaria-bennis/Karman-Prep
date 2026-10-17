# MathQuill (vendored)

Upstream: https://github.com/mathquill/mathquill
Commit: 1cbc1c4128ec87db3733bc99965522f7d62cde75
Version: 0.10.1 (package.json at that commit, jQuery-free master)
Licence: MPL-2.0 (LICENSE, copied unchanged)
Local changes: PATCHES.md

## Build (Node 22, from the repository root)

```sh
WORK="$(mktemp -d)"; MQ="$WORK/mathquill"
git clone https://github.com/mathquill/mathquill.git "$MQ"
git -C "$MQ" checkout 1cbc1c4128ec87db3733bc99965522f7d62cde75
for p in "$PWD"/vendor/mathquill/patches/*.patch; do git -C "$MQ" apply "$p"; done
(cd "$MQ" && npm ci --ignore-scripts && make js css OMIT_FONT_FACE=true NO_INSTALL=1)
cp "$MQ/build/mathquill.js" "$MQ/build/mathquill.css" "$MQ/LICENSE" vendor/mathquill/
```

## Files

| File          | sha256                                                           |
| ------------- | ---------------------------------------------------------------- |
| LICENSE       | 1f256ecad192880510e84ad60474eab7589218784b9a50bc7ceee34c2b91f1d5 |
| mathquill.css | 70bc76264f5a7bcafd53d5af25a2bb47aa04ebadc068f486b8c2551f1575b3e9 |
| mathquill.js  | 7850009b2aa8a19b959a554d319ae303cc3af04e9d9e7678c9d89d64e9464f0e |
