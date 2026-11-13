"""Turn script-font text into a filled outline plus "pen strokes" (a centreline in writing order),
so the word can be revealed as if a pen were writing it."""
import math
import os
import numpy as np
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.svgPathPen import SVGPathPen
from skimage.morphology import skeletonize
from scipy import ndimage

FONTDIR = os.environ.get("KARMAN_FONT_DIR", os.path.join(os.path.dirname(__file__), "fonts")) + "/"


class FlatPen(BasePen):
    """Collects contours as lists of points, flattening curves."""

    def __init__(self, glyphSet, steps=12):
        super().__init__(glyphSet)
        self.contours, self.cur, self.steps = [], [], steps

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            mt = 1 - t
            self.cur.append((
                mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            mt = 1 - t
            self.cur.append((mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
                             mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]))

    def _closePath(self):
        if self.cur:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


def shape(fontfile, text, size=100, tracking=0.0, features=None):
    """Returns (svg path d, flattened contours, advance width) with y down, baseline at y=0."""
    path = FONTDIR + fontfile
    blob = hb.Blob.from_file_path(path)
    face = hb.Face(blob)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, features or {"kern": True, "liga": True, "calt": True})
    tt = TTFont(path)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    upem = tt["head"].unitsPerEm
    s = size / upem
    svg = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
    flat = FlatPen(gs)
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        tr = (s, 0, 0, -s, (x + pos.x_offset) * s, -pos.y_offset * s)
        gs[name].draw(TransformPen(svg, tr))
        gs[name].draw(TransformPen(flat, tr))
        x += pos.x_advance + tracking * upem
    return svg.getCommands(), flat.contours, x * s


def bbox(contours):
    pts = np.concatenate([np.array(c) for c in contours])
    return pts.min(0), pts.max(0)


def rasterize(contours, x0, y0, scale, W, H):
    """Nonzero-winding fill of contours (in svg units) into a W x H bool image."""
    img = np.zeros((H, W), bool)
    edges = []
    for c in contours:
        pts = [((px - x0) * scale, (py - y0) * scale) for px, py in c]
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            if a[1] != b[1]:
                edges.append((a[0], a[1], b[0], b[1]))
    e = np.array(edges)
    ax, ay, bx, by = e.T
    ymin, ymax = np.minimum(ay, by), np.maximum(ay, by)
    d = np.where(by > ay, 1, -1)
    for row in range(H):
        yc = row + 0.5
        m = (ymin <= yc) & (ymax > yc)
        if not m.any():
            continue
        t = (yc - ay[m]) / (by[m] - ay[m])
        xs = ax[m] + t * (bx[m] - ax[m])
        ds = d[m]
        o = np.argsort(xs)
        xs, ds = xs[o], ds[o]
        w = np.cumsum(ds)
        for i in range(len(xs) - 1):
            if w[i] != 0:
                a = int(math.ceil(xs[i] - 0.5))
                b = int(math.floor(xs[i + 1] - 0.5))
                if b >= a:
                    img[row, max(a, 0):min(b + 1, W)] = True
    return img


NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def skeleton_graph(sk):
    """Breaks a skeleton into edges (pixel polylines) between nodes (ends and junctions)."""
    H, W = sk.shape
    pix = set(zip(*np.nonzero(sk)))

    def nbrs(p):
        return [(p[0] + dy, p[1] + dx) for dy, dx in NB if (p[0] + dy, p[1] + dx) in pix]

    deg = {p: len(nbrs(p)) for p in pix}
    nodes = {p for p in pix if deg[p] != 2}
    visited = set()
    edges = []
    for n in nodes:
        for q in nbrs(n):
            if (n, q) in visited:
                continue
            line = [n, q]
            visited.add((n, q))
            visited.add((q, n))
            prev, cur = n, q
            while cur not in nodes:
                nx = [r for r in nbrs(cur) if r != prev and (cur, r) not in visited]
                if not nx:
                    break
                # prefer 4-neighbours to avoid diagonal shortcuts
                nx.sort(key=lambda r: abs(r[0] - cur[0]) + abs(r[1] - cur[1]))
                r = nx[0]
                visited.add((cur, r))
                visited.add((r, cur))
                line.append(r)
                prev, cur = cur, r
            edges.append(line)
    # closed loops with no nodes
    rest = pix - {p for e in edges for p in e}
    while rest:
        start = next(iter(rest))
        line, prev, cur = [start], None, start
        while True:
            nx = [r for r in nbrs(cur) if r != prev and r in rest and r not in line]
            if not nx:
                break
            prev, cur = cur, nx[0]
            line.append(cur)
        line.append(start)
        edges.append(line)
        rest -= set(line)
    return edges


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a
    n = np.hypot(*ab) or 1e-9
    P = np.array(pts, float)
    dist = np.abs(ab[0] * (P[:, 1] - a[1]) - ab[1] * (P[:, 0] - a[0])) / n
    i = int(np.argmax(dist))
    if dist[i] > eps:
        return rdp(pts[: i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]


def smooth_d(pts, close=False):
    """Catmull-Rom through points -> cubic bezier svg path."""
    if len(pts) == 2:
        return f"M{pts[0][0]:.1f} {pts[0][1]:.1f} L{pts[1][0]:.1f} {pts[1][1]:.1f}"
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d


def plen(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def pen_strokes(contours, res=6.0):
    """Centreline strokes in writing order: [{pts, w}] in svg units."""
    (x0, y0), (x1, y1) = bbox(contours)
    pad = 4 / res
    x0, y0 = x0 - pad * 3, y0 - pad * 3
    W = int((x1 - x0) * res + 12)
    H = int((y1 - y0) * res + 12)
    img = rasterize(contours, x0, y0, res, W, H)
    img = ndimage.binary_closing(img, iterations=1)
    dt = ndimage.distance_transform_edt(img)
    sk = skeletonize(img)
    edges = skeleton_graph(sk)
    thick = np.percentile(dt[sk], 90) if sk.any() else 2
    # drop spurs: short edges that end in a free end
    endpoints = {}
    for e in edges:
        for p in (e[0], e[-1]):
            endpoints[p] = endpoints.get(p, 0) + 1
    keep = []
    for e in edges:
        L = len(e)
        free = endpoints.get(e[0], 0) == 1 or endpoints.get(e[-1], 0) == 1
        if free and L < thick * 0.5:
            continue
        if L < 2:
            continue
        keep.append(e)
    edges = keep

    def to_svg(p):
        return ((p[1] + 0.5) / res + x0, (p[0] + 0.5) / res + y0)

    # writing order: greedy walk, start leftmost, continue with the smallest turn
    E = [dict(px=e, used=False) for e in edges]
    node_of = {}
    for i, e in enumerate(E):
        for end in (0, -1):
            node_of.setdefault(e["px"][end], []).append((i, end))

    def near(p, q, r=2.5):
        return abs(p[0] - q[0]) <= r and abs(p[1] - q[1]) <= r

    order = []
    cur = None
    cur_dir = None
    while not all(e["used"] for e in E):
        cand = []
        if cur is not None:
            for i, e in enumerate(E):
                if e["used"]:
                    continue
                for end in (0, -1):
                    if near(e["px"][end], cur):
                        seq = e["px"] if end == 0 else e["px"][::-1]
                        k = min(len(seq) - 1, 8)
                        v = (seq[k][0] - seq[0][0], seq[k][1] - seq[0][1])
                        turn = 0
                        if cur_dir is not None:
                            a = math.atan2(*cur_dir)
                            b = math.atan2(*v)
                            turn = abs((b - a + math.pi) % (2 * math.pi) - math.pi)
                        cand.append((turn, i, seq))
        if cand:
            cand.sort(key=lambda c: c[0])
            _, i, seq = cand[0]
            lift = False
        else:
            # pen lift: next stroke starts at the leftmost unused end
            best = None
            for i, e in enumerate(E):
                if e["used"]:
                    continue
                for end in (0, -1):
                    p = e["px"][end]
                    key = p[1] + (0 if cur is None else 0.15 * abs(p[0] - cur[0]))
                    # prefer free ends (true starts of strokes)
                    if len(node_of.get(p, [])) > 1:
                        key += 40
                    if best is None or key < best[0]:
                        best = (key, i, e["px"] if end == 0 else e["px"][::-1])
            _, i, seq = best
            lift = True
        E[i]["used"] = True
        w = max(dt[p] for p in seq) * 2.15 + 3.5
        k = min(len(seq) - 1, 8)
        cur_dir = (seq[-1][0] - seq[-1 - k][0], seq[-1][1] - seq[-1 - k][1])
        cur = seq[-1]
        pts = [to_svg(p) for p in seq]
        if not lift and order:
            # join to the previous stroke so the mask has no seam
            order[-1]["pts"] += pts[1:]
            order[-1]["w"] = max(order[-1]["w"], w / res)
        else:
            order.append(dict(pts=pts, w=w / res))
    out = []
    for s in order:
        pts = rdp(s["pts"], 0.35 / res * 2)
        if plen(pts) < 0.5:
            continue
        out.append(dict(d=smooth_d(pts), len=plen(pts), w=s["w"], pts=pts))
    return out


def svg_bbox_of(contours):
    (x0, y0), (x1, y1) = bbox(contours)
    return x0, y0, x1, y1


def shape_glyphs(fontfile, text, size=100, x=0.0, y=0.0, tracking=0.0, wght=None):
    """One svg path per glyph (for staggered entrances), offset to (x, y). Returns (list of d, width)."""
    path = FONTDIR + fontfile
    blob = hb.Blob.from_file_path(path)
    face = hb.Face(blob)
    font = hb.Font(face)
    if wght is not None:
        font.set_variations({"wght": wght})
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True})
    tt = TTFont(path)
    gs = tt.getGlyphSet(location={"wght": wght} if wght is not None else None)
    order = tt.getGlyphOrder()
    upem = tt["head"].unitsPerEm
    s = size / upem
    out = []
    cx = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
        tr = (s, 0, 0, -s, x + (cx + pos.x_offset) * s, y - pos.y_offset * s)
        gs[name].draw(TransformPen(pen, tr))
        d = pen.getCommands()
        if d:
            out.append(d)
        cx += pos.x_advance + tracking * upem
    return out, cx * s
