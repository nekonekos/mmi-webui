/* 用系统 Chrome 无头模式对各界面截图（1024x768，1x），供与参考图逐像素比对。
   用法: node shoot.js <outDir> [route ...] */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');

const ALL = [
  'select', 'metro-door', 'metro-main',
  'cr400-run-bf', 'cr400-brake-af'
];

(async () => {
  const outDir = process.argv[2] || path.join(__dirname, 'shots');
  const routes = process.argv.length > 3 ? process.argv.slice(3) : ALL;
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1',
           '--font-render-hinting=none', '--disable-lcd-text']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE ERROR:', m.text()); });

  for (const r of routes) {
    const url = 'file:///' + path.join(ROOT, 'public', 'index.html').replace(/\\/g, '/') +
      '?freeze=1#/' + r;
    await page.goto(url, { waitUntil: 'load' });
    await new Promise(res => setTimeout(res, 400));
    const file = path.join(outDir, r + '.png');
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1024, height: 768 } });
    console.log('shot', r, '->', file);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
