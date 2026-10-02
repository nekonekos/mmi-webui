#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract MMI display-zone icon assets from the DB37/XXXX.4-2020 reference PDF.

The reference standard (materials/1593313757438339.pdf, 车载人机界面) describes
the metro MMI "main" screen as a set of numbered display zones.  Section 5.4
documents every zone with a "X 区的显示图标" table whose columns are the zone
states and whose rows are, in order:

    [state name]  [pixel spec, e.g. "139x83 黑色/浅灰色"]  [icon artwork]

The artwork is a mix of embedded bitmaps and vector art (and the icon
background colour is part of the artwork), so extracting embedded images alone
is incomplete.  This tool instead renders the page with PyMuPDF at high DPI and
crops every state to its *nominal spec icon box* (the "WxH" printed under each
state, e.g. 118x83) rather than to the table cell, so the PNGs have exactly the
aspect ratio the MMI zones expect.

The PDF draws artwork at ~0.46 pt per nominal spec pixel, so a state's box is
(spec_w * 0.46, spec_h * 0.46) points, centred on its table cell (or on the
artwork ink centroid when that differs by more than a few points).  The box is
kept as rendered - background colour plus artwork exactly as printed - with only
table rules and annotation text (spec lines, "注："/"（闪烁）" notes) whitened.

Usage
-----
    py -3 tools/extract_zone_icons.py [--dpi 288] [--out public/assets/metro-main]

Outputs
-------
    <out>/z<zone>-s<index>-<key>.png   one PNG per zone state
    <out>/manifest.json                JSON array describing every PNG
    tools/shots/zone-icons-sheet.png   contact sheet for visual inspection
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = REPO_ROOT / "materials" / "1593313757438339.pdf"
DEFAULT_OUT = REPO_ROOT / "public" / "assets" / "metro-main"
DEFAULT_SHEET = REPO_ROOT / "tools" / "shots" / "zone-icons-sheet.png"

