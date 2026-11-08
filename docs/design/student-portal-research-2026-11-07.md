# Student portal: what the research says, and what we did with it

Written 2026-11-07. Sources were read directly unless marked. Khan Academy's skill colours and
grid could not be verified, because its legend is an image and Mobbin needs a paid plan.

## How strong designers decide

| Source | What they do | What Karman does |
| --- | --- | --- |
| [NN/g, progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Put what people often need up front, and stop at two levels | Today holds today's work. Everything else is one clear click away |
| [Khan Academy, 2025](https://blog.khanacademy.org/?p=20367) | Students called it overwhelming and unclear about what to do next | Today opens by naming the next task, its size and its due date |
| [Duolingo, new home](https://blog.duolingo.com/new-duolingo-home-screen-design) | Replaced vague labels with what the learner can do | Skills use their real names, never coded labels |
| [NN/g, information scent](https://www.nngroup.com/articles/information-scent/) | Vague labels weaken a user's guess at what a link delivers | Rows name the task and carry one useful number, such as "3 to review" |
| [NN/g, dashboards](https://www.nngroup.com/articles/dashboards-preattentive/) | Use length and position for quantity. Avoid gauges and donuts | Bars and squares, no progress rings |
| [Tufte, sparklines](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/) | Give a number its history | The score sits on top of its test history |
| [Linear, redesign](https://linear.app/blog/how-we-redesigned-the-linear-ui) | Set hierarchy in black and white before colour | Check screens in greyscale before approving colour |
| [NN/g, animation](https://www.nngroup.com/articles/animation-purpose-ux/) | Motion is for feedback, state change and orientation. Decorative motion often frustrates | Interface motion marks a press or a change, such as a skill moving up |
| [Apple, WWDC25 session 219](https://developer.apple.com/videos/play/wwdc2025/219/) | Glass belongs on the navigation layer, never on content or on other glass | Only the sidebar is glass. Respects Reduced Transparency and Reduced Motion |
| [Duolingo, streaks](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals) | Planned breaks raise retention | Open idea: streak breaks. Not built |

## How Khan Academy shows mastery

- **Levels:** [Not started, Attempted, Familiar, Proficient, Mastered](https://support.khanacademy.org/hc/en-us/articles/5548760867853).
  Mastered needs a mixed-skill assessment, not practice alone.
- **Course mastery:** since August 2026, [Proficient plus Mastered skills, divided by all skills](https://support.khanacademy.org/hc/en-us/articles/115002552631). It used to be weighted points.
- **Unit goals:** [a count per unit, such as "3 of 22 skills to Proficient"](https://support.khanacademy.org/hc/en-us/articles/47078681852045).
- **Moving down:** [tests can move skills up or down, with a summary afterward](https://support.khanacademy.org/hc/en-us/articles/360032987591). Students [can be angry about losing a level](https://support.khanacademy.org/hc/en-us/community/posts/9123270418701), so it needs explaining when it happens.
- **Evidence:** mastery practice is [linked to gains when students actually use it](https://www.nber.org/papers/w32388), but [few students reach the recommended amount](https://www.educationnext.org/5-percent-problem-online-mathematics-programs-may-benefit-most-kids-who-need-it-least/). Nothing found tests the display itself. Getting students to do the work is the larger risk.

## What Karman takes from Khan

- Karman keeps its own four bars (Learning, Developing, Proficient, Mastered), from the portal brief.
- The headline is a plain count: "23 of 39 skills at Proficient or above".
- Each domain has a short goal: "2 of 3 to Proficient".
- The squares and one-hue colours are our design. Khan's exact grid could not be checked.

## Where the founder overrides the research

No study was found on living backgrounds, and motion draws attention by nature, so the
research leans toward stillness. The founder asked for a world that moves. It moves behind
Today and the other screens, stops on question screens, and is still under Reduced Motion.
