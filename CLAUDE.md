# Karman Prep — Claude Code quick-start

Pre-launch SAT prep platform. Adaptive practice + live tutoring. Live deploy
target Nov 2026. Code is in prod (Cloudflare Workers via OpenNext), no
paying users yet.

## Read these first (5 min)

1. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branch model, dev commands,
   lint/test/format gates, gotchas.
2. [`docs/handoff.md`](./docs/handoff.md) — what this product is, who uses
   it, current status.
3. [`docs/architecture.md`](./docs/architecture.md) — system map +
   Mermaid diagram of the data flows.
4. [`docs/adr/`](./docs/adr/) — why core decisions exist (per-session pay,
   Stripe Connect Express, ChatGPT-based imports).

## Repo defaults you must respect

- Default branch `main`. Feature branches `zakaria/<short-kebab-description>`.
- Lint rules `@typescript-eslint/no-unused-vars` and `react/no-unescaped-entities`
  are **error**, not warn — CI fails on either.
- 5 required CI checks: TypeScript, ESLint, Prettier, Vitest, Cloudflare build.
- Migrations: `supabase/migrations/<YYYYMMDDHHMMSS>_name.sql`, applied via
  `npm run db:push` or on `main` merges via `.github/workflows/db-deploy.yml`.
- Dev server: `npm run dev:next`. Deploy: `npm run cf:deploy` (Cloudflare, not
  Vercel).
- No file should exceed ~700 lines — split by concern instead.
- Server actions validate inputs with Zod schemas; add a schema when adding
  an action.

## Testing & verification workflow

Five tools, picked by the question being asked. Start at the cheapest layer
that can answer the question — climb only when needed.

| Question                                                            | Tool                                                  | Cost       |
| ------------------------------------------------------------------- | ----------------------------------------------------- | ---------- |
| Does this pure function return the right value?                     | Vitest (node env)                                     | ~ms        |
| Does this component render the right text / fire the right handler? | Vitest + RTL (jsdom env)                              | ~10ms/test |
| Does this multi-step flow still work (click → navigate → assert)?   | Playwright (`test:e2e`)                               | ~5s/test   |
| What does this page actually look like with real data?              | Dev bypass + seed fixtures, browse manually           | ~10s       |
| Is the spacing / color / font _exactly_ right?                      | `mcp__Claude_Preview__preview_inspect` for CSS values | ~1s        |

Specific calls that come up often:

- **Verify a style** (color, padding, font-size, dimensions) → use `preview_inspect`, NOT `preview_screenshot`. The screenshot is a compressed JPEG; the inspector returns computed CSS as exact strings. A wrong color in a screenshot is invisible; in the inspector it's `rgb(...)` vs the expected value.
- **Verify a page rendered at all** → screenshot is fine. Or `curl -s -w "%{http_code}\n"`.
- **Verify "this banner appears for state X"** → write a Playwright test or an RTL test, not a one-off curl.
- **Verify a layout / structure question** → `preview_snapshot` returns the DOM as readable text. Cheap.

### Dev-only auth bypass (for visual smoke tests)

Clerk's sign-in flow can't be driven from automation. To view authenticated
pages locally without typing real credentials, set `DEV_IMPERSONATE_CLERK_ID`
in `.env.local` to any real Clerk id from the `users` table, then restart
`npm run dev:next`. Every page renders as that user — middleware skips
`auth.protect()` and `safeAuth()` returns the synthetic id.

The bypass is hard-gated on `NODE_ENV !== "production"`; it cannot fire on
the deployed Cloudflare Worker. Unset / clear the var to go back to real
Clerk auth. See `src/lib/auth/dev-auth.ts`.

### Dev fixtures: `npm run seed:dev`

Pairs with the auth bypass. Upserts a known set of users (admin, fresh /
mid / stuck student, tutor, parent linked to mid) into Supabase. Idempotent
— re-running merges on `clerk_id`, never wipes anything outside the
`dev_seed_*` prefix.

```
npm run seed:dev                                 # one-time setup
echo 'DEV_IMPERSONATE_CLERK_ID=dev_seed_student_mid' >> .env.local
npm run dev:next                                 # view mid-student dashboard
```

To clean up: `delete from users where clerk_id like 'dev_seed_%';` (cascades).
See `scripts/seed-dev.mjs` for the full fixture list + what state each
persona exercises.

### Component tests (React Testing Library)

For client components, add a co-located `.test.tsx` next to the component
with the `// @vitest-environment jsdom` directive at the top. They run as
part of `npm test` (no separate command). Use them for prop matrices
(e.g. banner with / without a name, button enabled / disabled) and for
behavior that doesn't need a full page (clicks, menu open/close, form
state). Examples: `src/components/admin/ImpersonationBanner.test.tsx`,
`src/components/admin/ImpersonationMenu.test.tsx`.

For multi-step UI flows that hit real pages (impersonation flow, dashboard
data), use Playwright instead — those tests get the full app + bypass +
seeded data.

### Visual perception harness

`npm run test:visual` — captures full-resolution PNGs across personas ×
pages × viewports, plus a11y / token-drift / animation-timing reports.
Output lives under `tests/visual/snapshots/` (gitignored) and the PNGs
can be read at full fidelity rather than the compressed JPEG that
`preview_screenshot` returns. Pairs with the dev bypass + seed fixtures.

What it covers:

- Visual snapshots — 3 personas × {dashboard, learn, admin pages} × 3
  viewports (375 / 768 / 1440). Viewport-only by default so admin
  tables don't produce 30k-px-tall PNGs.
