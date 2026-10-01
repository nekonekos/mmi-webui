/* 固定 1024x768 舞台：等比缩放到窗口内的最大尺寸并居中，多余部分为黑边。
   界面内部完全不受影响（非灵活布局）。 */
(function (global) {
  'use strict';

  var MMI = global.MMI;
  var W = 1024, H = 768;

  function layout() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scale = Math.min(vw / W, vh / H);
    var left = (vw - W * scale) / 2;
    var top = (vh - H * scale) / 2;
    stage.style.transform = 'translate(' + left + 'px,' + top + 'px) scale(' + scale + ')';
    MMI.stageScale = scale;
    MMI.bus.emit('stage:resize', { scale: scale, left: left, top: top });
  }

  var pending = false;
  function onResize() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () {
      pending = false;
      layout();
    });
  }

  MMI.stage = { layout: layout, W: W, H: H };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
  document.addEventListener('DOMContentLoaded', layout);
  if (document.readyState !== 'loading') layout();
})(window);
