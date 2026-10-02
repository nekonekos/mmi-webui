"""把 public/assets/metro-main/manifest.json 转成浏览器可直接 <script> 引用的
public/assets/metro-main/manifest.js（页面在 file:// 下无法用 fetch 读 JSON）。

用法: py -3 tools/gen_mm_manifest_js.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'metro-main')
SRC = os.path.join(OUT_DIR, 'manifest.json')
DST = os.path.join(OUT_DIR, 'manifest.js')


def main():
    with open(SRC, encoding='utf-8') as f:
        data = json.load(f)
    js = ["/* 由 tools/gen_mm_manifest_js.py 从 manifest.json 生成，请勿手改。 */",
          "(function (g) {",
          "  'use strict';",
          "  var MMI = g.MMI || (g.MMI = {});",
          "  MMI.mmAssets = ["]
    for a in data:
        js.append("    { zone: %d, state: %d, key: %s, file: %s, w: %d, h: %d },"
                  % (a['zone'], a['state'], json.dumps(a['key']),
                     json.dumps(a['file']), a['w'], a['h']))
    js += ["  ];", "})(window);", ""]
    with open(DST, 'w', encoding='utf-8') as f:
        f.write('\n'.join(js))
    print('wrote %s (%d entries, %d bytes)' % (DST, len(data), os.path.getsize(DST)))


if __name__ == '__main__':
    main()
