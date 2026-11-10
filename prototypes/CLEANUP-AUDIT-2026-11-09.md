# What loads into a Claude session for Karman, and what to clear out

Written 9 November 2026 for Zakaria. It lists everything a new session reads or is handed before it
does any work, says which of it is stale or irrelevant, and gives a keep, turn off or archive call
for each. Nothing here was deleted. What was already fixed is listed at the end.

## The short version

A design session for Karman starts with roughly this in its head:

- 36 plugins, which add about 250 skills and about 40 connectors with several hundred tools.
- A hook that orders the model to run a planning process before answering anything.
- Two different copies of the project instructions, one of them a month out of date.
- 31 saved notes, about a third of them superseded.
- A product brief that, until today, described a brand voice and a look you have since replaced.

Almost none of it is about the task in front of it. The model does not ignore what it is handed. It
tries to honour it. That is why a design request drifted toward old rules, old prices and old
screens.

The biggest single cause is the first item in section 1.

## 1. The folder a session opens is a month behind

`/Users/zakariabennis/Karman-Prep` is checked out on `claude/first-pass`. That branch is about 2,400
files behind `main`. So a new session:

- reads the `CLAUDE.md` from that old branch. It still says to branch from `claude/site-redesign`,
  lists Platform at $29 and Plus at $49, says the design rules "win over everything", and points at a
  mock that was replaced;
- sees month-old code, and has to discover that `main` moved on.

**Do this first:** once `claude/painted-site` is merged, switch that folder to `main`. It has
uncommitted mock files from early November; commit or discard those first. After that, every session
starts from current files.

## 2. Plugins: 36 installed, about 8 are useful here

Installed in the desktop app: 21st, Box, Brand Voice, Claude Bridge, Data, Design, E2E Test
Generator, Figma, Legal, Marketing, Mobbin, Operations, PDF Viewer, Plugin Management, Productivity,
SearchFit SEO, Security Guidance, Slack, Small Business, Stripe, Superdesign, Superpowers, UI Color
Palette, Zoom, claude-md-management, code-review, context7, designs-drift, firecrawl,
frontend-design, github, playwright, serena, supabase, typescript-native-lsp, watch-video.

| Call | Plugins | Why |
|---|---|---|
| Keep for design work | Mobbin, 21st, playwright, context7, frontend-design | Reference screens, components, a real browser, current library docs. |
| Keep for building and shipping | github, supabase, Stripe, code-review, typescript-native-lsp | The product actually uses these. |
| Turn off unless you are doing that job | Legal, Small Business, Operations, Marketing, Brand Voice, Data, SearchFit SEO, Productivity, Zoom, Box, Slack, PDF Viewer, firecrawl, watch-video, E2E Test Generator, Security Guidance, Design | About 180 skills between them. None is about building Karman's site. Small Business alone adds 40 and Zoom 25. |
| Remove | UI Color Palette | It forced every session to start as a "color system orchestrator". Its setting is switched off, but a plugin update can switch it back. |
| Decide | Superpowers | See section 3. |
| Decide | Superdesign, designs-drift, Figma, serena, Claude Bridge, claude-md-management, Plugin Management | Overlap with the `impeccable` skill, or unused in this project. Keep one design process, not four. |

Connectors that come with these or with your account and are loaded into every session: Vercel
(over 200 tools, and the site runs on Cloudflare, not Vercel), a reverse-engineering toolkit (about
200 tools), computer control, Shopify, two Gmail connectors, Calendar, Drive, Sheets, Slides, Docs,
Box, Zoom, Wispr notes, an audio-analysis tool, a whiteboard tool, Higgsfield. For design work, none
of these is needed. Turn them off per session, or run design in a project where they are not
connected.

## 3. Hooks: instructions injected into every session

| Hook | What it does | Call |
|---|---|---|
| Superpowers, at session start | Injects a block marked "extremely important" telling the model it must invoke a skill before any response, and to brainstorm and write a spec before building. | This is why sessions open with process instead of work. Remove Superpowers, or accept that every session starts that way. `impeccable` already gives design work a process. |
| Impeccable, after each edit and at the end | Scans UI files for known design faults and reports them. | Keep. It caught two real contrast problems today. |
| Stripe CLI, at session start | Prints an update notice. | Harmless noise. Turn Stripe off outside payment work. |

## 4. Skills outside plugins