# ---------------------------------------------------------------------------
# Zone / state mapping (verified against the PDF text layer)
# ---------------------------------------------------------------------------
# kind:
#   "art"  -> the table has an artwork row below the spec row
#   "text" -> the "icon" is the rendered text itself (terminus / next station /
#             train number zones): the cell text is the icon depiction
# match: normalised substring used to locate the state's header cell
ZONES = [
    dict(zone=1, page=9, caption="表3", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("overspeed", "超过推荐速度报警时", "超过推荐速度报警时"),
        ("emergency-trigger", "实际速度达到紧急制动触发速度值时",
         "实际速度达到紧急制动触发速度值时"),
    ]),
    dict(zone=4, page=12, caption="表5", kind="art", states=[
        ("traction", "牵引状态", "牵引状态"),
        ("coasting", "惰行状态", "惰行状态"),
        ("braking", "制动状态", "制动状态"),
        ("initial", "初始状态", "初始状态"),
    ]),
    dict(zone=5, page=12, caption="表6", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("am-step", "AM模式-点式", "AM 模式---点式"),
        ("am-continuous", "AM模式-连续式", "AM 模式---连续式"),
        ("cm-step", "CM模式-点式", "CM 模式---点式"),
        ("cm-continuous", "CM模式-连续式", "CM 模式---连续式"),
        ("restricted-manual", "限制人工驾驶模式", "限制人工驾驶模式"),
    ]),
    dict(zone=6, page=13, caption="表7", kind="art", states=[
        ("integrity-ok", "列车完整性正常", "列车完整性正常"),
        ("integrity-lost", "列车完整性丢失", "列车完整性丢失"),
    ]),
    dict(zone=7, page=13, caption="表8", kind="art", states=[
        ("headtail-comm-ok", "头尾设备激活通信正常", "另一端车载ATC设备通信正常"),
        ("headtail-comm-lost", "头尾设备激活通信中断", "另一端车载ATC设备通信中断"),
    ]),
    dict(zone=8, page=13, caption="表9", kind="text", states=[
        ("terminus", "终点站", "终点站：车站名称"),
        ("desc", "说明", "列车当次运行交路"),
    ]),
    dict(zone=9, page=13, caption="表10", kind="text", states=[
        ("next-station", "下一站", "下一站：车站名称"),
        ("desc", "说明", "列车运行的下一站"),
    ]),
    dict(zone=10, page=14, caption="表11", kind="text", states=[
        ("train-number", "车次号", "车次号显示"),
        ("desc", "说明", "当前列车车次号"),
    ]),
    dict(zone=11, page=14, caption="表12", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("skip-stop", "跳停显示", "跳停显示"),
        ("hold-train", "扣车显示", "扣车显示"),
    ]),
    dict(zone=12, page=14, caption="表13", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("menu-enabled", "菜单设置按钮可用", "菜单设置按钮可用"),
    ]),
    dict(zone=13, page=14, caption="表14", kind="art", states=[
        ("initial", "初始模式", "初始模式"),
        ("am-step", "AM模式-点式", "AM 模式---点式"),
        ("am-continuous", "AM模式-连续式", "AM 模式---连续式"),
        ("cm-step", "CM模式-点式", "CM 模式---点式"),
        ("cm-continuous", "CM模式-连续式", "CM 模式---连续式"),
        ("restricted-manual", "限制人工驾驶模式", "限制人工驾驶模式"),
    ]),
    dict(zone=14, page=15, caption="表15", kind="art", states=[
        ("forward", "非向后状态", "非向后状态"),
        ("backward", "向后状态", "向后状态"),
    ]),
    dict(zone=15, page=15, caption="表16", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("turning-back-soon", "将要折返", "将要折返"),
        ("turning-back", "折返中", "折返中"),
    ]),
    dict(zone=16, page=15, caption="表17", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("in-stop-area", "进入停车区域未进入停车窗", "列车进入停车区域但未进入停车窗"),
        ("in-stop-window", "进入停车区域且进入停车窗", "列车进入停车区域且进入停车窗"),
        ("rollback-window", "位于退行激活窗", "列车位于退行激活窗"),
    ]),
    dict(zone=17, page=15, caption="表18", kind="art", states=[
        ("allow-both", "允许左右侧同时开启", "允许左右两侧车门同时开启"),
        ("allow-left", "允许左侧开启", "允许左侧车门开启"),
        ("allow-right", "允许右侧开启", "允许右侧车门开启"),
        ("left-open", "左侧打开", "左侧车门打开"),
        ("right-open", "右侧打开", "右侧车门打开"),
        ("both-open", "左右两侧都打开", "左右两侧车门都打开"),
    ]),
    dict(zone=18, page=16, caption="表19", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("departure-request", "有列车发车请求时", "有列车发车请求时"),
        ("close-door-prompt", "关车门提示", "关车门提示"),
    ]),
    dict(zone=19, page=16, caption="表20", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("manual-open-manual-close", "人工开门-人工关门", "人工开门/人工关门"),
        ("auto-open-manual-close", "自动开门-人工关门", "自动开门/人工关门"),
        ("auto-open-auto-close", "自动开门-自动关门", "自动开门/自动关门"),
    ]),
    dict(zone=20, page=16, caption="表21", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("wheel-slip", "车轮空转打滑", "车轮空转/打滑"),
        ("emergency-brake", "车辆紧急制动", "车辆紧急制动"),
        ("platform-door", "站台屏蔽门未关闭", "站台屏蔽门未关闭"),
    ]),
    dict(zone=21, page=16, caption="表22", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("atp-fault", "ATP故障", "ATP 故障时显示"),
        ("ato-fault", "ATO故障", "两系均故障时显示"),
        ("rad-fault", "无线设备通信故障", "无线设备通信故障时显示"),
    ]),
    dict(zone=22, page=17, caption="表23", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("depot", "列车进入车辆段停车场", "列车进入车辆段"),
        ("lost-position", "列车丢失定位", "列车丢失定位"),
        ("open-mode-confirmed", "开口模式下司机已确认", "开口模式下"),
    ]),
    dict(zone=23, page=17, caption="表24", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("time", "时间显示", "时间显示"),
    ]),
    dict(zone=24, page=17, caption="表25", kind="art", states=[
        ("initial", "初始状态", "初始状态"),
        ("example", "示例", "示例"),
    ]),
]

# Nominal icon box per zone, in spec pixels (tables 3-25 of the standard).
SPECS = {
    1: (118, 83),
    4: (139, 83),
    5: (139, 83),
    6: (177, 83),
    7: (94, 83),
    8: (284, 85),
    9: (284, 85),
    10: (298, 85),
    24: (211, 133),
}
for _zone in range(11, 24):
    SPECS[_zone] = (177, 83)

