"""Builds a concept's SVG markup from layers, either animated (CSS + a little SMIL) or frozen at a time."""
import math
from lib import shape, pen_strokes, svg_bbox_of, smooth_d, plen

_cache = {}


def word(font, text, size=100, x=0.0, y=0.0, res=6.0, features=None):
    key = (font, text, size, x, y, res)
    if key in _cache:
        return _cache[key]
    d, contours, adv = shape(font, text, size, features=features)
    # bake the offset into the outline and contours
    from fontTools.svgLib.path import parse_path  # noqa: F401  (kept for clarity)
    contours = [[(px + x, py + y) for px, py in c] for c in contours]
    d = shift_d(d, x, y)
    strokes = pen_strokes(contours, res=res)
    x0, y0, x1, y1 = svg_bbox_of(contours)
    last = strokes[-1]["pts"] if strokes else [(x1, y0)]
    W = dict(d=d, strokes=strokes, bbox=(x0, y0, x1, y1), adv=adv + x, exit=last[-1],
             exit_dir=(last[-1][0] - last[max(0, len(last) - 4)][0], last[-1][1] - last[max(0, len(last) - 4)][1]))
    _cache[key] = W
    return W


def shift_d(d, dx, dy):
    """Shift an absolute-coordinate svg path (as written by SVGPathPen: M L C Q Z, absolute)."""
    if dx == 0 and dy == 0:
        return d
    import re
    out = []
    toks = re.findall(r"[MLCQZHV]|-?\d*\.?\d+(?:e-?\d+)?", d)
    cmd = None
    i = 0
    nums = []
    for t in toks:
        if t.isalpha():
            if nums:
                out.append(_shift_nums(cmd, nums, dx, dy))
                nums = []
            cmd = t
            out.append(t)
        else:
            nums.append(float(t))
    if nums:
        out.append(_shift_nums(cmd, nums, dx, dy))
    return " ".join(out)


def _shift_nums(cmd, nums, dx, dy):
    if cmd == "H":
        return " ".join(f"{n + dx:.1f}" for n in nums)
    if cmd == "V":
        return " ".join(f"{n + dy:.1f}" for n in nums)
    res = []
    for k, n in enumerate(nums):
        res.append(f"{n + (dx if k % 2 == 0 else dy):.1f}")
    return " ".join(res)


CSS = """
.KID .ink{fill:var(--logo-ink,var(--d-ink))}.KID .acc{fill:var(--logo-acc,var(--d-acc))}
.KID .ink-s{fill:none;stroke:var(--logo-ink,var(--d-ink))}.KID .acc-s{fill:none;stroke:var(--logo-acc,var(--d-acc))}
.KID{--d-ink:#1d1a22;--d-acc:#2449b8}
@media (prefers-color-scheme:dark){.KID{--d-ink:#fffaf3;--d-acc:#e7cf9a}}
.KID .w,.KID .ln{stroke-dasharray:1 2;stroke-dashoffset:1.01;animation:k-draw linear forwards}
.KID .ln.ease{animation-timing-function:cubic-bezier(.45,0,.2,1)}
.KID .fx{opacity:0;transform-box:fill-box;transform-origin:center;animation:k-fade .6s cubic-bezier(.2,.8,.2,1) forwards}
.KID .fx.rise{animation-name:k-rise}.KID .fx.pop{animation-name:k-pop;animation-timing-function:cubic-bezier(.3,1.6,.5,1)}
.KID .tw{transform-box:fill-box;transform-origin:center;animation:k-tw 2.6s ease-in-out infinite}
.KID .orb-still{display:none}
@keyframes k-draw{to{stroke-dashoffset:0}}
@keyframes k-fade{to{opacity:1}}
@keyframes k-rise{from{opacity:0;transform:translateY(30%)}to{opacity:1;transform:none}}
@keyframes k-pop{from{opacity:0;transform:scale(0)}to{opacity:1;transform:none}}
@keyframes k-tw{0%,100%{transform:scale(1) rotate(0);opacity:1}50%{transform:scale(.55) rotate(45deg);opacity:.7}}
@media (prefers-reduced-motion:reduce){.KID .w,.KID .ln{animation:none;stroke-dashoffset:0}
.KID .fx{animation:none;opacity:1;transform:none}.KID .tw{animation:none}.KID .orb{display:none}.KID .orb-still{display:inline}}
"""


