/* 图一：地铁 MMI —— 车门状态界面 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  var GRID = ['ac', 'panto', 'train', 'door', 'horn', 'brakeCyl', 'motor', 'fire', 'atc', 'dir'];
  /* 每个图标的绘制外框尺寸，按参考图各自实测（参考图像素） */
  var ICO_SIZE = [
    [70, 60], [40, 70], [55, 66], [58, 60], [62, 70],
    [70, 36], [54, 58], [58, 70], [58, 70], [62, 52]
  ];

  var CAR_X = [0, 43, 42, 195, 346, 497, 648, 800, 951];
  /* 车厢分隔线位置（相对编组左边界 x=10） */
  var CAR_LINES = [185, 336, 487, 638, 790, 941];
  var WIN_OFF = [42, 81, 119, 158];

  var refs = null;

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
    var st = MMI.box(sheet, 'station', 0, 49, 1102, 48);
    var from = MMI.el('span', 'from'); from.textContent = MMI.sim.state.metro.fromStation;
    var to = MMI.el('span', 'to'); to.textContent = MMI.sim.state.metro.toStation;
    from.style.left = '5px'; from.style.color = '#6478e4';
    to.style.right = '108px'; to.style.color = '#8a95ee';
    st.appendChild(from); st.appendChild(to);
    MMI.box(sheet, 'md-arrow', 6, 93, 978, 4);

    /* ---- 编组 ---- */
    var consist = MMI.box(sheet, 'md-consist', 10, 119, 968, 66);
    MMI.box(consist, 'body', 0, 0, 968, 66);
    MMI.box(consist, 'rib-t', 2, 0, 964, 4);
    MMI.box(consist, 'rib-b', 6, 63, 956, 3);
    MMI.box(consist, 'band u', 8, 3, 952, 17);
    MMI.box(consist, 'band l', 8, 44, 952, 17);
    for (var c = 0; c < CAR_LINES.length; c++) MMI.box(consist, 'car', CAR_LINES[c], 1, 3, 62);
    MMI.box(consist, 'nose-r', 947, 19, 22, 22);

    /* ---- 运行信息行 ---- */
    var info = MMI.box(sheet, 'md-info', 0, 213, 1102, 40);
    function lab(x, t, w) { var n = MMI.box(info, 'lab', x, 0, w == null ? 120 : w, 40); n.textContent = t; return n; }
    function val(x, w, cls) { return MMI.box(info, 'val' + (cls ? ' ' + cls : ''), x, 0, w, 40); }
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
    var fPct = MMI.box(sheet, 'md-force-pct', 106, 448, 32);
    fPct.textContent = '%';

    /* ---- 12 格状态图标 ---- */
    var grid = MMI.box(sheet, 'md-grid', 223, 324, 555, 206);
    var cells = [];
    for (var g = 0; g < GRID.length; g++) {
      var cell = MMI.el('div', 'md-cell');
      cell.style.left = (g % 5) * 111 + 'px';
      cell.style.top = Math.floor(g / 5) * 103 + 'px';
      cell.appendChild(MMI.icon(GRID[g], ICO_SIZE[g][0], ICO_SIZE[g][1]));
      grid.appendChild(cell);
      cells.push(cell);
    }

    /* ---- 状态文字与分隔 ---- */
    MMI.box(sheet, 'md-sep1', 0, 564, 993, 2);
    MMI.box(sheet, 'md-lower', 0, 596, 993, 72);
    MMI.box(sheet, 'md-sep2', 0, 594, 993, 2);
    var statA = MMI.box(sheet, 'md-stat a', 15, 566, 200, 28);
    var statB = MMI.box(sheet, 'md-stat b', 417, 566, 200, 28);

    /* ---- 侧栏 ---- */
    MMI.box(sheet, 'md-sep3', 993, 49, 108, 616);
    [51, 153, 255, 358, 461, 564].forEach(function (y) {
      MMI.box(sheet, 'md-side-line', 993, y, 108, 2);
    });
    var confirm = MMI.box(sheet, 'md-confirm', 1013, 596, 70, 44);
    confirm.textContent = '确认';

    /* ---- 底部按钮条 ---- */
    var bottom = MMI.box(sheet, 'md-bottom', 0, 668, 1102, 100);
    var CELLW = 110.1;
    var buttons = [];
    for (var bi = 0; bi < 9; bi++) {
      buttons.push(MMI.box(bottom, 'md-btn', Math.round(bi * CELLW), 0, Math.round(CELLW), 100));
    }
    function btn(i, cls) {
      if (cls) buttons[i].className = 'md-btn ' + cls;
      return buttons[i];
    }
    btn(0).appendChild(lbl('事件信息'));
    btn(1).appendChild(lbl('设置'));
    btn(2).appendChild(lbl('维护'));
    /* 索引 3 为空白按钮 */
    var bVolD = btn(4, 'icon'); bVolD.appendChild(MMI.icon('volDown', 34, 22));
    var bVolU = btn(5, 'icon'); bVolU.appendChild(MMI.icon('volUp', 34, 22));
    var bNavL = btn(6, 'icon'); bNavL.appendChild(MMI.icon('navLeft', 30, 22));
    var bNavR = btn(7, 'icon'); bNavR.appendChild(MMI.icon('navRight', 30, 22));
    /* 索引 8 为语言切换按钮：保留位置，内部留空、无功能 */

    var home = MMI.el('div', 'abs md-home');
    home.textContent = '主页';
    sheet.appendChild(home);
    home.style.left = '997px'; home.style.top = '672px';

    function lbl(t) { var n = MMI.el('span', 'lbl'); n.textContent = t; return n; }

    /* ---- 交互 ---- */
    confirm.addEventListener('click', function () { MMI.sim.state.metro.confirm = true; });
    bNavL.addEventListener('click', function () { MMI.bus.emit('nav:step', -1); });
    bNavR.addEventListener('click', function () { MMI.bus.emit('nav:step', 1); });
    home.addEventListener('click', function () { location.hash = '#/select'; });
    btn(2).addEventListener('click', function () { location.hash = '#/metro-main'; });

    refs = {
      date: date, vSpeed: vSpeed, vBrake: vBrake, vVolt: vVolt,
      cell3: cells[3], cell7: cells[7]
    };

    MMI.bus.on('sim:tick', update);
    update();
  }

  function update() {
    if (!refs) return;
    var m = MMI.sim.state.metro;
    var now = new Date(m.origin.getTime() + m.elapsed * 1000);
    MMI.setText(refs.date, MMI.sim.fmtDateTime(now));
    MMI.setText(refs.vSpeed, Math.round(m.speed));
    MMI.setText(refs.vBrake, m.brakePressure.toFixed(1));
    MMI.setText(refs.vVolt, Math.round(m.lineVoltage));

    var cell = refs.cell3;
    var on = m.doorOpen;
    if (cell.classList.contains('on') !== on) cell.classList.toggle('on', on);
    if (refs.cell7) {
      var on7 = m.icons[7] === 1;
      if (refs.cell7.classList.contains('on') !== on7) refs.cell7.classList.toggle('on', on7);
    }
  }

  function unmount() {
    MMI.bus.off('sim:tick', update);
    refs = null;
  }

  MMI.screens = MMI.screens || {};
  MMI.screens['metro-door'] = { mount: mount, unmount: unmount };
})(window);