# ---------------------------------------------------------------------------
# text helpers
# ---------------------------------------------------------------------------
_RX_SIZE = re.compile(r"\d+\s*[×xX]\s*\d+")
_RX_SECTION = re.compile(r"^\s*\d+\.\d")
_RX_CAPTION = re.compile(r"^\s*表\s*\d")
_MAX_ICON_PT = 300.0  # embedded bitmaps larger than this are figures, not icons
_PAGE_TOP_LIMIT = 175.0  # a table row spilling over spans the top of the next page
PT_PER_SPEC_PX = 0.46  # measured: the PDF draws artwork at ~0.46pt per spec pixel
RULE_MAX_PT = 1.3  # table rules are drawn as filled rectangles this thin
RULE_MIN_LEN = 12.0  # ...and at least this long (horizontal)
RULE_MIN_V = 5.0  # vertical rule segments are shorter (single table rows)


def spec_box_pt(zone):
    """Nominal icon box of a zone, in PDF points."""
    spec_w, spec_h = SPECS[zone]
    return spec_w * PT_PER_SPEC_PX, spec_h * PT_PER_SPEC_PX


def target_px(zone, dpi):
    """Nominal icon box of a zone, in output pixels at the given DPI."""
    spec_w, spec_h = SPECS[zone]
    scale = PT_PER_SPEC_PX * dpi / 72.0
    return int(round(spec_w * scale)), int(round(spec_h * scale))


def norm(text):
    """Normalise text for matching: drop whitespace/commas/slashes, unify dashes."""
    t = re.sub(r"\s+", "", text)
    t = t.replace("---", "-").replace("--", "-")
    for ch in "－—–―‐−":
        t = t.replace(ch, "-")
    for ch in "/／":
        t = t.replace(ch, "")
    for ch in "，,、":
        t = t.replace(ch, "")
    return t


def is_note(text):
    t = text.strip()
    return t.startswith("注") or "闪烁" in t or t.startswith("（") or t.startswith("(")


def is_block_boundary(text):
    return bool(_RX_SECTION.match(text) or _RX_CAPTION.match(text))


class Line(object):
    __slots__ = ("text", "x0", "y0", "x1", "y1", "size", "page")

    def __init__(self, text, bbox, size):
        self.text = text
        self.x0, self.y0, self.x1, self.y1 = bbox
        self.size = size
        self.page = None


class Block(Line):
    __slots__ = ("page", "lines")

    def __init__(self, line, page=None):
        Line.__init__(self, line.text, (line.x0, line.y0, line.x1, line.y1), line.size)
        self.page = page
        self.lines = [line]


def page_lines(page):
    out = []
    for blk in page.get_text("dict")["blocks"]:
        if blk.get("type") != 0:
            continue
        for ln in blk["lines"]:
            spans = [s for s in ln["spans"] if s["text"].strip()]
            if not spans:
                continue
            text = "".join(s["text"] for s in spans)
            size = max(s["size"] for s in spans)
            x0 = min(s["bbox"][0] for s in spans)
            x1 = max(s["bbox"][2] for s in spans)
            y0 = min(s["bbox"][1] for s in spans)
            y1 = max(s["bbox"][3] for s in spans)
            out.append(Line(text, (x0, y0, x1, y1), size))
    out.sort(key=lambda l: (round(l.y0, 1), l.x0))
    return out


def merge_blocks(lines):
    """Join vertically adjacent lines of the same size (wrapped header cells)."""
    blocks = []
    for ln in lines:
        target = None
        for b in reversed(blocks[-8:]):
            if abs(b.size - ln.size) > 0.4:
                continue
            if not (-1.0 <= ln.y0 - b.y1 <= 5.5):
                continue
            if min(b.x1, ln.x1) - max(b.x0, ln.x0) <= 0.5:
                continue
            target = b
            break
        if target is None:
            blocks.append(Block(ln, getattr(ln, "page", None)))
        else:
            target.text += ln.text
            target.x0 = min(target.x0, ln.x0)
            target.x1 = max(target.x1, ln.x1)
            target.y0 = min(target.y0, ln.y0)
            target.y1 = ln.y1
            target.lines.append(ln)
    return blocks


def page_grid(page):
    """Return horizontal rules (y, x0, x1) and vertical rules (x, y0, y1)."""
    hs, vs = [], []
    for d in page.get_drawings():
        r = d["rect"]
        if r.height <= RULE_MAX_PT and r.width >= RULE_MIN_LEN:
            hs.append((r.y0, r.x0, r.x1))
        elif r.width <= RULE_MAX_PT and r.height >= RULE_MIN_V:
            vs.append((r.x0, r.y0, r.y1))
    hs.sort()
    return hs, vs


