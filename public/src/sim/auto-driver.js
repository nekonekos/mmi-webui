/* 自动演示循环：地铁按“停站开门 → 牵引 → 巡航 → 制动 → 停车”往复；
   动车组按“牵引 → 巡航 → 制动 → 停车”往复。所有派生量由速度等自动算出。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  function AutoDriver() {
    this.metroPhase = 'dwell';
    this.metroTimer = 6;
    this.cr400Phase = 'coast';
    this.cr400Timer = 0;
  }

  AutoDriver.prototype.reset = function () {
    this.metroPhase = 'dwell';
    this.metroTimer = 6;
    this.cr400Phase = 'coast';
    this.cr400Timer = 0;
  };

  AutoDriver.prototype.update = function (dt) {
    this.updateMetro(dt);
    this.updateCr400(dt);
  };

  AutoDriver.prototype.updateMetro = function (dt) {
    var m = MMI.sim.state.metro;
    this.metroTimer -= dt;

    if (this.metroPhase === 'dwell') {
      m.speed = 0;
      m.doorOpen = true;
      m.effort = 0;
      m.modeText = '保护人工';
      m.stateText = '停车制动';
      m.icons[7] = 1;               /* 车门图标点亮 */
      if (this.metroTimer <= 0) {
        this.metroPhase = 'power';
        this.metroTimer = 26;
        m.doorOpen = false;
        m.icons[7] = 0;
      }
    } else if (this.metroPhase === 'power') {
      m.stateText = '牵引';
      m.effort = Math.min(100, 30 + (26 - this.metroTimer) * 3);
      m.speed = Math.min(80, m.speed + 1.6 * dt * 10);
      if (this.metroTimer <= 0) {
        this.metroPhase = 'cruise';
        this.metroTimer = 30;
        m.stateText = '';
      }
    } else if (this.metroPhase === 'cruise') {
      m.effort = 18;
      m.speed = m.speed + (80 - m.speed) * 0.06;
      if (this.metroTimer <= 0) {
        this.metroPhase = 'brake';
        this.metroTimer = 20;
      }
    } else { /* brake */
      m.stateText = '制动';
      m.effort = -Math.min(100, 30 + (20 - this.metroTimer) * 4);
      m.speed -= 4.6 * dt * 10;
      if (m.speed <= 0) {
        m.speed = 0;
        this.metroPhase = 'dwell';
        this.metroTimer = 10;
      }
      if (this.metroTimer <= -40) {
        this.metroPhase = 'dwell';
        this.metroTimer = 10;
      }
    }
    if (m.speed < 0) m.speed = 0;
  };

  AutoDriver.prototype.updateCr400 = function (dt) {
    var c = MMI.sim.state.cr400;
    this.cr400Timer -= dt;

    if (this.cr400Phase === 'coast') {
      c.tractionRatio = 0.22;
      c.brakeLevel = 0;
      c.speed += (300 - c.speed) * 0.05 * dt;
      if (this.cr400Timer <= 0) { this.cr400Phase = 'power'; this.cr400Timer = 18; }
    } else if (this.cr400Phase === 'power') {
      c.tractionRatio = 0.5;
      c.brakeLevel = 0;
      c.speed = Math.min(350, c.speed + 6 * dt);
      if (this.cr400Timer <= 0) { this.cr400Phase = 'coast'; this.cr400Timer = 20; }
    } else {
      c.brakeLevel = Math.min(7, 1 + Math.floor((20 - this.cr400Timer) / 3));
      c.tractionRatio = -0.35;
      c.speed -= 9 * dt;
      if (c.speed <= 0 || this.cr400Timer <= -30) {
        c.speed = c.speed < 0 ? 0 : c.speed;
        this.cr400Phase = 'power';
        this.cr400Timer = 20;
      }
    }
    if (c.speed < 0) c.speed = 0;
  };

  MMI.AutoDriver = AutoDriver;
})(window);
