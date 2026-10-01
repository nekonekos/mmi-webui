"""Render an image region as text so layout can be inspected without a viewer.

Usage: ascii.py <img> <x0> <y0> <x1> <y1> [cols] [rows]
"""
import sys
from PIL import Image

PALETTE = [
    ((0, 0, 0), "."),        # pure black
    ((255, 255, 255), "#"),  # white
    ((255, 255, 0), "Y"),    # yellow
    ((255, 0, 255), "M"),    # magenta
    ((255, 0, 0), "R"),      # red
    ((0, 255, 0), "G"),      # bright green
    ((0, 255, 255), "C"),    # cyan
    ((0, 0, 255), "B"),      # blue
]


def classify(c):
    best, bestd = "?", 10 ** 9
    for col, ch in PALETTE:
        d = sum(abs(c[i] - col[i]) for i in range(3))
        if d < bestd:
            bestd, best = d, ch
    if bestd <= 60:
        return best
    r, g, b = c
    mx, mn = max(c), min(c)
    if mx - mn < 40:  # greyscale
        return " " if mx < 40 else ("-" if mx < 110 else ("+" if mx < 180 else "%"))
    # saturated colour -> hue bucket
    if b > r and b > g:
        return "b" if r > 60 else "B"
    if g > r and g > b:
        return "g" if r > 60 else "G"
    if r > g and r > b:
        return "o" if g > 90 else "R"
    return "?"


def main():
    path = sys.argv[1]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
    cols = int(sys.argv[6]) if len(sys.argv) > 6 else 130
    rows = int(sys.argv[7]) if len(sys.argv) > 7 else 48
    im = Image.open(path).convert("RGB").crop((x0, y0, x1, y1))
    im = im.resize((cols, rows), Image.BOX)
    px = im.load()
    print("region (%d,%d)-(%d,%d) of %s  -> %dx%d cells" % (x0, y0, x1, y1, path, cols, rows))
    hdr = "     " + "".join(str((i // 10) % 10) for i in range(cols))
    print(hdr)
    print("     " + "".join(str(i % 10) for i in range(cols)))
    for y in range(rows):
        line = "".join(classify(px[x, y]) for x in range(cols))
        print("%4d %s" % (y, line))


main()
