"""Dump PDF page geometry (text spans with exact coordinates, vector drawings,
embedded images) so the HMI layout can be reconstructed numerically."""
import sys, os, json
import fitz

PDF = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

doc = fitz.open(PDF)

report = []
for pno in range(doc.page_count):
    page = doc[pno]
    rep = {"page": pno + 1, "rect": [round(v, 2) for v in page.rect], "spans": [], "drawings": []}
    d = page.get_text("dict")
    for block in d.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                t = span.get("text", "")
                if not t.strip():
                    continue
                rep["spans"].append({
                    "text": t,
                    "bbox": [round(v, 2) for v in span["bbox"]],
                    "font": span.get("font"),
                    "size": round(span.get("size", 0), 2),
                    "color": "#%06x" % span.get("color", 0),
                })
    for dr in page.get_drawings():
        r = dr.get("rect")
        if r is None:
            continue
        rep["drawings"].append({
            "rect": [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)],
            "type": dr.get("type"),
            "fill": dr.get("fill"),
            "stroke": dr.get("color"),
            "width": dr.get("width"),
        })
    report.append(rep)

with open(os.path.join(OUT, "pdf_geometry.json"), "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=1)

# extract embedded images
imgdir = os.path.join(OUT, "images")
os.makedirs(imgdir, exist_ok=True)
seen = {}
for pno in range(doc.page_count):
    page = doc[pno]
    for idx, info in enumerate(page.get_images(full=True)):
        xref = info[0]
        try:
            ex = doc.extract_image(xref)
        except Exception:
            continue
        name = "p%02d_i%02d_x%d.%s" % (pno + 1, idx, xref, ex["ext"])
        if xref in seen:
            continue
        seen[xref] = name
        with open(os.path.join(imgdir, name), "wb") as f:
            f.write(ex["image"])
        print(name, ex["width"], "x", ex["height"])
print("done")
