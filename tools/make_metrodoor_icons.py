"""Metro MMI「车门状态」参考图 → 按钮裁剪 + 图标 1:1 提取。

参考图 materials/31a2832b-f536-4af6-850d-0cd60abc9a58.png 是 1102x768 设计图
的等比降采样（768x535）。本工具：
  1) 把参考图中每个按钮/图标区域裁切到 tools/refs/metrodoor/（人工核对用）；
  2) 对图标区域做「与底色差异」的二值化，按行做 run-length 编码，
     输出 SVG path 数据到 tools/metrodoor_icons.json（供 metro-door.js 使用）。
     与 cr400-run-bf/brake-af 的逐像素提取方式一致，保证 1:1 还原。

设计坐标换算：design = ref * (1102/768, 768/535)。
用法: py -3 -u tools/make_metrodoor_icons.py
"""
import json
import os
import sys
from collections import Counter

from PIL import Image

REF = os.path.join(os.path.dirname(__file__), '..', 'materials',
                   '31a2832b-f536-4af6-850d-0cd60abc9a58.png')
OUT_CROPS = os.path.join(os.path.dirname(__file__), 'refs', 'metrodoor')
OUT_JSON = os.path.join(os.path.dirname(__file__), 'metrodoor_icons.json')
OUT_JS = os.path.join(os.path.dirname(__file__), '..', 'public', 'src', 'ui', 'metrodoor-icons.js')

SX = 1102.0 / 768.0     # ref px -> design px (x)
SY = 768.0 / 535.0      # ref px -> design px (y)

# ---- 参考图像素坐标下的区域 ----
GRID_X0, GRID_Y0 = 156, 226      # 5 列 x 2 行，每格 77 x 72
CELL_W, CELL_H = 77, 72

GRID_NAMES = ['ac', 'panto', 'train', 'door', 'horn',
              'brakeCyl', 'motor', 'fire', 'atc', 'dir']

BTN_X0, BTN_Y0, BTN_Y1 = 2, 467, 533
BTN_PITCH = 76.5
BTN_NAMES = ['btn-event', 'btn-set', 'btn-maint', 'btn-blank',
             'btn-vol-down', 'btn-vol-up', 'btn-nav-left', 'btn-nav-right', 'btn-lang']
ICON_BUTTONS = {'btn-vol-down', 'btn-vol-up', 'btn-nav-left', 'btn-nav-right', 'btn-lang'}

HOME_BOX = (694, 468, 765, 530)
CONFIRM_BOX = (706, 416, 754, 447)


def dominant(img):
    return Counter(img.getdata()).most_common(1)[0][0]


def ink_mask(img, tol=150):
    """返回 (mask 2D list[bool], bbox)。ink = 与「本行底色」差异大的像素。

    参考图里未激活格是平底色、激活格是纵向渐变；逐行取众数即可同时适配两者，
    避免把渐变背景误判成图标墨迹。"""
    bg = dominant(img)
    w, h = img.size
    px = img.load()
    row_bg = [Counter(px[x, y] for x in range(w)).most_common(1)[0][0]
              for y in range(h)]
    mask = [[False] * w for _ in range(h)]
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        base = row_bg[y]
        for x in range(w):
            p = px[x, y]
            if abs(p[0] - base[0]) + abs(p[1] - base[1]) + abs(p[2] - base[2]) > tol:
                mask[y][x] = True
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    if x1 < 0:
        return mask, None, bg
    return mask, (x0, y0, x1, y1), bg


def runs_to_path(mask, bbox):
    """把 bbox 区域内的墨迹按行 run-length 编码成 SVG path。"""
    x0, y0, x1, y1 = bbox
    parts = []
    for y in range(y0, y1 + 1):
        row = mask[y]
        x = x0
        while x <= x1:
            if not row[x]:
                x += 1
                continue
            start = x
            while x <= x1 and row[x]:
                x += 1
            w = x - start
            parts.append('M%d %dh%dv1h-%dz' % (start - x0, y - y0, w, w))
    return ''.join(parts), x1 - x0 + 1, y1 - y0 + 1


