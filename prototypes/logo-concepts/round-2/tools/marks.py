"""Round 2: twelve simple marks, four versions each. Every mark lives in a 100x100 box.
Colour classes: i ink, a accent (cobalt / soft gold at night), g warm gold, s soft sky, c paper (the page colour, for cut-outs).
A class ending in -s strokes instead of fills. Motion classes: tw (twinkle), bob (float), sway (rock)."""
import math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))  # lib.py and svgbuild.py from round one


def star(cx, cy, r, k=0.2, cls="g", extra=""):
    q = r * k
    d = (f"M{cx:.1f} {cy - r:.1f}Q{cx + q:.1f} {cy - q:.1f} {cx + r:.1f} {cy:.1f}Q{cx + q:.1f} {cy + q:.1f} {cx:.1f} {cy + r:.1f}"
         f"Q{cx - q:.1f} {cy + q:.1f} {cx - r:.1f} {cy:.1f}Q{cx - q:.1f} {cy - q:.1f} {cx:.1f} {cy - r:.1f}Z")
    return f'<path class="{cls}{extra}" d="{d}"/>'


def tw(s, delay=0):
    return f'<g class="tw" style="animation-delay:{delay}s">{s}</g>'


def C(cx, cy, r, cls):
    return f'<circle class="{cls}" cx="{cx}" cy="{cy}" r="{r}"/>'


def P(d, cls, w=None):
    sw = f' stroke-width="{w}"' if w else ""
    return f'<path class="{cls}" d="{d}"{sw}/>'


def L(x1, y1, x2, y2, cls, w):
    return f'<path class="{cls}" d="M{x1} {y1}L{x2} {y2}" stroke-width="{w}"/>'


def tile(cls="i", r=24):
    return f'<rect class="{cls}" x="4" y="4" width="92" height="92" rx="{r}"/>'


def K_glyph(x, y, size, cls):
    from lib import shape
    d, _, adv = shape("YoungSerif-Regular.ttf", "K", size)
    from svgbuild import shift_d
    return f'<path class="{cls}" d="{shift_d(d, x - adv / 2, y)}"/>'


# ---------------- 1 Kármán Line ----------------
def line_a():
    return L(10, 66, 90, 66, "a-s", 6) + tw(star(50, 40, 24)) + tw(star(78, 20, 6), .8) + L(26, 80, 74, 80, "s-s", 4)


def line_b():
    return (L(30, 18, 30, 82, "i-s", 11) + L(38, 52, 70, 82, "i-s", 11)
            + P("M32 56Q50 50 62 30", "a-s", 9) + tw(star(70, 21, 14)))


def line_c():
    return (C(50, 134, 72, "s") + C(50, 134, 84, "a-s").replace('/>', ' stroke-width="3"/>')
            + tw(star(50, 26, 15)) + tw(star(22, 32, 5), .6) + tw(star(80, 36, 4), 1.2))


def line_d():
    return ('<clipPath id="kl-d"><rect x="4" y="4" width="92" height="92" rx="24"/></clipPath>' + tile("i")
            + '<g clip-path="url(#kl-d)">' + C(50, 150, 82, "a") + "</g>" + tw(star(50, 40, 18)) + tw(star(74, 22, 5), .7))


# ---------------- 2 North Star ----------------
def nstar_a():
    return (tw(star(50, 38, 30)) + L(38, 76, 38, 86, "a-s", 6) + L(50, 76, 50, 94, "a-s", 6)
            + L(62, 76, 62, 86, "a-s", 6))


def nstar_b():
    return (P("M50 16A34 34 0 1 1 49.9 16", "a-s", 4) + C(50, 16, 9, "c") + star(50, 52, 34, .2, "g")
            + C(50, 52, 4, "c"))


def nstar_c():
    return (star(46, 54, 34, .22, "i-s").replace('/>', ' stroke-width="5"/>') + tw(star(80, 20, 11), .3)
            + C(84, 44, 3.5, "a"))


def nstar_d():
    return tile("a") + star(50, 52, 30, .2, "c") + tw(star(74, 24, 9), .4)


# ---------------- 3 Comet ----------------
def comet_a():
    return P("M58 25Q32 46 12 88Q40 62 76 44Z", "a") + C(68, 33, 13, "g") + tw(star(84, 14, 5), .5)


def comet_b():
    return (L(26, 16, 26, 84, "i-s", 11) + L(34, 50, 66, 84, "i-s", 11)
            + P("M30 56Q46 36 60 21L74 34Q52 44 30 56Z", "a") + C(68, 26, 11, "g"))


