/* 图一：地铁 MMI —— 车门状态界面
   严格按参考图 materials/31a2832b-f536-4af6-850d-0cd60abc9a58.png 重写。
   设计坐标 = 参考图自身像素 1102x768（由 .md 整体映射到 1024x768）；
   按钮/图标为参考图 1:1 提取的 SVG（见 src/ui/metrodoor-icons.js，
   由 tools/make_metrodoor_icons.py 生成）。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;
  var NS = 'http://www.w3.org/2000/svg';
  var IC = MMI.mdIcons;
  var SX = IC.scale[0], SY = IC.scale[1];

  /* 参考图（ref）像素 -> 设计像素 */
  function rx(v) { return v * SX; }
  function ry(v) { return v * SY; }

  /* 10 格状态图标（参考图实测为 5x2） */
  var GRID = ['ac', 'panto', 'train', 'door', 'horn',
              'brakeCyl', 'motor', 'fire', 'atc', 'dir'];

  /* 底部按钮：9 格，前 3 格文字，4-7 图标，8 为红色状态图标 */
  var BTN_TEXT = ['事件信息', '设置', '维护', '', '', '', '', '', ''];
  var BTN_ICON = ['', '', '', '', 'btn-vol-down', 'btn-vol-up', 'btn-nav-left', 'btn-nav-right', 'btn-lang'];

  var CELL_X = IC.cell.x, CELL_Y = IC.cell.y, CELL_W = IC.cell.w, CELL_H = IC.cell.h;
  var BTN_X = IC.btn.x, BTN_Y = IC.btn.y, BTN_PITCH = IC.btn.pitch;

  var refs = null;

  /* 参考图提取的图标 -> 绝对定位的 <svg>。own=true 用图标原色，否则跟随 currentColor */
  function icon(name, own) {
    var d = IC.icons[name];
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + d.w + ' ' + d.h);
    svg.setAttribute('width', rx(d.w).toFixed(2));
    svg.setAttribute('height', ry(d.h).toFixed(2));
    svg.setAttribute('shape-rendering', 'crispEdges');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d.d);
    p.setAttribute('fill', own ? d.c : 'currentColor');
    svg.appendChild(p);
    svg.style.position = 'absolute';
    return svg;
  }

  /* 把图标放到原点（设计 px）的 (dx,dy)（参考图像素）处 */
  function place(svg, originX, originY, dx, dy) {
    svg.style.left = (originX + rx(dx)).toFixed(2) + 'px';
    svg.style.top = (originY + ry(dy)).toFixed(2) + 'px';
    return svg;
  }

  function lbl(t) { var n = MMI.el('span', 'lbl'); n.textContent = t; return n; }

  function mount(root) {
    var sheet = MMI.el('div', 'abs md');
    root.appendChild(sheet);

    /* ---- 顶栏 ---- */
    var top = MMI.box(sheet, 'md-top', 0, 0, 1102, 49);
    MMI.box(top, 'vd v1', 304, 0, 2, 49);
    MMI.box(top, 'vd v2', 716, 0, 2, 49);
    var no = MMI.box(top, 'txt no', 6, 0, 298, 49);
    var title = MMI.box(top, 'txt title', 306, 0, 410, 49);
    var date = MMI.box(top, 'txt date', 716, 0, 386, 49);
    no.textContent = MMI.sim.state.metro.trainNo;
    title.textContent = '车门状态';

    /* ---- 始发 / 终点站 ---- */
    var st = MMI.box(sheet, 'md-station', 0, 49, 1102, 48);
    var from = MMI.el('span', 'from');
    var to = MMI.el('span', 'to');
    from.textContent = MMI.sim.state.metro.fromStation;
    to.textContent = MMI.sim.state.metro.toStation;
    st.appendChild(from);
    st.appendChild(to);
    MMI.box(sheet, 'md-arrow', 6, 93, 978, 4);

    /* ---- 编组 ---- */
    var consist = MMI.box(sheet, 'md-consist', 10, 119, 968, 66);
    MMI.box(consist, 'body', 0, 0, 968, 66);
    MMI.box(consist, 'rib-t', 2, 0, 964, 4);
    MMI.box(consist, 'rib-b', 6, 63, 956, 3);
    MMI.box(consist, 'band u', 8, 3, 952, 17);
    MMI.box(consist, 'band l', 8, 44, 952, 17);
    [185, 336, 487, 638, 790, 941].forEach(function (x) {
      MMI.box(consist, 'car', x, 1, 3, 62);
    });
    MMI.box(consist, 'nose-r', 947, 19, 22, 22);

    /* ---- 运行信息行 ---- */
    var info = MMI.box(sheet, 'md-info', 0, 213, 1102, 40);
    function lab(x, t, w) { var n = MMI.box(info, 'lab', x, 0, w == null ? 120 : w, 40); n.textContent = t; return n; }
    function val(x, w) { return MMI.box(info, 'val', x, 0, w, 40); }
    lab(100, '速度', 40);
    var vSpeed = val(170, 60);
    lab(246, '公里/小时', 110);
    lab(413, '总风压力', 90);
    var vBrake = val(525, 80);
    lab(640, '巴', 40);
    lab(736, '线电压', 90);
    var vVolt = val(830, 60);
    lab(900, '伏', 40);

    /* ---- 牵引力竖条 ---- */
    var force = MMI.box(sheet, 'md-force', 121, 324, 26, 204);
    var forceFill = MMI.box(force, 'fill', 0, null, 20, 0);
    forceFill.style.bottom = '0px';
    MMI.box(force, 'mid', 0, 98, 20, 3);
    var fLab = MMI.box(sheet, 'md-force-lab', 68, 400, 46);
    fLab.textContent = '力';
    var fVal = MMI.box(sheet, 'md-force-val', 62, 448, 40);
    MMI.box(sheet, 'md-force-pct', 106, 448, 32).textContent = '%';

    /* ---- 10 格状态图标（参考图 1:1 提取） ---- */
    var cells = {};
    for (var g = 0; g < GRID.length; g++) {
      var col = g % 5, row = Math.floor(g / 5);
      var ox = rx(CELL_X + col * CELL_W), oy = ry(CELL_Y + row * CELL_H);
      var cell = MMI.box(sheet, 'md-cell', ox, oy, rx(CELL_W), ry(CELL_H));
      var d = IC.icons['grid-' + GRID[g]];
      cell.appendChild(place(icon('grid-' + GRID[g], false), ox, oy, d.dx, d.dy));
      cells[GRID[g]] = cell;
    }

    /* ---- 状态文字与分隔 ---- */
    MMI.box(sheet, 'md-sep1', 0, 564, 993, 2);
    MMI.box(sheet, 'md-lower', 0, 596, 993, 72);
    MMI.box(sheet, 'md-sep2', 0, 594, 993, 2);
    MMI.box(sheet, 'md-stat a', 15, 566, 200, 28).textContent = '保护人工';
    MMI.box(sheet, 'md-stat b', 417, 566, 200, 28).textContent = '停车制动';

    /* ---- 侧栏 ---- */
    MMI.box(sheet, 'md-sep3', 993, 49, 108, 616);
    [51, 153, 255, 358, 461, 564].forEach(function (y) {
      MMI.box(sheet, 'md-side-line', 993, y, 108, 2);
    });
    var confirm = MMI.box(sheet, 'md-confirm', 1013, 596, 70, 44);
    confirm.textContent = '确认';

    /* ---- 底部按钮条（9 格） ---- */
    var bottom = MMI.box(sheet, 'md-bottom', 0, ry(BTN_Y), 1102, ry(535 - BTN_Y));
    var buttons = [];
    for (var bi = 0; bi < 9; bi++) {
      var bx = rx(BTN_X) + bi * rx(BTN_PITCH);
      var b = MMI.box(bottom, 'md-btn', bx, 0, rx(BTN_PITCH), ry(535 - BTN_Y));
      if (BTN_TEXT[bi]) {
        b.appendChild(lbl(BTN_TEXT[bi]));
      } else if (BTN_ICON[bi]) {
        b.className = 'md-btn icon';
        var dd = IC.icons[BTN_ICON[bi]];
        b.appendChild(place(icon(BTN_ICON[bi], true), 0, 0, dd.dx, dd.dy));
      }
      buttons.push(b);
    }

    /* ---- 主页圆钮 ---- */
    var home = MMI.el('div', 'abs md-home');
    home.textContent = '主页';
    home.style.left = '996px';
    home.style.top = '672px';
    sheet.appendChild(home);

    /* ---- 交互 ---- */
    confirm.addEventListener('click', function () { MMI.sim.state.metro.confirm = true; });
    buttons[6].addEventListener('click', function () { MMI.bus.emit('nav:step', -1); });
    buttons[7].addEventListener('click', function () { MMI.bus.emit('nav:step', 1); });
    home.addEventListener('click', function () { location.hash = '#/select'; });
    buttons[2].addEventListener('click', function () { location.hash = '#/metro-main'; });

    refs = {
      date: date, vSpeed: vSpeed, vBrake: vBrake, vVolt: vVolt,
      forceFill: forceFill, fVal: fVal,
      cellDoor: cells.door
    };

    MMI.bus.on('sim:tick', update);
    MMI.bus.on('clock:tick', update);
    update();
  }

  function update() {
    if (!refs) return;
    var m = MMI.sim.state.metro;
    MMI.setText(refs.date, MMI.sim.fmtDateTime(MMI.sim.now()));
    MMI.setText(refs.vSpeed, Math.round(m.speed));
    MMI.setText(refs.vBrake, m.brakePressure.toFixed(1));
    MMI.setText(refs.vVolt, Math.round(m.lineVoltage));

    /* 牵引力竖条：中点为 0，向上牵引（绿）、向下制动（红） */
    var eff = Math.max(-100, Math.min(100, m.effort));
    var h = Math.round(98 * Math.abs(eff) / 100);
    MMI.setStyle(refs.forceFill, 'height', h + 'px');
    MMI.setStyle(refs.forceFill, 'bottom', eff >= 0 ? '101px' : (98 - h) + 'px');
    MMI.setStyle(refs.forceFill, 'background', eff >= 0 ? '#00ff00' : '#ff0000');
    MMI.setText(refs.fVal, eff.toFixed(0));

    /* 车门图标随开门状态高亮 */
    var on = m.doorOpen;
    if (refs.cellDoor.classList.contains('on') !== on) {
      refs.cellDoor.classList.toggle('on', on);
    }
  }

  function unmount() {
    MMI.bus.off('sim:tick', update);
    MMI.bus.off('clock:tick', update);
    refs = null;
  }

  MMI.screens = MMI.screens || {};
  MMI.screens['metro-door'] = { mount: mount, unmount: unmount };
})(window);
