/* requestAnimationFrame 定步长主循环 + 键盘输入绑定。
   每帧只在数值变化时写 DOM（见 bus.js 的 setText/setStyle）。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;
  var STEP = 1 / 60;
  var MAX_SUB = 4;

  var auto = new MMI.AutoDriver();
  var manual = new MMI.ManualDriver();

  var sim = {
    auto: auto,
    manual: manual,
    mode: 'auto',           /* 'auto' | 'manual' */
    keys: Object.create(null),
    accumulator: 0,
    last: 0
  };
  MMI.simLoop = sim;

  var keys = sim.keys;

  function active() { return document.querySelector('.sheet') !== null; }

  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    keys[e.code] = true;

    if (e.code === 'KeyM') {
      sim.mode = sim.mode === 'auto' ? 'manual' : 'auto';
      MMI.bus.emit('sim:mode', sim.mode);
      return;
    }
    if (e.code === 'KeyD') {
      var m = MMI.sim.state.metro;
      m.doorOpen = !m.doorOpen;
      MMI.bus.emit('sim:doors', m.doorOpen);
      return;
    }
    if (e.code === 'Space') {
      manual.brake = 1;
      e.preventDefault();
      return;
    }
    if (/^Digit[1-7]$/.test(e.code)) {
      manual.brake = +e.code.slice(5) / 7;
      return;
    }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      MMI.bus.emit('nav:step', e.code === 'ArrowRight' ? 1 : -1);
    }
    if (e.code === 'KeyW' || e.code === 'ArrowUp') e.preventDefault();
    if (e.code === 'KeyS' || e.code === 'ArrowDown') e.preventDefault();
  });

  window.addEventListener('keyup', function (e) {
    keys[e.code] = false;
    if (e.code === 'Space') manual.brake = 0;
  });

  function readAxes() {
    manual.throttle = (keys.KeyW || keys.ArrowUp) ? 1 : 0;
    var brakeDown = keys.KeyS || keys.ArrowDown;
    if (brakeDown) manual.brake = 1;
    else if (manual.brake >= 1) manual.brake = 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!sim.last) sim.last = now;
    var dt = (now - sim.last) / 1000;
    sim.last = now;
    if (dt > 0.25) dt = 0.25;

    sim.accumulator += dt;
    var steps = 0;
    while (sim.accumulator >= STEP && steps < MAX_SUB) {
      sim.accumulator -= STEP;
      steps++;
      if (!active()) continue;
      /* ?freeze=1：冻结车体运动，便于与参考图做确定性比对 */
      if (MMI.sim.state.freezeTime) {
        MMI.sim.derive(MMI.sim.state);
        continue;
      }
      if (sim.mode === 'auto') auto.update(STEP);
      else { readAxes(); manual.update(STEP); }
      MMI.sim.state.metro.elapsed += STEP;
      MMI.sim.state.cr400.elapsed += STEP;
      MMI.sim.derive(MMI.sim.state);
    }
    if (steps) MMI.bus.emit('sim:tick', dt);
  }

  requestAnimationFrame(frame);
})(window);
