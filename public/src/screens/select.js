/* 启动 / 模式选择页 */
(function (global) {
  'use strict';
  var MMI = global.MMI;

  function mount(root) {
    var sheet = MMI.el('div', 'abs se');
    root.appendChild(sheet);

    var t = MMI.box(sheet, 'se-title', 0, 104, 1024, 60);
    t.textContent = '轨道交通驾驶模拟人机交互显示屏';
    var s = MMI.box(sheet, 'se-sub', 0, 168, 1024, 24);
    s.textContent = 'RAIL TRANSIT DRIVING SIMULATOR — HMI';
    MMI.box(sheet, 'se-line', 232, 214, 560, 1);

    var wrap = MMI.box(sheet, 'se-cards', 112, 258, 800, 300);
    card(wrap, 0, '地铁模式', 'Metro · CBTC 车载人机界面', '#/metro-door',
      '车门状态 / 运行界面', 'metro');
    card(wrap, 440, '中国标准动车组', 'CR400-AF 车载人机界面', '#/cr400-run-bf',
      '运行界面 / 制动界面', 'cr400');

    var foot = MMI.box(sheet, 'se-foot', 0, 588, 1024, 60);
    foot.innerHTML = '模拟数据由前端生成，无后端依赖<br>自动演示循环与键盘手动驾驶可切换';
    var keys = MMI.box(sheet, 'se-keys', 112, 664, 800, 20);
    keys.textContent = 'W / ↑ 牵引　S / ↓ 制动　1-7 制动级位　空格 快速制动　D 开关门　M 自动/手动　← → 切换界面';

    /* 卡片示例时间跟随系统时间实时更新 */
    MMI.bus.on('clock:tick', tickClock);
    tickClock();
  }

  function tickClock() {
    var d = MMI.sim.now();
    var de = document.querySelector('.se-clock-date');
    var te = document.querySelector('.se-clock-time');
    if (de) de.textContent = MMI.sim.fmtDate(d);
    if (te) te.textContent = MMI.sim.fmtTime(d);
  }

  function unmount() {
    MMI.bus.off('clock:tick', tickClock);
  }

  function card(wrap, left, title, sub, hash, hint, kind) {
    var c = MMI.box(wrap, 'se-card', left, 0, 360, 300);
    var cap = MMI.box(c, 'cap', 0, 22, 360, 34);
    cap.textContent = title;
    var d = MMI.box(c, 'desc', 0, 62, 360, 24);
    d.textContent = sub;
    var art = MMI.box(c, 'art', 20, 116, 320, 150);
    art.innerHTML = kind === 'metro' ? METRO_ART : CR400_ART;
    var h = MMI.box(c, 'idx', 0, 0, 0, 0);
    h.textContent = hint;
    h.style.cssText = 'position:absolute;left:0;top:274px;width:360px;text-align:center;' +
      'font-size:13px;color:#6d92bf';
    c.addEventListener('click', function () { location.hash = hash; });
    return c;
  }

  var METRO_ART =
    '<svg viewBox="0 0 320 150" width="320" height="150">' +
    '<rect x="6" y="30" width="308" height="46" rx="14" fill="#d5d5d3"/>' +
    '<rect x="6" y="30" width="308" height="46" rx="14" fill="none" stroke="#6e7276"/>' +
    '<g fill="#9a9ea2">' +
    '<rect x="34" y="44" width="18" height="18"/><rect x="60" y="44" width="18" height="18"/>' +
    '<rect x="92" y="44" width="18" height="18"/><rect x="118" y="44" width="18" height="18"/>' +
    '<rect x="150" y="44" width="18" height="18"/><rect x="176" y="44" width="18" height="18"/>' +
    '<rect x="208" y="44" width="18" height="18"/><rect x="234" y="44" width="18" height="18"/>' +
    '<rect x="266" y="44" width="18" height="18"/><rect x="292" y="44" width="18" height="18"/>' +
    '</g>' +
    '<circle cx="300" cy="53" r="9" fill="#3b3f45"/>' +
    '<rect x="20" y="96" width="280" height="2" fill="#3a6fb0"/>' +
    '<path d="M300 92l14 6-14 6z" fill="#8ab4e8"/>' +
    '<text x="20" y="126" fill="#7fa6d8" font-size="14" font-family="SimSun">西三环站</text>' +
    '<text x="300" y="126" fill="#7fa6d8" font-size="14" font-family="SimSun" text-anchor="end">市体育中心站</text>' +
    '</svg>';

  var CR400_ART =
    '<svg viewBox="0 0 320 150" width="320" height="150">' +
    '<rect x="0" y="0" width="320" height="150" fill="#000"/>' +
    '<g fill="#fff" font-size="15" font-family="SimHei">' +
    '<text class="se-clock-date" x="4" y="18"></text>' +
    '<text class="se-clock-time" x="112" y="18" fill="#00ff00"></text>' +
    '<text x="196" y="18">290</text><text x="238" y="18" font-size="12">km/h</text>' +
    '</g>' +
    '<g fill="#8c8c8c">' +
    '<rect x="40" y="60" width="34" height="70" fill="none" stroke="#fff" stroke-width="1.4"/>' +
    '<rect x="41" y="96" width="32" height="33" fill="#2a6ec4"/>' +
    '<rect x="96" y="46" width="42" height="84" fill="none" stroke="#fff" stroke-width="1.4"/>' +
    '<rect x="97" y="88" width="40" height="41" fill="#2a6ec4"/>' +
    '<path d="M97 88h40l-6 12h-34z" fill="#ff00ff"/>' +
    '<rect x="158" y="46" width="42" height="84" fill="none" stroke="#fff" stroke-width="1.4"/>' +
    '<rect x="159" y="88" width="40" height="41" fill="#2a6ec4"/>' +
    '<path d="M159 88h40l-6 12h-34z" fill="#ff00ff"/>' +
    '<rect x="220" y="46" width="42" height="84" fill="none" stroke="#fff" stroke-width="1.4"/>' +
    '<rect x="221" y="88" width="40" height="41" fill="#2a6ec4"/>' +
    '<path d="M221 88h40l-6 12h-34z" fill="#ff00ff"/>' +
    '</g>' +
    '</svg>';

  MMI.screens = MMI.screens || {};
  MMI.screens.select = { mount: mount, unmount: unmount };
})(window);
