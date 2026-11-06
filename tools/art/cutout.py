"""Cuts the plain light background off a painted figure: flood fill from the edges over pixels close to the
background colour, fill enclosed holes of background colour too, feather the edge, crop, scale to 560 high."""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB"); a = np.asarray(im).astype(int); H, W, _ = a.shape
bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
d = np.abs(a - bg).sum(axis=2)
sat = a.max(axis=2) - a.min(axis=2)
near = (d < 42) & (sat < 22)
mask = np.zeros((H, W), bool); q = deque()
for x in range(W): q.extend([(0, x), (H - 1, x)])
for y in range(H): q.extend([(y, 0), (y, W - 1)])
while q:
    y, x = q.popleft()
    if mask[y, x] or not near[y, x]: continue
    mask[y, x] = True
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and not mask[ny, nx]: q.append((ny, nx))
# holes: big enclosed patches of very-near background (between arm and body)
hole = (d < 18) & (sat < 10) & ~mask
from scipy import ndimage
lab, n = ndimage.label(hole)
sizes = ndimage.sum(hole, lab, range(1, n + 1))
for i, s in enumerate(sizes, 1):
    if s > 400: mask |= lab == i
alpha = Image.fromarray(((~mask) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
rgba = im.convert("RGBA"); rgba.putalpha(alpha)
bb = rgba.getbbox(); rgba = rgba.crop(bb)
h = 560; w = round(rgba.width * h / rgba.height)
rgba.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=88, method=6)
print(out, w, h)
