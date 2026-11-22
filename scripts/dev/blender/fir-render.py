# The endless world's firs, step 1 of 2: renders side views of a real scanned fir (Poly Haven
# fir_tree_01, CC0) in Blender, as passes: colour, surface direction, ambient occlusion and coverage.
# Step 2 is fir-pack.py; then scripts/dev/world-textures.mjs --trees <atlas folder> makes the two files
# the shader reads (public/site/world/tree.jpg, tree-n.jpg; src/lib/flight/world-tex.ts).
#
#   1. Download the model (about 260 MB): https://polyhaven.com/a/fir_tree_01, Blender format, 1k
#   2. blender -b fir_tree_01_1k.blend --python scripts/dev/blender/fir-render.py -- <passes folder>
#
# About four minutes on an M2 Pro.
import bpy, mathutils, sys, os, math
OUT = sys.argv[sys.argv.index("--") + 1]
os.makedirs(OUT, exist_ok=True)
s = bpy.context.scene
s.render.engine = "CYCLES"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d in prefs.devices: d.use = True
    s.cycles.device = "GPU"
except Exception as e:
    print("GPU?", e)
s.cycles.samples = 32
s.cycles.transparent_max_bounces = 32
s.cycles.use_denoising = False
s.render.film_transparent = True
W, H = 512, 1024
s.render.resolution_x, s.render.resolution_y, s.render.resolution_percentage = W, H, 100
vl = s.view_layers[0]
vl.use_pass_normal = True
vl.use_pass_diffuse_color = True
vl.use_pass_ambient_occlusion = True
if s.world is None:
    s.world = bpy.data.worlds.new("w")
s.world.light_settings.distance = 1.2
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
s.collection.objects.link(cam)
s.camera = cam
cam.data.type = "ORTHO"
# compositor: each pass to its own EXR
ng = bpy.data.node_groups.new("out", "CompositorNodeTree")
s.compositing_node_group = ng
s.render.use_compositing = True
rl = ng.nodes.new("CompositorNodeRLayers")
print("RL outputs", [o.name for o in rl.outputs])
fo = ng.nodes.new("CompositorNodeOutputFile")
if hasattr(fo.format, "media_type"): fo.format.media_type = "IMAGE"
fo.format.file_format = "OPEN_EXR"
fo.format.color_depth = "32"
fo.directory = OUT
for name, src in [("col", "Diffuse Color"), ("nor", "Normal"), ("ao", "Ambient Occlusion"), ("alpha", "Alpha")]:
    item = fo.file_output_items.new("RGBA" if name != "alpha" else "FLOAT", name)
    ng.links.new(rl.outputs[src], fo.inputs[name])
trees = {n: bpy.data.objects[f"fir_tree_01_{n}_LOD1"] for n in "abc"}
# the trunk and bare branches are seen through: only the boughs are drawn (a crown wrapped on a cone
# would otherwise show its trunk as a line down the middle)
for m in bpy.data.materials:
    if m.use_nodes and ("bark" in m.name or "trunk" in m.name or "dead" in m.name):
        nt = m.node_tree
        out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        tb = nt.nodes.new("ShaderNodeBsdfTransparent")
        nt.links.new(tb.outputs[0], out.inputs["Surface"])
        print("SEE-THROUGH", m.name)
for o in bpy.data.objects:
    if o.type in ("MESH", "CURVE"): o.hide_render = True
VIEWS = [("a", 0), ("b", 0), ("c", 0), ("a", 120)]
for i, (n, ang) in enumerate(VIEWS):
    t = trees[n]
    for o in trees.values(): o.hide_render = o is not t
    t.rotation_euler[2] = math.radians(ang)
    bpy.context.view_layer.update()
    bb = [t.matrix_world @ mathutils.Vector(c) for c in t.bound_box]
    lo = [min(v[k] for v in bb) for k in range(3)]; hi = [max(v[k] for v in bb) for k in range(3)]
    # the trunk's axis: the bounding box centre in x, y
    cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
    half = max(hi[0] - cx, cx - lo[0], hi[1] - cy, cy - lo[1])
    tall = hi[2] - lo[2]
    # ortho scale is the larger side of the frame; frame height = tall, width = tall * W / H
    cam.data.ortho_scale = tall
    cam.location = (cx, cy - 60, lo[2] + tall / 2)
    cam.rotation_euler = (math.radians(90), 0, 0)
    print("VIEW", i, n, ang, "tall", round(tall, 2), "half", round(half, 2), "frame w", round(tall * W / H, 2))
    fo.file_name = f"v{i}_"
    s.frame_set(1)
    bpy.ops.render.render(write_still=False)
print("FILES", sorted(os.listdir(OUT)))
