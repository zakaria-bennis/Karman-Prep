# Turbopack output fixtures (Next 16.3.8)

Recorded 2026-10-17 from a `next build` (Next 16.3.8, Turbopack, Node 22) of this repository with a
temporary probe route, for `scripts/build/turbopack-output.mjs` and the calculator bundle checks
(AR-32, AR-33, AR-66). Any other installed Next version fails `assertPinnedNext`; re-capture these
files into `scripts/build/__fixtures__/turbopack-<version>/` and update the parsers.

## Probe (temporary, never committed)

`src/app/turbopack-probe/page.tsx` renders `<Probe />`; `Probe.tsx` (`"use client"`) is a button
whose `onClick` runs
`typeof window === "undefined" ? null : import("@/components/calculator/host/quiz-host")`.

## Commands

```sh
export NEXT_PUBLIC_APP_URL=https://karmanprep.com NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder \
  CLERK_SECRET_KEY=sk_test_placeholder STRIPE_SECRET_KEY=sk_test_placeholder \
  RESEND_API_KEY=re_placeholder RESEND_FROM_EMAIL=hello@karmanprep.com
npx next build
LAZY=$(grep -l "karman-calculator:lazy-chunk" .next/static/chunks/*.js)
for f in $LAZY; do grep -l "$(basename "$f")" .next/static/chunks/*.js; done | sort -u   # probe chunk listing the lazy group
grep -l "turbopack-worker-" $LAZY; grep -l "#params=" .next/static/chunks/*.js            # worker call; runtime helper
```

Then `rm -rf src/app/turbopack-probe .next`.

## Files

- `async-import.txt`: the whole probe chunk (`static/chunks/40eg_hl9s771n.js`), whose `onClick`
  loads the lazy group through `t.v(s=>Promise.all([...].map(s=>t.l(s))).then(()=>s(<id>)))`.
- `worker-call.txt`: 600 characters either side of the worker call
  `e.r(<helper>).default("static/chunks/turbopack-worker-<hash>.js",[<chunks>])` in the lazy chunk
  `static/chunks/0q-8luhtsbxqf.js` (which also holds the sentinel and `mq-root-block`).
- `worker-runtime-helper.txt`: the helper module that builds the worker URL. It maps each chunk
  through the runtime's `q` (chunk base path `/_next/`, no asset suffix in this build), reverses
  the list and appends the asset suffix `""`, the base path `"/_next/"`, `NEXT_DEPLOYMENT_ID` and
  `NEXT_CLIENT_ASSET_SUFFIX` (both unset, so `null`), then sets
  `#params=` + `encodeURIComponent(JSON.stringify(list))` on the bootstrap URL.
- `page_client-reference-manifest.js`: `.next/server/app/turbopack-probe/page_client-reference-manifest.js`,
  formatted with Prettier.
- `expected.json`: values read from those files; `workerUrl` is the helper's URL for origin
  `http://localhost:8787`, and `probeChunk` is the original path of `async-import.txt`.
