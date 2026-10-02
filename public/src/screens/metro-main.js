/* 地铁 MMI 主界面（25 个主显示区）
   分区尺寸依据 DB37/XXXX.4-2020 表1（5.2 总体要求），颜色依据 5.3；
   各区图标严格取自同规范 PDF（materials/1593313757438339.pdf）里
   5.4 各表的图例图片，资产位于 public/assets/metro-main/（由
   tools/extract_zone_icons.py 生成，清单见 assets/metro-main/manifest.js）。
   某区状态为初始态时不显示图标，仅露出该区底色。 */
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
  var SWEEP = 310;
  var R_OUT = 204, R_TICK = 201, R_LONG = 28, R_SHORT = 15, R_NUM = 162;

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* 表1：区域编号 -> [x, y, w, h] */
  var ZONES = {
    1: [0, 0, 128, 95], 2: [0, 95, 128, 440], 3: [128, 95, 542, 440],
    4: [0, 535, 157, 88], 5: [157, 535, 167, 88], 6: [324, 535, 179, 88], 7: [503, 535, 167, 88],
    8: [128, 0, 295, 95], 9: [423, 0, 295, 95], 10: [718, 0, 306, 95],
    23: [0, 623, 216, 145], 24: [216, 623, 439, 145], 25: [655, 623, 369, 145]
  };
  for (var zi = 0; zi < 12; zi++) {
    ZONES[11 + zi] = [670 + (zi % 2) * 177, 95 + Math.floor(zi / 2) * 88, 177, 88];
  }

  /* 各单位区默认状态（key 对应 manifest 中的 key；'initial' = 不显示图标） */
  var DEFAULT_STATE = {
    1: 'initial', 4: 'coasting', 5: 'am-continuous', 6: 'integrity-ok',
    7: 'headtail-comm-ok', 11: 'initial', 12: 'initial', 13: 'am-continuous',
    14: 'forward', 15: 'initial', 16: 'in-stop-window', 17: 'allow-both',
    18: 'initial', 19: 'auto-open-manual-close', 20: 'initial', 21: 'initial',
    22: 'initial', 24: 'initial'
  };

  /* zone -> { key -> asset } */
  var ASSETS = {};
  (MMI.mmAssets || []).forEach(function (a) {
    (ASSETS[a.zone] || (ASSETS[a.zone] = {}))[a.key] = a;
  });

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function polar(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  }

  function speedAngle(v) { return -SWEEP / 2 + (v / MAXSPEED) * SWEEP; }

  function buildDial() {
    var cx = 205.5, cy = 205.5;
    var svg = svgEl('svg', { viewBox: '0 0 411 411', width: 411, height: 411 });

    svg.appendChild(svgEl('circle', {
      cx: cx, cy: cy, r: R_OUT, fill: 'none', stroke: C.red, 'stroke-width': 3
    }));

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

    var pk = polar(cx, cy, 168, 180);
    var kmh = svgEl('text', {
      x: pk[0], y: pk[1], fill: C.lgray, 'font-size': 20,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'SimHei, "黑体", sans-serif'
    });
    kmh.textContent = 'km/h';
    svg.appendChild(kmh);

    var triRec = svgEl('polygon', { points: '', fill: C.yellow });
    var triEbi = svgEl('polygon', { points: '', fill: C.red });
    svg.appendChild(triRec);
    svg.appendChild(triEbi);

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

  /* 各区图标层 */
  var iconNodes = {};   /* zone -> <img> */
  var zoneRect = {};    /* zone -> [x,y,w,h] */
  var refs = null;

  function setState(zone, key) {
    var node = iconNodes[zone];
    if (!node) return;
    if (node.__key === key) return;
    node.__key = key;
    var a = ASSETS[zone] && ASSETS[zone][key];
    /* 初始态（或未取到该状态图片）：不显示图标，露出底色 */
    if (!a || key === 'initial') {
      node.style.display = 'none';
      return;
    }
    var zr = zoneRect[zone];
    var s = Math.min(zr[2] / a.w, zr[3] / a.h) * 0.98;
    node.style.width = (a.w * s).toFixed(1) + 'px';
    node.style.height = (a.h * s).toFixed(1) + 'px';
    node.style.left = ((zr[2] - a.w * s) / 2).toFixed(1) + 'px';
    node.style.top = ((zr[3] - a.h * s) / 2).toFixed(1) + 'px';
    node.style.display = 'block';
    if (node.getAttribute('src') !== 'assets/metro-main/' + a.file) {
      node.setAttribute('src', 'assets/metro-main/' + a.file);
    }
  }

  function mount(root) {
    var s = MMI.el('div', 'abs mm');
    root.appendChild(s);

    function zoneBox(id, cls) {
      var z = ZONES[id];
      zoneRect[id] = z;
      var node = MMI.box(s, 'zone mm-z' + id + (cls ? ' ' + cls : ''), z[0], z[1], z[2], z[3]);
      var img = MMI.el('img', 'mm-ico');
      img.style.position = 'absolute';
      img.style.display = 'none';
      img.alt = '';
      node.appendChild(img);
      iconNodes[id] = img;
      return node;
    }

    /* ===== 2 区 目标速度及目标距离信息 128×440 ===== */
    var z2 = zoneBox(2);
    MMI.box(z2, 'mm-tgt-axis', 58, 14, 1, 400);
    var scale = [750, 500, 300, 150, 0];
    for (var li = 0; li < scale.length; li++) {
      var ly = 14 + li * 100;
      MMI.box(z2, 'mm-tgt-tick', 52, ly, 7, 1);
      MMI.box(z2, 'mm-tgt-lab', 0, ly - 8, 48, 16).textContent = scale[li];
    }
    var tgtBar = MMI.box(z2, 'mm-tgt-bar', 63, null, 15, 0);
    tgtBar.style.bottom = '26px';
    var tgtSpeed = MMI.box(z2, 'mm-tgt-speed', 0, 0, 128, 20);
    var tgtDist = MMI.box(z2, 'mm-tgt-dist', 0, 428, 128, 14);

    /* ===== 3 区 速度表盘 542×440 ===== */
    var z3 = zoneBox(3);
    var dial = buildDial();
    dial.svg.style.position = 'absolute';
    dial.svg.style.left = '66px';
    dial.svg.style.top = '9px';
    z3.appendChild(dial.svg);

    /* ===== 8/9/10 区（文字） ===== */
    zoneBox(8, 'mm-line center').textContent = '终点站：市体育中心站';
    zoneBox(9, 'mm-line center').textContent = '下一站：西三环站';
    var z10 = zoneBox(10, 'mm-line center');
    z10.textContent = MMI.sim.state.metro.trainNo;
    z10.style.fontSize = '40px';

    /* ===== 1、4、5、6、7 区（图标） ===== */
    [1, 4, 5, 6, 7].forEach(function (id) { zoneBox(id); });

    /* ===== 11..22 区（右侧两列，每格 177×88） ===== */
    for (var i = 0; i < 12; i++) zoneBox(11 + i, 'mm-zone-cell');

    /* ===== 23 区 时间显示 216×145（系统时间） ===== */
    var z23 = zoneBox(23);
    var z23t = MMI.box(z23, 'mm-time', 8, 44, 200, 60);
    var z23d = MMI.box(z23, 'mm-date', 8, 106, 200, 24);

    /* ===== 24 区 自定义确认信息显示 439×145 ===== */
    var z24 = zoneBox(24);
    var z24t = MMI.box(z24, 'mm-lab', 10, 52, 419, 40);
    z24t.style.fontSize = '24px';
    z24t.style.textAlign = 'center';
    z24t.textContent = '请确认前方信号开放';

    /* ===== 25 区 自定义显示 369×145（规范允许厂商自定义） ===== */
    var z25 = zoneBox(25);
    var z25t = MMI.box(z25, 'mm-lab', 10, 14, 349, 30);
    z25t.style.fontSize = '18px';
    z25t.textContent = MMI.sim.state.metro.fromStation + ' → ' + MMI.sim.state.metro.toStation;
    var back = MMI.box(z25, 'mm-btn', 250, 84, 100, 44);
    back.textContent = '返回';
    back.addEventListener('click', function () { location.hash = '#/metro-door'; });
    var help = MMI.box(z25, 'mm-btn', 130, 84, 100, 44);
    help.textContent = '帮助信息';
    help.style.fontSize = '18px';

    /* 各图标区初始状态 */
    for (var zid in DEFAULT_STATE) setState(zid, DEFAULT_STATE[zid]);

    refs = { dial: dial, tgtBar: tgtBar, tgtSpeed: tgtSpeed, tgtDist: tgtDist, z23: z23t, z23d: z23d };

    MMI.bus.on('sim:tick', update);
    MMI.bus.on('clock:tick', update);
    update();
  }

  function update() {
    if (!refs) return;
    var m = MMI.sim.state.metro;
    var now = MMI.sim.now();

    MMI.setText(refs.z23, MMI.sim.fmtTime(now));
    MMI.setText(refs.z23d, MMI.sim.fmtDate(now));

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

    /* 1 区：超速报警（初始 / 超过推荐速度 / 紧急制动触发） */
    var z1 = 'initial';
    if (m.speed >= 80) z1 = 'emergency-trigger';
    else if (m.speed >= 70) z1 = 'overspeed';
    setState(1, z1);

    /* 4 区：牵引 / 惰行 / 制动 */
    var eff = m.effort;
    setState(4, eff > 3 ? 'traction' : (eff < -3 ? 'braking' : 'coasting'));

    /* 17 区：门状态及门允许命令 */
    setState(17, m.doorOpen ? 'both-open' : 'allow-both');
  }

  function unmount() {
    MMI.bus.off('sim:tick', update);
    MMI.bus.off('clock:tick', update);
    refs = null;
    iconNodes = {};
    zoneRect = {};
  }

  MMI.screens = MMI.screens || {};
  MMI.screens['metro-main'] = { mount: mount, unmount: unmount };
})(window);
