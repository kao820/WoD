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
          script.src = 'static/js/network.js';
          script.defer = true;
          document.head.appendChild(script);
        }
        window.networkScriptLoaded = true;
      }
    })();
  `

  return NetworkScript
}) satisfies QuartzComponentConstructor
