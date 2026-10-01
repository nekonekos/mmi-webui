"""Report runs of 'ink' (pixels far from a background colour) along a row or column,
merging gaps smaller than `merge`. Useful for measuring text / element extents.

Usage:
  runs.py <img> row <y> <x0> <x1> <bgHex|auto> [dist] [merge]
  runs.py <img> col <x> <y0> <y1> <bgHex|auto> [dist] [merge]
"""
import sys
from PIL import Image

im = Image.open(sys.argv[1]).convert("RGB")
px = im.load()
mode = sys.argv[2]
idx = int(sys.argv[3])
a0, a1 = int(sys.argv[4]), int(sys.argv[5])
bgarg = sys.argv[6]
dist = int(sys.argv[7]) if len(sys.argv) > 7 else 90
merge = int(sys.argv[8]) if len(sys.argv) > 8 else 3

if bgarg == "auto":
    bg = px[(a0 + a1) // 2, idx] if mode == "row" else px[idx, (a0 + a1) // 2]
else:
    bgarg = bgarg.lstrip("#")
    bg = tuple(int(bgarg[i:i + 2], 16) for i in (0, 2, 4))


def get(i):
    return px[i, idx] if mode == "row" else px[idx, i]


def is_ink(c):
    return sum(abs(c[k] - bg[k]) for k in range(3)) > dist


runs = []
start = None
for i in range(a0, a1):
    if is_ink(get(i)):
        if start is None:
            start = i
    else:
        if start is not None:
            runs.append([start, i - 1])
            start = None
if start is not None:
    runs.append([start, a1 - 1])

merged = []
for r in runs:
    if merged and r[0] - merged[-1][1] - 1 <= merge:
        merged[-1][1] = r[1]
    else:
        merged.append(list(r))

print("bg=%s dist=%d merge=%d" % (bg, dist, merge))
for s, e in merged:
    print("  %5d..%5d  w=%4d" % (s, e, e - s + 1))
