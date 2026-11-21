# The endless world's photographs

What the portals' live landscape (`src/lib/flight/`) draws its ground, its firs and its sea with. The
photographs are CC0 from Poly Haven: no credit is required; the sources are kept here so each can be
traced.

| Files | Source | What it shows |
| --- | --- | --- |
| rock.jpg, rock-n.jpg | [aerial_rocks_02](https://polyhaven.com/a/aerial_rocks_02) | a cliff face from the air, ledged, with moss |
| grass.jpg, grass-n.jpg | [rocky_terrain_02](https://polyhaven.com/a/rocky_terrain_02) | an upland meadow from the air, with stones |
| snow.jpg, snow-n.jpg | [snow_field_aerial](https://polyhaven.com/a/snow_field_aerial) | a snowfield from the air, ground showing through |
| ground.jpg, ground-n.jpg | [aerial_ground_rock](https://polyhaven.com/a/aerial_ground_rock) | stony earth and gravel from the air |
| tree.jpg, tree-n.jpg | [fir_tree_01](https://polyhaven.com/a/fir_tree_01) | real firs, rendered in Blender from the scanned model |
| waves.jpg | made here | a wind sea, built from an ocean wave spectrum (JONSWAP) |

Each `<name>.jpg` is colour as a ratio to the photograph's own average, so a land keeps its own colours.
Each `<name>-n.jpg` holds how the surface tilts (red, green) and how high it stands, or for the firs how
much of the tree is there (blue). `waves.jpg` holds the sea's slopes (red, green) and height (blue). Made
by `scripts/dev/world-textures.mjs`, `scripts/dev/blender/` and `scripts/dev/world-waves.mjs`.
