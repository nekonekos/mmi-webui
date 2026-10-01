"""Analyze a reference screenshot: content bbox, dominant colors, grid-line
positions (long horizontal / vertical edges) so the HMI layout can be rebuilt
with exact coordinates."""
import sys, io
from collections import Counter
from PIL import Image


def load(path):
    im = Image.open(path).convert("RGB")
    return im


def content_bbox(im):
    w, h = im.size
    px = im.load()
    bg = px[0, 0]

    def is_bg(c):
        return sum(abs(c[i] - bg[i]) for i in range(3)) <= 12

    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if not is_bg(px[x, y]):
                if x < x0:
                    x0 = x
                if x > x1:
                    x1 = x
                if y < y0:
                    y0 = y
                if y > y1:
                    y1 = y
    return (x0, y0, x1, y1)


def dominant(im, topn=30):
    small = im
    if im.size[0] > 1200:
        small = im.resize((im.size[0] // 2, im.size[1] // 2), Image.NEAREST)
    c = Counter(small.getdata())
    return c.most_common(topn)


def edge_lines(im, axis, min_run_ratio=0.45):
    """Return candidate separator coordinates along `axis`
    ('x' -> vertical separators, 'y' -> horizontal separators)."""
    w, h = im.size
    px = im.load()
    if axis == "x":
        n, m = w, h
        get = lambda i, j: px[i, j]
    else:
        n, m = h, w
        get = lambda i, j: px[j, i]
    scores = []
    for i in range(1, n):
        diff = 0
        for j in range(m):
            a = get(i - 1, j)
            b = get(i, j)
            if sum(abs(a[k] - b[k]) for k in range(3)) > 60:
                diff += 1
        if diff > m * min_run_ratio:
            scores.append((i, diff))
    return scores


def color_runs(im, y, x_from=0, x_to=None):
    """Run-length encode one scanline."""
    if x_to is None:
        x_to = im.size[0]
    px = im.load()
    out = []
    cur = px[x_from, y]
    start = x_from
    for x in range(x_from + 1, x_to):
        c = px[x, y]
        if sum(abs(c[k] - cur[k]) for k in range(3)) > 24:
            out.append((start, x - 1, cur))
            cur = c
            start = x
    out.append((start, x_to - 1, cur))
    return out


if __name__ == "__main__":
    path = sys.argv[1]
    out = io.StringIO()
    im = load(path)
    out.write("SIZE %dx%d\n" % im.size)
    out.write("CONTENT BBOX (non-uniform-border) %s\n" % (content_bbox(im),))
    out.write("--- DOMINANT COLORS ---\n")
    for c, n in dominant(im, 24):
        out.write("  %-18s %8d\n" % (str(c), n))
    out.write("--- VERTICAL SEPARATORS (x, changed rows) ---\n")
    for i, d in edge_lines(im, "x"):
        out.write("  x=%5d  rows=%d\n" % (i, d))
    out.write("--- HORIZONTAL SEPARATORS (y, changed cols) ---\n")
    for i, d in edge_lines(im, "y"):
        out.write("  y=%5d  cols=%d\n" % (i, d))
    target = sys.argv[2] if len(sys.argv) > 2 else None
    if target:
        open(target, "w", encoding="utf-8").write(out.getvalue())
        print("wrote", target)
    else:
        sys.stdout.write(out.getvalue())