def main():
    os.makedirs(OUT_CROPS, exist_ok=True)
    full = Image.open(REF).convert('RGB')

    def crop(box, name):
        full.crop(box).save(os.path.join(OUT_CROPS, name + '.png'))

    icons = {}

    def extract(box, key, cell_origin):
        cell = full.crop(box)
        mask, bbox, bg = ink_mask(cell)
        if bbox is None:
            print('  [warn] %s 无墨迹' % key)
            return
        d, w, h = runs_to_path(mask, bbox)
        # 墨迹主色（用于按参考图原色填充；网格格仍由 CSS currentColor 控制显隐态）
        px = cell.load()
        ink = Counter()
        for y in range(bbox[1], bbox[3] + 1):
            for x in range(bbox[0], bbox[2] + 1):
                if mask[y][x]:
                    ink[px[x, y]] += 1
        c = ink.most_common(1)[0][0] if ink else bg
        icons[key] = {
            'w': w, 'h': h, 'd': d,
            'dx': box[0] + bbox[0] - cell_origin[0],
            'dy': box[1] + bbox[1] - cell_origin[1],
            'bg': list(bg),
            'c': '#%02x%02x%02x' % c,
        }

    # ---- 10 格状态图标 ----
    for idx, name in enumerate(GRID_NAMES):
        col, row = idx % 5, idx // 5
        cx = GRID_X0 + col * CELL_W
        cy = GRID_Y0 + row * CELL_H
        crop((cx, cy, cx + CELL_W, cy + CELL_H), 'grid-' + name)
        extract((cx + 9, cy + 7, cx + CELL_W - 8, cy + CELL_H - 6),
                'grid-' + name, (cx, cy))

    # ---- 底部 9 格按钮 ----
    for idx, name in enumerate(BTN_NAMES):
        x0 = int(round(BTN_X0 + idx * BTN_PITCH)) + 1
        x1 = int(round(BTN_X0 + (idx + 1) * BTN_PITCH)) - 1
        crop((x0, BTN_Y0, x1, BTN_Y1), name)
        if name in ICON_BUTTONS:
            extract((x0 + 9, BTN_Y0 + 9, x1 - 9, BTN_Y1 - 9), name, (x0, BTN_Y0))

    crop(HOME_BOX, 'home')
    crop(CONFIRM_BOX, 'confirm')

    manifest = {
        'ref': 'materials/31a2832b-f536-4af6-850d-0cd60abc9a58.png',
        'ref_size': [full.size[0], full.size[1]],
        'scale': [SX, SY],
        'grid': {'x0': GRID_X0, 'y0': GRID_Y0, 'cell_w': CELL_W, 'cell_h': CELL_H},
        'btn': {'x0': BTN_X0, 'y0': BTN_Y0, 'y1': BTN_Y1, 'pitch': BTN_PITCH},
        'icons': icons,
    }
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, separators=(',', ':'))
    print('wrote %s  icons=%d  bytes=%d' % (OUT_JSON, len(icons), os.path.getsize(OUT_JSON)))

    js = ["/* 由 tools/make_metrodoor_icons.py 从参考图 1:1 提取生成，请勿手改。 */",
          "(function (g) {",
          "  'use strict';",
          "  var MMI = g.MMI || (g.MMI = {});",
          "  MMI.mdIcons = {",
          "    scale: [%r, %r]," % (SX, SY),
          "    cell: { x: %d, y: %d, w: %d, h: %d }," % (GRID_X0, GRID_Y0, CELL_W, CELL_H),
          "    btn: { x: %r, y: %d, pitch: %r }," % (BTN_X0, BTN_Y0, BTN_PITCH),
          "    icons: {"]
    for k in sorted(icons):
        v = icons[k]
        js.append("      %r: { w: %d, h: %d, dx: %d, dy: %d, c: %r, d: %r },"
                  % (k, v['w'], v['h'], v['dx'], v['dy'], v['c'], v['d']))
    js += ["    }", "  };", "})(window);", ""]
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(js))
    print('wrote %s  bytes=%d' % (OUT_JS, os.path.getsize(OUT_JS)))
    for k in sorted(icons):
        v = icons[k]
        print('  %-16s %2dx%-3d dx=%-3d dy=%-3d path=%d' % (k, v['w'], v['h'], v['dx'], v['dy'], len(v['d'])))


if __name__ == '__main__':
    sys.exit(main())
