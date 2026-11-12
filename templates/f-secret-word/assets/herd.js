/*
  Shared by every Herd Shorts template (copied into each template's assets/ by
  pipeline/build.mjs; templates/_shared/herd.js is the one to edit).

  Loaded by the root index.html before any scene, so every scene script can read
  the video's variables (a scene's own getVariables() sees only its own).

  HERD.kit() builds the pieces every Herd Short shares, so all formats look and
  move like one series (strategy/PRINCIPLES.md): the world (sky, the herd on a
  hill), the cow host, the challenge that stays on screen, the slot under it,
  the countdown ring, the stat line, the question, the play banner, confetti.
  Layout follows the safe area: everything to read inside y 206-1600.
*/
(function () {
  var cache = null;
  function vars() {
    if (!cache) { var api = window.__hyperframes; cache = api && api.getVariables ? api.getVariables() : {}; }
    return cache;
  }

  function num(n) { return Number(n).toLocaleString("en-US"); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* Fill an element with one span per word ("|" is a line break); returns the spans.
     The last two words share a span, so a line never ends on one short word alone. */
  function words(el, text, cls) {
    if (typeof el === "string") el = document.getElementById(el);
    cls = cls || "w";
    var parts = String(text == null ? "" : text).split(" ");
    var n = parts.length;
    if (n >= 4 && parts[n - 1] !== "|" && parts[n - 2] !== "|" && (parts[n - 1] + parts[n - 2]).length <= 16) {
      parts.splice(n - 2, 2, parts[n - 2] + " " + parts[n - 1]);
    }
    el.innerHTML = parts.map(function (w) {
      return w === "|" ? "<br />" : '<span class="' + cls + '">' + esc(w) + "</span>";
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

  /* mulberry32: seeded, so every render is the same */
  function seeded(seed) {
    return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  var CSS = [
    ".hk-ground { position: absolute; inset: 0; background: linear-gradient(180deg, #BFE3F7 0%, #E9F4E8 45%, #FFE58F 100%); }",
    ".hk-dots { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.55) 7px, rgba(255,255,255,0) 7.5px); background-size: 64px 64px; background-position: 16px 24px; }",
    ".hk-cloud { position: absolute; background: url('assets/img/cloud.svg') center / contain no-repeat; }",
    ".hk-hill { position: absolute; left: 0; top: 1600px; width: 1080px; height: 320px; }",
    ".hk-sheep { position: absolute; width: 150px; height: 150px; background: url('assets/img/sheep.svg') center / contain no-repeat; }",
    ".hk-c { position: absolute; left: 70px; width: 940px; text-align: center; color: #2D1810; font-family: 'Fredoka', sans-serif; }",
    ".hk-w { display: inline-block; }",
    ".hk-hook { top: 206px; height: 200px; display: flex; align-items: center; justify-content: center; font-size: 84px; font-weight: 700; line-height: 1.05; letter-spacing: -0.01em; }",
    ".hk-slot { top: 424px; height: 120px; display: flex; align-items: center; justify-content: center; font-size: 72px; font-weight: 700; line-height: 1.05; letter-spacing: -0.01em; }",
    ".hk-answer { color: #C2306F; white-space: nowrap; }",
    ".hk-stat { position: absolute; left: 226px; top: 1312px; width: 764px; color: #2D1810; font-family: 'Quicksand', sans-serif; font-size: 44px; font-weight: 700; white-space: nowrap; }",
    ".hk-stat b { color: #2F6E45; } .hk-stat.hk-sting { font-size: 46px; } .hk-stat.hk-sting b { color: #C2306F; }",
    ".hk-ask { top: 1446px; font-size: 56px; font-weight: 700; white-space: nowrap; }",
    ".hk-cow { position: absolute; left: 34px; top: 1300px; width: 176px; height: 176px; background: url('assets/img/cow.svg') center / contain no-repeat; }",
    ".hk-bubble { position: absolute; left: 150px; top: 1272px; width: 70px; height: 62px; border-radius: 31px; background: #FFFFFF; border: 4px solid #2D1810; display: flex; align-items: center; justify-content: center; color: #2D1810; font-family: 'Fredoka', sans-serif; font-size: 44px; font-weight: 700; }",
    ".hk-ring { position: absolute; width: 190px; height: 190px; }",
    ".hk-ring-n { position: absolute; width: 190px; height: 190px; display: flex; align-items: center; justify-content: center; font-family: 'Fredoka', sans-serif; font-size: 104px; font-weight: 700; color: #C2306F; }",
    ".hk-banner { position: absolute; left: 50px; top: 1290px; width: 980px; height: 290px; z-index: 20; border-radius: 44px; background: #E84A8B; border: 6px solid #2D1810; box-shadow: 0 14px 0 rgba(45,24,16,0.22); color: #FFFFFF; text-align: center; font-family: 'Fredoka', sans-serif; }",
    ".hk-banner-1 { position: absolute; left: 0; top: 34px; width: 100%; font-family: 'Quicksand', sans-serif; font-size: 48px; font-weight: 700; }",
    ".hk-banner-2 { position: absolute; left: 30px; top: 112px; width: 920px; white-space: nowrap; font-size: 92px; font-weight: 700; letter-spacing: -0.01em; }",
    ".hk-bit { position: absolute; width: 18px; height: 30px; border-radius: 4px; z-index: 30; }",
    ".hk-star { position: absolute; width: 64px; height: 64px; z-index: 30; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }",
    ".hk-runner { position: absolute; width: 130px; height: 130px; z-index: 6; background: url('assets/img/sheep.svg') center / contain no-repeat; }",
    ".hk-sun { position: absolute; left: 800px; top: 40px; width: 180px; height: 180px; border-radius: 90px; }",
    ".hk-sea { position: absolute; left: 0; top: 1560px; width: 1080px; height: 120px; }",
    ".hk-fall { position: absolute; left: 0; top: 0; }",
    ".hk-insight { position: absolute; left: 226px; top: 1378px; width: 764px; color: rgba(45,24,16,0.78); font-family: 'Quicksand', sans-serif; font-size: 40px; font-weight: 700; white-space: nowrap; }",
  ].join("\n");

  /*
    The worlds (all light, so every line of text keeps its contrast). Rotated by
    day with the celebration and the cow's reaction (pipeline/lib.mjs variety).
  */
  var WORLDS = {
    meadow: { sky: ["#BFE3F7", "#E9F4E8", "#FFE58F"], dots: "rgba(255,255,255,0.55)", hill: ["#8FD16F", "#6FBF55"] },
    sunset: { sky: ["#FFC9A8", "#FFE3CF", "#FFF1C1"], dots: "rgba(255,255,255,0.5)", hill: ["#A3CF7E", "#86BC66"], sun: "#FFB27A" },
    snow: { sky: ["#C9E1F2", "#E9F2F8", "#FFFFFF"], dots: "rgba(255,255,255,0.75)", hill: ["#F4F8FB", "#DCE7EF"], fall: "snow" },
    beach: { sky: ["#B8E6F6", "#E3F6F6", "#FFF0C8"], dots: "rgba(255,255,255,0.5)", hill: ["#F6D88E", "#EBC46C"], sea: "#7CC8E0", sun: "#FFD36E" },
    autumn: { sky: ["#F8DEC0", "#FBECD9", "#FFF6E2"], dots: "rgba(255,255,255,0.5)", hill: ["#DDA75E", "#C98C40"], fall: "leaf" },
    spring: { sky: ["#FCDCE8", "#F7F0E8", "#E4F5D6"], dots: "rgba(255,255,255,0.6)", hill: ["#A8DB86", "#8ACB69"], fall: "blossom" },
  };
  var FALL = { snow: { color: "#FFFFFF", r: "50%", w: 22, h: 22, edge: "2px solid rgba(160,190,215,0.7)" }, leaf: { color: "#E07B39", r: "0 60% 0 60%", w: 38, h: 26, edge: "none" }, blossom: { color: "#F38DB6", r: "60% 0 60% 0", w: 30, h: 24, edge: "none" } };

  function el(parent, cls, html) {
    var d = document.createElement("div");
    d.className = cls;
    if (html != null) d.innerHTML = html;
    parent.appendChild(d);
    return d;
  }

  /*
    The kit. Build pieces into containers in the scene, then animate them on the
    scene's timeline with the matching anim helpers. T is the scene's beat
    clock: { count, reveal, sting, ask, play, rewind, end } in seconds.
  */
  function kit() {
    if (!document.getElementById("hk-css")) {
      var st = document.createElement("style");
      st.id = "hk-css"; st.textContent = CSS;
      document.head.appendChild(st);
    }
    var K = {};

    /* The world behind everything: sky, clouds, the hill with the herd grazing (decoration under the apps' UI) */
    K.world = function (box) {
      var W = WORLDS[vars().theme] || WORLDS.meadow;
      var g = el(box, "hk-ground"); g.style.background = "linear-gradient(180deg, " + W.sky[0] + " 0%, " + W.sky[1] + " 45%, " + W.sky[2] + " 100%)";
      var d = el(box, "hk-dots"); d.style.backgroundImage = "radial-gradient(circle, " + W.dots + " 7px, rgba(255,255,255,0) 7.5px)";
      if (W.sun) { var sun = el(box, "hk-sun"); sun.style.background = "radial-gradient(circle, " + W.sun + " 0%, " + W.sun + " 55%, rgba(255,255,255,0) 72%)"; }
      var c1 = el(box, "hk-cloud"); Object.assign(c1.style, { left: "60px", top: "70px", width: "240px", height: "120px" });
      var c2 = el(box, "hk-cloud"); Object.assign(c2.style, { left: "760px", top: "120px", width: "200px", height: "100px" });
      if (W.sea) { var sea = el(box, "hk-sea"); sea.style.background = "linear-gradient(180deg, " + W.sea + " 0%, #A8DCEB 100%)"; }
      var hill = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      hill.setAttribute("class", "hk-hill"); hill.setAttribute("viewBox", "0 0 1080 320"); hill.setAttribute("preserveAspectRatio", "none");
      hill.innerHTML = '<path d="M0 90 C 220 20, 420 40, 600 70 C 780 100, 920 40, 1080 60 L 1080 320 L 0 320 Z" fill="' + W.hill[0] + '" />' +
        '<path d="M0 170 C 260 120, 520 150, 760 140 C 900 134, 1000 120, 1080 130 L 1080 320 L 0 320 Z" fill="' + W.hill[1] + '" />';
      box.appendChild(hill);
      var flock = [[30, 1598], [240, 1640], [455, 1604], [670, 1644], [885, 1610]].map(function (p, i) {
        var s = el(box, "hk-sheep"); s.style.left = p[0] + "px"; s.style.top = p[1] + "px";
        if (i % 2) s.style.transform = "scaleX(-1)";
        return s;
      });
      // Snow, leaves or blossom drifting down (behind everything, seeded)
      var fall = [];
      if (W.fall) {
        var F = FALL[W.fall], rand = seeded(29);
        for (var i = 0; i < 22; i++) {
          var p = el(box, "hk-fall");
          Object.assign(p.style, { width: F.w + "px", height: F.h + "px", background: F.color, borderRadius: F.r, border: F.edge, left: Math.round(rand() * 1060) + "px" });
          fall.push({ el: p, dur: 6 + rand() * 4, delay: rand() * 8, sway: 30 + rand() * 50, spin: (rand() - 0.5) * 540 });
        }
      }
      return { clouds: [c1, c2], flock: flock, fall: fall };
    };

    /* The challenge: stays on screen for the whole video; returns its word spans */
    K.hook = function (box, text) {
      var h = el(box, "hk-c hk-hook"); var inner = el(h, "");
      return { el: h, spans: words(inner, text, "hk-w") };
    };

    /* A line in the slot under the challenge ("Final answer?", the answer...) */
    K.slot = function (box, text, answer) {
      var s = el(box, "hk-c hk-slot" + (answer ? " hk-answer" : "")); var inner = el(s, "");
      if (answer) inner.textContent = text;
      var spans = answer ? [inner] : words(inner, text, "hk-w");
      s.style.visibility = "hidden";
      return { el: s, spans: spans };
    };

    K.stat = function (box) { return el(box, "hk-stat"); };
    K.ask = function (box, text) { var a = el(box, "hk-c hk-ask"); a.style.visibility = "hidden"; return { el: a, spans: words(a, text, "hk-w") }; };

    /* The cow host and its thought bubble ("?" while you guess, "!" at the answer) */
    K.host = function (box) {
      var cow = el(box, "hk-cow");
      var b = el(box, "hk-bubble", '<span>?</span><span style="position:absolute">!</span>');
      return { cow: cow, bubble: b, q: b.children[0], x: b.children[1] };
    };

    /* The countdown ring: empties as the number counts down */
    K.ring = function (box, x, y, size) {
      size = size || 190;
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "hk-ring"); svg.setAttribute("viewBox", "0 0 200 200");
      svg.style.left = x + "px"; svg.style.top = y + "px"; svg.style.width = size + "px"; svg.style.height = size + "px";
      svg.innerHTML = '<circle cx="100" cy="100" r="86" fill="#FFFFFF" stroke="#2D1810" stroke-width="8" />' +
        '<circle class="hk-ring-arc" cx="100" cy="100" r="70" fill="none" stroke="#E84A8B" stroke-width="18" stroke-linecap="round" transform="rotate(-90 100 100)" />';
      box.appendChild(svg);
      var n = el(box, "hk-ring-n", "<span>3</span>"); n.style.left = x + "px"; n.style.top = y + "px";
      n.style.width = size + "px"; n.style.height = size + "px"; n.style.fontSize = Math.round(size * 0.55) + "px";
      return { svg: svg, arc: svg.querySelector(".hk-ring-arc"), box: n, n: n.firstChild };
    };

    /* The last beat: where to play, the address big enough to remember and type */
    K.banner = function (box, line1, url) {
      var b = el(box, "hk-banner");
      el(b, "hk-banner-1").textContent = line1;
      var u = el(b, "hk-banner-2"); u.textContent = url;
      return { el: b, url: u };
    };

    /* The reveal's celebration, rotated by day (variety "party"): confetti, a starburst, or the herd stampeding across the hill */
    K.confetti = function (box, x, y, n, seed) {
      var rand = seeded(seed || 11), COLORS = ["#E84A8B", "#3D8B5A", "#FFC93C", "#4FA3D9", "#FF7A45"];
      var kind = vars().party || "confetti", parts = [], i;
      if (kind === "stars") {
        for (i = 0; i < 18; i++) {
          var s = el(box, "hk-star"); s.style.background = ["#FFC93C", "#E84A8B", "#FFC93C", "#4FA3D9"][i % 4]; s.style.left = (x - 32) + "px"; s.style.top = (y - 32) + "px";
          var a = (i / 18) * Math.PI * 2 + rand() * 0.3, r = 260 + rand() * 260;
          parts.push({ b: s, dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8, rot: (rand() - 0.5) * 360, sc: 0.6 + rand() * 0.9 });
        }
      } else if (kind === "stampede") {
        for (i = 0; i < 7; i++) {
          var rn = el(box, "hk-runner"); rn.style.left = "-160px"; rn.style.top = (1560 + (i % 3) * 46) + "px";
          parts.push({ b: rn, delay: i * 0.13 + rand() * 0.08, hop: 40 + rand() * 40 });
        }
      } else {
        for (i = 0; i < (n || 44); i++) {
          var b = el(box, "hk-bit"); b.style.background = COLORS[i % COLORS.length]; b.style.left = x + "px"; b.style.top = y + "px";
          var ang = -Math.PI / 2 + (rand() - 0.5) * 2.4, sp = 380 + rand() * 520;
          parts.push({ b: b, dx: Math.cos(ang) * sp, dy: Math.sin(ang) * sp, rot: (rand() - 0.5) * 900, fall: 900 + rand() * 500 });
        }
      }
      parts.kind = kind;
      return parts;
    };

    /* A line under the stat that reads the result ("78% guessed too low"): commentary, not just numbers */
    K.insight = function (box, text) { var d = el(box, "hk-insight"); d.textContent = text || ""; d.style.visibility = "hidden"; return d; };

    /* ---- Animation helpers (all on the scene's one paused timeline) ---- */
    var A = K.anim = {};

    /* Words pop in one after another */
    A.popIn = function (tl, spans, t, opt) {
      opt = opt || {};
      tl.fromTo(spans, { opacity: 0, scale: 1.5, y: -14 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, stagger: opt.stagger || 0.08, ease: "back.out(2.2)" }, t);
    };
    /* Gone completely within 0.3 s however many words, so the last frame matches the first */
    A.popOut = function (tl, spans, t) { var n = spans.length || 1; tl.to(spans, { opacity: 0, scale: 0.6, duration: 0.12, stagger: Math.min(0.03, 0.18 / n), ease: "power2.in" }, t); };

    /* A slot line: shown from tIn, gone by tOut (hidden, not just transparent, so nothing overlaps it while it's away) */
    A.slot = function (tl, s, tIn, tOut, big) {
      tl.set(s.el, { visibility: "visible" }, tIn);
      if (big) tl.fromTo(s.spans, { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.32, ease: "back.out(1.8)", transformOrigin: "50% 50%" }, tIn);
      else tl.fromTo(s.spans, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.28, stagger: 0.06, ease: "back.out(2)" }, tIn);
      if (tOut != null) {
        tl.to(s.spans, { opacity: 0, y: -20, duration: 0.15, stagger: 0.02, ease: "power2.in" }, tOut - 0.17);
        tl.set(s.el, { visibility: "hidden" }, tOut);
      }
    };

    /* Clouds drift; the flock grazes, then jumps for the answer */
    A.world = function (tl, w, T) {
      tl.fromTo(w.clouds[0], { x: 0 }, { x: 70, duration: T.end, ease: "none" }, 0);
      tl.fromTo(w.clouds[1], { x: 0 }, { x: -60, duration: T.end, ease: "none" }, 0);
      w.flock.forEach(function (s, i) { tl.fromTo(s, { y: 0 }, { keyframes: { y: [0, -6, 0, -4, 0] }, duration: 4, ease: "none" }, 0.3 + i * 0.37); });
      tl.fromTo(w.flock, { y: 0 }, { keyframes: { y: [0, -90, 0, -30, 0] }, duration: 0.75, ease: "none", stagger: 0.05 }, T.reveal + 0.05);
      // Snow, leaves or blossom: each piece falls on its own loop (finite repeats, so every frame is a function of time)
      (w.fall || []).forEach(function (p) {
        var reps = Math.max(0, Math.ceil((T.end + p.delay) / p.dur) - 1);
        tl.fromTo(p.el, { y: -60, x: 0, rotation: 0 }, { y: 1980, x: p.sway, rotation: p.spin, duration: p.dur, ease: "none", repeat: reps }, -p.delay);
      });
    };

    /* The cow thinks while you guess, fidgets through the countdown, jumps at the answer */
    A.host = function (tl, h, T) {
      gsap.set(h.x, { opacity: 0 });
      tl.fromTo(h.cow, { rotation: 0 }, { keyframes: { rotation: [0, -5, 0, 5, 0, -5, 0, 5, 0] }, duration: Math.max(1, T.count - 0.4), ease: "none", transformOrigin: "50% 90%" }, 0.2);
      tl.fromTo(h.cow, { x: 0 }, { keyframes: { x: [0, -4, 4, -4, 4, -4, 4, -4, 4, 0] }, duration: 3.0, ease: "none" }, T.count);
      // The reaction at the answer, rotated by day (variety "react")
      var react = vars().react || "jump";
      if (react === "spin") {
        tl.fromTo(h.cow, { y: 0, rotation: 0 }, { keyframes: { y: [0, -60, 0], rotation: [0, 180, 360] }, duration: 0.7, ease: "none", transformOrigin: "50% 60%" }, T.reveal);
      } else if (react === "dance") {
        tl.fromTo(h.cow, { y: 0, rotation: 0 }, { keyframes: { y: [0, -30, 0, -30, 0, -30, 0], rotation: [0, -14, 0, 14, 0, -14, 0] }, duration: 1.2, ease: "none", transformOrigin: "50% 90%" }, T.reveal);
      } else {
        tl.fromTo(h.cow, { y: 0 }, { keyframes: { y: [0, -70, 0, -26, 0] }, duration: 0.7, ease: "none" }, T.reveal);
      }
      tl.to(h.q, { opacity: 0, duration: 0.05 }, T.reveal);
      tl.to(h.x, { opacity: 1, duration: 0.05 }, T.reveal);
      tl.fromTo(h.bubble, { scale: 1 }, { keyframes: { scale: [1, 1.3, 1] }, duration: 0.3, ease: "none" }, T.reveal);
      tl.to(h.x, { opacity: 0, duration: 0.05 }, T.rewind + 0.6);
      tl.to(h.q, { opacity: 1, duration: 0.05 }, T.rewind + 0.6);
    };

    /* 3, 2, 1 from t0: the ring empties, the number pops each second */
    A.ring = function (tl, r, t0, from) {
      from = from || 3;
      var RING = 2 * Math.PI * 70;
      gsap.set([r.svg, r.box], { scale: 0, transformOrigin: "50% 50%" });
      tl.to([r.svg, r.box], { scale: 1, duration: 0.25, ease: "back.out(2)" }, t0 - 0.1);
      tl.fromTo(r.arc, { strokeDasharray: RING, strokeDashoffset: 0 }, { strokeDashoffset: RING, duration: from, ease: "none" }, t0);
      for (var i = 0; i < from; i++) {
        tl.set(r.n, { textContent: String(from - i) }, t0 + i);
        tl.fromTo(r.n, { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "back.out(2.5)" }, t0 + i);
      }
      tl.to([r.svg, r.box], { scale: 0, duration: 0.15, ease: "power2.in" }, t0 + from + 0.02);
    };

    /* The banner rises over the row under the stage at T.play and goes at T.rewind */
    A.banner = function (tl, b, T, under) {
      if (under && under.length) {
        tl.to(under, { opacity: 0, duration: 0.15 }, T.play - 0.1);
        tl.to(under, { opacity: 1, duration: 0.2 }, T.rewind + 0.2);
      }
      // Fully off the bottom and hidden until its moment (not just lowered: it must never peek over the hill)
      gsap.set(b.el, { y: 720, visibility: "hidden" });
      tl.set(b.el, { visibility: "visible" }, T.play);
      tl.to(b.el, { y: 0, duration: 0.42, ease: "back.out(1.4)" }, T.play);
      tl.fromTo(b.url, { scale: 1 }, { keyframes: { scale: [1, 1.08, 1] }, duration: 0.4, ease: "none", transformOrigin: "50% 50%" }, T.play + 0.75);
      tl.to(b.el, { y: 720, duration: 0.3, ease: "power2.in" }, T.rewind);
      tl.set(b.el, { visibility: "hidden" }, T.rewind + 0.31);
    };

    A.burst = function (tl, bits, t) {
      if (bits.kind === "stars") {
        gsap.set(bits.map(function (x) { return x.b; }), { opacity: 0, scale: 0 });
        bits.forEach(function (x, i) {
          var t0 = t + (i % 4) * 0.03;
          tl.set(x.b, { opacity: 1 }, t0);
          tl.fromTo(x.b, { x: 0, y: 0, scale: 0, rotation: 0 }, { x: x.dx, y: x.dy, scale: x.sc, rotation: x.rot, duration: 0.6, ease: "power3.out" }, t0);
          tl.to(x.b, { opacity: 0, scale: 0, duration: 0.4, ease: "power2.in" }, t0 + 0.9);
        });
        return;
      }
      if (bits.kind === "stampede") {
        bits.forEach(function (x) {
          var t0 = t + 0.05 + x.delay;
          tl.fromTo(x.b, { x: 0 }, { x: 1400, duration: 1.5, ease: "none" }, t0);
          tl.fromTo(x.b, { y: 0 }, { keyframes: { y: [0, -x.hop, 0, -x.hop, 0, -x.hop, 0, -x.hop, 0] }, duration: 1.5, ease: "none" }, t0);
        });
        return;
      }
      gsap.set(bits.map(function (x) { return x.b; }), { opacity: 0 });
      bits.forEach(function (x, i) {
        var t0 = t + (i % 6) * 0.015;
        tl.set(x.b, { opacity: 1 }, t0);
        tl.fromTo(x.b, { x: 0, y: 0, rotation: 0 }, { x: x.dx, y: x.dy, rotation: x.rot * 0.4, duration: 0.5, ease: "power2.out" }, t0);
        tl.to(x.b, { y: x.dy + x.fall, x: x.dx * 1.15, rotation: x.rot, duration: 1.3, ease: "power1.in" }, t0 + 0.5);
        tl.set(x.b, { opacity: 0 }, t0 + 1.8);
      });
    };

    /* The insight line: in under the sting, away when the banner rises */
    A.insight = function (tl, d, T) {
      if (!d.textContent) return;
      fit(d, { max: 40, min: 28 });   // runs after fonts load (inside the scene's build), so it measures the real text
      /* On long enough to read (about 0.3 s a word): a longer line comes in earlier, never
         before the reveal has landed. 12 Nov 2026: an 8-word line had 1.8 s and was flagged unread. */
      var words = d.textContent.trim().split(/\s+/).length;
      var start = Math.max(T.reveal + 0.4, Math.min(T.sting + 0.7, T.play - 0.1 - (words * 0.3 + 0.2)));
      tl.set(d, { visibility: "visible" }, start);
      tl.fromTo(d, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, start);
      tl.to(d, { opacity: 0, duration: 0.12 }, T.play - 0.1);
      tl.set(d, { visibility: "hidden" }, T.play);
    };

    /* The stat line: "<b>28</b> of 344 players ..." as plain markup; sting styling on/off */
    K.statText = function (stat, html, sting) { stat.innerHTML = html; stat.className = "hk-stat" + (sting ? " hk-sting" : ""); };
    K.pick = function (text) { return esc(text).replace(/(\d[\d,.]*%?)/, "<b>$1</b>"); };

    return K;
  }

  window.HERD = { get V() { return vars(); }, num: num, words: words, fit: fit, fontsReady: fontsReady, seeded: seeded, esc: esc, kit: kit };
})();
