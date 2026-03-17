import type { QuartzComponentConstructor } from "./types"

/*
 * Загрузчик скриптов карты. Этот компонент вставляет два скрипта:
 * - сначала библиотеку force-graph,
 * - затем наш кастомный скрипт network.js.
 * Оба загружаются последовательно и только один раз, даже при SPA‑навигации.
 */
export default (() => {
  function NetworkScript() {
    return null
  }

  NetworkScript.beforeDOMLoaded = `
    ;(function() {
      if (window.__networkScriptsLoaded) return;

      function addScript(src, callback) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = callback || function() {};
        s.async = false;
        s.defer = false;
        document.head.appendChild(s);
      }

      // Определяем базовый путь к файлам в статике (например, /WoD) для GitHub Pages
      var host = window.location.hostname;
      var basePath = '';
      if (host.endsWith('github.io')) {
        var segs = window.location.pathname.split('/').filter(Boolean);
        basePath = segs.length > 0 ? '/' + segs[0] : '';
      }

      // Сначала загружаем force-graph, затем network.js
      addScript('https://unpkg.com/force-graph', function() {
        addScript(basePath + '/static/js/network.js');
      });

      window.__networkScriptsLoaded = true;
    })();
  `
  return NetworkScript
}) satisfies QuartzComponentConstructor
