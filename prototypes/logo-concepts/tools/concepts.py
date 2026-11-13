"""The logo concepts. Each is a viewBox plus timed layers (see svgbuild.build)."""
import math
from lib import smooth_d, shape_glyphs, rdp
from svgbuild import word, star_d, ellipse_d

HANKEN = "HankenGrotesk%5Bwght%5D.ttf"


def prep_caps(x, y, size=20, t0=0.0, step=0.07, track=0.32, cls="ink", text="PREP", anim="rise", wght=600):
    glyphs, width = shape_glyphs(HANKEN, text, size, x, y, tracking=track, wght=wght)
    return [dict(k="fill", d=d, cls=cls, t0=t0 + i * step, anim=anim) for i, d in enumerate(glyphs)], width


def P(*pts):
    return smooth_d(list(pts))


# ---------- the founder's own signature (src/components/site/home/signature.ts + Guarantee.tsx) ----------
LETTERS = [
    [[0.72, 0.78], [0.42, 1], [0.08, 0.62], [0.14, 0.14], [0.42, 0.02], [0.68, 0.4], [0.76, 0.96], [0.76, 0.5], [0.8, 0.06], [1, 0.08]],
    [[0, 0.08], [0.18, 0.98], [0.2, 0.66], [0.46, 1], [0.72, 0.84], [0.76, 0.58]],
    [[0, 0.05], [0.1, 0.96], [0.1, 0.05], [0.16, 0.7], [0.36, 1], [0.5, 0.6], [0.5, 0.05], [0.56, 0.7], [0.76, 1], [0.9, 0.6], [0.9, 0.06], [1.05, 0.1]],
    [[0.72, 0.78], [0.42, 1], [0.08, 0.62], [0.14, 0.14], [0.42, 0.02], [0.68, 0.4], [0.76, 0.96], [0.76, 0.5], [0.8, 0.06], [1, 0.08]],
    [[0, 0.05], [0.1, 0.96], [0.1, 0.05], [0.16, 0.7], [0.4, 1], [0.56, 0.6], [0.56, 0.06], [0.7, 0.2], [1, 0.9]],
]


def arman(lean=1.15, tall=36, wideM=1.3, round_=0.22):
    X0, X1, BASE, END = 369, 741, 254, (741, 212)
    widths = [1, 0.8, wideM, 1, 1]
    pts = []
    x = 0
    for i, letter in enumerate(LETTERS):
        for lx, ly in letter:
            pts.append((x + lx * widths[i], ly))
        x += widths[i] + 0.1
    total = x
    run = X1 - X0 - lean * tall
    p = [(X0 + (px / total) * run + lean * py * tall, BASE - py * tall) for px, py in pts]
    p[-1] = END
    k = round_ / 2.2
    d = f"M{p[0][0]:.1f} {p[0][1]:.1f}"
    for i in range(len(p) - 1):
        a, b, c, e = p[max(0, i - 1)], p[i], p[i + 1], p[min(len(p) - 1, i + 2)]
        c1 = (b[0] + (c[0] - a[0]) * k, b[1] + (c[1] - a[1]) * k)
        c2 = (c[0] - (e[0] - b[0]) * k, c[1] - (e[1] - b[1]) * k)
        d += f" C {c1[0]:.1f} {c1[1]:.1f}, {c2[0]:.1f} {c2[1]:.1f}, {c[0]:.1f} {c[1]:.1f}"
    return d


