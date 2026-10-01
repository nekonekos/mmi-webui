"""Run-length report of a scanline or a column of an image.

Usage:
  probe.py <img> row <y> [x0] [x1] [tol]
  probe.py <img> col <x> [y0] [y1] [tol]
  probe.py <img> bbox <x0> <y0> <x1> <y1>   # bbox of pixels differing from corner colour
"""
import sys
from PIL import Image

im = Image.open(sys.argv[1]).convert("RGB")
px = im.load()
mode = sys.argv[2]


def near(a, b, tol):
    return sum(abs(a[i] - b[i]) for i in range(3)) <= tol


if mode == "row":
    y = int(sys.argv[3])
    x0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    x1 = int(sys.argv[5]) if len(sys.argv) > 5 else im.size[0]
    tol = int(sys.argv[6]) if len(sys.argv) > 6 else 24
    cur = px[x0, y]
    start = x0
    for x in range(x0 + 1, x1):
        c = px[x, y]
        if not near(c, cur, tol):
            print("x %5d..%5d  (%4d)  %s" % (start, x - 1, x - start, cur))
            cur = c
            start = x
    print("x %5d..%5d  (%4d)  %s" % (start, x1 - 1, x1 - start, cur))
elif mode == "col":
    x = int(sys.argv[3])
    y0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    y1 = int(sys.argv[5]) if len(sys.argv) > 5 else im.size[1]
    tol = int(sys.argv[6]) if len(sys.argv) > 6 else 24
    cur = px[x, y0]
    start = y0
    for y in range(y0 + 1, y1):
        c = px[x, y]
        if not near(c, cur, tol):
            print("y %5d..%5d  (%4d)  %s" % (start, y - 1, y - start, cur))
            cur = c
            start = y
    print("y %5d..%5d  (%4d)  %s" % (start, y1 - 1, y1 - start, cur))
elif mode == "bbox":
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    bg = px[x0, y0]
    bx0, by0, bx1, by1 = x1, y1, x0, y0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if not near(px[x, y], bg, 24):
                bx0 = min(bx0, x); by0 = min(by0, y)
                bx1 = max(bx1, x); by1 = max(by1, y)
    print("bg=%s bbox=(%d,%d)-(%d,%d) size=%dx%d" % (bg, bx0, by0, bx1, by1, bx1 - bx0 + 1, by1 - by0 + 1))
