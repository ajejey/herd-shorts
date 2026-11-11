/*
  Shared by every Herd Shorts template (copied into each template's assets/ by
  pipeline/build.mjs; templates/_shared/herd.js is the one to edit).

  Loaded by the root index.html before any scene, so every scene script can read
  the video's variables (a scene's own getVariables() sees only its own).
*/
(function () {
  var cache = null;
  function vars() {
    if (!cache) { var api = window.__hyperframes; cache = api && api.getVariables ? api.getVariables() : {}; }
    return cache;
  }

  function num(n) { return Number(n).toLocaleString("en-US"); }

  /* Fill an element with one span per word ("|" is a line break); returns the spans.
     The last two words share a span, so a line never ends on one short word alone. */
  function words(el, text, cls) {
    if (typeof el === "string") el = document.getElementById(el);
    cls = cls || "w";
    var parts = String(text == null ? "" : text).split(" ");
    var n = parts.length;
    if (n >= 4 && parts[n - 1] !== "|" && parts[n - 2] !== "|" && (parts[n - 1] + parts[n - 2]).length <= 16) {
      parts.splice(n - 2, 2, parts[n - 2] + "\u00a0" + parts[n - 1]);
    }
    el.innerHTML = parts.map(function (w) {
      return w === "|" ? "<br />" : '<span class="' + cls + '">' + w.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>";
    }).join(" ");
    return el.querySelectorAll("." + cls);
  }

  /* Shrink an element's font (2 px steps) until it fits its box: maxH for wrapped text, its own width for one line. */
  function fit(el, opts) {
    if (typeof el === "string") el = document.getElementById(el);
    var s = opts.max;
    el.style.fontSize = s + "px";
    var over = function () {
      return (opts.maxH && el.scrollHeight > opts.maxH + 1) || el.scrollWidth > el.clientWidth + 1;
    };
    while (s > opts.min && over()) { s -= 2; el.style.fontSize = s + "px"; }
    return s;
  }

  /* Call from a scene after its markup is in: resolves once the display fonts can be measured. */
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 64px "Fredoka"'),
      document.fonts.load('700 40px "Quicksand"'),
    ]).then(function () { return document.fonts.ready; }, function () { return null; });
  }

  window.HERD = { get V() { return vars(); }, num: num, words: words, fit: fit, fontsReady: fontsReady };
})();
