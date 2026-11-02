# Prompts for Gemini: batch 2

Batch 1 was withdrawn on 1 November 2026. Every prompt in it was the same
scene (a teen with a phone on a bus, a bench or in a kitchen). Batch 2 follows
the new direction in `docs/design/imagery-direction.md`: portraits on colour
backdrops, real places with room for a product card, Zoom tiles, sport-style
portraits, close-up hands and big places.

## How to use this

1. Open Gemini. Use **Nano Banana** for pictures and **Veo** for video.
2. For each prompt, paste the **style block** first, then the prompt.
3. Save each result into `assets/gemini-inbox/` with the exact file name given.
4. Check each one before saving: no watermark, no logo on clothes or devices,
   no readable writing anywhere, hands and faces look right.
5. When you are done, tell Claude: **"batch 2 is in"**.

Nothing goes on the site until you have approved it. Screens in these pictures
are either turned away from the camera or a flat solid green. The real Karman
screen is put in afterwards in code, so the image model never invents one.

If you pick Harbor instead of Pine as the supporting colour, change "deep pine
green" to "deep harbor blue" and "#1F4D45" to "#1D3A5F" everywhere below.

## Style block (paste before every prompt)

```
Photorealistic editorial photograph or film, made to sit in one coordinated set. Colour grade: warm neutral, gentle contrast, shadows leaning toward deep pine green, skin tones natural, fine film grain. Real people with real skin texture, calm and focused, never laughing, never posed like a stock photo. No text, letters or numbers anywhere in the image. No logos on clothing, devices, bags or buildings. No paper, notebooks, worksheets, pencils or calculators. No purple, no neon colours, no glowing orbs, no lens-flare balls, no sparkles, no drop shadows, no gradients in the background. Any phone, laptop or tablet screen is either turned away from the camera, or is a flat, evenly lit solid green (#00B140) with no reflections or glare.
```

---

## Portraits on colour

### 1. cast-student-marigold.png

- **Tool:** Nano Banana
- **Aspect ratio:** 4:5

```
Studio portrait of a 17-year-old student, waist up, standing against a seamless paper backdrop in solid marigold (#EBA21F) that fills the whole frame. Soft key light from above and slightly left, no harsh shadows on the backdrop. Plain charcoal crewneck sweater, AirPods Max resting around the neck. Holding an iPhone low at chest height in both hands, the back of the phone toward the camera. Looking slightly off camera with quiet focus and the hint of a small smile. Camera at chest height, 85mm lens look. Clear empty space above the head for a headline.
```

### 2. cast-student-pine-floor.png

- **Tool:** Nano Banana
- **Aspect ratio:** 4:5

```
Overhead studio photograph looking straight down at a 16-year-old student sitting cross-legged on a seamless paper floor in deep pine green (#1F4D45) that fills the whole frame. An open laptop rests on their knees, the screen tilted toward their face so only the back of the lid and the keyboard edge are seen from above. Wearing a sand-coloured hoodie and white socks, AirPods Pro in. Head tilted down toward the screen, concentrating. Even, soft top light, the student centred with generous coloured space around them.
```

### 3. cast-parent-clay.png

- **Tool:** Nano Banana
- **Aspect ratio:** 4:5

```
Studio portrait of a parent in their mid-forties, waist up, against a seamless paper backdrop in deep clay red (#9A3B26) that fills the whole frame. Wearing a navy work jacket over a white shirt. Holding a phone loosely in one hand by their side, screen turned toward their body. Looking directly at the camera with a calm, reassured expression and a slight smile. Soft key light from the right, warm rim light on the shoulder. Camera at eye level, 85mm lens look.
```

## Zoom tiles

### 4. zoom-student-tile.png

- **Tool:** Nano Banana
- **Aspect ratio:** 16:9

```
A frame that looks exactly like a laptop webcam view on a video call: a 17-year-old student seen straight on from screen height, head and shoulders, centred, at her desk in her own bedroom in the evening. A warm desk lamp lights her face from the side; behind her, a softly blurred bookshelf and a bed corner. She leans slightly toward the camera, listening hard, one hand near her chin, wired earbuds in. Slight webcam softness, no on-screen interface, no other people.
```

### 5. zoom-tutor-loop.mp4

- **Tool:** Veo
- **Aspect ratio:** 16:9
- **Length:** 8 seconds

```
Locked-off webcam-style video of a tutor in his early thirties, head and shoulders, seen straight on from screen height, in his own home study in cool daylight from a window on the left. Plain olive overshirt, a small over-ear headset with a microphone. He explains something calmly, glances down at his own screen once, then back to camera, and makes one small open-hand gesture. Behind him, a plain wall and a softly blurred plant. No on-screen interface, no other people, no dialogue captions.
```

## Real places with room for a card

### 6. pool-bleachers.png

- **Tool:** Nano Banana
- **Aspect ratio:** 16:9

