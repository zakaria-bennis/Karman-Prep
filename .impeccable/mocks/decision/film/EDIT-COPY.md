# Writing your own landing page copy

## The easy way: the copy editor

1. In the Terminal panel, run `npm run copy`. Your browser opens the editor.
2. Change any words on the left. The real landing page on the right updates
   as you type; click "Show" on a message (or on one of its films) to jump the
   preview there, and use "Phone" to see it on a phone.
3. Red notes (like an em dash) must be fixed before you can save; amber notes
   are reminders of the house rules.
4. Click "Save to the page". That writes `copy.js` on your computer only.
   Nothing goes live until you tell Claude to check it and publish it.
5. Press Ctrl+C in the Terminal panel to stop the editor.

## By hand

All the words on the landing page live in one file: `copy.js`, in this folder.

1. Open `copy.js` in any text editor (TextEdit works; choose Format, then Make
   Plain Text).
2. Change the words after each label. For example, change
   `screen title: Ten minutes on the way to school.` to
   `screen title: Ten minutes before first period.`
3. Save, then refresh the landing page in your browser.

Other pages have their own sections: 21 to 27 the SAT Program, 31 to 36 private tutoring, 41 to 45
the free practice test, 51 to 55 the guarantee, 61 to 65 About, 71 the FAQ. Form labels start with "form".

The home page has eleven sections, top to bottom: Opening, Live classes, Classes
built on mistakes, Daily 10, Parent updates, Between classes, Test date, Guarantee, Campus film,
Student messages and The close. Each starts with a line like `## 8 Guarantee`. The
`## Site` block holds the header, menu and footer words, the pricing page (labels
starting `pricing`) and the students map (labels starting `map`).

After the seven messages, a `## Site` block holds the words around the film:
the header and menu links, the footer's column titles, links and footage
credits, and the Pause, Play and Light mode controls. The copy editor shows it
as the last box, "Site: header, menu and footer".

Things to know:

- Keep the labels (`headline:`, `time:`, `feature text:` and so on), the
  `## 1` to `## 7` message lines, the `## Site` line and the `### ` film lines
  exactly as they are.
- A headline stays on screen from the film it is written under to the end of
  its message (in Live classes it stays over Priya's class only); a clock stays until the next
  clock.
- `skip:` in message 1 is the small "Skip the film" link under the button.
  Leave it empty to hide the link.
- Delete a line, or leave it empty after the colon, to hide that piece of text.
- Keep the two backtick marks ( ` ) at the top and bottom of the copy.
- Headlines read best at eight words or fewer, because each one is set very
  large and animated word by word.
- The house copy rules still apply: no em dashes, no invented claims, and
  prices and dates must match the offer. Every score is shown with
  "Karman 1:1 tutoring, median 16 weeks".

Send me a message when you've changed it and I'll check every line against the
copy rules and the overlap scan before it goes on the real site.
