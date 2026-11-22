# The endless world's firs, step 2 of 2 (step 1 is fir-render.py): packs the rendered passes into two
# atlases, four crowns side by side, each 256 x 512 from its tip (top) to the foot of its crown:
#   tree.png    colour, as 128 + 40 * log2(ratio to the average), with the shade inside the crown in it
#   tree-n.png  surface direction across (red) and up (green) as the eye sees it; coverage in blue
#
#   blender -b --factory-startup --python scripts/dev/blender/fir-pack.py -- <passes folder> <atlas folder>
import bpy, numpy as np, sys, os, json
IN = sys.argv[sys.argv.index("--") + 1]; OUT = sys.argv[sys.argv.index("--") + 2]
def load(path, ch):
    img = bpy.data.images.load(path)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(img)
    return a[::-1, :, :ch]  # top row first
CW, CH = 256, 512
cols, nors, alps, meta = [], [], [], []
def resize(a, w, h):
    # area resize by averaging blocks (sizes divide) or nearest-then-box
    H0, W0 = a.shape[:2]
    ys = (np.arange(h + 1) * H0 / h).astype(int); xs = (np.arange(w + 1) * W0 / w).astype(int)
    out = np.zeros((h, w) + a.shape[2:], np.float32)
    cs = np.cumsum(np.cumsum(np.pad(a, ((1, 0), (1, 0)) + ((0, 0),) * (a.ndim - 2)), 0), 1)
    for j in range(h):
        y0, y1 = ys[j], max(ys[j + 1], ys[j] + 1)
        s = cs[y1][xs[1:]] - cs[y0][xs[1:]] - cs[y1][xs[:-1]] + cs[y0][xs[:-1]]
        out[j] = s / ((y1 - y0) * np.maximum(xs[1:] - xs[:-1], 1)).reshape((-1,) + (1,) * (a.ndim - 2))
    return out
# the third fir rendered (c) is too sparse to read as a fir: its place goes to the second, mirrored
for i, (v, flip) in enumerate([(0, False), (1, False), (1, True), (3, False)]):
    col = load(f"{IN}/v{v}_col.exr", 3); nor = load(f"{IN}/v{v}_nor.exr", 3)
    ao = load(f"{IN}/v{v}_ao.exr", 1)[..., 0]; al = load(f"{IN}/v{v}_alpha.exr", 1)[..., 0]
    if flip:
        col, nor, ao, al = col[:, ::-1], nor[:, ::-1].copy(), ao[:, ::-1], al[:, ::-1]
        nor[..., 0] *= -1
    H, W = al.shape
    on = np.where(al.max(0) > 0.1)[0]
    half = int(max(W / 2 - on.min(), on.max() - W / 2)) + 2
    x0, x1 = W // 2 - half, W // 2 + half
    rows = np.where(al.max(1) > 0.1)[0]
    cover = (al > 0.3).sum(1).astype(np.float32)
    y0 = rows.min()
    # the crown only: from the tip down to the lowest row still a quarter as full as the fullest
    y1 = int(np.where(cover[: int(H * 0.86)] > 0.25 * cover.max())[0].max()) + 4
    sl = (slice(y0, y1), slice(x0, x1))
    a = resize(al[sl][..., None], CW, CH)[..., 0]
    c = resize((col * (0.3 + 0.7 * ao[..., None]) * al[..., None])[sl], CW, CH)
    n = resize((nor * al[..., None])[sl], CW, CH)
    c = c / np.maximum(a[..., None], 1e-4); n = n / np.maximum(a[..., None], 1e-4)
    cols.append(c); nors.append(n); alps.append(a)
    meta.append({"view": i, "half_px": half, "tip_row": int(y0), "base_row": int(y1), "rows": int(H)})
c = np.concatenate(cols, 1); n = np.concatenate(nors, 1); a = np.concatenate(alps, 1)
solid = a > 0.5
mean = c[solid].mean(0)
print("MEAN", mean, "META", json.dumps(meta))
# where nothing stands, the average colour and a flat face, so smaller copies do not darken at the edges
c = np.where(a[..., None] > 0.02, c, mean)
ratio = np.clip(128 + 40 * np.log2(np.maximum(c, 1e-4) / mean), 0, 255)
sx, sy = n[..., 0], n[..., 2]
nn = np.stack([0.5 + 0.5 * np.where(a > 0.02, sx, 0), 0.5 + 0.5 * np.where(a > 0.02, sy, 0), a], -1)
def save(arr, path):
    h, w = arr.shape[:2]
    img = bpy.data.images.new("o", w, h, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    px = np.concatenate([arr[::-1], np.ones((h, w, 1), np.float32)], -1)
    img.pixels = px.ravel().tolist()
    img.filepath_raw = path; img.file_format = "PNG"; img.save()
save(ratio / 255, f"{OUT}/tree.png"); save(np.clip(nn, 0, 1), f"{OUT}/tree-n.png")
print("SAVED")