def comet_c():
    return (L(14, 58, 44, 28, "a-s", 6) + C(46, 26, 6, "g") + L(20, 78, 62, 36, "a-s", 6) + C(64, 34, 7, "g")
            + L(36, 88, 70, 54, "a-s", 6) + C(72, 52, 6, "g"))


def comet_d():
    return tile("i") + P("M18 80Q30 34 70 28L72 40Q40 42 18 80Z", "a") + C(71, 33, 10, "g") + tw(star(30, 26, 5), .7)


# ---------------- 4 Paper Plane ----------------
def plane_a():
    body = P("M88 18L12 46L42 58Z", "a") + P("M88 18L42 58L56 84Z", "i") + P("M42 58L44 76L52 66Z", "i")
    return P("M36 70C20 84 6 74 14 64C20 58 28 66 22 78", "s-s", 3).replace('/>', ' stroke-dasharray="4 5"/>') + f'<g class="bob">{body}</g>'


def plane_b():
    return (P("M86 20L14 46L42 58L56 82Z M86 20L42 58", "i-s", 4.5)
            + P("M40 64Q22 80 12 70Q6 62 16 60", "a-s", 3).replace('/>', ' stroke-dasharray="3 5"/>'))


def plane_c():
    bars = ('<rect class="s" x="12" y="66" width="16" height="22" rx="4"/><rect class="s" x="34" y="52" width="16" height="36" rx="4"/>'
            '<rect class="a" x="56" y="36" width="16" height="52" rx="4"/>')
    return bars + '<g class="bob">' + P("M92 8L60 22L72 27Z", "i") + P("M92 8L72 27L78 38Z", "i") + "</g>"


def plane_d():
    return (P("M50 8A42 42 0 1 1 49.9 8", "a-s", 5) + '<g class="bob">' + P("M94 22L22 50L50 60Z", "g")
            + P("M94 22L50 60L62 84Z", "i") + "</g>")


# ---------------- 5 Little Planet ----------------
def planet_a():
    ring_back = '<path class="i-s" d="M-44 0A44 12 0 0 1 44 0" stroke-width="5"/>'
    ring_front = '<path class="i-s" d="M-44 0A44 12 0 0 0 44 0" stroke-width="5"/>'
    return (f'<g transform="translate(50 52) rotate(-18)">{ring_back}</g>' + C(50, 52, 24, "a")
            + f'<g transform="translate(50 52) rotate(-18)">{ring_front}</g>' + tw(star(82, 16, 6), .4))


def planet_b():
    return (C(46, 54, 30, "a") + P("M46 24A30 30 0 0 1 46 84A22 30 0 0 0 46 24Z", "i")
            + P("M82 30A40 40 0 0 1 70 88", "s-s", 3).replace('/>', ' stroke-dasharray="3 5"/>') + C(84, 26, 7, "g"))


def planet_c():
    return (C(50, 70, 26, "s") + L(50, 44, 50, 14, "i-s", 4) + P("M51 15L72 21L51 28Z", "g")
            + tw(star(22, 28, 6), .5) + tw(star(80, 46, 4), 1.1))


def planet_d():
    ring_back = '<path class="c-s" d="M-38 0A38 10 0 0 1 38 0" stroke-width="4"/>'
    ring_front = '<path class="c-s" d="M-38 0A38 10 0 0 0 38 0" stroke-width="4"/>'
    return (tile("i") + f'<g transform="translate(50 52) rotate(-18)">{ring_back}</g>' + C(50, 52, 20, "a")
            + f'<g transform="translate(50 52) rotate(-18)">{ring_front}</g>' + tw(star(78, 22, 6)))


# ---------------- 6 Lantern ----------------
def _lantern(x, y, s, window=False, cls="g"):
    o = (f'<g transform="translate({x} {y}) scale({s})">'
         f'<path class="i-s" d="M0 -40L0 -28" stroke-width="2.5"/>'
         f'<rect class="{cls}" x="-18" y="-24" width="36" height="46" rx="16"/>'
         f'<rect class="i" x="-10" y="-29" width="20" height="7" rx="2"/><rect class="i" x="-8" y="21" width="16" height="6" rx="2"/>'
         f'<path class="i-s" d="M-7 -22Q-11 0 -7 21M7 -22Q11 0 7 21" stroke-width="1.6" opacity=".35"/>')
    if window:
        o += star(0, 0, 11, .2, "c")
    return o + "</g>"


