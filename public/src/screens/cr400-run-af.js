/* 中国标准动车组 CR400AF —— 运行界面
   设计坐标 = 参考图自身像素坐标 (1074x768)，由 .cra 整体映射到 1024x768。
   参考图基准值：2016-03-02 13:04:08 / 290 km/h / 制动级位 0 级。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  /* ------------------------- 局部 SVG ------------------------- */

  /* 顶部黄色三角警示牌（参考图 x 983..1063, y 4..76） */
  var TRI = '<svg width="88" height="78" viewBox="0 0 88 78">' +
    '<polygon points="44,9 81,71 7,71" fill="none" stroke="#ffffff" stroke-width="8"/>' +
    '<rect x="39" y="24" width="10" height="27" fill="#ffffff"/>' +
    '<rect x="39" y="57" width="10" height="10" fill="#ffffff"/></svg>';

  /* 受电弓 06：弓头 + 斜臂 + 底架 + 绝缘子 */
  var PAN6 = '<svg width="43" height="100" viewBox="0 0 43 100">' +
    '<rect x="2" y="0" width="37" height="6" fill="#ffffff"/>' +
    '<path d="M33 5 L3 30" stroke="#ffffff" stroke-width="4" fill="none"/>' +
    '<path d="M3 29 L16 41" stroke="#ffffff" stroke-width="4" fill="none"/>' +
    '<rect x="1" y="39" width="40" height="8" fill="#ffffff"/>' +
    '<rect x="15" y="56" width="10" height="43" fill="#ffffff"/>' +
    '<rect x="13" y="66" width="14" height="5" fill="#ffffff"/>' +
    '<rect x="13" y="82" width="14" height="5" fill="#ffffff"/></svg>';

  /* 受电弓 03：与 06 镜像且折叠（弓头间距更小） */
  var PAN3 = '<svg width="41" height="92" viewBox="0 0 41 92">' +
    '<rect x="2" y="2" width="34" height="5" fill="#ffffff"/>' +
    '<rect x="29.5" y="0" width="5" height="7" fill="#ffffff"/>' +
    '<path d="M6 6 L18 15" stroke="#ffffff" stroke-width="3" fill="none"/>' +
    '<rect x="2" y="14" width="34" height="6" fill="#ffffff"/>' +
    '<rect x="14.5" y="45" width="5" height="43" fill="#ffffff"/>' +
    '<rect x="13.5" y="54" width="7" height="14" fill="#ffffff"/></svg>';

  /* 网压刻度尺中部的绿色三角指示（参考图 x 249..285, y 137..167） */
  var GTRI = '<svg width="38" height="32" viewBox="0 0 38 32">' +
    '<polygon points="1,16 19,1 19,31" fill="#00ff00"/>' +
    '<rect x="19" y="7" width="18" height="19" fill="#00ff00"/></svg>';

  /* 钥匙图标（参考图 x 253..285, y 185..245） */
  var KEY = '<svg width="36" height="62" viewBox="0 0 36 62">' +
    '<circle cx="17" cy="19" r="12.7" fill="none" stroke="#b9b9b9" stroke-width="5"/>' +
    '<path d="M11.2 30 L11.2 58 L21.2 58 L21.2 30" fill="none" stroke="#b9b9b9" stroke-width="4.6"/>' +
    '<rect x="14.4" y="9" width="3.2" height="7.5" fill="#b9b9b9"/></svg>';

  /* 底部红底图标：白色闪电状斜带（参考图 x 896..951） */
  var BOLT = '<svg width="56" height="53" viewBox="0 0 56 53">' +
    '<path d="M44 6 L30 6 L26 24 L21 24 L17 42 L30 42 L35 24 L41 24 Z" fill="#ffffff"/>' +
    '<rect x="8" y="41" width="40" height="4" fill="#ffffff"/></svg>';

  /* 底部白底图标：黑色折线（参考图 x 124..179） */
  var ZIG = '<svg width="56" height="53" viewBox="0 0 56 53">' +
    '<rect x="9" y="12" width="43" height="9" fill="#0c0c0c"/>' +
    '<rect x="6" y="33" width="42" height="10" fill="#0c0c0c"/>' +
    '<path d="M19 1 L12 13" stroke="#0c0c0c" stroke-width="9" fill="none"/>' +
    '<path d="M14 21 L25 33" stroke="#0c0c0c" stroke-width="9" fill="none"/>' +
    '<path d="M34 43 L45 52" stroke="#0c0c0c" stroke-width="9" fill="none"/></svg>';

  /* ------------------------- 布局常量（参考图像素） ------------------------- */

  var BAR_X = [316, 453, 527, 664];
  var BAR_TOP = 286, BAR_H = 301;
  var PCT_100 = 315.5, PCT_0 = 585.5;     /* 100% / 0% 对应高度 */
  var CAR_LAB = ['07', '05', '04', '02'];

  /* 底部按钮：位置 / 宽度 / 文本（第 9 格参考图为纯黑空格） */
  var BTN = [
    { x: 5,   w: 94, t: '牵引界面' },
    { x: 113, w: 93, t: '制动界面' },
    { x: 221, w: 94, t: '设备状态' },
    { x: 329, w: 93, t: '设备控制' },
    { x: 436, w: 94, t: '低恒速' },
    { x: 544, w: 93, t: '故障信息' },
    { x: 652, w: 93, t: '运行界面' },
    { x: 760, w: 93, t: '维护界面' },
    { x: 867, w: 94, t: '' },
    { x: 975, w: 94, t: '帮助信息' }
  ];

  /* 底部图标位：x / 底色 / 前景色 / 前景类型 */
  var IB = [
    [2,    '#108c19', '#67ab6a', 'ch2', '受电'],
    [63,   '#06f0ef', '#298089', 'diag6'],
    [124,  '#ffffff', '#141414', 'zig'],
    [186,  '#0a0a0a', '#0a0a0a', 'none'],
    [351,  '#008d00', '#6eb06f', 'diag'],
    [444,  '#008d00', '#6cb06e', 'diag'],
    [537,  '#008d00', '#6eb06f', 'diag'],
    [630,  '#008d00', '#6eb06f', 'diag'],
    [836,  '#dfde00', '#8a8800', 'ch4', '旅客报警'],
    [896,  '#b50000', '#ffffff', 'bolt'],
    [955,  '#b50000', '#d29455', 'diag18'],
    [1018, '#e9c200', '#b50000', 'ch2', '状态']
  ];

  var refs = null;

  /* ------------------------- 小工具 ------------------------- */

  function txt(parent, cls, s, x, y, w, h, fs, ls) {
    var n = MMI.box(parent, 'tx ' + cls, x, y, w, h);
    n.textContent = s;
    n.style.fontSize = fs + 'px';
    n.style.lineHeight = h + 'px';
    if (ls != null) n.style.letterSpacing = ls + 'px';
    return n;
  }

  function box(parent, cls, x, y, w, h) {
    var n = MMI.box(parent, cls, x, y, w, h);
    n.style.lineHeight = '0px';
    return n;
  }

  /* ------------------------- 挂载 ------------------------- */

  function mount(root) {
    var sheet = MMI.el('div', 'abs cra');
    root.appendChild(sheet);

    /* ================= 顶栏 ================= */
    box(sheet, 'cra-tsep', 0, 82, 1074, 4);
    var elDate = txt(sheet, 'lat cra-date', '2016-03-02', 13, 19, 200, 44, 38.6, 0);
    var elTime = txt(sheet, 'lat cra-time', '13:04:08', 242, 20, 156, 43, 38.5, 0);
    var elSpeed = txt(sheet, 'lat cra-speed', '290', 431, 14, 82, 51, 44.5, 0);
    txt(sheet, 'lat cra-unit', 'km/h', 535, 26, 64, 31, 27, 0);
    txt(sheet, 'cra-brkl', '制动级位', 641, 28, 126, 38, 31.8, -1.2);
    var elBrk = txt(sheet, 'lat cra-brkv', '0', 830, 8, 34, 64, 56, 0);
    txt(sheet, 'cra-brkji', '级', 921, 26, 36, 38, 33, 0);
    box(sheet, 'cra-warn', 979, 0, 88, 78).innerHTML = TRI;

    /* ================= 左侧 网压 ================= */
    txt(sheet, 'cra-lt', '网压', 81, 137, 68, 29, 24, 8);
    txt(sheet, 'lat cra-lt', '[KV]', 148, 136, 46, 26, 21, 0);

    box(sheet, 'cra-lg-red', 112, 194, 53, 6);
    box(sheet, 'cra-lg-grn', 112, 218, 53, 5);
    for (var i = 0; i < 14; i++) {
      box(sheet, 'cra-lg-tick', 99, Math.round(197 + i * 23.1), 12, 2);
    }
    var lbar = box(sheet, 'cra-lg-bar', 110, 222, 50, 364);
    var lfill = box(lbar, 'cra-lg-fill', 4, 115, 40, 244);
    box(sheet, 'cra-lg-mark', 116, 509, 40, 3);

    txt(sheet, 'lat cra-lg-lab', '30', 49, 206.5, 40, 33, 29, 0);
    txt(sheet, 'lat cra-lg-lab', '20', 49, 319.5, 40, 33, 29, 0);
    txt(sheet, 'lat cra-lg-lab', '10', 49, 436.5, 40, 33, 29, 0);
    txt(sheet, 'lat cra-lg-lab', '1750', 28, 497, 54, 33, 27, -3);
    txt(sheet, 'lat cra-lg-lab', '0', 65, 572.5, 20, 27, 27, 0);
    box(sheet, 'cra-gtri', 248, 136, 38, 32).innerHTML = GTRI;
    box(sheet, 'cra-key', 252, 184, 36, 62).innerHTML = KEY;

    /* ================= 中部 ================= */
    txt(sheet, 'lat cra-no', 'CR400AF0207', 454, 95, 140, 27, 22.5, -0.6);
    box(sheet, 'cra-cat', 310, 149, 470, 4);
    box(sheet, 'cra-cat', 306, 127, 5, 140);
    txt(sheet, 'lat cra-car', '06', 388, 119, 36, 35, 30, 0);
    txt(sheet, 'lat cra-car', '03', 599, 119, 34, 35, 30, 0);
    box(sheet, 'cra-pan', 386, 158, 43, 100).innerHTML = PAN6;
    box(sheet, 'cra-pan', 597, 167, 41, 92).innerHTML = PAN3;

    var fills = [], caps = [];
    for (var b = 0; b < 4; b++) {
      var bar = box(sheet, 'cra-bar', BAR_X[b], BAR_TOP, 42, BAR_H);
      var f = box(bar, 'fill', 0, 170, 38, 0);
      var c = box(bar, 'cap', -2, 158, 42, 13);
      fills.push(f); caps.push(c);
      txt(sheet, 'lat cra-blab', CAR_LAB[b], BAR_X[b] + 5, 259, 32, 29, 25, 0);
      for (var t = 0; t < 11; t++) {
        box(sheet, 'cra-btick', BAR_X[b] + 44, Math.round(PCT_100 + t * 27) - 1, 9, 2);
      }
    }
    box(sheet, 'cra-bconn', 358, 314, 95, 3);
    box(sheet, 'cra-bconn', 570, 314, 94, 3);
    box(sheet, 'cra-bconn', 358, 449, 95, 3);
    box(sheet, 'cra-bconn', 570, 449, 94, 3);
    box(sheet, 'cra-bbase', 316, 584, 453, 4);

    txt(sheet, 'lat cra-plab', '100%', 783, 300, 66, 29, 25, 0);
    txt(sheet, 'lat cra-plab', '50%', 789, 435, 54, 29, 25, 0);
    txt(sheet, 'lat cra-plab', '0%', 789, 568, 40, 29, 25, 0);

    /* ================= 右侧 网流 ================= */
    txt(sheet, 'cra-rt', '网流', 883, 128, 64, 32, 27, 5);
    txt(sheet, 'lat cra-rt', '[A]', 950, 128, 34, 27, 23, 0);

    var rbar = box(sheet, 'cra-rg-bar', 910, 172, 46, 414);
    var rfill = box(rbar, 'cra-rg-fill', 4, 307, 34, 103);
    for (var k = 0; k < 41; k++) {
      box(sheet, 'cra-rg-tick', 954, Math.round(172 + k * 10.35), 12, 2);
    }
    txt(sheet, 'lat cra-rg-lab', '800', 979, 160, 52, 34, 29, 0);
    txt(sheet, 'lat cra-rg-lab', '600', 981, 260, 52, 34, 29, 0);
    txt(sheet, 'lat cra-rg-lab', '400', 980, 361, 52, 34, 29, 0);
    txt(sheet, 'lat cra-rg-lab', '200', 981, 465, 52, 34, 29, 0);
    txt(sheet, 'lat cra-rg-lab', '0', 981, 569, 20, 34, 29, 0);

    /* ================= 底部图标位 ================= */
    for (var q = 0; q < IB.length; q++) {
      var spec = IB[q];
      var ib = box(sheet, 'cra-ibox', spec[0], 636, 56, 53);
      ib.style.background = spec[1];
      if (spec[3] === 'none') continue;
      if (spec[3] === 'bolt') { box(ib, '', 0, 0, 56, 53).innerHTML = BOLT; continue; }
      if (spec[3] === 'zig') { box(ib, '', 0, 0, 56, 53).innerHTML = ZIG; continue; }
      if (spec[3] === 'ch2' || spec[3] === 'ch4') {
        var n = spec[3] === 'ch4' ? 2 : 2;
        var fsz = spec[3] === 'ch4' ? 17 : 21;
        var lh = spec[3] === 'ch4' ? 19 : 20;
        var half = n;
        for (var ci = 0; ci < half; ci++) {
          var line = spec[4].slice(ci * 2, ci * 2 + 2);
          var cl = txt(ib, 'ch', line, 0, 5 + ci * lh, 56, lh, fsz, 0);
          cl.style.color = spec[2];
        }
        continue;
      }
      var th = spec[3] === 'diag6' ? 6 : (spec[3] === 'diag18' ? 19 : 15);
      var dg = box(ib, 'diag', 24 - 50, 26 - th / 2, 100, th);
      dg.style.background = spec[2];
      dg.style.transform = 'rotate(-51.6deg)';
      if (spec[3] !== 'diag18') {
        box(ib, 'band', 12, 10, 14, 3).style.background = spec[2];
        box(ib, 'band', 10, 16, 14, 3).style.background = spec[2];
      }
    }

    /* ================= 底部按钮条 ================= */
    var btns = [];
    for (var n = 0; n < BTN.length; n++) {
      var B = BTN[n];
      var btn = box(sheet, 'cra-btn', B.x, 693, B.w, 75);
      box(btn, 'bev', -4, 0, B.w + 8, 22);
      box(btn, 'le', 0, 0, 1, 75);
      box(btn, 'bot', 0, 72, B.w, 3);
      if (B.t) {
        var lb = txt(btn, 'lb', B.t, 0, 25, B.w, 26, 23, -2.2);
        lb.style.textAlign = 'center';
      }
      btns.push(btn);
    }

    refs = {
      date: elDate, time: elTime, speed: elSpeed, brk: elBrk,
      lfill: lfill, rfill: rfill, fills: fills, caps: caps, btns: btns
    };

    MMI.bus.on('sim:tick', update);
    update();
  }

  /* ------------------------- 每帧刷新 ------------------------- */

  function update() {
    if (!refs) return;
    var c = MMI.sim.state.cr400;
    var now = new Date(c.origin.getTime() + c.elapsed * 1000);
    MMI.setText(refs.date, MMI.sim.fmtDate(now));
    MMI.setText(refs.time, MMI.sim.fmtTime(now));
    MMI.setText(refs.speed, Math.round(c.speed));
    MMI.setText(refs.brk, c.brakeLevel);

    /* 网压：蓝色填充由底部升起（参考图比例 ≈ 9.8px/kV） */
    var lv = Math.max(0, Math.min(30, c.netVoltage));
    var lo = Math.max(224, Math.min(583, Math.round(583 - lv * 9.76)));
    MMI.setStyle(refs.lfill, 'top', (lo - 224) + 'px');
    MMI.setStyle(refs.lfill, 'height', (583 - lo) + 'px');

    /* 网流：蓝色填充由底部升起（参考图比例 ≈ 0.4px/A） */
    var cur = Math.max(0, Math.min(800, c.netCurrent));
    var ro = Math.max(174, Math.min(583, Math.round(583 - cur * 0.4)));
    MMI.setStyle(refs.rfill, 'top', (ro - 174) + 'px');
    MMI.setStyle(refs.rfill, 'height', (583 - ro) + 'px');

    /* 变流器负载柱：蓝色填充 + 顶部洋红条 */
    for (var i = 0; i < 4; i++) {
      var pct = Math.max(0, Math.min(100, c.converters[i] * 2.6));
      var h = Math.round((PCT_0 - PCT_100) * pct / 100);
      var top = Math.round(PCT_0 - h - BAR_TOP);
      MMI.setStyle(refs.caps[i], 'top', top + 'px');
      MMI.setStyle(refs.fills[i], 'top', (top + 13) + 'px');
      MMI.setStyle(refs.fills[i], 'height', Math.max(0, h - 13) + 'px');
    }

    for (var b = 0; b < refs.btns.length; b++) {
      var on = BTN[b].t !== '' && BTN[b].t === c.highlight;
      if (refs.btns[b].classList.contains('on') !== on) refs.btns[b].classList.toggle('on', on);
    }
  }

  function unmount() {
    MMI.bus.off('sim:tick', update);
    refs = null;
  }

  MMI.screens = MMI.screens || {};
  MMI.screens['cr400-run-af'] = { mount: mount, unmount: unmount };
})(window);
