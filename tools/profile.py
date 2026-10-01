"""Column (or row) darkness profile: locate vertical/horizontal element edges.

Usage: profile.py <img> x <x0> <x1> <y0> <y1> [lum]   -> per-x dark pixel counts
       profile.py <img> y <y0> <y1> <x0> <x1> [lum]   -> per-y dark pixel counts
Only spans with counts > 0 are printed, run-length compressed.
"""
import sys
from PIL import Image

im = Image.open(sys.argv[1]).convert("RGB")
px = im.load()
mode = sys.argv[2]
a0, a1 = int(sys.argv[3]), int(sys.argv[4])
b0, b1 = int(sys.argv[5]), int(sys.argv[6])
lum = int(sys.argv[7]) if len(sys.argv) > 7 else 100

res = []
for a in range(a0, a1):
    n = 0
    for b in range(b0, b1):
        c = px[a, b] if mode == "x" else px[b, a]
        if (c[0] + c[1] + c[2]) / 3 < lum:
            n += 1
    res.append(n)

runs = []
start = None
for i, n in enumerate(res):
    if n > 0:
        if start is None:
            start = i
    else:
        if start is not None:
            runs.append((a0 + start, a0 + i - 1, max(res[start:i])))
            start = None
if start is not None:
    runs.append((a0 + start, a0 + len(res) - 1, max(res[start:])))

for s, e, m in runs:
    print("  %5d..%5d w=%4d peak=%d" % (s, e, e - s + 1, m))
