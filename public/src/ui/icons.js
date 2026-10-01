/* 手写内联 SVG 图标库（以参考图逐个比对绘制）。
   用法: MMI.icon('panto', w, h) 返回 <svg><use href="#i-panto"></svg> 元素。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  /* 每个条目: viewBox + 内容。描边/填充风格与地铁 MMI 参考图一致（浅灰线条）。 */
  var DEFS = {

    /* ---- 地铁 车辆状态屏（图一）12 格图标 ---- */

    /* 空调 / 通风：三条斜线 + 太阳 */
    ac: [30, 26,
      '<path d="M2 3h16M2 9h16M2 15h16" stroke="currentColor" stroke-width="2.4" fill="none"/>' +
      '<circle cx="24" cy="17" r="5" stroke="currentColor" stroke-width="1.8" fill="none"/>' +
      '<path d="M24 8v3M24 23v2M15 17h3M31 17h2M18 11l2 2M28 21l2 2M30 11l-2 2M20 21l-2 2" ' +
      'stroke="currentColor" stroke-width="1.6" fill="none"/>' +
      '<path d="M1 25L32 1" stroke="currentColor" stroke-width="2.6" fill="none"/>'],

    /* 受电弓：竖直杆 + 弓头 + 正负号 */
    panto: [30, 26,
      '<path d="M15 4v18" stroke="currentColor" stroke-width="2.6" fill="none"/>' +
      '<path d="M6 8h18" stroke="currentColor" stroke-width="2.6" fill="none"/>' +
      '<path d="M9 22h12" stroke="currentColor" stroke-width="2.6" fill="none"/>' +
      '<path d="M4 2L8 6M8 2L4 6" stroke="currentColor" stroke-width="1.8" fill="none"/>' +
      '<path d="M5 25h6" stroke="currentColor" stroke-width="1.8" fill="none"/>' +
      '<path d="M22 1v6M19 4h6" stroke="currentColor" stroke-width="1.8" fill="none"/>'],

    /* 列车（车头正面） */
    train: [30, 26,
      '<path d="M6 24V12C6 6 10 2 15 2C20 2 24 6 24 12V24Z" stroke="currentColor" ' +
      'stroke-width="2.2" fill="none"/>' +
      '<path d="M9 8h12" stroke="currentColor" stroke-width="2" fill="none"/>' +
      '<rect x="10" y="12" width="10" height="5" stroke="currentColor" stroke-width="1.8" fill="none"/>' +
      '<path d="M10 25v3M20 25v3" stroke="currentColor" stroke-width="2" fill="none"/>'],

    /* 车门：两扇门 */
    door: [30, 26,
      '<rect x="3" y="1" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
      '<path d="M15 1v24" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
      '<rect x="6" y="4" width="6" height="12" fill="currentColor"/>' +
      '<rect x="18" y="4" width="6" height="12" fill="currentColor"/>'],

    /* 广播：喇叭 + 声波 + 人形 */
    horn: [30, 26,
      '<path d="M2 6h6l4-3v18l-4-3H2Z" stroke="currentColor" stroke-width="2" fill="none"/>' +
      '<path d="M16 8c2 2 2 6 0 8M20 5c4 4 4 12 0 16" stroke="currentColor" stroke-width="2" fill="none"/>' +
      '<path d="M26 12h4M28 9v6" stroke="currentColor" stroke-width="1.8" fill="none"/>'],

    /* 制动缸：半圆 + 竖杆 */
    brakeCyl: [30, 26,
      '<path d="M4 20a11 11 0 0 1 22 0" stroke="currentColor" stroke-width="2.4" fill="none"/>' +
      '<path d="M15 4v20" stroke="currentColor" stroke-width="2.4" fill="none"/>' +
      '<rect x="2" y="19" width="26" height="5" stroke="currentColor" stroke-width="2.2" fill="none"/>'],

    /* 牵引电机：圆角方框 + M */
    motor: [30, 26,
      '<rect x="1" y="3" width="28" height="20" rx="3" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
      '<path d="M7 18V8l8 8 8-8v10" stroke="currentColor" stroke-width="2.4" fill="none"/>'],

    /* 火灾：火焰 */
    fire: [30, 26,
      '<path d="M15 1c6 6 8 9 8 14a8 8 0 0 1-16 0c0-3 1-5 3-7 0 2 1 3 2 3 0-3 1-7 3-10Z" ' +
      'stroke="currentColor" stroke-width="2" fill="none"/>' +
      '<path d="M15 12c2 3 3 4 3 6a3 3 0 0 1-6 0c0-2 1-3 3-6Z" fill="currentColor"/>'],

    /* 车载 ATC：圆 + C */
    atc: [30, 26,
      '<circle cx="15" cy="13" r="12" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
      '<path d="M20 7a8 8 0 1 0 0 12" stroke="currentColor" stroke-width="2.2" fill="none"/>'],

    /* 换向 / 方向：双箭头 */
    dir: [30, 26,
      '<path d="M3 13h24" stroke="currentColor" stroke-width="2.4" fill="none"/>' +
      '<path d="M12 5l8 8-8 8" stroke="currentColor" stroke-width="2.4" fill="none"/>'],

    /* ---- 底部按钮图标 ---- */

    volDown: [34, 22,
      '<path d="M1 7h6l4-4v16l-4-4H1Z" fill="currentColor"/>' +
      '<path d="M14 11h12M14 11l4-4M14 11l4 4" stroke="currentColor" stroke-width="2.6" fill="none"/>'],

    volUp: [34, 22,
      '<path d="M1 7h6l4-4v16l-4-4H1Z" fill="currentColor"/>' +
      '<circle cx="20" cy="11" r="2.4" fill="currentColor"/>' +
      '<path d="M14 11h12M26 11l-4-4M26 11l-4 4" stroke="currentColor" stroke-width="2.6" fill="none"/>'],

    navLeft: [30, 22,
      '<path d="M1 3l10 8-10 8Z" fill="currentColor"/>' +
      '<path d="M20 3c-4 0-6 3-6 8s2 8 6 8 6-3 6-8-2-8-6-8Z" stroke="currentColor" ' +
      'stroke-width="2" fill="none"/>' +
      '<path d="M29 3l-8 8 8 8Z" fill="currentColor"/>'],

    navRight: [30, 22,
      '<path d="M29 3l-10 8 10 8Z" fill="currentColor"/>' +
      '<path d="M10 3c4 0 6 3 6 8s-2 8-6 8-6-3-6-8 2-8 6-8Z" stroke="currentColor" ' +
      'stroke-width="2" fill="none"/>' +
      '<path d="M1 3l8 8-8 8Z" fill="currentColor"/>']
  };

  function build() {
    var sprite = document.getElementById('sprite');
    if (!sprite || sprite.dataset.built) return;
    var defs = '';
    for (var k in DEFS) {
      if (!Object.prototype.hasOwnProperty.call(DEFS, k)) continue;
      var d = DEFS[k];
      defs += '<symbol id="i-' + k + '" viewBox="0 0 ' + d[0] + ' ' + d[1] + '">' + d[2] + '</symbol>';
    }
    sprite.innerHTML = defs;
    sprite.dataset.built = '1';
  }

  MMI.icon = function (name, w, h, cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + DEFS[name][0] + ' ' + DEFS[name][1]);
    if (w != null) svg.setAttribute('width', w);
    if (h != null) svg.setAttribute('height', h);
    svg.setAttribute('class', cls || '');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  };

  MMI.icons = { build: build, DEFS: DEFS };
  build();
})(window);
