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

The page tells seven messages: Morning, Pickup, Tennis, Classes and reviews,
Test day, Next fall and The edge. Each message has one headline. Some play
more than one film (Morning: the kitchen, then Ava on the bus); their words
are split by a `### ` line naming the film, for example `### Ava on the bus`.
The top of `copy.js` lists the messages, their films and which labels show
where (for example `screen title:`, the first line of a product screen's
caption, and `line note:`, the sentence shown when someone taps the line at
the end).

After the seven messages, a `## Site` block holds the words around the film:
the header and menu links, the footer's column titles, links and footage
credits, and the Pause, Play and Light mode controls. The copy editor shows it
as the last box, "Site: header, menu and footer".

Things to know:

- Keep the labels (`headline:`, `time:`, `feature text:` and so on), the
  `## 1` to `## 7` message lines, the `## Site` line and the `### ` film lines
  exactly as they are.
- A headline stays on screen from the film it is written under to the end of
  its message (in Classes and reviews it stays over Priya's class only; the
  review's screen title carries David's film); a clock stays until the next
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
