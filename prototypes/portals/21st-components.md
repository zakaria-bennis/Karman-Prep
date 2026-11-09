# Components ported from 21st.dev

Fetched on 2026-10-30 (paid tier, no retrieval cap). Each file names its source
in a comment at the top. "Became" says what survived the port with Karman's
tokens; everything with a Lucide icon got one of ours, every colour became a
token, and anything the design rules ban (gradients on controls, glows,
numbered steps, shimmer) was left out.

| id | Name | Author | Became | File |
| ---: | --- | --- | --- | --- |
| 12460 | Apple Tahoe Liquid Glass Button | 21st.dev | `GlassButton`, `useLiquidGlass`, the glass engine (map planes, shared SVG filter host, press and glow springs). The Lissé squircle tessellation became an analytic rounded-box field; press is scale 0.97 on pointer down per the brief; the capsule slice bake and fluid resize were not needed. | `src/design-system/glass/*` |
| 23552 | Segmented Control (ddoemonn) | ddoemonn | `GlassSegmented`: the grid, thumb and keyboard model; the thumb is a glass control on an opaque track, moving on the quick spring. 34763 (Halaska) was read and not used: its inline token sheet and blur track port less cleanly. | `src/design-system/glass/GlassSegmented.tsx` |
| 43112 | Liquid Toggle (Nimbus) | guglielmogiannattasio | `GlassToggle`: tap, drag, snap past the middle, arrow keys. The WebGL water and the CSS gradient fallback were not ported (weight, and gradients are out); the knob is drawn by the glass engine. | `src/design-system/glass/GlassToggle.tsx` |
| 35156 | Skeleton (vijayksingh) | vijayksingh | `Skeleton` slots: Block, Text, Circle, Swap. The sheen and the 300 ms delay were dropped for a still placeholder of the final layout. | `src/design-system/components/Skeleton.tsx` |
| 29863 | Skeleton shapes (ai2) | ai2 | The shape family idea (circle, bar, pill); its pulse was dropped. | `src/design-system/components/Skeleton.tsx` |
| 20068 | Count Up (unlumen) | unlumen | `CountUp`: the API (to, from, duration, onEnd). The spring and odometer digits were not ported; the count runs on the one easing. | `src/design-system/components/CountUp.tsx` |
| 33152 | Burst (confetti) | 21st.dev | `ConfettiLayer` and `useConfetti`: the radial pop with drag and gravity, through the end screen's canvas port, plus the corner cannons and gold coin discs. 24692 (motion.dev confetti) was read and not used. | `src/design-system/components/Confetti.tsx` |
| 31360 | Drawer (wensity) | wensity | `Sheet`: handle, swipe to dismiss past 40 percent, Escape, scroll lock, through the end screen's port with Apple's projection and rubber band. The Base UI runtime was not used. | `src/design-system/components/Sheet.tsx` |
| 23549 | Progress Bar (ddoemonn) | ddoemonn | `ProgressBar`: the accessible shape (progressbar, valuetext, live completion). Inset shadows, pending shimmer and blue were left out. | `src/design-system/components/ProgressBar.tsx` |
| 19749 | Empty (cnippet) | cnippet | `Empty`: header, title, description, one action. The stacked icon tile was dropped. | `src/design-system/components/Empty.tsx` |
| 35038 | Sparkline (kuratlielia) | kuratlielia | `Sparkline`: label, value, scrubbing by pointer and keys, the end point. Curve smoothing and the motion library were removed (straight segments by the app rules). | `src/design-system/components/Sparkline.tsx` |
| 37467 | Line Chart (luv-jeri) | luv-jeri | Nothing: its CartesianChart utilities were not in the fetch. `LineChart` is drawn to the app-screens rules. | `src/design-system/components/LineChart.tsx` |
| 29334 | Animated Sidebar (starc007) | starc007 | `IconRail`: the sliding active background. The labelled sidebar, submenus and motion library were not ported (rule 52 wants a slim icon rail). | `src/design-system/components/IconRail.tsx` |
| 36571 | Activity Heatmap (dhxwhy) | dhxwhy | `Heatmap`: the calendar layout and the four-step level mix. Views, autoplay, tooltip and stats were not ported. | `src/design-system/components/Heatmap.tsx` |
| 35036 | Sortable Data Table (kuratlielia) | kuratlielia | `DataTable`: the sort model (collator, numbers, empties last). Selection, motion and the CSS module were not ported; rows fold to two lines under 560px. | `src/design-system/components/DataTable.tsx` |
| 6067 | Countdown Timer (anubra266) | anubra266 | `Timer`: the hours, minutes, seconds parts. The Ark UI runtime and its three buttons were not ported; the face hides. | `src/design-system/components/Timer.tsx` |
| 35703 | Notification Stack (sltowl) | sltowl | `ToastProvider`, `useToast`, `NotificationStack`: three visible, the rest queued, dismiss, live region. | `src/design-system/components/Toast.tsx` |
| 24297 | Toast (cnippet) | cnippet | Nothing: it needs Base UI. Read for the kinds and the action slot. | `src/design-system/components/Toast.tsx` |
| 19201 | File Dropzone (joyco) | joyco | `Dropzone`: the drag model and single-file preview; the upload hook was rewritten in place; a camera button appears on coarse pointers. | `src/design-system/components/Dropzone.tsx` |
| 29526 | Step Onboarding Wizard (ziegfiroyt) | ziegfiroyt | `Stepper`: steps, title, content, Back and Continue. Numbered boxes and the badge were dropped (no index numbers); the indicator is segments. 29801 (progress bar stepper) was read and not used. | `src/design-system/components/Stepper.tsx` |
| 25353 | Calendar with Event List (shadcnspace) | shadcnspace | `WeekCalendar`: the event list shape and time-range formatting. Its react-day-picker month grid was not used; the week view, kind marks and legend are drawn to the app rules. 17020 (HeroUI calendar) was read and not used. | `src/design-system/components/Calendar.tsx` |
| 18228 | Billing Upgrade Prompt (preetsuthar17) | preetsuthar17 | `Locked`: the one-line reason and one action. Banner, badge, savings pill and modal variants were left out. | `src/design-system/components/Locked.tsx` |
| 22095 | Circular Progress (shadcnui-blocks) | shadcnui blocks | Nothing yet: the end screen's score gauge (920) is the Daily 10 agent's; kept in the fetch for it. | |
| 28540 | Pricing Tiers List (felipemenezes) | felipemenezes | Nothing: the plan ladder is data in `src/plans/plans.ts`; the comparison table belongs to the pricing page, not the portals. | |

Drawn for Karman, no source: `Panel`, `Well`, `Orb`, `Tabs`, `Row`, `List`,
`Pill`, `KpiStrip`, `Welcome`, `Wordmark`, `DeviceFrame`, `TopBar`,
`BottomBar`, `LineChart`, the four backgrounds, the icon set, and the marks
(the coin, box, flame, level mark, medal, fox and owl are ports of the approved
end screen, `prototypes/daily10-end/`).
