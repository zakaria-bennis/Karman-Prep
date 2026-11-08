# iPhone 17 Pro Max frame

Hand-drawn for Karman (no Apple images, logos or marks), in three finishes:
`iphone-17-pro-max-orange.svg` (Cosmic orange), `-blue.svg` (Deep blue),
`-silver.svg` (Silver). Each SVG's screen is a hole, so whatever sits under it shows.
No drop shadow (rule 5): depth is only the light-to-dark edge highlight.

## Use it on a page

```html
<link rel="stylesheet" href="device/device.css">
<script type="module" src="device/device.js"></script>

<k-iphone finish="orange" src="shots/student-home-cohort-phone-dark.webp" alt="Karman Home"></k-iphone>
<k-iphone finish="blue" src="out/dashboard-9x16-night.mp4" video alt="Karman Home scrolling"></k-iphone>
```

- `finish`: `orange` (default), `blue`, `silver`.
- `src`: a 440 x 956 point picture (any multiple: our captures are 1320 x 2868) or
  a video. It fills the screen exactly, top aligned, clipped to the screen's corners.
- `video`: plays muted, inline and looping; paused for visitors who ask for reduced motion.
- Size it with CSS width; the height follows (`k-iphone { width: 320px }`).
- In code: `import { iphoneSVG, SCREEN_BOX, GEOMETRY } from "./device.js"`.
  `iphoneSVG("silver")` returns the frame markup; `SCREEN_BOX` gives the screen
  rectangle as percentages of the frame, to place anything inside it.
- `node device/build.mjs` writes the three SVGs again from `device.js`.
- `preview.html` shows the three finishes with real captures (serve the motion
  folder, for example `python3 -m http.server`, because modules do not load from file://).

## The measurements used

All in iOS points; 1 pt = 3 px on this phone = 0.1657 mm (460 ppi).

| What | Value | Source |
| --- | --- | --- |
| Body | 78.0 x 163.4 mm, so 471 x 986 pt | Apple tech specs, support.apple.com/125091 |
| Screen | 2868 x 1320 px at 460 ppi, so 440 x 956 pt (72.9 x 158.4 mm) | Apple tech specs |
| Screen corner radius | 62 pt | iOS `UIScreen._displayCornerRadius` for the 16 Pro, 16 Pro Max, 17, 17 Pro, 17 Pro Max and Air, as listed by the `device_geometry` package (pub.dev). Apple does not publish it. |
| Border around the screen | 15.5 pt left and right, 15 pt top and bottom (2.5 mm): what is left of the body after the screen | derived |
| Outer corner radius | 77.5 pt, concentric with the screen | derived |
| Metal edge seen from the front | 4 pt, then 11.5 pt of black glass bezel | judged from Apple's product photos |
| Dynamic Island | 126 x 37 pt, 11 pt below the screen's top edge | the prototype's own frame (`prototypes/portals/src/design-system/components/DeviceFrame.tsx`), which matches iOS's island |
| Side buttons | left: Action (42 pt), volume up and down (66 pt each); right: side button (103 pt), Camera Control (80 pt); 3 pt proud | approximate, from published side views; not an Apple drawing |
| Finishes | Cosmic orange #E2702A, Deep blue #2F3B54, Silver #D3D4D2, each with a lighter and darker edge tone | Apple's finish names; colours matched by eye |

The SVG adds 4 pt on every side for the buttons, so its viewBox is 479 x 994 and the
screen starts at (19.5, 19).