def page_rules(page):
    """Thin filled rectangles that sit on the page's table grid (the rules)."""
    hs, vs = page_grid(page)
    hys = [y for y, _, _ in hs]
    vxs = [x for x, _, _ in vs]
    out = []
    for d in page.get_drawings():
        r = d["rect"]
        thin = (r.height <= RULE_MAX_PT and r.width >= 2.0) or \
               (r.width <= RULE_MAX_PT and r.height >= 2.0)
        if not thin:
            continue
        if not (any(abs(r.y0 - y) <= 1.0 for y in hys) or
                any(abs(r.x0 - x) <= 1.0 for x in vxs)):
            continue  # not on the table grid -> could be artwork, keep it
        out.append(fitz.Rect(r))
    return out


def cluster(values, tol=1.5):
    out = []
    for v in sorted(values):
        if out and v - out[-1][-1] <= tol:
            out[-1].append(v)
        else:
            out.append([v])
    return [sum(g) / len(g) for g in out]


def find_row(hs, y_min):
    """First bordered table row starting at/after y_min (top, bottom)."""
    ys = cluster([h[0] for h in hs])
    y_min = y_min - 0.6
    cand = [y for y in ys if y >= y_min]
    for i, top in enumerate(cand):
        for bottom in cand[i + 1:]:
            h = bottom - top
            if h < 14:
                continue
            if h <= 130:
                return top, bottom
            break
    return None


def cell_edges(vs, top, bottom):
    xs = cluster([v[0] for v in vs
                  if v[1] <= top + 1.5 and v[2] >= bottom - 1.5], tol=1.2)
    return xs


def find_image(page, x_center, y_min, y_max, max_dist):
    best = None
    for info in page.get_image_info():
        b = info["bbox"]
        w, h = b[2] - b[0], b[3] - b[1]
        if w > _MAX_ICON_PT or h > _MAX_ICON_PT:
            continue
        cx = (b[0] + b[2]) / 2.0
        cy = (b[1] + b[3]) / 2.0
        if cy < y_min or cy > y_max:
            continue
        dist = abs(cx - x_center)
        if dist > max_dist:
            continue
        if best is None or dist < best[0]:
            best = (dist, b)
    return best[1] if best else None


# ---------------------------------------------------------------------------
# image trimming
# ---------------------------------------------------------------------------
def ink_mask(img, tol=240):
    return img.convert("L").point(lambda v: 255 if v < tol else 0, mode="L")


def thin_runs(flags, max_len):
    runs, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            if i - start <= max_len:
                runs.append((start, i))
            start = None
    if start is not None and len(flags) - start <= max_len:
        runs.append((start, len(flags)))
    return runs


def trim_rect(img, tol=240, rule_frac=0.9, max_rule=8):
    """Bounding box of the ink, ignoring thin full-width/height table rules."""
    mask = ink_mask(img, tol)
    w, h = mask.size
    if w == 0 or h == 0:
        return None
    draw = ImageDraw.Draw(mask)
    rows = mask.tobytes()
    row_flags = [rows[i * w:(i + 1) * w].count(255) >= rule_frac * w for i in range(h)]
    for s, e in thin_runs(row_flags, max_rule):
        draw.rectangle([0, s, w - 1, e - 1], fill=0)
    trans = mask.transpose(Image.TRANSPOSE)
    cols = trans.tobytes()
    col_flags = [cols[i * h:(i + 1) * h].count(255) >= rule_frac * h for i in range(w)]
    for s, e in thin_runs(col_flags, max_rule):
        draw.rectangle([s, 0, e - 1, h - 1], fill=0)
    return mask.getbbox()


def render(page, rect, dpi):
    pix = page.get_pixmap(clip=rect, dpi=dpi, alpha=False)
    if pix.width <= 0 or pix.height <= 0:
        return None
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def mask_lines(img, lines, rect, dpi, pad=1.0):
    """Whiten text lines (table annotations) that fall inside the crop."""
    sx, sy = img.width / rect.width, img.height / rect.height
    draw = ImageDraw.Draw(img)
    for line in lines:
        _whiten(draw, img, (line.x0, line.y0, line.x1, line.y1), rect, sx, sy, pad)
    return img


def mask_rules(img, rules, rect, dpi, pad=0.4):
    """Whiten the table rules (thin filled rectangles) that cross the crop."""
    sx, sy = img.width / rect.width, img.height / rect.height
    draw = ImageDraw.Draw(img)
    for rule in rules:
        _whiten(draw, img, (rule.x0, rule.y0, rule.x1, rule.y1), rect, sx, sy, pad)
    return img


