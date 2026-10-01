/* 校验舞台缩放：在不同窗口尺寸下截图，确认等比缩放 + 黑边、无变形。
   用法: node stage-check.js */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const SIZES = [[1024, 768], [1600, 900], [1366, 768], [800, 600], [2560, 1080]];

(async () => {
  const outDir = path.join(__dirname, 'shots', 'stage');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  const url = 'file:///' + path.join(ROOT, 'public', 'index.html').replace(/\\/g, '/') + '?freeze=1#/metro-door';

  for (const [w, h] of SIZES) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 250));
    const info = await page.evaluate(() => {
      const t = getComputedStyle(document.getElementById('stage')).transform;
      const r = document.getElementById('stage').getBoundingClientRect();
      return { transform: t, rect: [r.x, r.y, r.width, r.height] };
    });
    console.log(`viewport ${w}x${h} -> scale=${info.transform} rect=${info.rect.map(v => v.toFixed(1)).join(',')}`);
    await page.screenshot({ path: path.join(outDir, `stage_${w}x${h}.png`) });
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