- Interactive states — `states.spec.ts` snapshots resting / hover /
  focus separately for select components.
- Accessibility — `a11y.spec.ts` runs axe-core (WCAG 2 A + AA) per page
  and writes a JSON violation report. Doesn't fail the suite by design.
- Token drift — `tokens.spec.ts` diffs computed h1/h2/h3 font-size +
  line-height against `docs/design-tokens.md`. Flags raw hex codes in
  inline styles. JSON report, no fail.
- Animation timing — `timing.spec.ts` measures CSS transitions; warns
  if a hover state exceeds 500ms.

What it does NOT do (deliberate):

- Subjective taste / motion feel / first-time-user intuition — human only.
- Full-page visual regression diffs — would need Chromatic / Percy /
  baseline-on-disk; tracked as a follow-up.

### Cross-browser + mobile emulation

- `npm run test:e2e:all` — runs the e2e flows on Chromium + Firefox + WebKit
  (Safari engine). Catches CSS-engine + Web-API differences Chromium alone hides.
- `npm run test:visual:all` — runs the snapshot spec on Chromium + Firefox +
  WebKit desktop + Pixel 7 + iPhone 14. Snapshots go to
  `tests/visual/snapshots/<project>/<persona>/<viewport>/<page>.png` so the
  five engines don't clobber each other.
- `npm run test:visual:mobile` — just the two mobile-device projects when you
  only want to check touch-density rendering.

WebKit ≈ Safari's engine, and Playwright's mobile profiles set viewport, DPR,
touch capability, and user-agent correctly — together they catch the
overwhelming majority of layout, touch-event, and rendering bugs. They do
NOT replicate:

- Real iOS Safari scroll-bounce, momentum, or rubber-banding.
- Real touch latency / GPU performance / battery state.
- Hardware sensors (camera, accelerometer, biometrics).
- Real network conditions on cellular.

For changes that affect any of those, the fallback workflow is:

1. Run `npm run dev:next` with `DEV_IMPERSONATE_CLERK_ID=dev_seed_*` set.
2. Find your laptop's LAN IP (`ipconfig getifaddr en0` on macOS).
3. Open `http://<that-ip>:3000/dashboard/student` on your phone's actual
   browser. (Make sure the phone is on the same Wi-Fi.) For external access
   to share with a teammate, `npx cloudflared tunnel --url http://localhost:3000`
   prints a public URL — free, ephemeral, no signup.

Treat that 60-second manual check as required for anything visual-heavy
before merge.

### Real-device capture workflow (iPhone wired to Mac)

When you want me to look at how something **actually** renders on real iOS
Safari — scroll bounce, color fidelity on the iPhone's P3 display, real
touch behavior — plug the iPhone into the Mac and capture from there.
Drop the resulting PNGs into `tests/visual/real-device-captures/`; I can
`Read` any file in that folder at full pixel fidelity.

**One-time setup (5 min):**

1. **On iPhone:** Settings → Apps → Safari → Advanced → toggle **Web
   Inspector** ON.
2. **On Mac:** Safari → Settings → Advanced → check **Show features for
   web developers**.
3. Trust the Mac on the iPhone when prompted (USB connection).

**Per-session (~30s):**

1. Plug the iPhone into the Mac via USB. Unlock the phone.
2. On the iPhone, open Safari and navigate to
   `http://<laptop-LAN-IP>:3000/dashboard/student` (or wherever you want
   to check). The dev bypass + seed fixtures work the same way they do
   in the desktop dev flow.
3. On the Mac, open Safari, then **Develop → [your iPhone name] → [the
   open tab]**. A DevTools window pops up showing the real iPhone Safari's
   DOM + console + computed styles.
4. To capture: either
   - Use DevTools' **screenshot** button on a node (right-click → Capture
     Screenshot in the inspector), or
   - On the iPhone itself: Volume Up + Side Button → Photos →
     AirDrop / USB to Mac.
5. Save the PNG to `tests/visual/real-device-captures/` with a name like
   `iphone17pm__dashboard-student__banner-feels-off.png`. Tell me what to
   look at; I'll read the file.

**Even higher fidelity — built-in iPhone Mirroring (macOS 15+):**
open the **iPhone Mirroring** app on the Mac with the iPhone connected.
The phone's full screen mirrors at native resolution; use Cmd+Shift+4
to screenshot any region. Same destination folder, same workflow.

**For motion-feel checks:** QuickTime Player → File → New Movie
Recording → camera dropdown → choose the iPhone. Records the phone's
screen at full quality to a .mov file. I can't watch video but a human
review still beats emulation for "does this animation feel snappy."

I'll prompt you to do a real-device check whenever a change is visual-
heavy or touches mobile-specific code (touch handlers, viewport meta,
scroll behavior, hover-vs-touch states).

See `docs/design-tokens.md` for the canonical type scale + palette the
drift-checker compares against.

### Playwright end-to-end tests

`npm run test:e2e` — drives the full browser through multi-step user flows.
Built on top of the dev bypass + seed fixtures: the suite auto-starts the
dev server with `DEV_IMPERSONATE_CLERK_ID=dev_seed_admin` and runs
`npm run seed:dev` in global setup, so tests can immediately exercise
admin-only flows like impersonation. CI isn't wired up yet — that needs
a Supabase fixture project reachable from GitHub Actions; tracked as
follow-up.

Tests live in `tests/e2e/`. Add a new spec there when adding a flow worth
protecting end-to-end (UI clicks, navigation, banner state). For pure-logic
checks, keep using Vitest.