def mask_complement(img, keep, rect, dpi, pad=1.5):
    """Whiten everything inside the crop except `keep` (a page rectangle)."""
    sx, sy = img.width / rect.width, img.height / rect.height
    draw = ImageDraw.Draw(img)
    x0, y0 = keep.x0 - pad, keep.y0 - pad
    x1, y1 = keep.x1 + pad, keep.y1 + pad
    _whiten(draw, img, (rect.x0, rect.y0, rect.x1, y0), rect, sx, sy, 0.0)
    _whiten(draw, img, (rect.x0, y1, rect.x1, rect.y1), rect, sx, sy, 0.0)
    _whiten(draw, img, (rect.x0, y0, x0, y1), rect, sx, sy, 0.0)
    _whiten(draw, img, (x1, y0, rect.x1, y1), rect, sx, sy, 0.0)
    return img


def _whiten(draw, img, bbox, rect, sx, sy, pad):
    px0 = max(0, int((bbox[0] - pad - rect.x0) * sx))
    py0 = max(0, int((bbox[1] - pad - rect.y0) * sy))
    px1 = min(img.width - 1, int((bbox[2] + pad - rect.x0) * sx))
    py1 = min(img.height - 1, int((bbox[3] + pad - rect.y0) * sy))
    if px1 < px0 or py1 < py0:
        return
    draw.rectangle([px0, py0, px1, py1], fill=(255, 255, 255))


