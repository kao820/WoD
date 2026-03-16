import type { QuartzComponentConstructor } from "./types"

/*
 * NetworkScript is a tiny component that injects the custom network.js
 * script into the page after the DOM has loaded. Quartz will execute
 * the `afterDOMLoaded` script whenever a new page is navigated to
 * (including SPA navigations). The script itself checks if the
 * network graph script has already been injected and avoids adding
 * duplicate tags. By using a relative path (`static/js/network.js`),
 * the script will resolve correctly both during local development and
 * when the site is served from a subfolder (e.g. GitHub Pages project
 * sites such as /WoD/).
 */
export default (() => {
  function NetworkScript() {
    return null
  }

  NetworkScript.afterDOMLoaded = `
    (function() {
      if (!window.networkScriptLoaded) {
        // Avoid adding the script multiple times
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