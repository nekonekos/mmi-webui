"""Reconstruct the 25-zone grid of 图1 (显示屏分区示意图) from PDF vector lines."""
import json, sys, io

d = json.load(open(sys.argv[1], encoding="utf-8"))
page = [x for x in d if x["page"] == 8][0]

vs, hs = [], []
for g in page["drawings"]:
    x, y, x1, y1 = g["rect"]
    w, h = x1 - x, y1 - y
    if w < 1.5 and h > 3:
        vs.append((round(x, 2), round(y, 2), round(h, 2)))
    elif h < 1.5 and w > 3:
        hs.append((round(y, 2), round(x, 2), round(w, 2)))

xs = sorted(set(v[0] for v in vs))
ys = sorted(set(h[0] for h in hs))

out = io.StringIO()
out.write("distinct vertical-line x: %s\n" % xs)
out.write("distinct horizontal-line y: %s\n" % ys)

minx, maxx = xs[0], xs[-1]
miny, maxy = ys[0], ys[-1]
out.write("bbox in pt: x %.2f..%.2f (w %.2f)  y %.2f..%.2f (h %.2f)\n" % (minx, maxx, maxx - minx, miny, maxy, maxy - miny))
sx = (maxx - minx) / 1024.0
sy = (maxy - miny) / 768.0
out.write("scale pt/px: x %.5f  y %.5f\n" % (sx, sy))

out.write("\n--- x lines -> px (from left edge) ---\n")
for x in xs:
    out.write("  pt %8.2f  px %8.2f\n" % (x, (x - minx) / sx))
out.write("\n--- y lines -> px (from top edge) ---\n")
for y in ys:
    out.write("  pt %8.2f  px %8.2f\n" % (y, (y - miny) / sy))

open(sys.argv[2], "w", encoding="utf-8").write(out.getvalue())
print("ok")
