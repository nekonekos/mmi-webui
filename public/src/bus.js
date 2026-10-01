/* 极简事件总线 + 全局命名空间 */
(function (global) {
  'use strict';

  var MMI = global.MMI || (global.MMI = {});

  function Bus() {
    this.map = Object.create(null);
  }

  Bus.prototype.on = function (type, fn) {
    (this.map[type] || (this.map[type] = [])).push(fn);
    return this;
  };

  Bus.prototype.off = function (type, fn) {
    var list = this.map[type];
    if (!list) return this;
    var i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
    return this;
  };

  Bus.prototype.emit = function (type, payload) {
    var list = this.map[type];
    if (!list) return this;
    for (var i = 0; i < list.length; i++) list[i](payload);
    return this;
  };

  MMI.Bus = Bus;
  MMI.bus = new Bus();

  /* ---- 小工具 ---- */
  MMI.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* 在父节点上创建绝对定位元素 */
  MMI.box = function (parent, cls, x, y, w, h) {
    var n = document.createElement('div');
    n.className = 'abs' + (cls ? ' ' + cls : '');
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    if (w != null) n.style.width = w + 'px';
    if (h != null) n.style.height = h + 'px';
    if (parent) parent.appendChild(n);
    return n;
  };

  /* 只有值变化时才写 DOM，避免每帧重排 */
  MMI.setText = function (node, value) {
    var v = String(value);
    if (node.__last !== v) {
      node.__last = v;
      node.textContent = v;
    }
  };

  MMI.setStyle = function (node, prop, value) {
    var key = '__s_' + prop;
    if (node[key] !== value) {
      node[key] = value;
      node.style[prop] = value;
    }
  };

  MMI.pad = function (n, len) {
    var s = String(Math.floor(Math.abs(n)));
    while (s.length < len) s = '0' + s;
    return s;
  };
})(window);
