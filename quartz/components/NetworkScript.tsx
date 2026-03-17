import type { QuartzComponentConstructor } from "./types"

/*
 * Loads network.js early in the <head> so it is available when the DOM
 * finishes loading. This fixes the issue where the graph doesn't appear
 * on first page load unless the page is refreshed. The script is only
 * injected once; subsequent SPA navigations rely on this loaded copy.
 */
export default (() => {
  function NetworkScript() {
    return null
  }

  NetworkScript.beforeDOMLoaded = `
    (function() {
      if (!window.networkScriptLoaded) {
        var existing = document.querySelector('script[src*="static/js/network.js"]');
        if (!existing) {
          var script = document.createElement('script');
          // Compute an absolute path to network.js so it loads correctly on GitHub Pages
          // project sites (e.g. /WoD/) and during local development.
          var host = window.location.hostname;
          var path = 'static/js/network.js';
          if (host.endsWith('github.io')) {
            var segs = window.location.pathname.split('/').filter(function(s) { return s.length > 0; });
            var base = segs.length > 0 ? '/' + segs[0] : '';
            path = base + '/static/js/network.js';
          } else {
            // Prefix with / for other environments to make it root-relative
            if (!path.startsWith('/')) {
              path = '/' + path;
            }
          }
          script.src = path;
          script.defer = true;
          document.head.appendChild(script);
        }
        window.networkScriptLoaded = true;
      }
    })();
  `

  return NetworkScript
}) satisfies QuartzComponentConstructor