def lantern_a():
    return C(50, 54, 40, "g") .replace('/>', ' opacity=".2"/>') + f'<g class="bob">{_lantern(50, 54, 1.05)}</g>'


def lantern_b():
    return f'<g class="bob">{_lantern(50, 54, 1.15, True, "a")}</g>'


def lantern_c():
    return (f'<g class="bob" style="animation-delay:.6s">{_lantern(24, 66, .55)}</g>'
            f'<g class="bob">{_lantern(52, 44, .8)}</g>'
            f'<g class="bob" style="animation-delay:1.2s">{_lantern(80, 62, .5)}</g>')


def lantern_d():
    def sky(x, y, s, d):
        return (f'<g class="bob" style="animation-delay:{d}s"><g transform="translate({x} {y}) scale({s})">'
                + C(0, 0, 20, "g").replace('/>', ' opacity=".22"/>') + P("M-11 -18Q0 -24 11 -18Q15 0 8 14Q0 18 -8 14Q-15 0 -11 -18Z", "g")
                + P("M-4 10Q0 4 4 10Q4 14 0 14Q-4 14 -4 10Z", "a")
                + "</g></g>")
    return tile("i") + sky(30, 64, .9, .6) + sky(54, 40, 1.3, 0) + sky(76, 66, .75, 1.2)


# ---------------- 7 Pencil and check ----------------
def pencil_a():
    pen = ('<g transform="translate(30 76) rotate(-135)">'
           '<path class="i" d="M0 0L12 -6L12 6Z"/><path class="g" d="M4 -2L12 -6L12 6L4 2Z"/>'
           '<rect class="a" x="12" y="-6" width="40" height="12"/><rect class="s" x="52" y="-6" width="6" height="12"/>'
           '<rect class="g" x="58" y="-6" width="7" height="12" rx="3"/></g>')
    return P("M30 76C46 74 52 58 60 46C66 36 70 30 76 26", "i-s", 3).replace('/>', ' stroke-dasharray="1 6"/>') + pen + tw(star(80, 20, 12))


def pencil_b():
    return P("M14 54L38 76L80 30", "a-s", 11) + tw(star(82, 24, 14))


def pencil_c():
    return ('<g transform="rotate(-30 50 50)">'
            '<path class="i" d="M8 50L20 44L20 56Z"/><path class="g" d="M13 47.5L20 44L20 56L13 52.5Z"/>'
            '<rect class="a" x="20" y="44" width="50" height="12"/><rect class="s" x="70" y="44" width="6" height="12"/></g>'
            + tw(star(78, 30, 14)))


def pencil_d():
    return tile("a") + P("M22 54L42 72L76 34", "c-s", 10) + tw(star(78, 28, 12))


# ---------------- 8 Answer Bubble ----------------
def bubble_a():
    o = ""
    for k, x in enumerate((17, 39, 61, 83)):
        o += C(x, 56, 9, "a" if k == 2 else "i-s").replace('/>', ' stroke-width="3"/>' if k != 2 else '/>')
    return o + tw(star(61, 30, 10))


def bubble_b():
    return C(48, 52, 32, "i") + C(62, 42, 27, "c") + tw(star(70, 50, 9)) + tw(star(78, 28, 4), .6)


def bubble_c():
    o = ""
    for k, (x, y) in enumerate(((16, 84), (34, 68), (52, 52), (70, 36))):
        o += C(x, y, 7, "a" if k == 3 else "i-s").replace('/>', '/>' if k == 3 else ' stroke-width="3"/>')
    return o + tw(star(86, 18, 10))


def bubble_d():
    return C(50, 50, 44, "a") + K_glyph(50, 72, 64, "c") + tw(star(85, 15, 8))


# ---------------- 9 Kite ----------------
def kite_a():
    k = (P("M50 8L50 46L24 38Z", "a") + P("M50 8L76 38L50 46Z", "g") + P("M24 38L50 46L50 70Z", "i")
         + P("M76 38L50 70L50 46Z", "a"))
    tail = P("M50 70Q40 80 46 88Q52 96 40 98", "i-s", 2.5) + P("M44 80L38 76L40 84Z M46 91L52 87L52 95Z", "g")
    return f'<g class="sway">{k}{tail}</g>'


