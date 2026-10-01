/* 校验地铁主界面的 25 个显示区是否与 DB37/XXXX.4-2020 表1 的分区尺寸一致。
   用法: node zone-check.js */
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');

/* 表1：区域编号 -> [x, y, w, h]（由规范的宽高在 1024x768 上唯一推得） */
const EXPECT = {
  z1: [0, 0, 128, 95], z8: [128, 0, 295, 95], z9: [423, 0, 295, 95], z10: [718, 0, 306, 95],
  z2: [0, 95, 128, 440], z3: [128, 95, 542, 440],
  z4: [0, 535, 157, 88], z5: [157, 535, 167, 88], z6: [324, 535, 179, 88], z7: [503, 535, 167, 88],
  z23: [0, 623, 216, 145], z24: [216, 623, 439, 145], z25: [655, 623, 369, 145]
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.join(ROOT, 'public', 'index.html').replace(/\\/g, '/') + '#/metro-main',
    { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 250));

  const boxes = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.mm .zone').forEach(n => {
      const cls = Array.from(n.classList).find(c => /^mm-z\d+$/.test(c));
      if (!cls) return;
      const r = n.getBoundingClientRect();
      out[cls.slice(3)] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    });
    const cells = document.querySelectorAll('.mm-zone-cell').length;
    return { out, cells };
  });

  let bad = 0;
  for (const k of Object.keys(EXPECT)) {
    const got = boxes.out[k], want = EXPECT[k];
    const ok = got && got.join() === want.join();
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}  want=${want.join(',')}  got=${got ? got.join(',') : 'missing'}`);
  }
  console.log(`${boxes.cells === 12 ? 'PASS' : 'FAIL'}  11-22 区数量 = ${boxes.cells}（期望 12）`);
  if (boxes.cells !== 12) bad++;
  await browser.close();
  console.log(bad === 0 ? '\n分区全部符合规范表1' : `\n${bad} 处不符`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
