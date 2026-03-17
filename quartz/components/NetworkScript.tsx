import type { QuartzComponentConstructor } from "./types";

/*
 * Загрузчик скриптов для карты. Он гарантирует, что force-graph
 * загружается раньше network.js. Скрипты вставляются только один раз,
 * даже если SPA-навигация происходит неоднократно.
 */
export default (() => {
  function NetworkScript() {
    return null;
  }

  NetworkScript.beforeDOMLoaded = `
    ;(function() {
      if (window.__networkScriptsLoaded) return;

      function addScript(src, callback) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = callback || function() {};
        script.async = false;
        script.defer = false;
        document.head.appendChild(script);
      }

      // Определяем базовый путь для GitHub Pages (например, /WoD)
      var host = window.location.hostname;
      var basePath = '';
      if (host.endsWith('github.io')) {
        var segs = window.location.pathname.split('/').filter(function(s) { return s.length > 0; });
        basePath = segs.length > 0 ? '/' + segs[0] : '';
      }

      // Подключаем force-graph, затем network.js
      addScript('https://unpkg.com/force-graph', function() {
        addScript(basePath + '/static/js/network.js');
      });

      window.__networkScriptsLoaded = true;
    })();
  `;

  return NetworkScript;
}) satisfies QuartzComponentConstructor;