- In your user folder: animation-performance, animation-vocabulary, conversion-copywriter,
  find-skills, four GSAP skills, hairline-adopt, hairline-create, impeccable, onetake, three Remotion
  skills, reverse-engineer-anything.
- In the project: apple-design, taste-skill, web-design-guidelines.

Keep for this work: impeccable, conversion-copywriter, animation-performance. The Hairline skills
draw the isometric line figures you called ugly; remove them. Remotion, onetake and GSAP are for
video and a library the site does not use; remove or move them to a video project.
reverse-engineer-anything is unrelated. Having both `impeccable` and `taste-skill` gives two design
processes that disagree; pick one. I would keep `impeccable`.

## 5. Project files the model reads or is pointed at

| File | State | Call |
|---|---|---|
| `CLAUDE.md` (on `claude/painted-site`) | Updated today. | Keep. This becomes the one true copy once merged. |
| `CLAUDE.md` (in the main folder) | A month old. See section 1. | Replaced when that folder moves to `main`. |
| `PRODUCT.md` | Updated today. Was telling every design session "confident, not cocky", "serious first, never poppy", +285 and the old guarantee. | Keep. It is the product brief design sessions load. |
| `AGENTS.md` | A second set of agent instructions. | Check it says the same as `CLAUDE.md`, or delete it. |
| `docs/design-rules.md` | 58 numbered rules from October, many since removed or overruled. | Archive. Your current direction is in `PRODUCT.md`. |
| `docs/brand.md`, `docs/design-tokens.md`, `docs/style-bible.md` | Describe looks that were retired. | Archive. |
| `docs/roadmap.md`, `docs/handoff.md`, `docs/audit-2026-05-15.md`, `docs/legacy-feature-review-2026-10-06.md` | May to October snapshots. | Archive. |
| `docs/overnight/` | Reports from the 8 November overnight sessions. | Archive once you have read them. |
| `docs/` as a whole | 543 files, 83 MB. | Keep `business/`, `ingestion/`, `superpowers/specs/` for the calculator, and the vocabulary source. Move the rest to `docs/archive/`. |
| `.impeccable/mocks/` | 239 MB of mockups: the film site, three October redesigns, a rebuild, the first painted mock. | Archive or delete all but `decision/`, which holds today's sketches. A session that greps for "home page" finds seven old ones first. |
| `prototypes/` | 11 MB. The old portal prototypes and a 1 November handover. | Keep `daily10-end/` if still the reference. Archive the rest. Keep the two files dated 2026-11-09. |
| `src/lib/marketing/offer.ts` | Current, with the 280 figure and the tiered guarantee added today. | Keep. This is where prices belong, and a design session should only read it when it needs a number. |

## 6. Saved notes (the model's memory of past sessions)

31 notes were loaded as an index at the start of every session. Six were superseded by today's
direction and are now in an `archive/` folder beside them, not deleted: the white and marigold theme,
the October site design decisions, the 26 October copy rules, the imagery direction, the AI device
rules, and the 1 November handover.

Still loaded, and worth your eye because they are old: the roadmap (May), the Slack chat plan (May),
support channels (May), pending routines (April), the phase state (30 October), UX rules for every
build (October, mentions orb loaders and Hairline drawings), and the plan ladder (now carries a note
about the tiered guarantee and 280).

## 7. Working copies and transcripts

- 50 git worktrees exist for this repository. Most belong to finished work. Each is a full copy of
  the code that a search can land in. Clean up merged ones from the desktop app.
- 47 separate transcript folders exist for this project, one per worktree a session ever ran in.
  They are not loaded, but each has its own copy of nothing: notes are only shared with sessions
  opened in the main folder.

## 8. What a clean design session needs, and nothing else

1. The main folder on `main`, with one current `CLAUDE.md`.
2. `PRODUCT.md` and `prototypes/HANDOVER-home-2026-11-09.md`.
3. Plugins: Mobbin, 21st, playwright, context7, github. Skill: impeccable.
4. No Superpowers hook, no UI Color Palette.
5. Old docs and mocks out of the way in an archive folder.

## Already done today

- Switched off the UI Color Palette setting that forced the orchestrator role.
- Rewrote the stale parts of `PRODUCT.md` and `CLAUDE.md` on `claude/painted-site`.
- Archived six superseded notes and added one with the current working rules.
- Recorded the agreed home page direction where the design skill reads it
  (`.impeccable/surfaces/src-app-site-page-tsx.md`).
