/* hash 路由：file:// 与 http(s) 下表现一致，无需服务端配合。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;
  var screen = document.getElementById('screen');

  var ROUTES = [
    { id: 'select',        title: '模式选择',   group: 'start' },
    { id: 'metro-door',    title: '车门状态',   group: 'metro' },
    { id: 'metro-main',    title: '运行界面',   group: 'metro' },
    { id: 'cr400-run-bf',  title: '运行界面',   group: 'cr400' },
    { id: 'cr400-brake-af', title: '制动界面',  group: 'cr400' }
  ];
  MMI.routes = ROUTES;

  var current = null;

  function groups() {
    var out = [];
    for (var i = 0; i < ROUTES.length; i++) {
      var g = ROUTES[i].group;
      if (out.indexOf(g) < 0) out.push(g);
    }
    return out;
  }

  function step(dir) {
    if (!current) return;
    var g = current.group;
    var list = ROUTES.filter(function (r) { return r.group === g; });
    var i = list.indexOf(current);
    var next = list[(i + dir + list.length) % list.length];
    location.hash = '#/' + next.id;
  }

  function render(id) {
    var route = null;
    for (var i = 0; i < ROUTES.length; i++) if (ROUTES[i].id === id) route = ROUTES[i];
    if (!route) route = ROUTES[0];
    if (current && current.module && current.module.unmount) current.module.unmount();
    screen.innerHTML = '';
    current = route;
    current.module = MMI.screens[route.id];
    if (current.module && current.module.mount) current.module.mount(screen);
    document.title = route.title + ' — 轨道交通驾驶模拟 HMI';
    MMI.bus.emit('route', route);
  }

  function parse() {
    var h = location.hash.replace(/^#\/?/, '');
    return h || 'select';
  }

  window.addEventListener('hashchange', function () { render(parse()); });
  MMI.bus.on('nav:step', step);

  function boot() {
    MMI.bus.emit('boot');
    MMI.stage.layout();
    render(parse());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
