/* 复刻用公共部件：竖直柱状图、竖直刻度尺、编组条、状态指示灯、底部按钮条。
   各界面按需调用；全部使用绝对定位，布局不随窗口变化。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  /* 竖直刻度尺：axis 线 + 刻度 + 数值
     opts: { left, top, width, height, min, max, step, majorStep, unit, label, side } */
  MMI.vScale = function (parent, opts) {
    var box = MMI.el('div', 'abs');
    box.style.left = opts.left + 'px';
    box.style.top = opts.top + 'px';
    box.style.width = opts.width + 'px';
    box.style.height = opts.height + 'px';
    parent.appendChild(box);

    var vals = [];
    for (var v = opts.min; v <= opts.max; v += opts.step) vals.push(v);
    var span = opts.max - opts.min;

    var axis = MMI.el('div', 'abs');
    axis.style.cssText = 'left:' + (opts.axisX || 0) + 'px;top:0;bottom:0;width:1px;background:' +
      (opts.axisColor || '#ffffff');
    box.appendChild(axis);

    var ticks = [];
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i];
      var y = (opts.height - 1) * (1 - (v - opts.min) / span);
      var major = (v % (opts.majorStep || opts.step) === 0);
      var t = MMI.el('div', 'abs');
      t.style.cssText = 'left:' + ((opts.axisX || 0) - (major ? 12 : 7)) + 'px;top:' + y +
        'px;width:' + (major ? 12 : 7) + 'px;height:1px;background:' + (opts.tickColor || '#ffffff');
      box.appendChild(t);
      if (major) {
        var lab = MMI.el('div', 'abs');
        lab.style.cssText = 'left:' + ((opts.axisX || 0) + 16) + 'px;top:' + (y - 9) +
          'px;width:70px;height:18px;line-height:18px;font-size:14px;font-family:SimHei,"黑体",sans-serif;color:' +
          (opts.tickColor || '#ffffff');
        lab.textContent = v;
        box.appendChild(lab);
        ticks.push({ value: v, y: y, node: lab });
      }
    }

    /* 填充条（从 0 开始向上） */
    var fill = MMI.el('div', 'abs');
    fill.style.cssText = 'left:' + ((opts.axisX || 0) + 3) + 'px;bottom:0;width:' +
      (opts.fillWidth || 20) + 'px;height:0;background:' + (opts.fillColor || '#2a6ec4');
    box.appendChild(fill);

    return { box: box, ticks: ticks, fill: fill, span: span,
      set: function (value) {
        var r = (value - opts.min) / span;
        if (r < 0) r = 0; if (r > 1) r = 1;
        fill.style.height = Math.round(opts.height * r) + 'px';
      } };
  };

  /* 竖向柱状图（带洋红顶端条） */
  MMI.bar = function (parent, left, top, w, h, color, topColor, topH) {
    var b = MMI.el('div', 'abs');
    b.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h +
      'px;border:1px solid #ffffff;background:transparent';
    parent.appendChild(b);
    var f = MMI.el('div', 'abs');
    f.style.cssText = 'left:1px;bottom:1px;width:' + (w - 2) + 'px;height:0;background:' + color;
    b.appendChild(f);
    var t = MMI.el('div', 'abs');
    t.style.cssText = 'left:1px;bottom:1px;width:' + (w - 2) + 'px;height:' + (topH || 8) +
      'px;background:' + (topColor || '#ff00ff') + ';display:none';
    b.appendChild(t);
    return { box: b, fill: f, top: t,
      set: function (ratio) {
        var r = ratio < 0 ? 0 : (ratio > 1 ? 1 : ratio);
        var px = Math.round((h - 2) * r);
        f.style.height = px + 'px';
        t.style.display = px > (topH || 8) ? 'block' : 'none';
        t.style.bottom = (px - (topH || 8) + 1) + 'px';
      } };
  };

  /* 状态指示灯（圆角方块，带色） */
  MMI.lamp = function (parent, left, top, w, h, color, radius) {
    var n = MMI.el('div', 'abs');
    n.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h +
      'px;background:' + color + ';border-radius:' + (radius || 0) + 'px';
    parent.appendChild(n);
    return n;
  };
})(window);