def star_d(x, y, r, inner=0.28):
    pts = []
    for i in range(8):
        a = -math.pi / 2 + i * math.pi / 4
        rr = r if i % 2 == 0 else r * inner
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"
    # soft concave star: quadratic curves through the inner points' direction
    for i in range(1, 9, 2):
        p_in = pts[i % 8]
        p_out = pts[(i + 1) % 8]
        d += f" Q{(p_in[0] * 2 + x) / 3:.2f} {(p_in[1] * 2 + y) / 3:.2f} {p_out[0]:.2f} {p_out[1]:.2f}"
    return d + "Z"


def ellipse_d(cx, cy, rx, ry, rot=0, start=0.0, end=1.0, n=64):
    pts = []
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    for i in range(n + 1):
        t = 2 * math.pi * (start + (end - start) * i / n)
        ex, ey = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + ex * c - ey * s, cy + ex * s + ey * c))
    return smooth_d(pts)


def timeline_word(W, t0, dur, gap=0.035):
    """Gives each pen stroke a start and length in seconds so the pen moves at an even speed."""
    total = sum(s["len"] for s in W["strokes"])
    lifts = max(0, len(W["strokes"]) - 1)
    speed = total / max(0.2, dur - gap * lifts)
    t = t0
    out = []
    for s in W["strokes"]:
        d = s["len"] / speed
        out.append((t, d))
        t += d + gap
    return out


def clamp01(v):
    return max(0.0, min(1.0, v))


