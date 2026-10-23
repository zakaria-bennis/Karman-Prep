// KARMAN LANDING PAGE COPY
//
// Write your own words below, between the two backtick ( ` ) marks.
// The page tells seven messages, each starting with a line like "## 2 Pickup".
// A message with more than one film has a "### " line before each film's words.
// Keep the label before each colon ("headline:", "time:" and so on) and change
// only the words after it. Leave a line empty, or delete it, to hide that text.
// Save the file and refresh the page to see your changes.
//
// The seven messages and their films (films are fixed; words are yours):
//   1 Morning               the kitchen before dawn, then Ava on the bus
//   2 Pickup                the pickup line
//   3 Tennis                Mateo at tennis
//   4 Classes and reviews   Priya in the live class, then David's 1:1 review
//   5 Test day              the night (only the clock, at its end), then phones away
//   6 Next fall             Mateo, then Priya, then Ava
//   7 The edge              orbit and the line
//
// Labels and where they show:
//   headline                    the message's one big line; it stays on screen from the
//                               film it is written under to the end of the message
//                               (in message 4, over Priya's class only: the review's
//                               screen title carries David's film)
//   text, proof, button,        the opening (message 1) and the close (message 7);
//   button note                 in message 6, proof is the line under all three results
//   skip                        message 1, the small link that jumps to the close
//   time, name                  the clock in the corner, until the next clock
//   screen title                the first line of a product screen's caption card
//   feature title, feature text the rest of that caption, under the product screen
//   card title, card text       a second, plain card next to the screen
//   card intro, card date,      message 5: the test date and guarantee card
//   card later, card link
//   result, school              message 6, one per student
//   line note                   message 7, shown when the line is tapped
//
// After message 7, "## Site" holds the words around the film: the header and menu
// links, the footer's columns and footage credits, and the Pause / Play / Light mode
// controls ("pause words" is what follows Pause or Play, "the film").
//
// House rules still apply: no em dashes, nothing the offer doesn't promise,
// and every result shown with "Karman 1:1 tutoring, median 16 weeks".

window.KARMAN_COPY = `
## 1 Morning
### The kitchen before dawn
headline: The climb starts before sunrise.
text: SAT programs that end on your student's test date: live classes, ten minutes of practice a day, and a one-on-one review after every full-length test.
proof: Karman 1:1 students gained 285 points on average. Karman 1:1 tutoring, median 16 weeks.
button: Take the free practice test
button note: Saturday, December 12, live on Zoom
skip: Skip the film

### Ava on the bus
screen title: Ten minutes on the way to school.
time: 6:52 a.m.
name: Ava
feature title: Your Daily 10.
feature text: Ten minutes a day. Every question you miss comes back after 2, 7 and 21 days.

## 2 Pickup
headline: You see the week, every week.
time: 3:15 p.m.
name: The pickup line
feature title: The weekly update.
feature text: Practice time, attendance, test scores and what comes next.

## 3 Tennis
headline: Practice fits between sets.
time: 4:35 p.m.
name: Mateo
feature title: Wordline.
feature text: Today's SAT word in six tries.
card title: Your cohort, between classes.
card text: A group chat for your cohort. Questions are answered by a Karman tutor every day.

## 4 Classes and reviews
### Priya in the live class
headline: Live, twice a week, six students.
time: 8:05 p.m.
name: Priya
feature title: Two live classes a week.
feature text: Tuesdays and Thursdays, 7:00 to 8:30 p.m. ET, in a group of up to six.
card title: A weekly live session.
card text: Test mechanics, alternating with workshops on the skills students miss most.

### David's 1:1 review
screen title: An hour one-on-one after every full-length.
time: 9:00 p.m.
name: David, Karman tutor
feature title: Every mistake, explained.
feature text: Five full-length practice tests, each followed by a 60-minute review with a Karman tutor.

## 5 Test day
### The night
time: 7:40 a.m.
name: Saturday, March 6

### Test day, phones away
headline: One date. One plan.
card intro: Every cohort ends on one SAT date.
card date: Saturday, March 6
card later: Then May 1 and June 5
card text: If your official score isn't at least 50 points above your baseline, your next cohort is free.
card link: How the guarantee works

## 6 Next fall
### Mateo
proof: Karman 1:1 tutoring, median 16 weeks.
result: Mateo · 1570
school: Harvard

### Priya
result: Priya · 1540
school: Stanford

### Ava
result: Ava · 1520
school: UC Berkeley

## 7 The edge
headline: This is where the sky ends.
text: Start with a free practice test: about 75 minutes, live on Zoom with a proctor, then an estimated score range, a domain-by-domain breakdown and a 20-minute results call.
button: Take the free practice test
button note: Saturday, December 12, 10:00 a.m. ET
line note: 100 km up, where the sky ends and space begins.

## Site
logo: Karman
free test link: Free practice test
program link: The SAT Program
private link: Private tutoring
pricing link: Pricing
guarantee link: How the guarantee works
faq link: FAQ
about link: About
sign in link: Sign in
terms link: Terms of Service
privacy link: Privacy Policy
cookies link: Cookie Policy
email: hello@karmanprep.com
footer programs: Programs
footer company: Karman
footer legal: Legal
menu: Menu
close: Close
pause: Pause
play: Play
pause words: the film
light mode: Light mode
credits: Night sky: International Gemini Observatory/NOIRLab/NSF/AURA (CC BY 4.0). Earth from orbit: NASA.
`;