# ---------------------------------------------------------------------------
# per-zone extraction
# ---------------------------------------------------------------------------
class Extractor(object):
    def __init__(self, doc, dpi, fit_artwork=False):
        self.doc = doc
        self.dpi = dpi
        self.fit_artwork = fit_artwork
        self._cache = {}
        self.warnings = []

    def page_data(self, index):
        if index not in self._cache:
            page = self.doc[index]
            hs, vs = page_grid(page)
            lines = page_lines(page)
            self._cache[index] = {
                "page": page,
                "lines": lines,
                "hs": hs,
                "vs": vs,
                "notes": [l for l in lines if is_note(l.text)],
                "rules": page_rules(page),
            }
        return self._cache[index]

    def band_blocks(self, index, y0, y1):
        data = self.page_data(index)
        out = []
        for line in data["lines"]:
            if y0 < line.y0 < y1:
                line.page = index
                out.append(line)
        return merge_blocks(out)

    def match_block(self, blocks, match):
        want = norm(match)
        exact = [b for b in blocks if norm(b.text) == want]
        cands = exact or [b for b in blocks if want in norm(b.text)]
        return cands[0] if cands else None

    def extract_zone(self, spec, manifest, out_dir, dump_dir):
        pidx = spec["page"] - 1
        data = self.page_data(pidx)
        cap = None
        for line in data["lines"]:
            if norm(line.text).startswith(norm(spec["caption"])) and "图标" in line.text:
                cap = line
                break
        if cap is None:
            self.warnings.append("zone %d: caption %s not found" % (spec["zone"], spec["caption"]))
            return

        # vertical window that contains this table's body
        nxt = [l.y0 for l in data["lines"]
               if l.y0 > cap.y1 + 0.5 and is_block_boundary(l.text)]
        limit = min(nxt) if nxt else 790.0
        blocks = self.band_blocks(pidx, cap.y1, limit)
        has_next = pidx + 1 < len(self.doc)
        if has_next:
            nd = self.page_data(pidx + 1)
            nxt2 = [l.y0 for l in nd["lines"]
                    if l.y0 > 85 and is_block_boundary(l.text)]
            limit2 = min(nxt2) if nxt2 else 300.0
            blocks += self.band_blocks(pidx + 1, 85.0, min(limit2, 260.0))

        for idx, (key, label, match) in enumerate(spec["states"], start=1):
            block = self.match_block(blocks, match)
            if block is None:
                self.warnings.append("zone %d state %d (%s): header not matched"
                                     % (spec["zone"], idx, label))
                continue
            entry = self.extract_state(spec, idx, key, label, block, dump_dir)
            if entry is None:
                self.warnings.append("zone %d state %d (%s): no ink found"
                                     % (spec["zone"], idx, label))
                continue
            img, page_index, box, source = entry
            fname = "z%d-s%d-%s.png" % (spec["zone"], idx, key)
            path = out_dir / fname
            save_png(img, path)
            spec_w, spec_h = SPECS[spec["zone"]]
            manifest.append({
                "zone": spec["zone"],
                "state": idx,
                "key": key,
                "label": label,
                "file": fname,
                "w": img.width,
                "h": img.height,
                "spec": "%dx%d" % (spec_w, spec_h),
                "pt": "%.1fx%.1f" % (box.width, box.height),
            })
            print("  z%-2d s%d %-24s %-6s p%-2d spec %-8s box %4.1fx%-5.1fpt -> %3dx%-3d  %s"
                  % (spec["zone"], idx, key, source, page_index + 1,
                     "%dx%d" % (spec_w, spec_h), box.width, box.height,
                     img.width, img.height, fname))

    def extract_state(self, spec, idx, key, label, block, dump_dir):
        spec_page = block.page
        hdata = self.page_data(spec_page)
        # spec row: the small-print lines right below the header cell
        win = [l for l in hdata["lines"]
               if block.y1 - 2.5 <= l.y0 <= block.y1 + 45.0
               and not is_note(l.text) and not is_block_boundary(l.text)]
        seeds = [l for l in win if _RX_SIZE.search(l.text)]
        if seeds:
            first = min(s.y0 for s in seeds)
            spec_lines = [l for l in win if l.y0 <= first + 26.0 and l.size <= 10.2]
        else:
            spec_lines = list(win)
        if not spec_lines:
            self.warnings.append("zone %d state %d: spec row not found" % (spec["zone"], idx))
            return None
        spec_bottom = max(l.y1 for l in spec_lines)
        columns = self._spec_columns(spec_lines)
        if not columns:
            return None
        pitch = median_pitch(columns)
        x_center = min(columns, key=lambda c: abs(c - (block.x0 + block.x1) / 2.0))
        stem = "z%d-s%d" % (spec["zone"], idx)
        zone = spec["zone"]

        if spec["kind"] == "text":
            # the "icon" is the printed text itself: keep the state's own cell text
            # and drop every other text item (spec values, the other column, ...)
            keep = {id(l) for l in block.lines}
            masked = [l for l in hdata["lines"] if id(l) not in keep]
            region = fitz.Rect(block.x0 - 4, block.y0 - 4, block.x1 + 4, block.y1 + 4)
            return self._extract_box(region, block.page, masked, zone, stem, "text",
                                     dump_dir, text_keep=block)

        # tablet/vector annotations inside the artwork row: the spec values and notes
        masked = hdata["notes"] + list(spec_lines)

        # candidate image: same page below the spec row, else top of next page
        scale = 0.72 * pitch
        img = find_image(hdata["page"], x_center, spec_bottom - 3.0,
                         spec_bottom + 140.0, scale)
        img_page = spec_page
        if img is None and spec_page + 1 < len(self.doc):
            nd = self.page_data(spec_page + 1)
            for info in nd["page"].get_image_info():
                b = info["bbox"]
                if b[2] - b[0] > _MAX_ICON_PT or b[3] - b[1] > _MAX_ICON_PT:
                    continue
                if b[1] < 85.0 or b[3] > _PAGE_TOP_LIMIT:
                    continue
                if abs((b[0] + b[2]) / 2.0 - x_center) > scale:
                    continue
                if img is None or abs((b[0] + b[2]) / 2.0 - x_center) < \
                        abs((img[0] + img[2]) / 2.0 - x_center):
                    img = b
                    img_page = spec_page + 1

        # candidate regions, best first: grid cell, image band, geometric band
        regions = []
        order = [spec_page] if img_page == spec_page else [spec_page, img_page]
        for cand in order:
            cd = self.page_data(cand)
            y_min = spec_bottom if cand == spec_page else 85.0
            row = find_row(cd["hs"], y_min)
            if row is None or row[0] - y_min > 90.0:
                continue
            top, bottom = row
            edges = cell_edges(cd["vs"], top, bottom)
            inside = [c for c in zip(edges[:-1], edges[1:])
                      if c[0] - 1.0 <= x_center <= c[1] + 1.0]
            if inside:
                x0, x1 = inside[0]
                regions.append(("grid", cand, fitz.Rect(x0 + 0.7, top + 0.7,
                                                        x1 - 0.7, bottom - 0.7)))
                break
        if img is not None:
            regions.append(("image", img_page,
                            fitz.Rect(x_center - 0.46 * pitch, img[1] - 8.0,
                                      x_center + 0.46 * pitch, img[3] + 8.0)))
        below = [l.y0 for l in hdata["lines"]
                 if l.y0 > spec_bottom + 0.5
                 and (is_block_boundary(l.text) or is_note(l.text))]
        y1 = min(below) if below else spec_bottom + 85.0
        regions.append(("geom", spec_page,
                        fitz.Rect(x_center - 0.46 * pitch, spec_bottom + 2.0,
                                  x_center + 0.46 * pitch,
                                  min(y1, spec_bottom + 85.0) - 2.0)))
        regions.append(("cell-text", block.page,
                        fitz.Rect(block.x0 - 4, block.y0 - 4,
                                  block.x1 + 4, block.y1 + 4)))

        for source, page_index, region in regions:
            out = self._extract_box(region, page_index, masked, zone, stem,
                                    source, dump_dir)
            if out is not None:
                return out
        return None

    def _extract_box(self, region, page_index, masked, zone, stem, source, dump_dir,
                     text_keep=None):
        """Render `region`, find the artwork, and re-crop to the nominal spec box."""
        page = self.doc[page_index]
        region = region & page.rect
        if region.width < 4 or region.height < 4:
            return None
        search = render(page, region, self.dpi)
        if search is None:
            return None
        if text_keep is None:
            mask_lines(search, masked, region, self.dpi)
            mask_rules(search, self.page_data(page_index)["rules"], region, self.dpi)
        else:
            mask_complement(search, text_keep, region, self.dpi)
        if dump_dir is not None:
            search.save(str(Path(dump_dir) / ("%s-%s-search.png" % (stem, source))))
        ink = trim_rect(search)
        if ink is None:
            return None
        ptpp = 72.0 / self.dpi
        ink_rect = fitz.Rect(region.x0 + ink[0] * ptpp, region.y0 + ink[1] * ptpp,
                             region.x0 + ink[2] * ptpp, region.y0 + ink[3] * ptpp)
        cx = (region.x0 + region.x1) / 2.0
        cy = (region.y0 + region.y1) / 2.0
        if abs(ink_rect.x0 + ink_rect.x1 - 2 * cx) > 6.0:
            cx = (ink_rect.x0 + ink_rect.x1) / 2.0
        if abs(ink_rect.y0 + ink_rect.y1 - 2 * cy) > 6.0:
            cy = (ink_rect.y0 + ink_rect.y1) / 2.0
        w_pt, h_pt = spec_box_pt(zone)
        if self.fit_artwork:
            grow = max(1.0, (ink_rect.width + 3.0) / w_pt, (ink_rect.height + 3.0) / h_pt)
            w_pt, h_pt = w_pt * grow, h_pt * grow
        cx = min(max(cx, page.rect.x0 + w_pt / 2.0), page.rect.x1 - w_pt / 2.0)
        cy = min(max(cy, page.rect.y0 + h_pt / 2.0), page.rect.y1 - h_pt / 2.0)
        box = fitz.Rect(cx - w_pt / 2.0, cy - h_pt / 2.0,
                        cx + w_pt / 2.0, cy + h_pt / 2.0)
        img = render(page, box, self.dpi)
        if img is None:
            return None
        if text_keep is None:
            mask_lines(img, masked, box, self.dpi)
            mask_rules(img, self.page_data(page_index)["rules"], box, self.dpi)
        else:
            mask_complement(img, text_keep, box, self.dpi)
        want = target_px(zone, self.dpi)
        if (img.width, img.height) != want:
            img = img.resize(want, Image.LANCZOS)
        if dump_dir is not None:
            img.save(str(Path(dump_dir) / ("%s-%s-box.png" % (stem, source))))
        return img, page_index, box, source

    def _spec_columns(self, spec_lines):
        """Group spec-row lines into one column centre per zone state."""
        cols = []
        for line in sorted(spec_lines, key=lambda l: l.x0):
            placed = False
            for c in cols:
                if min(c["x1"], line.x1) - max(c["x0"], line.x0) > 0.5:
                    c["x0"] = min(c["x0"], line.x0)
                    c["x1"] = max(c["x1"], line.x1)
                    placed = True
                    break
            if not placed:
                cols.append({"x0": line.x0, "x1": line.x1})
        cols.sort(key=lambda c: (c["x0"] + c["x1"]) / 2.0)
        return [(c["x0"] + c["x1"]) / 2.0 for c in cols]


