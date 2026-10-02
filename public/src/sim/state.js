/* 车体模拟数据模型（纯前端，无后端）
   两条线路：地铁（图一 / PDF 主界面）与中国标准动车组 CR400。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;

  function createState() {
    var freeze = /(\?|&)freeze=1/.test(location.search);

    return {
      freezeTime: freeze,

      metro: {
        trainNo: '10301',
        elapsed: 0,

        fromStation: '西三环站',
        toStation: '市体育中心站',

        speed: 0,           /* 公里/小时 */
        brakePressure: 9.0, /* 总风压力 巴 */
        lineVoltage: 0,     /* 线电压 伏 */
        effort: 0,          /* 力 %（牵引为正，制动为负） */

        doorOpen: true,          /* 车门开启（参考图停车开门工况） */
        doors: [0, 0, 0, 0, 0, 0],/* 每节车厢开门状态 0 关 1 开 */
        consist: 6,

        modeText: '保护人工',     /* 左侧工况文字 */
        stateText: '停车制动',    /* 中间状态文字 */

        /* 12 格状态图标：0 灰（未激活） 1 亮 */
        icons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

        /* 底部按钮激活态 */
        volume: 0,
        doorCmd: 0,
        confirm: false
      },

      cr400: {
        trainNo: 'CR400-AF-0003',
        elapsed: 0,

        speed: 290,          /* km/h */
        brakeLevel: 0,       /* 制动级位 0-7 级 */
        pantographUp: true,  /* 受电弓 */

        netVoltage: 25.0,    /* 网压 kV */
        netCurrent: 240,     /* 网流 A */
        mainReservoir: 175,  /* 总风管 kPa（图三） */

        /* 变流器负载（车厢 07 / 05 / 04 / 02），0-100% */
        converters: [20, 20, 20, 20],
        tractionRatio: 0.2,

        /* 受电弓状态：车厢 06 / 03 */
        panto06: true,
        panto03: true,

        /* 每节车厢（08..01 顺序）制动状态 */
        cars: {
          count: 8,
          electric: [0, 0, 0, 0, 0, 0, 0, 0],  /* 电制动 1 施加 */
          air: [0, 0, 0, 0, 0, 0, 0, 0],       /* 空气制动 */
          park: [0, 0, 0, 0, 0, 0, 0, 0]       /* 停放制动 */
        },

        warning: true,       /* 顶部警示三角 */
        highlight: '运行界面' /* 底部按钮当前高亮项 */
      }
    };
  }

  /* 由速度等派生量，供自动演示与手动驾驶共用 */
  function derive(st) {
    var m = st.metro;
    m.brakePressure = 9.0 - Math.max(0, (m.speed - 40)) * 0.002;
    if (m.brakePressure < 8.2) m.brakePressure = 8.2;
    m.lineVoltage = m.speed > 0.4 ? 1500 : 0;
    m.doors = m.doorOpen ? [1, 1, 1, 1, 1, 1] : [0, 0, 0, 0, 0, 0];

    var c = st.cr400;
    c.netVoltage = c.speed > 0.4 ? 25 + Math.sin(c.elapsed * 0.7) * 0.6 : 0;
    c.netCurrent = c.speed > 0.4 ? Math.round(Math.max(0, c.tractionRatio) * 1200 * (0.55 + c.speed / 700)) : 0;
    if (c.netCurrent > 800) c.netCurrent = 800;
    c.mainReservoir = Math.round(880 - c.tractionRatio * 180 + Math.cos(c.elapsed * 0.4) * 6);
    for (var i = 0; i < 4; i++) {
      c.converters[i] = Math.round(Math.max(0, c.tractionRatio) * 100 * (0.9 + 0.1 * Math.sin(c.elapsed + i)));
    }
    var eb = c.brakeLevel > 0 || (c.speed > 0.5 && c.brakeLevel === 0 && c.tractionRatio < 0);
    for (var j = 0; j < 8; j++) {
      c.cars.electric[j] = eb ? 1 : 0;
      c.cars.air[j] = eb && c.speed < 60 ? 1 : 0;
      c.cars.park[j] = c.speed < 0.5 && c.brakeLevel > 2 ? 1 : 0;
    }
    c.warning = c.brakeLevel > 0;
  }

  MMI.sim = {
    state: createState(),
    derive: derive,
    /* 页面时间一律取浏览器系统时间（实时），不再使用模拟时钟 */
    now: function () { return new Date(); },
    fmtDateTime: function (d) {
      return MMI.pad(d.getFullYear(), 4) + '-' + MMI.pad(d.getMonth() + 1, 2) + '-' + MMI.pad(d.getDate(), 2) +
        ' ' + MMI.pad(d.getHours(), 2) + ':' + MMI.pad(d.getMinutes(), 2) + ':' + MMI.pad(d.getSeconds(), 2);
    },
    fmtDate: function (d) {
      return MMI.pad(d.getFullYear(), 4) + '-' + MMI.pad(d.getMonth() + 1, 2) + '-' + MMI.pad(d.getDate(), 2);
    },
    fmtTime: function (d) {
      return MMI.pad(d.getHours(), 2) + ':' + MMI.pad(d.getMinutes(), 2) + ':' + MMI.pad(d.getSeconds(), 2);
    }
  };
})(window);
