import sys, os
import fitz

PDF = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

doc = fitz.open(PDF)
print("pages:", doc.page_count)
lines = []
for i, page in enumerate(doc):
    r = page.rect
    lines.append("=" * 70)
    lines.append("PAGE %d  size=%.1f x %.1f  rotation=%s" % (i + 1, r.width, r.height, page.rotation))
    lines.append("=" * 70)
    lines.append(page.get_text("text").rstrip())
    for j, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        try:
            info = doc.extract_image(xref)
            lines.append("[IMG %d] xref=%d %dx%d ext=%s bytes=%d" % (
                j, xref, info["width"], info["height"], info["ext"], len(info["image"])))
        except Exception as e:
            lines.append("[IMG %d] xref=%d err=%s" % (j, xref, e))
    try:
        lines.append("[DRAWINGS] count=%d" % len(page.get_drawings()))
    except Exception as e:
        lines.append("[DRAWINGS] err=%s" % e)

with open(os.path.join(OUT, "pdf_text.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("wrote pdf_text.txt")

for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    pix.save(os.path.join(OUT, "pdf_page_%02d.png" % (i + 1)))
print("rendered", doc.page_count, "pages")
