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
| mathquill.css | 2612845e915e2bd21611d34eb8fcfdaad0b09399f1023dae9e70bb95a55a1a49 |
| mathquill.js  | 10da7bb43b6cefc59f7a66f9e0cf31c4afbd0b19de6516068c40b575c9d47278 |