def median_pitch(columns):
    if len(columns) < 2:
        return 120.0
    diffs = sorted(columns[i + 1] - columns[i] for i in range(len(columns) - 1))
    return diffs[len(diffs) // 2]


def save_png(img, path):
    out = img.convert("RGBA")
    try:
        out = out.quantize(colors=96, method=Image.FASTOCTREE)
    except Exception:
        pass
    out.save(str(path), optimize=True)


# ---------------------------------------------------------------------------
# contact sheet
# ---------------------------------------------------------------------------
def build_sheet(manifest, out_dir, sheet_path, cols=6, tile=(190, 132)):
    font = load_font(11)
    font_small = load_font(10)
    rows = (len(manifest) + cols - 1) // cols
    tw, th = tile
    cell_h = th + 34
    sheet = Image.new("RGB", (cols * tw, rows * cell_h + 30), (250, 250, 250))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 8), "metro MMI zone icons - %d assets from DB37/XXXX.4-2020 section 5.4"
              % len(manifest), fill=(0, 0, 0), font=font)
    for i, entry in enumerate(manifest):
        cx = (i % cols) * tw
        cy = (i // cols) * cell_h + 30
        draw.rectangle([cx + 3, cy + 3, cx + tw - 3, cy + th + 3], outline=(200, 200, 200))
        img = Image.open(str(out_dir / entry["file"])).convert("RGBA")
        scale = min((tw - 16) / max(img.width, 1), (th - 16) / max(img.height, 1), 1.0)
        if scale < 1.0:
            img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))),
                             Image.LANCZOS)
        bg = Image.new("RGB", (tw - 16, th - 16), (255, 255, 255))
        bg.paste(img, ((tw - 16 - img.width) // 2, (th - 16 - img.height) // 2), img)
        sheet.paste(bg, (cx + 8, cy + 8))
        draw.text((cx + 6, cy + th + 6), entry["file"], fill=(0, 0, 0), font=font_small)
        draw.text((cx + 6, cy + th + 18),
                  "z%d s%d %s  %dx%d (spec %s)" % (entry["zone"], entry["state"],
                                                   entry["label"], entry["w"],
                                                   entry["h"], entry["spec"]),
                  fill=(80, 80, 80), font=font_small)
    sheet_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(str(sheet_path), optimize=True)
    return sheet


def load_font(size):
    for cand in (r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(cand, size)
        except Exception:
            continue
    return ImageFont.load_default()


# ---------------------------------------------------------------------------
def main(argv=None):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--pdf", default=str(DEFAULT_PDF), help="reference PDF")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output directory for PNGs")
    ap.add_argument("--dpi", type=int, default=288, help="render DPI (default 288)")
    ap.add_argument("--sheet", default=str(DEFAULT_SHEET), help="contact sheet path")
    ap.add_argument("--no-sheet", action="store_true", help="do not write the contact sheet")
    ap.add_argument("--dump-raw", default=None, help="also save pre-trim crops here")
    ap.add_argument("--fit-artwork", action="store_true",
                    help="grow the box (keeping the spec aspect) until it contains the "
                         "artwork; default is the strict nominal box")
    args = ap.parse_args(argv)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    if args.dump_raw:
        Path(args.dump_raw).mkdir(parents=True, exist_ok=True)

    doc = fitz.open(args.pdf)
    extractor = Extractor(doc, args.dpi, fit_artwork=args.fit_artwork)
    manifest = []
    for spec in ZONES:
        print("zone %d (page %d, %s)" % (spec["zone"], spec["page"], spec["caption"]))
        extractor.extract_zone(spec, manifest, out_dir, args.dump_raw)

    manifest.sort(key=lambda e: (e["zone"], e["state"]))
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = 0
    for entry in manifest:
        total += (out_dir / entry["file"]).stat().st_size
    print("\n%d icons, %d bytes total" % (len(manifest), total))
    if extractor.warnings:
        print("\nWARNINGS:")
        for warning in extractor.warnings:
            print("  " + warning)

    print("\naspect check (|w/h - spec_w/spec_h| < 0.06):")
    fails = 0
    for entry in manifest:
        spec_w, spec_h = (int(v) for v in entry["spec"].split("x"))
        ratio = spec_w / float(spec_h)
        delta = abs(entry["w"] / float(entry["h"]) - ratio)
        if delta >= 0.06:
            fails += 1
            print("  FAIL %s: %dx%d = %.3f vs spec %s = %.3f (delta %.3f)"
                  % (entry["file"], entry["w"], entry["h"],
                     entry["w"] / float(entry["h"]), entry["spec"], ratio, delta))
    print("  %d/%d within tolerance" % (len(manifest) - fails, len(manifest)))

    if not args.no_sheet:
        sheet = build_sheet(manifest, out_dir, Path(args.sheet))
        print("contact sheet: %s (%dx%d)" % (args.sheet, sheet.width, sheet.height))
    return 0


if __name__ == "__main__":
    sys.exit(main())
