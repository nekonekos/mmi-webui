/* 地铁 MMI 主界面（25 个主显示区）
   依据 DB37/XXXX.4-2020《城市轨道交通互联互通体系规范 信号系统 第4部分：车载人机界面》
   表1 的分区尺寸与 5.3/5.4 的颜色与图例规定实现。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  /* 表2 主要颜色定义推荐值 */
  var C = {
    white: '#ffffff',
    black: '#000c19',
    red: '#bd0000',
    yellow: '#fff200',
    lgray: '#d4d4d4',
    green: '#2d9033',
    orange: '#ea9100',
    blue: '#2597e6'
  };

  var MAXSPEED = 160;      /* 表盘速度范围（工程可配置，最大 160km/h） */
  var SWEEP = 310;         /* 0 到最大刻度的扇形弧度 */
  var R_OUT = 204;         /* 红色边框半径 */
  var R_TICK = 201;        /* 刻度外端 */
  var R_LONG = 28, R_SHORT = 15, R_NUM = 162;

  var SVGNS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function polar(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  }

  /* 速度 -> 表盘角度（-155° 为 0km/h，+155° 为最大速度） */
  function speedAngle(v) {
    return -SWEEP / 2 + (v / MAXSPEED) * SWEEP;
  }

  function buildDial() {
    var cx = 205.5, cy = 205.5;
    var svg = svgEl('svg', { viewBox: '0 0 411 411', width: 411, height: 411 });

    /* 沿着速度表盘外边界显示环形边框，红色，宽 3 像素，半径 204 */
    svg.appendChild(svgEl('circle', {
      cx: cx, cy: cy, r: R_OUT, fill: 'none', stroke: C.red, 'stroke-width': 3
    }));

    /* 刻度：每 5km/h 一格；长刻度宽 3 长 28，短刻度宽 2 长 15，浅灰 */
    for (var v = 0; v <= MAXSPEED; v += 5) {
      var deg = speedAngle(v);
      var isLong = (v % 10 === 0);
      var r1 = isLong ? R_TICK - R_LONG : R_TICK - R_SHORT;
      var w = isLong ? 3 : 2;
      var half = w / 2;
      var dx = Math.sin(deg * Math.PI / 180) * half;
      var dy = -Math.cos(deg * Math.PI / 180) * half;
      var p0 = polar(cx, cy, R_TICK, deg);
      var p1 = polar(cx, cy, r1, deg);
      svg.appendChild(svgEl('line', {
        x1: p0[0] + dx, y1: p0[1] + dy, x2: p1[0] + dx, y2: p1[1] + dy,
        stroke: C.lgray, 'stroke-width': w
      }));
      if (v % 20 === 0) {
        var pn = polar(cx, cy, R_NUM, deg);
        var t = svgEl('text', {
          x: pn[0], y: pn[1], fill: C.lgray, 'font-size': 17,
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-family': 'SimHei, "黑体", sans-serif'
        });
        t.textContent = String(v);
        svg.appendChild(t);
      }
    }

    /* km/h 文字位于底部缺口处，距中心半径 168 */
    var pk = polar(cx, cy, 168, 180);
    var kmh = svgEl('text', {
      x: pk[0], y: pk[1], fill: C.lgray, 'font-size': 20,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'SimHei, "黑体", sans-serif'
    });
    kmh.textContent = 'km/h';
    svg.appendChild(kmh);

    /* 推荐速度（黄色等边三角形，边长 15）与紧急制动干预速度（红色） */
    var triRec = svgEl('polygon', { points: '', fill: C.yellow });
    var triEbi = svgEl('polygon', { points: '', fill: C.red });
    svg.appendChild(triRec);
    svg.appendChild(triEbi);

    /* 速度指针：指针 + 始端圆圈（半径 41），圆内以数字显示当前速度 */
    var needle = svgEl('line', {
      x1: cx, y1: cy, x2: cx, y2: cy - 165, stroke: C.white,
      'stroke-width': 4, 'stroke-linecap': 'round'
    });
    svg.appendChild(needle);
    svg.appendChild(svgEl('circle', {
      cx: cx, cy: cy, r: 41, fill: C.black, stroke: C.white, 'stroke-width': 3
    }));
    var cur = svgEl('text', {
      x: cx, y: cy + 1, fill: C.white, 'font-size': 24,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'SimHei, "黑体", sans-serif'
    });
    cur.textContent = '0';
    svg.appendChild(cur);

    return { svg: svg, needle: needle, cur: cur, triRec: triRec, triEbi: triEbi, cx: cx, cy: cy };
  }

  /* 等边三角形：中线与该速度处半径共线，顶点朝向表盘圆心 */
  function triangle(cx, cy, deg, side) {
    var r = side / Math.sqrt(3);
    var pts = [];
    for (var i = 0; i < 3; i++) {
      var p = polar(cx, cy, r, deg + 180 + i * 120);
      pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
    }
    return pts.join(' ');
  }

  function iconSvg(inner, w, h, color) {
    var box = MMI.el('div', 'abs');
    box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" style="color:' + color + '">' + inner + '</svg>';
    return box;
  }

  var ICO = {
    /* 1 区 超速报警及输出紧急制动 */
    warn: function (color) {
      return iconSvg('<path d="M59 6L112 76H6Z" fill="none" stroke="currentColor" stroke-width="5"/>' +
        '<rect x="54" y="28" width="10" height="26" fill="currentColor"/>' +
        '<rect x="54" y="60" width="10" height="10" fill="currentColor"/>', 118, 83, color);
    },
    /* 4 区 牵引制动状态 */
    traction: function (color) {
      return iconSvg('<circle cx="60" cy="41" r="33" fill="none" stroke="currentColor" stroke-width="4"/>' +
        '<path d="M44 41h30M60 28l14 13-14 13" fill="none" stroke="currentColor" stroke-width="5"/>' +
        '<text x="116" y="56" font-size="40" font-family="SimHei" fill="currentColor">B</text>', 139, 83, color);
    },
    coast: function (color) {
      return iconSvg('<circle cx="60" cy="41" r="33" fill="none" stroke="currentColor" stroke-width="4"/>' +
        '<path d="M42 41h36" fill="none" stroke="currentColor" stroke-width="5"/>', 139, 83, color);
    },
    brake: function (color) {
      return iconSvg('<circle cx="60" cy="41" r="33" fill="none" stroke="currentColor" stroke-width="4"/>' +
        '<rect x="42" y="35" width="36" height="12" fill="currentColor"/>', 139, 83, color);
    },
    /* 6 区 列车完整性 */
    chain: function (color) {
      return iconSvg('<rect x="8" y="22" width="34" height="38" rx="6" fill="none" stroke="currentColor" stroke-width="4"/>' +
        '<rect x="54" y="22" width="34" height="38" rx="6" fill="none" stroke="currentColor" stroke-width="4"/>' +
        '<path d="M42 41h12" stroke="currentColor" stroke-width="5"/>' +
        '<rect x="102" y="22" width="66" height="38" rx="6" fill="none" stroke="currentColor" stroke-width="4"/>', 177, 83, color);
    },
    /* 7 区 列车头尾设备状态 */
    dev: function (color) {
      return iconSvg('<rect x="6" y="20" width="36" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="4"/>' +
        '<rect x="52" y="20" width="36" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="4"/>', 94, 83, color);
    },
    generic: function (w, h, color) {
      return iconSvg('<rect x="8" y="8" width="' + (w - 16) + '" height="' + (h - 16) +
        '" fill="none" stroke="currentColor" stroke-width="3"/>', w, h, color);
    }
  };

  /* 11..22 区（跳停、扣车 → 车辆段/停车场转换区） */
  var CELLS = [
    '跳停、扣车', '菜单按钮', '当前驾驶模式', '当前运行方向',
    '折返状态', '列车进入停车窗', '门状态及门允许', '发车信息',
    '客室门控制模式', '车辆及站台屏蔽门', '设备故障', '车辆段/停车场转换区'
  ];

  var refs = null;

  function mount(root) {
    var s = MMI.el('div', 'abs mm');
    root.appendChild(s);

    /* ===== 1 区 超速报警及输出紧急制动 128×95 ===== */
    var z1 = MMI.box(s, 'zone mm-z1', 0, 0, 128, 95);
    var z1ico = ICO.warn(C.lgray);
    z1ico.style.left = '5px'; z1ico.style.top = '6px';
    z1.appendChild(z1ico);

    /* ===== 2 区 目标速度及目标距离信息 128×440 ===== */
    var z2 = MMI.box(s, 'zone mm-z2', 0, 95, 128, 440);
    MMI.box(z2, 'mm-tgt-axis', 58, 14, 1, 400);
    var scale = [750, 500, 300, 150, 0];
    for (var li = 0; li < scale.length; li++) {
      var ly = 14 + li * 100;
      MMI.box(z2, 'mm-tgt-tick', 52, ly, 7, 1);
      var lab = MMI.box(z2, 'mm-tgt-lab', 0, ly - 8, 48, 16);
      lab.textContent = scale[li];
    }
    var tgtBar = MMI.box(z2, 'mm-tgt-bar', 63, null, 15, 0);
    tgtBar.style.bottom = '26px';
    var tgtSpeed = MMI.box(z2, 'mm-tgt-speed', 0, 0, 128, 20);
    var tgtDist = MMI.box(z2, 'mm-tgt-dist', 0, 428, 128, 14);

    /* ===== 3 区 速度表盘 542×440 ===== */
    var z3 = MMI.box(s, 'zone mm-z3', 128, 95, 542, 440);
    var dial = buildDial();
    dial.svg.style.position = 'absolute';
    dial.svg.style.left = '66px';
    dial.svg.style.top = '9px';
    z3.appendChild(dial.svg);

    /* ===== 4 区 牵引制动状态显示 157×88 ===== */
    var z4 = MMI.box(s, 'zone mm-z4', 0, 535, 157, 88);
    var z4ico = ICO.coast(C.lgray);
    z4ico.style.left = '9px'; z4ico.style.top = '3px';
    z4.appendChild(z4ico);

    /* ===== 5 区 最高可用驾驶模式显示 167×88 ===== */
    var z5 = MMI.box(s, 'zone mm-z5', 157, 535, 167, 88);
    var z5t = MMI.box(z5, 'mm-val', 0, 22, 167, 44);
    z5t.style.fontSize = '26px';
    z5t.style.textAlign = 'center';
    z5t.textContent = 'AM 连续式';

    /* ===== 6 区 列车完整性显示 179×88 ===== */
    var z6 = MMI.box(s, 'zone mm-z6', 324, 535, 179, 88);
    var z6ico = ICO.chain(C.green);
    z6ico.style.left = '1px'; z6ico.style.top = '3px';
    z6.appendChild(z6ico);

    /* ===== 7 区 列车头尾设备状态显示 167×88 ===== */
    var z7 = MMI.box(s, 'zone mm-z7', 503, 535, 167, 88);
    var z7ico = ICO.dev(C.green);
    z7ico.style.left = '36px'; z7ico.style.top = '3px';
    z7.appendChild(z7ico);

    /* ===== 8 区 终点站显示 295×95 ===== */
    var z8t = MMI.box(s, 'zone mm-z8 mm-line center', 128, 0, 295, 95);
    z8t.textContent = '终点站：市体育中心站';

    /* ===== 9 区 下一站显示 295×95 ===== */
    var z9t = MMI.box(s, 'zone mm-z9 mm-line center', 423, 0, 295, 95);
    z9t.textContent = '下一站：西三环站';

    /* ===== 10 区 车次显示 306×95 ===== */
    var z10t = MMI.box(s, 'zone mm-z10 mm-line center', 718, 0, 306, 95);
    z10t.style.fontSize = '40px';
    z10t.textContent = MMI.sim.state.metro.trainNo;

    /* ===== 11..22 区（右侧两列，每格 177×88） ===== */
    var cellNodes = [];
    for (var i = 0; i < CELLS.length; i++) {
      var col = i % 2, row = Math.floor(i / 2);
      var cnode = MMI.box(s, 'zone mm-zone-cell', 670 + col * 177, 95 + row * 88, 177, 88);
      var ico = ICO.generic(177, 83, C.lgray);
      ico.style.left = '0'; ico.style.top = '0';
      cnode.appendChild(ico);
      var cap = MMI.box(cnode, 'mm-lab', 0, 36, 177, 20);
      cap.style.fontSize = '15px';
      cap.style.textAlign = 'center';
      cap.textContent = CELLS[i];
      cellNodes.push(cnode);
    }

    /* ===== 23 区 时间显示 216×145 ===== */
    var z23t = MMI.box(s, 'zone mm-z23 mm-val', 0, 623, 216, 145);
    z23t.style.fontSize = '46px';
    z23t.style.lineHeight = '145px';
    z23t.style.textAlign = 'center';

    /* ===== 24 区 自定义确认信息显示 439×145 ===== */
    var z24 = MMI.box(s, 'zone mm-z24', 216, 623, 439, 145);
    var z24t = MMI.box(z24, 'mm-lab', 10, 52, 419, 40);
    z24t.style.fontSize = '24px';
    z24t.style.textAlign = 'center';
    z24t.textContent = '请确认前方信号开放';

    /* ===== 25 区 自定义显示 369×145（规范允许厂商自定义） ===== */
    var z25 = MMI.box(s, 'zone mm-z25', 655, 623, 369, 145);
    var z25t = MMI.box(z25, 'mm-lab', 10, 14, 349, 30);
    z25t.style.fontSize = '18px';
    z25t.textContent = MMI.sim.state.metro.fromStation + ' → ' + MMI.sim.state.metro.toStation;
    var back = MMI.box(z25, 'mm-btn', 250, 84, 100, 44);
    back.textContent = '返回';
    back.addEventListener('click', function () { location.hash = '#/metro-door'; });
    var help = MMI.box(z25, 'mm-btn', 130, 84, 100, 44);
    help.textContent = '帮助信息';
    help.style.fontSize = '18px';

    refs = {
      z1: z1, z1ico: z1ico, dial: dial,
      tgtBar: tgtBar, tgtSpeed: tgtSpeed, tgtDist: tgtDist,
      z4ico: z4ico, z23t: z23t
    };

    MMI.bus.on('sim:tick', update);
    update();
  }

  function update() {
    if (!refs) return;
    var m = MMI.sim.state.metro;
    var now = new Date(m.origin.getTime() + m.elapsed * 1000);

    MMI.setText(refs.z23t, MMI.sim.fmtTime(now));

    /* 2 区：柱状光带按对数坐标映射，最高端 750m */
    var dist = 750;
    var ratio = Math.log(dist + 1) / Math.log(751);
    MMI.setStyle(refs.tgtBar, 'height', Math.round(400 * ratio) + 'px');
    var tone = C.green;
    if (m.speed <= 0) tone = C.red;
    else if (m.speed < 25) tone = C.yellow;
    MMI.setStyle(refs.tgtBar, 'background', tone);
    MMI.setText(refs.tgtSpeed, MMI.pad(Math.min(MAXSPEED, Math.round(m.speed + 20)), 2));
    MMI.setText(refs.tgtDist, Math.round(dist));

    /* 3 区：速度指针与数字 */
    var d = refs.dial;
    var ang = speedAngle(Math.min(m.speed, MAXSPEED));
    var p = polar(d.cx, d.cy, 165, ang);
    d.needle.setAttribute('x2', p[0].toFixed(1));
    d.needle.setAttribute('y2', p[1].toFixed(1));
    MMI.setText(d.cur, Math.round(m.speed));
    d.triRec.setAttribute('points', triangle(d.cx, d.cy, speedAngle(Math.min(MAXSPEED, m.speed + 20)), 15));
    d.triEbi.setAttribute('points', triangle(d.cx, d.cy, speedAngle(Math.min(MAXSPEED, m.speed + 40)), 15));

    /* 1 区：初始（黑）/ 超过推荐速度（橙）/ 紧急制动触发（红） */
    var bg = C.black, fg = C.lgray;
    if (m.speed >= 80) { bg = C.red; fg = C.white; }
    else if (m.speed >= 70) { bg = C.orange; fg = C.white; }
    MMI.setStyle(refs.z1, 'background', bg);
    refs.z1ico.firstChild.style.color = fg;

    /* 4 区：牵引 / 惰行 / 制动 */
    var eff = m.effort;
    var state = eff > 3 ? 'traction' : (eff < -3 ? 'brake' : 'coast');
    var fresh = ICO[state](state === 'coast' ? C.lgray : C.white);
    fresh.style.left = '9px'; fresh.style.top = '3px';
    refs.z4ico.parentNode.replaceChild(fresh, refs.z4ico);
    refs.z4ico = fresh;
  }

  function unmount() {
    MMI.bus.off('sim:tick', update);
    refs = null;
  }

  MMI.screens = MMI.screens || {};
  MMI.screens['metro-main'] = { mount: mount, unmount: unmount };
})(window);
