# Page Studio

A review tool for every page a visitor, student, parent, tutor or school can see. Open a page, use
it as they would, point at anything to leave a note, or retype its words in place. Notes go to
Claude, who turns word changes into one pull request and asks before acting on anything visual or
functional. Nothing changes on the live site until a pull request is merged.

## Opening it

Sign in as an admin and go to `/studio` (also linked from the admin home, under "The site"). Anyone
who isn't an admin is sent back to the home page. It works on a laptop and on a phone; on narrow
screens the page list and the notes slide in from the sides.

## What you can do

- **Flip through pages.** The list on the left has every page, grouped by area, with a search box
  and filters (not reviewed, needs work, has notes). The arrow buttons, or the ← and → keys, go to
  the previous or next page. "Good" and "Needs work" mark a page as reviewed.
- **Use** (key `b`). The page works as normal: click buttons, open menus, fill forms, watch the
  motion. Reload replays a page's opening animations.
- **Comment** (key `c`). Click anything on the page to pin a note to it, and say whether it's about
  how it looks, how it works, the words, or something else. "Note on the whole page" leaves a note
  on the page itself.
- **Edit words** (key `e`). Click any text and retype it, as you would in a slide. Enter keeps the
  change, Escape undoes it. The page shows your new words with a dashed outline; the toggle in the
  toolbar switches between your edits and the live words.
- **Screen size.** Desktop, laptop, tablet and phone.
- **View as.** Pages are shown as a real account, read only. With "Match each page" on, the studio
  picks a sample student for student pages, a parent for parent pages and a tutor for tutor pages.
  Pick any account from the list to see the site as that person (their plan, their progress).
  Pages that need a specific record (a child, a skill, an exam) open with a sample, or open the
  page that links to them first so the studio can follow the link.

Pages on other sites (Clerk sign-in, Stripe checkout) can't be noted from inside the studio.
Visitor pages are seen while signed in as you.

## How notes reach Claude

Notes start as drafts ("Not sent"). **Send to Claude** marks every draft as sent and copies a brief
to your clipboard; **Copy for Claude** copies the brief again. Paste it to Claude in Claude Duet, or
let Claude read the notes itself with the command below. Each note shows where it stands: With
Claude, Claude asked, Claude is on it, In a pull request, Done. When Claude asks a question, answer
it on the note.

The notes live in three tables: `page_review_notes`, `page_review_messages` and
`page_review_marks` (migration `20261124230000_page_studio.sql`). Row-level security is on with no
policies, so only server code with the service key reads them.

## For Claude

Run these from the repository root on a machine whose `.env.local` reaches the site's database:

```
npm run studio -- list                       # the brief for notes sent to you
npm run studio -- claim <note id…>           # "Claude is on it"
npm run studio -- ask <note id> "question"   # asks the founder; shows as "Claude asked"
npm run studio -- pr <pull request url> <note id…>
npm run studio -- done <note id…>
```

1. `list`, then `claim` the notes you're taking.
2. Copy edits: search the code for the Before text and change it to the After text. Keep the
   founder's words exactly unless they break the page; if they do, ask.
3. Visual or how-it-works comments: if the note leaves a real choice (layout, colour, what a button
   should do), `ask` one short question and wait. Small, clear fixes can go in the same pull request.
4. Open one pull request for the batch, then `pr <url> <ids…>`. The founder merges it. Never merge
   or deploy yourself, and never touch the calculator without his OK (see CLAUDE.md).
5. After the merge, `done <ids…>`.

## Adding a page

Every `page.tsx` under `src/app` must be listed in `src/lib/page-studio/pages-public.ts` (site,
sign-up, student portal, quizzes) or `pages-portals.ts` (parent, tutor, school, admin); the test in
`inventory.test.ts` fails otherwise. Give it an area, a title, the address, who sees it and, for an
address with a `[param]`, either a sample (`samples`) or the page that links to it (`from`).