def kite_b():
    return (f'<g class="sway">' + P("M50 10L76 40L50 72L24 40Z M50 10L50 72 M24 40L76 40", "i-s", 4.5)
            + P("M50 72Q42 82 50 88Q58 94 48 98", "a-s", 3.5) + "</g>")


def kite_c():
    return (P("M14 92C30 78 34 60 60 46", "i-s", 2) + f'<g class="sway">' + P("M70 10L84 28L70 44L56 28Z", "a")
            + P("M70 10L84 28L70 28Z", "g") + "</g>" + tw(star(28, 22, 6), .5))


def kite_d():
    return (tile("a") + '<g class="sway">' + P("M50 14L72 40L50 66L28 40Z", "c") + P("M50 14L72 40L50 40Z", "g")
            + P("M50 66Q44 74 50 80Q56 86 50 90", "c-s", 3) + "</g>")


# ---------------- 10 Summit ----------------
def summit_a():
    return (P("M6 84L40 32L56 56L66 44L94 84Z", "i") + P("M40 32L49 46L42 44L35 48Z", "c")
            + tw(star(76, 20, 12)))


def summit_b():
    return (P("M14 86L50 26L86 86Z", "a") + L(50, 26, 50, 8, "i-s", 3.5) + P("M51 9L68 14L51 20Z", "g"))


def summit_c():
    return (P("M8 84L36 42L52 62L70 30L92 84", "i-s", 6) + P("M18 84L36 64L52 74L70 30", "a-s", 3).replace('/>', ' stroke-dasharray="2 6"/>')
            + tw(star(70, 18, 9)))


def summit_d():
    return (C(50, 50, 44, "s") + C(62, 52, 14, "g") + P("M10 76L38 38L54 58L64 48L90 76Q50 96 10 76Z", "i"))


# ---------------- 11 Balloon ----------------
ENV = "M50 10C74 10 82 32 74 50C68 62 58 68 56 72L44 72C42 68 32 62 26 50C18 32 26 10 50 10Z"
GORE = "M50 10C60 18 62 48 56 72L44 72C38 48 40 18 50 10Z"


def balloon_a():
    return (f'<g class="bob">' + P(ENV, "a") + P(GORE, "g") + P("M44 72L45 80M56 72L55 80", "i-s", 2)
            + '<rect class="i" x="43" y="80" width="14" height="10" rx="2"/></g>')


def balloon_b():
    return (f'<g class="bob">' + P(ENV, "i-s", 4.5) + star(50, 38, 13, .2, "g")
            + P("M44 72L45 80M56 72L55 80", "i-s", 2) + '<rect class="i" x="43" y="80" width="14" height="10" rx="2"/></g>')


def balloon_c():
    cloud = P("M14 82Q14 70 26 72Q30 60 44 66Q52 58 60 68Q74 66 72 80Z", "s")
    b = ('<g class="bob"><g transform="translate(34 -2) scale(.6)">' + P(ENV, "a") + P(GORE, "g")
         + P("M44 72L45 80M56 72L55 80", "i-s", 3) + '<rect class="i" x="43" y="80" width="14" height="10" rx="2"/></g></g>')
    return cloud + b


def balloon_d():
    return (tile("i") + '<g transform="translate(8 6) scale(.84)"><g class="bob">' + P(ENV, "g") + P(GORE, "a")
            + P("M44 72L45 80M56 72L55 80", "c-s", 2) + '<rect class="c" x="43" y="80" width="14" height="10" rx="2"/></g></g>')


# ---------------- 12 Owl ----------------
OWL = "M24 30L30 14L42 25Q50 23 58 25L70 14L76 30Q83 50 77 68Q68 88 50 88Q32 88 23 68Q17 50 24 30Z"


def owl_a():
    return (P(OWL, "i") + C(38, 44, 11, "c") + C(62, 44, 11, "c") + C(39, 45, 5, "i") + C(61, 45, 5, "i")
            + P("M46 54L54 54L50 62Z", "g"))


def owl_b():
    return (P(OWL, "a") + C(38, 42, 10, "c") + C(62, 42, 10, "c") + C(39, 43, 4.5, "i") + C(61, 43, 4.5, "i")
            + P("M46 52L54 52L50 58Z", "g") + tw(star(50, 72, 9)))


def owl_c():
    return (C(34, 50, 14, "i-s").replace('/>', ' stroke-width="5"/>') + C(66, 50, 14, "i-s").replace('/>', ' stroke-width="5"/>')
            + C(36, 51, 5, "i") + C(64, 51, 5, "i") + P("M18 30L44 40M82 30L56 40", "i-s", 5) + P("M46 64L54 64L50 72Z", "g"))