def concepts():
    C = []

    # 1. Kármán Line --------------------------------------------------------------------------------
    W = word("GreatVibes-Regular.ttf", "Karman", 100)
    caps, cw = prep_caps(0, 0, 17)
    arc = P((14, 40), (90, 31), (170, 28), (250, 31), (330, 40))
    L = [dict(k="word", w=W, t0=0.1, dur=1.9),
         dict(k="line", d=arc, sw=1.6, t0=1.75, dur=0.8, ease=True, cls="acc"),
         dict(k="star", x=340, y=8, r=9, t0=2.35, twinkle=0.2)]
    caps, cw = prep_caps(330 - 74, 66, 15, t0=2.2)
    L += caps
    C.append(dict(id="karman-line", name="Kármán Line",
                  feel="Classic flowing script over a thin horizon arc, with a star rising past the line.",
                  viewBox="-8 -100 370 185", layers=L))

    # 2. Copperplate --------------------------------------------------------------------------------
    W = word("PinyonScript-Regular.ttf", "Karman Prep", 100)
    x0, y0, x1, y1 = W["bbox"]
    C.append(dict(id="copperplate", name="Copperplate",
                  feel="Formal engraved hand: fine hairlines and swelling downstrokes. Quietly expensive.",
                  viewBox=f"{x0 - 12:.0f} {y0 - 14:.0f} {x1 - x0 + 24:.0f} {y1 - y0 + 34:.0f}",
                  layers=[dict(k="word", w=W, t0=0.1, dur=2.4),
                          dict(k="line", d=P((x0 + 30, y1 + 12), ((x0 + x1) / 2, y1 + 8), (x1 - 30, y1 + 12)), sw=1.2, t0=2.3, dur=0.6, ease=True)]))

    # 3. Paper plane --------------------------------------------------------------------------------
    W = word("Parisienne-Regular.ttf", "Karman", 100)
    ex, ey = W["exit"]
    trail = P((ex, ey), (ex + 20, ey - 10), (ex + 34, ey - 34), (ex + 22, ey - 54), (ex + 4, ey - 46), (ex + 12, ey - 28), (ex + 40, ey - 36), (ex + 66, ey - 60))
    px, py = ex + 72, ey - 66
    plane = f"M{px - 13:.1f} {py + 2:.1f} L{px + 9:.1f} {py - 9:.1f} L{px + 1:.1f} {py + 11:.1f} L{px - 3:.1f} {py + 3:.1f} Z"
    fold = f"M{px - 3:.1f} {py + 3:.1f} L{px + 9:.1f} {py - 9:.1f}"
    L = [dict(k="word", w=W, t0=0.1, dur=1.8),
         dict(k="line", d=trail, sw=1.4, t0=1.85, dur=0.75, cls="acc", op=0.7),
         dict(k="fill", d=plane, t0=2.45, anim="pop", cls="acc"),
         dict(k="line", d=fold, sw=1, t0=2.6, dur=0.2, cls="ink", op=0.5)]
    caps, _ = prep_caps(150, 44, 15, t0=2.2)
    L += caps
    C.append(dict(id="paper-plane", name="Paper Plane",
                  feel="A friendly postcard hand. The n's tail loops off as a little plane's flight path.",
                  viewBox="-14 -140 460 205", layers=L))

    # 4. Orbit ---------------------------------------------------------------------------------------
    W = word("Allura-Regular.ttf", "Karman", 100)
    cx, cy, rx, ry, rot = 130, -22, 178, 40, -7
    back = ellipse_d(cx, cy, rx, ry, rot, 0.5, 1.0)
    front = ellipse_d(cx, cy, rx, ry, rot, 0.0, 0.5)
    full = ellipse_d(cx, cy, rx, ry, rot, 0.0, 1.0)
    still = (cx + rx * math.cos(math.radians(rot)) * math.cos(-1.1) - ry * math.sin(math.radians(rot)) * math.sin(-1.1),
             cy + rx * math.sin(math.radians(rot)) * math.cos(-1.1) + ry * math.cos(math.radians(rot)) * math.sin(-1.1))
    L = [dict(k="line", d=back, sw=1.3, t0=0.05, dur=0.7, cls="acc", op=0.6, ease=True),
         dict(k="word", w=W, t0=0.35, dur=1.7),
         dict(k="line", d=front, sw=1.3, t0=0.75, dur=0.7, cls="acc", op=0.6, ease=True),
         dict(k="orbiter", path=full, r=4.2, t0=2.0, period=7, still=still)]
    C.append(dict(id="orbit", name="In Orbit",
                  feel="A soft script with a ring around it, like a planet's. A small moon keeps circling.",
                  viewBox="-60 -82 380 124", layers=L))

    # 5. Monoline ------------------------------------------------------------------------------------
    W = word("Sacramento-Regular.ttf", "Karman", 100)
    caps, cw = prep_caps(250, 26, 14, t0=1.9, track=0.45)
    L = [dict(k="word", w=W, t0=0.1, dur=1.7)] + caps + [dict(k="dot", x=243, y=21, r=2.4, t0=1.8, cls="acc")]
    C.append(dict(id="monoline", name="Monoline",
                  feel="One even, fine line, like a neon sign or a fountain pen on its side. Modern and light.",
                  viewBox="-10 -86 350 125", layers=L))

    # 6. Ink & Stars ---------------------------------------------------------------------------------
    W = word("AlexBrush-Regular.ttf", "Karman", 100)
    L = [dict(k="word", w=W, t0=0.1, dur=1.8),
         dict(k="dot", x=330, y=-40, r=3.0, t0=1.95, cls="ink"),
         dict(k="dot", x=343, y=-56, r=2.2, t0=2.05, cls="ink"),
         dict(k="star", x=358, y=-76, r=8, t0=2.18, twinkle=0.1),
         dict(k="star", x=338, y=-92, r=4.5, t0=2.32, twinkle=0.8)]
    caps, _ = prep_caps(232, 46, 15, t0=2.2)
    L += caps
    C.append(dict(id="ink-stars", name="Ink and Stars",
                  feel="A brush script whose last flick of ink turns into stars. Painterly, a little magic.",
                  viewBox="-6 -106 380 170", layers=L))

    # 7. Signature -----------------------------------------------------------------------------------
    W = word("MrsSaintDelafield-Regular.ttf", "Karman", 110)
    x0, y0, x1, y1 = W["bbox"]
    slash = P((x0 + 40, y1 + 10), (x0 + 120, y1 + 4), (x1 - 10, y1 - 6), (x1 + 30, y1 - 14))
    L = [dict(k="word", w=W, t0=0.1, dur=1.5),
         dict(k="line", d=slash, sw=2.2, t0=1.6, dur=0.35, cls="acc"),
         dict(k="dot", x=x1 + 40, y=y1 - 16, r=3, t0=1.95, cls="acc")]
    caps, _ = prep_caps(x1 - 60, y1 + 40, 14, t0=2.0)
    L += caps
    C.append(dict(id="signature", name="Signed",
                  feel="A quick, confident autograph with one swift stroke under it. Personal and a little cocky.",
                  viewBox=f"{x0 - 12:.0f} {y0 - 12:.0f} {x1 - x0 + 70:.0f} {y1 - y0 + 70:.0f}", layers=L))

    # 8. Flourish ------------------------------------------------------------------------------------
    W = word("MonsieurLaDoulaise-Regular.ttf", "Karman", 100)
    x0, y0, x1, y1 = W["bbox"]
    caps, _ = prep_caps(x1 - 70, y1 + 26, 14, t0=2.6)
    C.append(dict(id="flourish", name="Flourish",
                  feel="An ornate capital that loops and curls before the word runs off. Storybook whimsy.",
                  viewBox=f"{x0 - 10:.0f} {y0 - 10:.0f} {x1 - x0 + 22:.0f} {y1 - y0 + 50:.0f}",
                  layers=[dict(k="word", w=W, t0=0.1, dur=2.6)] + caps))

    # 9. Whisper -------------------------------------------------------------------------------------
    W = word("Italianno-Regular.ttf", "Karman Prep", 100)
    x0, y0, x1, y1 = W["bbox"]
    s1, s2, s3 = (x1 - 74, y0 - 2), (x1 - 46, y0 - 22), (x1 - 14, y0 - 12)
    L = [dict(k="word", w=W, t0=0.1, dur=2.2),
         dict(k="line", d=P(s1, s2), sw=0.8, t0=2.25, dur=0.25, cls="acc", op=0.7),
         dict(k="line", d=P(s2, s3), sw=0.8, t0=2.45, dur=0.25, cls="acc", op=0.7),
         dict(k="star", x=s1[0], y=s1[1], r=4, t0=2.15, twinkle=0.3),
         dict(k="star", x=s2[0], y=s2[1], r=6, t0=2.35, twinkle=0.9),
         dict(k="star", x=s3[0], y=s3[1], r=4.5, t0=2.55, twinkle=1.4)]
    C.append(dict(id="whisper", name="Whisper",
                  feel="Tall, airy and calm, with a tiny three-star constellation hung above Prep.",
                  viewBox=f"{x0 - 10:.0f} {y0 - 36:.0f} {x1 - x0 + 22:.0f} {y1 - y0 + 50:.0f}", layers=L))

    # 10. Bounce -------------------------------------------------------------------------------------
    W = word("MeowScript-Regular.ttf", "Karman", 100)
    ex, ey = 296, -15
    hop1 = P((ex, ey), (ex + 12, ey - 26), (ex + 24, ey - 4))
    hop2 = P((ex + 24, ey - 4), (ex + 34, ey - 22), (ex + 44, ey - 8))
    L = [dict(k="word", w=W, t0=0.1, dur=1.8),
         dict(k="line", d=hop1, sw=1.3, t0=1.85, dur=0.28, cls="acc", op=0.6),
         dict(k="line", d=hop2, sw=1.3, t0=2.1, dur=0.22, cls="acc", op=0.6),
         dict(k="star", x=ex + 52, y=ey - 18, r=9, t0=2.3, twinkle=0.2)]
    caps, _ = prep_caps(208, 46, 15, t0=2.3)
    L += caps
    C.append(dict(id="bounce", name="Bounce",
                  feel="Rounder, bouncier letters. A star hops off the end of the word. The most playful one.",
                  viewBox="-4 -92 380 160", layers=L))

    # 11. The founder's hand -------------------------------------------------------------------------
    stem = "M176 128 C 179 170, 178 232, 162 300"
    arm = "M312 150 C 314 132, 298 126, 284 140 C 256 172, 214 222, 166 266 C 190 240, 232 212, 268 212 C 304 213, 322 250, 360 274 C 400 298, 470 306, 590 302 C 720 298, 850 290, 958 278"
    tail = "M741 212 C 765 220, 800 221, 845 216 C 895 212, 930 222, 950 230"
    L = [dict(k="line", d=stem, sw=6.5, t0=0.1, dur=0.35, cls="ink"),
         dict(k="line", d=arm, sw=6.5, t0=0.45, dur=0.95, cls="ink", ease=True),
         dict(k="line", d=arman(), sw=5.5, t0=1.25, dur=1.2, cls="ink"),
         dict(k="line", d=tail, sw=6.5, t0=2.4, dur=0.3, cls="ink"),
         dict(k="star", x=975, y=232, r=13, t0=2.6, twinkle=0.2)]
    C.append(dict(id="founders-hand", name="Your Hand",
                  feel="Your own signature from the guarantee section, drawn as one pen line, ending in a star.",
                  viewBox="130 110 880 210", layers=L))

    # 12. K in orbit (monogram) ----------------------------------------------------------------------
    K = word("GreatVibes-Regular.ttf", "K", 150, x=10, y=0)
    x0, y0, x1, y1 = K["bbox"]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry, rot = 118, 36, -22
    L = [dict(k="line", d=ellipse_d(cx, cy, rx, ry, rot, 0.5, 1.0), sw=2, t0=0.05, dur=0.6, cls="acc", op=0.7, ease=True),
         dict(k="word", w=K, t0=0.25, dur=1.4),
         dict(k="line", d=ellipse_d(cx, cy, rx, ry, rot, 0.0, 0.5), sw=2, t0=0.6, dur=0.6, cls="acc", op=0.7, ease=True),
         dict(k="orbiter", path=ellipse_d(cx, cy, rx, ry, rot, 0, 1), r=6, t0=1.6, period=6,
              still=(cx + rx * math.cos(math.radians(rot)), cy + rx * math.sin(math.radians(rot)))),
         dict(k="star", x=cx - 70, y=cy - 70, r=10, t0=1.7, twinkle=0.4)]
    C.append(dict(id="k-orbit", name="K in Orbit", mono=True,
                  feel="Monogram. The script K with a ringed orbit and a moon. Works as the app icon.",
                  viewBox=f"{cx - 130:.0f} {cy - 130:.0f} 260 260", layers=L))

    # 13. KP ligature (monogram) ---------------------------------------------------------------------
    K = word("PinyonScript-Regular.ttf", "K", 200, x=0, y=0)
    Pg = word("PinyonScript-Regular.ttf", "P", 175, x=92, y=26)
    xs = [K["bbox"][0], K["bbox"][2], Pg["bbox"][0], Pg["bbox"][2]]
    ys = [K["bbox"][1], K["bbox"][3], Pg["bbox"][1], Pg["bbox"][3]]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    L = [dict(k="word", w=K, t0=0.1, dur=1.3),
         dict(k="word", w=Pg, t0=1.3, dur=1.0, cls="acc"),
         dict(k="star", x=max(xs) - 4, y=min(ys) + 12, r=7, t0=2.3, twinkle=0.3)]
    side = max(max(xs) - min(xs), max(ys) - min(ys)) + 40
    C.append(dict(id="kp-ligature", name="KP Ligature", mono=True,
                  feel="Monogram. A copperplate K with the P written through it, like an old bookplate.",
                  viewBox=f"{cx - side / 2:.0f} {cy - side / 2:.0f} {side:.0f} {side:.0f}", layers=L))

    # 14. Constellation K ----------------------------------------------------------------------------
    K = word("Allura-Regular.ttf", "K", 230, x=0, y=0)
    x0, y0, x1, y1 = K["bbox"]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 - 10
    L = []
    t = 0.0
    stars = []
    segs = []
    for s in K["strokes"]:
        pts = rdp(s["pts"], 12)
        for p in pts:
            if all(math.dist(p, q) > 16 for q in stars):
                stars.append(p)
        segs += [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    starL = [dict(k="star", x=p[0], y=p[1], r=7.5 if i % 2 == 0 else 5, t0=0.05 + i * 0.07,
                  twinkle=(i * 0.37) % 1.5, cls="acc") for i, p in enumerate(stars)]
    lines = []
    for a, b in segs:
        lines.append(dict(k="line", d=f"M{a[0]:.1f} {a[1]:.1f} L{b[0]:.1f} {b[1]:.1f}", sw=1.8, t0=0.5 + t, dur=0.16, cls="ink", op=0.75))
        t += 0.12
    W = word("Allura-Regular.ttf", "Karman", 62, x=cx - 82, y=y1 + 46)
    L = lines + starL + [dict(k="word", w=W, t0=0.75 + t, dur=1.2)]
    C.append(dict(id="constellation-k", name="Constellation K", mono=True,
                  feel="Stars light up and join into a K with straight lines, like your reading and math constellations. Then the name is written under it.",
                  viewBox=f"{cx - 140:.0f} {y0 - 22:.0f} 280 {y1 - y0 + 92:.0f}", layers=L))

    # 15. Seal ---------------------------------------------------------------------------------------
    K = word("GreatVibes-Regular.ttf", "K", 84, x=0, y=0)
    x0, y0, x1, y1 = K["bbox"]
    cx, cy = (x0 + x1) / 2 + 2, (y0 + y1) / 2 + 2
    R = 104
    ring = f"M{cx} {cy - R} a{R} {R} 0 1 1 -0.01 0"
    ring2 = f"M{cx} {cy - 70} a70 70 0 1 1 -0.01 0"
    text = "KARMAN PREP  ·  SAT  ·  KARMAN PREP  ·  SAT  ·  "
    glyphs, tw = shape_glyphs(HANKEN, text, 13.5, 0, 0, tracking=0.18, wght=700)
    # place glyphs round a circle of radius 86
    rr = 84
    gl = []
    adv_total = 2 * math.pi * rr
    scale = adv_total / tw
    # recompute positions per glyph by re-shaping each char's advance
    pos = 0
    from lib import shape as _shape
    raw = []
    for ch in text:
        g, w = shape_glyphs(HANKEN, ch, 13.5, 0, 0, tracking=0.18, wght=700)
        raw.append((g[0] if g else None, w))
    for i, (g, w) in enumerate(raw):
        ang = (pos + w / 2) * scale / rr - math.pi / 2
        if g:
            gx = cx + rr * math.cos(ang)
            gy = cy + rr * math.sin(ang)
            gl.append(dict(k="raw", svg=f'<g transform="translate({gx:.2f} {gy:.2f}) rotate({math.degrees(ang) + 90:.2f}) translate({-w / 2:.2f} 4.8)"><path class="ink fxr" d="{g}"/></g>'))
        pos += w
    L = [dict(k="line", d=ring, sw=3.2, t0=0.05, dur=0.9, cls="ink", ease=True),
         dict(k="line", d=ring2, sw=1.2, t0=0.3, dur=0.8, cls="ink", ease=True, op=0.6),
         dict(k="group_start", attrs='class="fx" style="animation-delay:.9s;animation-duration:.8s"')] + gl + [
        dict(k="group_end"),
        dict(k="word", w=K, t0=0.7, dur=1.4),
        dict(k="star", x=cx + 34, y=cy - 34, r=6, t0=2.1, twinkle=0.4, cls="acc")]
    C.append(dict(id="seal", name="Seal", mono=True,
                  feel="Monogram. A round seal like the +200 stamp: script K inside, the name around the edge.",
                  viewBox=f"{cx - 115:.0f} {cy - 115:.0f} 230 230", layers=L))

    # 16. Atmosphere ---------------------------------------------------------------------------------
    K = word("PinyonScript-Regular.ttf", "K", 170, x=0, y=0)
    x0, y0, x1, y1 = K["bbox"]
    cx = (x0 + x1) / 2
    base = y1 + 44
    L = []
    for i in range(4):
        r = 120 - i * 0
        yy = base - i * 13
        w_ = 112 - i * 14
        L.append(dict(k="line", d=P((cx - w_, yy + 10), (cx, yy - 6), (cx + w_, yy + 10)), sw=1.6 if i < 3 else 2.4,
                      t0=0.05 + i * 0.16, dur=0.55, cls="acc" if i == 3 else "ink", op=0.35 + i * 0.15 if i < 3 else 1, ease=True))
    L += [dict(k="word", w=K, t0=0.7, dur=1.3), dict(k="star", x=x1 + 2, y=y0 + 8, r=9, t0=2.0, twinkle=0.3)]
    side = 250
    C.append(dict(id="atmosphere", name="Four Skies", mono=True,
                  feel="Monogram. The K rises over four arcs, your four tiers, the top one gold: the Kármán line.",
                  viewBox=f"{cx - side / 2:.0f} {(y0 + base) / 2 - side / 2 + 6:.0f} {side} {side}", layers=L))
    return C
