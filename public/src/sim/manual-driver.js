/* 键盘手动驾驶：↑/W 牵引、↓/S 制动、1-7 直接给定制动级位、空格 快速制动、
   D 开关门、M 切换自动/手动、←/→ 切换界面。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  function ManualDriver() {
    this.throttle = 0;   /* 0..1 */
    this.brake = 0;      /* 0..1 */
  }

  ManualDriver.prototype.reset = function () {
    this.throttle = 0;
    this.brake = 0;
  };

  ManualDriver.prototype.update = function (dt) {
    var st = MMI.sim.state;
    var m = st.metro;
    var c = st.cr400;

    /* 地铁：牵引/制动合力 */
    if (this.throttle > 0) {
      m.effort = this.throttle * 100;
      m.speed += 9 * this.throttle * dt;
      m.stateText = '牵引';
      m.modeText = '人工驾驶';
    } else if (this.brake > 0) {
      m.effort = -this.brake * 100;
      m.speed -= 12 * this.brake * dt;
      m.stateText = '制动';
    } else {
      m.effort = 0;
      m.stateText = '惰行';
    }
    if (m.speed > 80) m.speed = 80;
    if (m.speed < 0) m.speed = 0;

    /* 动车组：制动级位 / 牵引 */
    if (this.brake > 0) {
      c.brakeLevel = Math.max(1, Math.min(7, Math.round(this.brake * 7)));
      c.tractionRatio = -0.4;
      c.speed -= (this.brake * 12) * dt;
    } else if (this.throttle > 0) {
      c.brakeLevel = 0;
      c.tractionRatio = this.throttle * 0.6;
      c.speed += 10 * this.throttle * dt;
    } else {
      c.brakeLevel = 0;
      c.tractionRatio = 0;
    }
    if (c.speed > 350) c.speed = 350;
    if (c.speed < 0) c.speed = 0;
  };

  MMI.ManualDriver = ManualDriver;
})(window);