def build(concept, uid, at=None):
    """concept: dict(viewBox, layers). at=None -> animated; at=float -> frozen at that second (inf = final)."""
    vb = concept["viewBox"]
    cls = f"k{uid}"
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" class="klogo {cls}" role="img" aria-label="{concept.get("label", "Karman Prep")}">']
    if at is None:
        o.append("<style>" + CSS.replace("KID", cls) + "</style>")
    else:
        o.append("<style>" + "\n".join(CSS.strip().split("\n")[:4]).replace("KID", cls) + "</style>")
    defs = []
    body = []
    vx, vy, vw, vh = [float(v) for v in vb.split()]
    for li, L in enumerate(concept["layers"]):
        k = L["k"]
        if k == "word":
            W = L["w"]
            mid = f"{cls}-m{li}"
            tl = timeline_word(W, L["t0"], L["dur"])
            mask = [f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="{vx - 50}" y="{vy - 50}" width="{vw + 100}" height="{vh + 100}">']
            for s, (ts, td) in zip(W["strokes"], tl):
                sw = s["w"] * L.get("wmul", 1.0)
                if at is None:
                    mask.append(f'<path class="w" d="{s["d"]}" pathLength="1" fill="none" stroke="#fff" stroke-width="{sw:.2f}" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:{ts:.3f}s;animation-duration:{td:.3f}s"/>')
                else:
                    p = clamp01((at - ts) / td) if td > 0 else 1
                    if p > 0:
                        Lr = s["len"] * 1.08
                        mask.append(f'<path d="{s["d"]}" fill="none" stroke="#fff" stroke-width="{sw:.2f}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="{Lr * p:.2f} {Lr * 3:.2f}"/>')
            te = tl[-1][0] + tl[-1][1]
            rect = f'x="{vx - 50}" y="{vy - 50}" width="{vw + 100}" height="{vh + 100}" fill="#fff"'
            if at is None:
                mask.append(f'<rect class="fx" {rect} style="animation-delay:{te - 0.1:.3f}s;animation-duration:.3s"/>')
            elif at >= te:
                mask.append(f'<rect {rect}/>')
            mask.append("</mask>")
            defs.append("".join(mask))
            extra = L.get("attrs", "")
            if at is not None and at >= tl[-1][0] + tl[-1][1]:
                defs.pop()
                body.append(f'<path class="{L.get("cls", "ink")}" d="{W["d"]}" {extra}/>')
                continue
            body.append(f'<path class="{L.get("cls", "ink")}" d="{W["d"]}" mask="url(#{mid})" {extra}/>')
        elif k == "line":
            c = L.get("cls", "acc") + "-s"
            sw = L.get("sw", 2)
            cap = L.get("cap", "round")
            ease = " ease" if L.get("ease") else ""
            op = f' opacity="{L["op"]}"' if "op" in L else ""
            dash_extra = L.get("attrs", "")
            if at is None:
                body.append(f'<path class="{c} ln{ease}" d="{L["d"]}" pathLength="1" stroke-width="{sw}" stroke-linecap="{cap}" stroke-linejoin="round"{op} {dash_extra} style="animation-delay:{L["t0"]:.3f}s;animation-duration:{L["dur"]:.3f}s"/>')
            else:
                p = clamp01((at - L["t0"]) / L["dur"])
                if L.get("ease"):
                    p = ease_io(p)
                if p >= 1:
                    body.append(f'<path class="{c}" d="{L["d"]}" stroke-width="{sw}" stroke-linecap="{cap}" stroke-linejoin="round"{op} {dash_extra}/>')
                elif p > 0:
                    body.append(f'<path class="{c}" d="{L["d"]}" pathLength="1" stroke-width="{sw}" stroke-linecap="{cap}" stroke-linejoin="round"{op} {dash_extra} stroke-dasharray="1 2" stroke-dashoffset="{1.01 - 1.01 * p:.3f}"/>')
        elif k in ("star", "dot", "fill"):
            if k == "star":
                d = star_d(L["x"], L["y"], L["r"], L.get("inner", 0.28))
            elif k == "dot":
                r = L["r"]
                d = f'M{L["x"] - r:.2f} {L["y"]:.2f}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0Z'
            else:
                d = L["d"]
            anim = L.get("anim", "pop" if k != "fill" else "fade")
            c = L.get("cls", "acc")
            op = f' opacity="{L["op"]}"' if "op" in L else ""
            tw = L.get("twinkle")
            if at is None:
                inner = f'<path class="{c}" d="{d}"{op}/>'
                if tw:
                    inner = f'<g class="tw" style="animation-delay:{L["t0"] + 0.6 + tw:.2f}s"><path class="{c}" d="{d}"{op}/></g>'
                body.append(f'<g class="fx {anim}" style="animation-delay:{L["t0"]:.3f}s;{L.get("style", "")}">{inner}</g>')
            else:
                p = clamp01((at - L["t0"]) / 0.6)
                if p > 0:
                    sc = 1 if anim != "pop" else min(1.0, p * 1.4)
                    body.append(f'<g opacity="{p:.2f}"><path class="{c}" d="{d}"{op} transform="{scale_about(d, sc)}"/></g>')
        elif k == "orbiter":
            r = L["r"]
            path = L["path"]
            c = L.get("cls", "acc")
            if at is None:
                body.append(
                    f'<g class="fx" style="animation-delay:{L["t0"]:.2f}s"><g class="orb"><circle class="{c}" r="{r}">'
                    f'<animateMotion dur="{L["period"]}s" repeatCount="indefinite" begin="0s" path="{path}" keyPoints="{L.get("kp0", 0)};{L.get("kp1", 1)}" keyTimes="0;1" calcMode="linear"/></circle></g>'
                    f'<circle class="{c} orb-still" r="{r}" cx="{L["still"][0]:.1f}" cy="{L["still"][1]:.1f}"/></g>')
            else:
                if at >= L["t0"]:
                    body.append(f'<circle class="{c}" r="{r}" cx="{L["still"][0]:.1f}" cy="{L["still"][1]:.1f}"/>')
        elif k == "raw":
            body.append(L["svg"])
        elif k == "group_start":
            body.append(f'<g {L.get("attrs", "")}>')
        elif k == "group_end":
            body.append("</g>")
    if defs:
        o.append("<defs>" + "".join(defs) + "</defs>")
    o.extend(body)
    o.append("</svg>")
    return "".join(o)


def ease_io(p):
    return p * p * (3 - 2 * p)


def scale_about(d, s):
    if s >= 0.999:
        return ""
    import re
    nums = [float(v) for v in re.findall(r"-?\d*\.?\d+", d)]
    xs, ys = nums[0::2], nums[1::2]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    return f"translate({cx:.2f} {cy:.2f}) scale({s:.3f}) translate({-cx:.2f} {-cy:.2f})"


def end_time(concept):
    t = 0
    for L in concept["layers"]:
        if L["k"] == "word":
            t = max(t, L["t0"] + L["dur"])
        elif "t0" in L:
            t = max(t, L["t0"] + L.get("dur", 0.6))
    return t


def flat_colors(svg, ink, acc):
    """For rasterising checks: inline the colours (the rasteriser has no CSS variables)."""
    import re
    def rep(m):
        c = m.group(1).split()
        out = []
        for name in c:
            if name == "ink":
                out.append(f'fill="{ink}"')
            elif name == "acc":
                out.append(f'fill="{acc}"')
            elif name == "ink-s":
                out.append(f'fill="none" stroke="{ink}"')
            elif name == "acc-s":
                out.append(f'fill="none" stroke="{acc}"')
        return " ".join(out) + f' class="{m.group(1)}"'
    svg = re.sub(r'class="([^"]*)"', rep, svg)
    return re.sub(r"<style>.*?</style>", "", svg, flags=re.S)