def owl_d():
    moon = C(46, 56, 38, "g") + C(60, 48, 32, "c")
    owl = ('<g transform="translate(38 44) scale(.42)">' + P(OWL, "i") + C(38, 44, 11, "c") + C(62, 44, 11, "c")
           + C(39, 45, 5, "i") + C(61, 45, 5, "i") + P("M46 54L54 54L50 62Z", "g") + "</g>")
    return moon + owl + tw(star(84, 18, 7), .4)


IDEAS = [
    ("karman-line", "The Kármán Line", "The edge of space as a single curve, with a star just above it.", [line_a, line_b, line_c, line_d]),
    ("north-star", "North Star", "One bright star that rises. Calm, hopeful, works at any size.", [nstar_a, nstar_b, nstar_c, nstar_d]),
    ("comet", "Comet", "Speed and a trail of progress, without a rocket.", [comet_a, comet_b, comet_c, comet_d]),
    ("paper-plane", "Paper Plane", "Homework that takes off. Playful and light.", [plane_a, plane_b, plane_c, plane_d]),
    ("little-planet", "Little Planet", "A tiny world of its own, with a ring or a flag.", [planet_a, planet_b, planet_c, planet_d]),
    ("lantern", "Lantern", "Warm light for late study nights, like the lanterns on the home page.", [lantern_a, lantern_b, lantern_c, lantern_d]),
    ("check-star", "Check and Star", "The pencil, the right answer, the reward.", [pencil_a, pencil_b, pencil_c, pencil_d]),
    ("answer-bubble", "Answer Bubble", "The SAT bubble, filled in, turned into a moon.", [bubble_a, bubble_b, bubble_c, bubble_d]),
    ("kite", "Kite", "Lift that comes from steady effort. Whimsical and simple.", [kite_a, kite_b, kite_c, kite_d]),
    ("summit", "Summit", "The climb to the score you want, with a star at the top.", [summit_a, summit_b, summit_c, summit_d]),
    ("balloon", "Hot Air Balloon", "Rising gently, Ghibli style.", [balloon_a, balloon_b, balloon_c, balloon_d]),
    ("owl", "Night Owl", "A study companion with a face students remember.", [owl_a, owl_b, owl_c, owl_d]),
]

CSS = """.i{fill:var(--m-ink)}.a{fill:var(--m-acc)}.g{fill:var(--m-gold)}.s{fill:var(--m-soft)}.c{fill:var(--m-paper)}
.i-s,.a-s,.g-s,.s-s,.c-s{fill:none;stroke-linecap:round;stroke-linejoin:round}
.i-s{stroke:var(--m-ink)}.a-s{stroke:var(--m-acc)}.g-s{stroke:var(--m-gold)}.s-s{stroke:var(--m-soft)}.c-s{stroke:var(--m-paper)}"""

LIGHT = dict(ink="#1d1a22", acc="#2449b8", gold="#dba84a", soft="#cfdaf2", paper="#fffaf3")
DARK = dict(ink="#fffaf3", acc="#8ea4f0", gold="#f1c96a", soft="#2a3468", paper="#0d1024")


def svg(inner, colors=None):
    if colors:
        st = (".i{fill:%(ink)s}.a{fill:%(acc)s}.g{fill:%(gold)s}.s{fill:%(soft)s}.c{fill:%(paper)s}"
              ".i-s,.a-s,.g-s,.s-s,.c-s{fill:none;stroke-linecap:round;stroke-linejoin:round}"
              ".i-s{stroke:%(ink)s}.a-s{stroke:%(acc)s}.g-s{stroke:%(gold)s}.s-s{stroke:%(soft)s}.c-s{stroke:%(paper)s}") % colors
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>{st}</style>{inner}</svg>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="mark">{inner}</svg>'


def flat(inner, colors):
    """resvg does not apply <style> classes reliably everywhere, so inline them for raster checks."""
    import re
    m = {"i": colors["ink"], "a": colors["acc"], "g": colors["gold"], "s": colors["soft"], "c": colors["paper"]}

    def rep(mm):
        cl = mm.group(1)
        if cl.endswith("-s"):
            return f'fill="none" stroke="{m[cl[0]]}" stroke-linecap="round" stroke-linejoin="round"'
        return f'fill="{m[cl]}"'
    return re.sub(r'class="([iagsc](?:-s)?)"', rep, inner)
