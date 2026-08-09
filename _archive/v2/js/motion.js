/* =========================================================
   AL-ASHTAL® — motion layer
   Shared by index.html (ar) and en.html (en).

   Two interchangeable paths, picked at runtime:

     A. GSAP + ScrollTrigger (loaded from the CDN in <head>) — clip
        reveals, line-by-line copy, scrubbed parallax, velocity skew,
        magnetic controls, tilting cards, chapter transitions.
        Nothing is pre-hidden: every reveal is a `from` tween that runs
        only once its trigger fires, so an element that is never reached
        simply stays visible.

     B. No GSAP (CDN blocked, offline, ancient browser) — the original
        IntersectionObserver + CSS layer, gated behind `html.motion`
        with a watchdog that repaints everything if the observer fails.

   `prefers-reduced-motion` skips both paths: no class, no tween, no
   hidden element. The page can never end up blank.
   ========================================================= */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var raf = window.requestAnimationFrame.bind(window);
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduced = mq("(prefers-reduced-motion: reduce)");
  var fine = mq("(hover: hover) and (pointer: fine)");
  var isRTL = root.dir === "rtl";

  /* -------------------------------------------------------
     Shared helpers — used by both paths
     ------------------------------------------------------- */
  var esc = function (s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  // headline → one clipping box per word
  function splitWords(el) {
    if (el.querySelector(".word")) return;
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(function (lineHTML) {
      var tmp = doc.createElement("div");
      tmp.innerHTML = lineHTML;
      return (tmp.textContent || "").trim().split(/\s+/).filter(Boolean)
        .map(function (w) { return '<span class="word"><span>' + esc(w) + "</span></span>"; })
        .join(" ");
    }).join("<br>");
  }

  /* paragraph → one clipping box per *rendered* line.
     Only plain-text paragraphs are touched, the split happens moments
     before the reveal, and the original markup is restored the instant
     the tween ends — so resizing later re-wraps normally. */
  function splitLines(el) {
    if (el.children.length || !(el.textContent || "").trim()) return null;
    var original = el.innerHTML;

    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map(function (w) { return '<span class="ln-w">' + esc(w) + "</span>"; }).join(" ");

    var groups = [], top = null, cur = null;
    Array.prototype.forEach.call(el.querySelectorAll(".ln-w"), function (w) {
      if (top === null || Math.abs(w.offsetTop - top) > 2) {
        cur = []; groups.push(cur); top = w.offsetTop;
      }
      cur.push(w.textContent);
    });
    if (groups.length < 2 && el.textContent.length < 40) { el.innerHTML = original; return null; }

    el.innerHTML = groups.map(function (words) {
      return '<span class="ln"><span>' + esc(words.join(" ")) + "</span></span>";
    }).join("");

    return { el: el, original: original, lines: el.querySelectorAll(".ln > span") };
  }

  function countUp(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll("b"), function (el) {
      if (el.getAttribute("data-counted")) return;
      var parts = /^(\D*)(\d+)(\D*)$/.exec(el.textContent.trim());
      if (!parts) return;
      var pre = parts[1], target = parseInt(parts[2], 10), post = parts[3];
      if (!target) return;
      el.setAttribute("data-counted", "1");
      var t0 = 0, dur = 1300;
      var tick = function (now) {
        if (!t0) t0 = now;
        var k = Math.min((now - t0) / dur, 1);
        el.textContent = pre + Math.round(target * (1 - Math.pow(1 - k, 4))) + post;
        if (k < 1) raf(tick);
      };
      el.textContent = pre + "0" + post;
      raf(tick);
    });
  }

  function wireCardSheen() {
    if (!fine) return;
    Array.prototype.forEach.call(doc.querySelectorAll(".cap"), function (card) {
      var queued = false, px = 0, py = 0, rect = null;
      card.addEventListener("pointerenter", function () { rect = card.getBoundingClientRect(); });
      card.addEventListener("pointermove", function (e) {
        if (!rect) rect = card.getBoundingClientRect();
        px = ((e.clientX - rect.left) / rect.width) * 100;
        py = ((e.clientY - rect.top) / rect.height) * 100;
        if (queued) return;
        queued = true;
        raf(function () {
          card.style.setProperty("--mx", px + "%");
          card.style.setProperty("--my", py + "%");
          queued = false;
        });
      });
      card.addEventListener("pointerleave", function () { rect = null; });
    });
  }

  var HEADLINES = ".hero__title, .foot .h2, .sec-head .h2, .talk .display";
  var LEADS = ".sec-head .lead, .caps__statement + * .lead";

  /* -------------------------------------------------------
     Path selection
     ------------------------------------------------------- */
  if (reduced) return;

  var gsap = window.gsap;
  var ST = window.ScrollTrigger;

  if (gsap && ST) {
    try {
      gsapPath(gsap, ST);
    } catch (err) {
      try { gsap.set("[style]", { clearProps: "opacity,transform,clipPath" }); } catch (e) { /* no-op */ }
      if (window.console) console.warn("[motion] GSAP path failed, falling back:", err);
      fallbackPath();
    }
  } else {
    fallbackPath();
  }

  /* =======================================================
     PATH A — GSAP + ScrollTrigger
     ======================================================= */
  function gsapPath(gsap, ST) {
    gsap.registerPlugin(ST);
    gsap.defaults({ ease: "expo.out", duration: 1.15 });
    root.classList.add("gsap-on");

    Array.prototype.forEach.call(doc.querySelectorAll(HEADLINES), splitWords);
    wireCardSheen();

    /* --- 1. hero entrance -------------------------------- */
    var intro = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.4 } });

    intro
      .from(".hero__mark", { scale: 1.14, opacity: 0, duration: 1.9, ease: "power2.out" })
      .from(".hero__fx b", { scale: 0.55, opacity: 0, duration: 2.1, stagger: 0.14 }, 0)
      .from(".topbar__brand, .topbar__side > *", { y: -18, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.15)
      .from(".hero__photo", {
        clipPath: "inset(100% 0% 0% 0%)",
        y: 60,
        scale: 1.08,
        duration: 1.7,
        ease: "expo.out"
      }, 0.3)
      .from(".hero__title .word > span", { yPercent: 118, rotate: 3, duration: 1.25, stagger: 0.075 }, 0.75)
      .from(".hero__cta > *", { y: 28, opacity: 0, duration: 1, stagger: 0.09 }, 1.15)
      .from(".float--stats", { x: 34, opacity: 0, duration: 1.1 }, 1.25)
      .from(".float--traits", { x: -34, opacity: 0, duration: 1.1 }, 1.32)
      .from(".scroll-hint", { opacity: 0, y: 10, duration: 0.9 }, 1.5);

    /* --- 2. hero parallax on scroll ---------------------- */
    var heroScrub = { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.7 };
    gsap.to(".hero__mark", { yPercent: -30, ease: "none", scrollTrigger: heroScrub });
    gsap.to(".hero__photo", { yPercent: 16, ease: "none", scrollTrigger: heroScrub });
    gsap.to(".hero__fx b", { yPercent: 28, ease: "none", stagger: 0.15, scrollTrigger: heroScrub });
    gsap.to(".hero__title", { yPercent: -10, opacity: 0.12, ease: "none", scrollTrigger: heroScrub });

    /* --- 3. hero parallax on pointer --------------------- */
    if (fine) {
      var layers = [
        { el: doc.querySelector(".hero__mark"), depth: 14 },
        { el: doc.querySelector(".hero__photo"), depth: -24 },
        { el: doc.querySelector(".float--stats"), depth: -36 },
        { el: doc.querySelector(".float--traits"), depth: -36 }
      ].filter(function (l) { return l.el; });

      layers.forEach(function (l) {
        l.x = gsap.quickTo(l.el, "x", { duration: 1.2, ease: "power3" });
        l.y = gsap.quickTo(l.el, "y", { duration: 1.2, ease: "power3" });
      });

      var hero = doc.querySelector(".hero");
      if (hero) {
        hero.addEventListener("pointermove", function (e) {
          var nx = e.clientX / window.innerWidth - 0.5;
          var ny = e.clientY / window.innerHeight - 0.5;
          layers.forEach(function (l) { l.x(nx * l.depth); l.y(ny * l.depth); });
        });
        hero.addEventListener("pointerleave", function () {
          layers.forEach(function (l) { l.x(0); l.y(0); });
        });
      }
    }

    /* --- 4. section reveals ------------------------------
       Cards arrive behind a clip that opens upward; plain blocks
       simply rise. Nothing is hidden before its trigger fires. */
    var WIPE = [
      { sel: ".cap", stagger: 0.08 },
      { sel: ".quote", stagger: 0.14 },
      { sel: ".offer__col", stagger: 0.13 },
      { sel: ".work-card", stagger: 0.1 },
      { sel: ".chapters__stage", stagger: 0 }
    ];
    WIPE.forEach(function (g) {
      if (!doc.querySelector(g.sel)) return;
      ST.batch(g.sel, {
        start: "top 88%",
        once: true,
        onEnter: function (batch) {
          gsap.from(batch, {
            clipPath: "inset(0% 0% 100% 0%)",
            y: 56,
            duration: 1.5,
            stagger: g.stagger,
            overwrite: "auto",
            clearProps: "clipPath,transform"
          });
        }
      });
    });

    var RISE = [
      { sel: ".sec-head > *", y: 40, stagger: 0.14 },
      { sel: ".ch-tab", y: 18, stagger: 0.07 },
      { sel: ".chapters__nav", y: 16, stagger: 0 },
      { sel: ".caps__statement", x: isRTL ? 54 : -54, stagger: 0 },
      { sel: ".talk__row", y: 32, stagger: 0.12 },
      { sel: ".faq-item", y: 28, stagger: 0.06 },
      { sel: ".form .field, .form .field--row, .form__send, .form__note", y: 26, stagger: 0.08 },
      { sel: ".foot__links a, .foot__soc a, .foot__cta > *", y: 22, stagger: 0.07 },
      { sel: ".foot__bar", y: 18, stagger: 0 }
    ];
    RISE.forEach(function (g) {
      if (!doc.querySelector(g.sel)) return;
      ST.batch(g.sel, {
        start: "top 90%",
        once: true,
        onEnter: function (batch) {
          gsap.from(batch, {
            y: g.y || 0,
            x: g.x || 0,
            opacity: 0,
            duration: 1.2,
            stagger: g.stagger,
            overwrite: "auto",
            clearProps: "transform,opacity"
          });
        }
      });
    });

    // headlines rise word by word as their section arrives
    gsap.utils.toArray(".sec-head .h2, .foot .h2, .talk .display").forEach(function (h) {
      var words = h.querySelectorAll(".word > span");
      if (!words.length) return;
      gsap.from(words, {
        yPercent: 118,
        rotate: 2,
        duration: 1.25,
        stagger: 0.06,
        clearProps: "transform",
        scrollTrigger: { trigger: h, start: "top 88%", once: true }
      });
    });

    // and the intro paragraphs arrive one rendered line at a time
    gsap.utils.toArray(LEADS).forEach(function (p) {
      ST.create({
        trigger: p,
        start: "top 90%",
        once: true,
        onEnter: function () {
          var split = splitLines(p);
          if (!split) return;
          gsap.from(split.lines, {
            yPercent: 110,
            duration: 1.15,
            stagger: 0.09,
            ease: "expo.out",
            onComplete: function () { split.el.innerHTML = split.original; }
          });
        }
      });
    });

    /* --- 5. counters ------------------------------------- */
    gsap.utils.toArray("[data-count]").forEach(function (block) {
      ST.create({ trigger: block, start: "top 92%", once: true, onEnter: function () { countUp(block); } });
    });

    /* --- 6. the big band drifts sideways ----------------- */
    gsap.utils.toArray(".band span").forEach(function (el) {
      gsap.fromTo(el, { xPercent: isRTL ? -6 : 6 }, {
        xPercent: isRTL ? 6 : -6,
        ease: "none",
        scrollTrigger: { trigger: el.closest(".band") || el, start: "top bottom", end: "bottom top", scrub: 0.7 }
      });
    });

    /* --- 7. work-card glyphs breathe --------------------- */
    gsap.utils.toArray(".work-card__glyph").forEach(function (g, i) {
      gsap.to(g, {
        y: -16, rotate: i % 2 ? -3 : 3,
        duration: 3.6 + i * 0.35, ease: "sine.inOut", repeat: -1, yoyo: true
      });
    });

    /* --- 8. cards lean with scroll velocity --------------
       A couple of degrees at most: enough to feel like weight,
       little enough that nobody notices it as an effect.      */
    var leaners = gsap.utils.toArray(".cap, .quote, .offer__col, .work-card, .faq-item");
    if (leaners.length) {
      var setSkew = gsap.quickSetter(leaners, "skewY", "deg");
      var clampSkew = gsap.utils.clamp(-2, 2);
      var proxy = { skew: 0 };
      gsap.set(leaners, { transformOrigin: "center center", force3D: true });
      ST.create({
        onUpdate: function (self) {
          var skew = clampSkew(self.getVelocity() / -620);
          if (Math.abs(skew) > Math.abs(proxy.skew)) {
            proxy.skew = skew;
            gsap.to(proxy, {
              skew: 0, duration: 0.85, ease: "power3", overwrite: true,
              onUpdate: function () { setSkew(proxy.skew); }
            });
          }
        }
      });
    }

    /* --- 9. magnetic controls ---------------------------- */
    if (fine) {
      gsap.utils.toArray(".btn--acc, .btn--light, .arrow-btn, .work__nav button, .ch-nav, .foot__soc a, .rail__soc a")
        .forEach(function (el) {
          var xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
          var yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
          var rect = null;
          el.addEventListener("pointerenter", function () { rect = el.getBoundingClientRect(); });
          el.addEventListener("pointermove", function (e) {
            if (!rect) rect = el.getBoundingClientRect();
            xTo((e.clientX - (rect.left + rect.width / 2)) * 0.3);
            yTo((e.clientY - (rect.top + rect.height / 2)) * 0.42);
          });
          el.addEventListener("pointerleave", function () { rect = null; xTo(0); yTo(0); });
        });
    }

    /* --- 10. cards tilt toward the pointer --------------- */
    if (fine) {
      gsap.utils.toArray(".cap, .quote, .offer__col, .chapters__stage").forEach(function (card) {
        gsap.set(card, { transformPerspective: 1000, transformOrigin: "center" });
        var rX = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
        var rY = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
        var amount = card.classList.contains("chapters__stage") ? 2.4 : 5.5;
        var lift = card.classList.contains("chapters__stage") ? 0 : -7;
        var rect = null;
        card.addEventListener("pointerenter", function () {
          rect = card.getBoundingClientRect();
          if (lift) gsap.to(card, { y: lift, duration: 0.5, overwrite: "auto" });
        });
        card.addEventListener("pointermove", function (e) {
          if (!rect) rect = card.getBoundingClientRect();
          rY(((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * amount);
          rX(-((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * amount);
        });
        card.addEventListener("pointerleave", function () {
          rect = null; rX(0); rY(0);
          if (lift) gsap.to(card, { y: 0, duration: 0.6, overwrite: "auto" });
        });
      });
    }

    /* --- 11. chapter transitions -------------------------
       main.js owns the state and fires the event; this only
       decorates the change. */
    var chapters = doc.querySelector("[data-chapters]");
    if (chapters) {
      chapters.addEventListener("chapter:change", function (e) {
        var d = e.detail;
        var out = d.dir * (isRTL ? -1 : 1);
        var tl = gsap.timeline({ defaults: { ease: "expo.out" } });

        tl.to(d.from, { opacity: 0, x: -34 * out, duration: 0.4, ease: "power2.in" })
          .set(d.from, { clearProps: "transform,opacity" })
          .fromTo(d.to, { opacity: 0, x: 46 * out }, { opacity: 1, x: 0, duration: 0.9 }, 0.16)
          .fromTo(d.to.querySelector(".chapter__ghost"),
            { opacity: 0, scale: 1.22, yPercent: -8 },
            { opacity: 0.55, scale: 1, yPercent: 0, duration: 1.3, ease: "expo.out" }, 0.16)
          .fromTo(d.to.querySelectorAll(".chapter__top, .chapter__title, .chapter__body, .chapter__extra"),
            { opacity: 0, y: 26 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.075, clearProps: "transform,opacity" }, 0.24);
      });
    }

    /* --- 12. the teaser cards arrive after their fetch ---- */
    var teaser = doc.querySelector("[data-latest-posts]");
    if (teaser) {
      teaser.addEventListener("posts:rendered", function () {
        gsap.from(teaser.querySelectorAll(".post-card"), {
          y: 40, opacity: 0, duration: 1.1, stagger: 0.1, clearProps: "transform,opacity"
        });
        ST.refresh();
      });
    }

    /* --- 12. keep triggers honest ------------------------ */
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ST.refresh(); });
    window.addEventListener("load", function () { ST.refresh(); });
  }

  /* =======================================================
     PATH B — IntersectionObserver + CSS (no GSAP)
     ======================================================= */
  function fallbackPath() {
    wireCardSheen();

    if (typeof window.IntersectionObserver !== "function") return;

    root.classList.add("motion");
    Array.prototype.forEach.call(doc.querySelectorAll(HEADLINES), splitWords);

    var REVEAL = [
      [".hero__photo", "zoom", 0],
      [".hero__title", "up", 0],
      [".hero__cta", "up", 0],
      [".float--stats", "up", 0],
      [".float--traits", "side", 0],
      [".sec-head > *", "up", 90],
      [".ch-tab", "up", 60],
      [".chapters__stage", "zoom", 0],
      [".chapters__nav", "up", 0],
      [".work-card", "up", 70],
      [".caps__statement", "side", 0],
      [".cap", "zoom", 60],
      [".offer__col", "up", 110],
      [".talk__row", "up", 0],
      [".quote", "up", 120],
      [".faq-item", "up", 45],
      [".band span", "zoom", 0],
      [".foot__grid > *", "up", 130],
      [".foot__bar", "up", 0]
    ];

    REVEAL.forEach(function (rule) {
      var seen = new WeakMap();
      Array.prototype.forEach.call(doc.querySelectorAll(rule[0]), function (el) {
        el.setAttribute("data-rv", rule[1]);
        if (!rule[2]) return;
        var i = seen.get(el.parentNode) || 0;
        seen.set(el.parentNode, i + 1);
        el.style.setProperty("--rv-d", i * rule[2] + "ms");
      });
    });

    Array.prototype.forEach.call(doc.querySelectorAll(".word"), function (w, i) {
      w.style.setProperty("--rv-d", 60 + (i % 8) * 70 + "ms");
    });

    var revealed = false;
    var io = new IntersectionObserver(function (entries) {
      revealed = true;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("rv-in");
        Array.prototype.forEach.call(entry.target.querySelectorAll(".word"), function (w) {
          w.classList.add("rv-in");
        });
        if (entry.target.hasAttribute("data-count")) countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    Array.prototype.forEach.call(doc.querySelectorAll("[data-rv], [data-count]"), function (el) {
      io.observe(el);
    });

    window.addEventListener("load", function () {
      setTimeout(function () { if (!revealed) root.classList.remove("motion"); }, 1200);
    });
  }
})();
