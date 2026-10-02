/* 交互自检：路由跳转、按钮点击、键盘导航、自动/手动切换。
   用法: node interact-check.js */
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'public', 'index.html').replace(/\\/g, '/');

let fails = 0;
function check(name, ok, extra) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) fails++;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.log('PAGE ERROR:', e.message); fails++; });

  const go = async h => { await page.goto(URL + h, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 250)); };
  const hash = () => page.evaluate(() => location.hash);

  await go('#/select');
  check('启动页渲染', await page.evaluate(() => !!document.querySelector('.se')));

  /* 点击"地铁模式"卡片 */
  await page.evaluate(() => document.querySelectorAll('.se-card')[0].click());
  await new Promise(r => setTimeout(r, 250));
  check('卡片点击 → 地铁车门状态', (await hash()) === '#/metro-door', await hash());

  /* 维护按钮 → 地铁主界面 */
  await page.evaluate(() => document.querySelectorAll('.md-bottom .md-btn')[2].click());
  await new Promise(r => setTimeout(r, 250));
  check('维护按钮 → 地铁主界面', (await hash()) === '#/metro-main', await hash());

  /* 返回按钮 */
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.mm-btn')).find(n => n.textContent === '返回');
    b.click();
  });
  await new Promise(r => setTimeout(r, 250));
  check('返回按钮 → 车门状态', (await hash()) === '#/metro-door', await hash());

  /* 主页按钮 → 启动页 */
  await page.evaluate(() => document.querySelector('.md-home').click());
  await new Promise(r => setTimeout(r, 250));
  check('主页按钮 → 启动页', (await hash()) === '#/select', await hash());

  /* 键盘 ← → 切换 */
  await go('#/cr400-run-bf');
  await page.keyboard.press('ArrowLeft');
  await new Promise(r => setTimeout(r, 200));
  const h1 = await hash();
  check('← 在同一模式内切换', h1 !== '#/cr400-run-bf' && h1.indexOf('#/cr400') === 0, h1);

  /* 自动/手动切换 */
  await go('#/metro-door');
  await page.keyboard.press('KeyM');
  await new Promise(r => setTimeout(r, 200));
  check('M 切换到手动驾驶', await page.evaluate(() => window.MMI.simLoop.mode === 'manual'));
  await page.keyboard.press('KeyM');
  await new Promise(r => setTimeout(r, 200));
  check('M 切回自动演示', await page.evaluate(() => window.MMI.simLoop.mode === 'auto'));

  /* 车门联动 */
  await page.keyboard.press('KeyD');
  await new Promise(r => setTimeout(r, 200));
  check('D 切换车门状态', await page.evaluate(() => window.MMI.sim.state.metro.doorOpen === false));
  await page.keyboard.press('KeyD');
  await new Promise(r => setTimeout(r, 200));
  check('D 再次切回开门', await page.evaluate(() => window.MMI.sim.state.metro.doorOpen === true));

  await browser.close();
  console.log(fails === 0 ? '\n全部通过' : `\n${fails} 项失败`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
