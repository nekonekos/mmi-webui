"""把参考图非等比映射到 1024x768，与本地截图逐像素比对。

用法: compare.py <refImg> <shotImg> [--dump out.txt] [--side N]
输出：平均绝对误差 MAE、最差 16x16 区块清单、以及 ASCII 热力/并排视图。
"""
import sys
from PIL import Image, ImageChops

ref_path, shot_path = sys.argv[1], sys.argv[2]
dump = None
if '--dump' in sys.argv:
    dump = sys.argv[sys.argv.index('--dump') + 1]
side = '--side' in sys.argv

ref = Image.open(ref_path).convert('RGB').resize((1024, 768), Image.LANCZOS)
shot = Image.open(shot_path).convert('RGB').resize((1024, 768), Image.LANCZOS)

diff = ImageChops.difference(ref, shot)
px = diff.load()
tot = 0
worst = []
BS = 32
for by in range(0, 768, BS):
    for bx in range(0, 1024, BS):
        s = 0
        for y in range(by, min(by + BS, 768), 2):
            for x in range(bx, min(bx + BS, 1024), 2):
                c = px[x, y]
                s += (c[0] + c[1] + c[2]) / 3
        n = ((min(by + BS, 768) - by + 1) // 2) * ((min(bx + BS, 1024) - bx + 1) // 2)
        m = s / n
        tot += m * n
        worst.append((m, bx, by))

lines = []
lines.append("ref  = %s (%s)" % (ref_path, Image.open(ref_path).size))
lines.append("shot = %s" % shot_path)
lines.append("MAE  = %.2f / 255" % (tot / (1024 * 768)))
worst.sort(reverse=True)
lines.append("worst 32x32 blocks:")
for m, bx, by in worst[:24]:
    lines.append("   (%4d,%4d) mae=%6.2f" % (bx, by, m))

if side:
    def ascii_of(im, x0, y0, x1, y1, cols, rows):
        crop = im.crop((x0, y0, x1, y1)).resize((cols, rows), Image.BOX).load()
        out = []
        for y in range(rows):
            out.append("".join(
                '.' if sum(crop[x, y]) < 150 else ('#' if sum(crop[x, y]) > 420 else '+')
                for x in range(cols)))
        return out
    cols, rows = 128, 32
    a = ascii_of(ref, 0, 0, 1024, 768, cols, rows)
    b = ascii_of(shot, 0, 0, 1024, 768, cols, rows)
    lines.append("--- LEFT = reference | RIGHT = rendered ---")
    for i in range(rows):
        lines.append(a[i] + " | " + b[i])

text = "\n".join(lines)
print(text)
if dump:
    open(dump, "w", encoding="utf-8").write(text)

if '--map' in sys.argv:
    print("--- block-MAE map (32x32, https:// = worst) ---")
    BS = 32
    chars = " .:-=+*#%@"
    for by in range(0, 768, BS):
        row = ""
        for bx in range(0, 1024, BS):
            s = 0
            n = 0
            for y in range(by, min(by + BS, 768), 4):
                for x in range(bx, min(bx + BS, 1024), 4):
                    c = px[x, y]
                    s += (c[0] + c[1] + c[2]) / 3
                    n += 1
            m = s / n
            row += chars[min(len(chars) - 1, int(m / 6))]
        print("%4d %s" % (by, row))
    print("     " + "".join(str((bx // 32) % 10) for bx in range(0, 1024, 32)))