```
Two 16-year-old swimmers in plain dark team parkas sitting on the empty bleachers beside an indoor pool between sessions, hair still damp. One holds a phone with the screen turned away from the camera; the other leans in to look at it, both focused and quiet. Teal water and lane ropes softly out of focus below. Cool overhead light mixed with warm daylight from high windows. The two students sit on the left third of the frame; the right half is calm, uncluttered pool hall, left empty for a card to be placed later. Camera at seat height, 35mm lens look.
```

### 7. pickup-line.png

- **Tool:** Nano Banana
- **Aspect ratio:** 16:9

```
Inside a parked car in a school pickup line in late afternoon, shot from the back seat. In sharp focus, a parent in the driver's seat glances down at a phone held at the steering wheel, screen facing them and away from camera. Through the windshield, softly out of focus, a 16-year-old student with a backpack walks toward the car among other students. Low golden sun, warm light on the dashboard. The top right of the windshield is calm and bright, left clear for a card to be placed later.
```

### 8. rehearsal-stage.png

- **Tool:** Nano Banana
- **Aspect ratio:** 16:9

```
A 17-year-old student sitting on the front edge of an empty school stage during a rehearsal break, a cello resting on its stand beside them, a laptop open on their knees with the screen facing them and away from the camera. Warm stage lights from above, the dark auditorium seats falling away into shadow. The student sits on the right third of the frame, looking down at the laptop, absorbed. The left half is the dark, quiet stage, left clear for a card to be placed later. Wide shot, 35mm lens look.
```

## Sport-style portraits

### 9. infield-overhead.png

- **Tool:** Nano Banana
- **Aspect ratio:** 3:4

```
Shot from directly above: a 16-year-old student lying on her back on the grass infield of a running track after practice, in a plain grey training top, hair spread on the grass, holding a phone up above her face in both hands so the camera sees only the back of the phone. Focused expression. The terracotta track lanes curve across one corner of the frame. Late afternoon sun, long soft shadows, rich green grass.
```

### 10. marigold-light.png

- **Tool:** Nano Banana
- **Aspect ratio:** 4:5

```
Dramatic portrait of a 17-year-old student against a near-black background, lit by a single warm marigold light from the left and a faint deep pine-green fill from the right. AirPods Max on, plain black t-shirt. Eyes down at a phone held at chin height, the back of the phone toward the camera, the screen's glow faintly on his face. Still, intense focus, no smile. Head and shoulders, 85mm lens look.
```

## Close-up hands

### 11. macro-thumb.png

- **Tool:** Nano Banana
- **Aspect ratio:** 4:5

```
Extreme close-up of a teenager's hand holding an iPhone, the thumb hovering just above the lower part of the screen, about to tap. The screen faces the camera at a slight angle and is a flat, evenly lit solid green (#00B140) with no reflections. Very shallow depth of field: the thumb tip and the edge of the screen are sharp, everything else melts into a soft warm sand-coloured background. A sleeve cuff of a dark green hoodie at the wrist. Soft window light from the side. 100mm macro lens look.
```

## Big places

### 12. school-aerial.mp4

- **Tool:** Veo
- **Aspect ratio:** 16:9
- **Length:** 8 seconds

```
Slow drone shot moving forward and gently descending over a high school car park at 6:50 a.m., just after sunrise, long blue shadows and warm light on the rooftops. Only a few parked cars. One 16-year-old student with a backpack walks alone across the car park toward the school entrance, looking down at a phone, small in the frame. Calm, quiet, the start of the day. No signs, no lettering on the building, no logos.
```

### 13. ferry-dawn.mp4

- **Tool:** Veo
- **Aspect ratio:** 16:9
- **Length:** 8 seconds

```
Wide cinematic shot on the open deck of a commuter ferry at dawn, very slow push-in. A 17-year-old student stands at the rail in a dark wool coat and scarf, AirPods Pro in, holding a phone in both hands with its back to the camera, reading it with steady focus while wind moves their hair. Behind, a calm grey-blue harbour and a city skyline soft in the haze, the sky warming toward gold. The student sits on the left third of the frame. No text, no logos, no birds crossing the lens.
```

### 14. library-stair-night.mp4

- **Tool:** Veo
- **Aspect ratio:** 9:16
- **Length:** 8 seconds

```
Vertical video, locked-off camera with a very slow rise. A 16-year-old student sits on a wide stone staircase inside a quiet public library at night, a laptop open on her knees with the screen facing her and away from the camera, its light on her face. Tall shelves and warm brass reading lamps recede above and behind her, softly out of focus. She types a few keys, pauses, then reads with steady focus. Nobody else in frame. No visible book titles or signs.
```

---

## After you save them

- Every still also has a phone crop. If Gemini offers it, make a 9:16 version
  of prompts 1, 3, 6, 7 and 8 with "Aspect ratio 9:16, the subject centred"
  at the end, and save it with `-9x16` before the extension (for example
  `pool-bleachers-9x16.png`).
- Veo clips are 8 seconds. On the site, nothing loops in under 10 seconds, so
  a clip plays once and holds on its last frame, or two clips are joined.
- Then say **"batch 2 is in"**.
