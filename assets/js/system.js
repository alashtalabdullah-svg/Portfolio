/* =============================================================
   الأشطل® — «من الفوضى إلى النظام»
   The ordering engine. No framework, no build step.

   Everything ambient on this page is a function of ONE number:
   `order`, which runs 0 → 1 with the reader's scroll. The grain, the
   lattice, the tilt of cards, the precision of the cursor and the
   colour of the page all read from it. The reader is the one doing
   the ordering — the site only reports it.

   If JS is off, or a CDN is down, the page is still fully readable:
   nothing here hides content, it only chooses when to reveal it.
   ============================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------------
     ⚙ CONTACT FORM — paste your Web3Forms access key here.
     Free key at https://web3forms.com — it is safe to publish;
     the destination address never reaches the browser.
     ----------------------------------------------------------- */
  var FORM_ACCESS_KEY = "PASTE-YOUR-WEB3FORMS-ACCESS-KEY-HERE";
  var FORM_ENDPOINT = "https://api.web3forms.com/submit";

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* One engine, two languages. Only the handful of strings the script
     writes at runtime live here — everything a reader sees on first paint
     is authored in the HTML, in that page's own language. */
  var AR = root.lang !== "en";
  var T = {
    pc: AR ? "٪" : "%",
    navOpen: AR ? "فتح القائمة" : "Open menu",
    navShut: AR ? "إغلاق القائمة" : "Close menu"
  };

  /* The published state. `field.js` reads this and nothing else; the
     number is owned here and written in exactly one place, below. */
  var A = window.ASHTAL = { order: 0, chaos: 1 };

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* deterministic pseudo-random — the disorder is composed, not accidental,
     so it looks identical on every visit and every machine */
  var seeded = function (i) {
    var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  /* Arabic-Indic-free percentage, always two digits, localised sign */
  var pct = function (n) {
    var v = Math.round(clamp(n, 0, 1) * 100);
    return (v < 10 ? "0" + v : String(v)) + T.pc;
  };

  /* ===========================================================
     1 · TEXT — split by WORD only.
     Splitting Arabic by character severs the joins (العمليات would
     render as ا ل ع م ل ي ا ت). Word is the smallest safe unit.
     =========================================================== */
  function splitWords(el) {
    var scatter = el.hasAttribute("data-scatter");
    var parts = el.textContent.split(/(\s+)/);
    var frag = doc.createDocumentFragment();
    var i = 0;

    parts.forEach(function (part) {
      if (part === "") return;
      if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(" ")); return; }

      var outer = doc.createElement("span");
      outer.className = scatter ? "w w--free" : "w";
      var inner = doc.createElement("span");
      inner.className = "wi";
      inner.textContent = part;
      inner.style.setProperty("--i", i);

      if (scatter) {
        var r1 = seeded(i + 1), r2 = seeded(i + 7), r3 = seeded(i + 13);
        inner.style.setProperty("--sx", ((r1 - 0.5) * 190).toFixed(1));
        inner.style.setProperty("--sy", ((r2 - 0.5) * 150).toFixed(1));
        inner.style.setProperty("--sr", ((r3 - 0.5) * 26).toFixed(1));
        inner.style.setProperty("--sb", (6 + r1 * 8).toFixed(1));
      } else {
        inner.style.setProperty("--wr", ((seeded(i + 3) - 0.5) * 5).toFixed(1));
      }

      outer.appendChild(inner);
      frag.appendChild(outer);
      i++;
    });

    el.textContent = "";
    el.appendChild(frag);
    el.classList.add("split");
  }

  /* GSAP, when it loads, does the splitting and the revealing better than
     this file can — by line as well as by word, and tied to the scroll
     rather than to a threshold. So this engine hands both jobs over and
     keeps everything else. If the CDN is unreachable, nothing was handed
     over and the page behaves exactly as it did before GSAP existed. */
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  A.gsap = HAS_GSAP;
  A.splitWords = splitWords;
  if (HAS_GSAP && !calm) root.classList.add("gsap");

  if (!calm && !HAS_GSAP) $$("[data-split='words']").forEach(splitWords);

  /* ===========================================================
     2 · REVEAL — things arrive crooked and settle straight
     =========================================================== */
  var revealTargets = $$("[data-reveal], [data-split='words'], .step, .entry, .tool, .offer, .say, .fr");

  function markIn(el) {
    if (el.classList.contains("in")) return;
    el.classList.add("in");
    var n = el.getAttribute("data-count");
    if (n) countUp(el, parseInt(n, 10), el.getAttribute("data-prefix") || "");
    $$("[data-count]", el).forEach(function (c) {
      countUp(c, parseInt(c.getAttribute("data-count"), 10), c.getAttribute("data-prefix") || "");
    });
  }

  /* published so the GSAP layer can fire the same reveal — the counters
     hang off it, and having two places that know how to start a counter
     is how you end up with one that counts twice */
  A.reveal = markIn;

  if (calm || !("IntersectionObserver" in window)) {
    revealTargets.forEach(markIn);
  } else if (HAS_GSAP) {
    /* motion.js owns these now */
  } else {
    /* stagger siblings so a grid resolves item by item, not all at once */
    revealTargets.forEach(function (el) {
      var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
      if (idx > 0 && idx < 12) el.style.setProperty("--d", (idx * 0.075).toFixed(3) + "s");
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        markIn(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });

    revealTargets.forEach(function (el) { io.observe(el); });
  }

  function countUp(el, target, prefix) {
    if (!isFinite(target)) return;
    if (calm) { el.textContent = prefix + target; return; }
    var t0 = null, dur = 1100;
    (function tick(t) {
      if (t0 === null) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ===========================================================
     3 · THE ORDER ENGINE — one number, everything downstream
     =========================================================== */
  var PAPER = [0xef, 0xeb, 0xe2], PAPER2 = [0xdd, 0xd8, 0xca];
  var VOID1 = [0x16, 0x16, 0x1a], VOID2 = [0x08, 0x08, 0x0a];

  var rgb = function (a, b, t) {
    return "rgb(" + Math.round(lerp(a[0], b[0], t)) + "," +
      Math.round(lerp(a[1], b[1], t)) + "," + Math.round(lerp(a[2], b[2], t)) + ")";
  };

  var meterFill = $(".meter__bar i");
  var meterPcts = $$("[data-order-pct]");
  var takeovers = $$(".takeover");
  var sign = $(".sign");
  var firstDark = $(".sec.dark");

  /* The site is four documents that tell one story, so `order` measures
     travel through the SITE, not through the document: page 2 of 4 runs
     from 0.25 to 0.50 and no further. That is why the field never fully
     settles until the reader has actually walked all four — and why the
     index in the rail is marked server-side with aria-current rather
     than by scroll-spying anchors, which no longer exist. */
  var pageIdx = parseInt(body.getAttribute("data-page"), 10) || 0;
  var pageNum = parseInt(body.getAttribute("data-pages"), 10) || 1;

  var lastOrder = -1, lastDark = null, lastMeterDark = null;

  function frame() {
    var vh = window.innerHeight;
    var max = doc.documentElement.scrollHeight - vh;
    var y = window.scrollY || window.pageYOffset || 0;
    var local = max > 0 ? clamp(y / max, 0, 1) : 0;
    var order = clamp((pageIdx + local) / pageNum, 0, 1);

    body.classList.toggle("scrolled", y > vh * 0.35);

    /* the canvas field reads this every frame, so it is published before
       the write-gate below — the gate exists to spare the style engine,
       not to starve the renderer */
    A.order = order;
    A.chaos = 1 - order;

    /* --- ambient: only write when it actually moved --- */
    if (Math.abs(order - lastOrder) > 0.002) {
      lastOrder = order;
      root.style.setProperty("--order", order.toFixed(4));
      root.style.setProperty("--chaos", (1 - order).toFixed(4));

      /* paper darkens through the first half; the void deepens through
         the second. The two never cross-fade through mid-grey — the
         handover is done by the takeover plate, so contrast never dips. */
      root.style.setProperty("--bg", rgb(PAPER, PAPER2, clamp(order / 0.45, 0, 1)));
      root.style.setProperty("--bg-deep", rgb(VOID1, VOID2, clamp((order - 0.45) / 0.55, 0, 1)));

      if (meterFill) meterFill.style.transform = "scaleX(" + order.toFixed(4) + ")";
      var reading = pct(order);
      for (var m = 0; m < meterPcts.length; m++) meterPcts[m].textContent = reading;
    }

    /* --- the payoff: the wordmark fills as the last of the page resolves ---
       Driven by the signature's own travel rather than by `order`, which is
       already at ~0.94 by the time it appears — the whole point is that the
       outline completes in front of the reader.

       The span is measured from where the signature enters the bottom of
       the viewport to where it comes to rest at full scroll, so the fill
       lands on exactly 1.0 at the very end of the page and not before. A
       fixed guess at that span leaves the wordmark permanently half-filled
       on tall viewports, which reads as a bug rather than a flourish. */
    if (sign) {
      var sr = sign.getBoundingClientRect();
      var rest = (sr.top + y) - max;   /* its top once the page bottoms out */
      var span = vh - rest;
      sign.style.setProperty("--fill",
        (span > 0 ? clamp((vh - sr.top) / span, 0, 1) : 1).toFixed(3));
    }

    /* --- the takeover: the dark plate swallowing the page ---
       Every page has one, and the home page has a second on its footer,
       because home is the only page whose last section is still paper. */
    for (var t = 0; t < takeovers.length; t++) {
      var r = takeovers[t].getBoundingClientRect();
      takeovers[t].style.setProperty("--tk",
        clamp((vh - r.top) / (vh * 0.62), 0, 1).toFixed(3));
    }

    /* --- which half is each piece of chrome sitting over? ---
       The bar rides at the top of the viewport and the meter at the
       bottom, so the takeover plate reaches them at different moments.
       One shared flag would leave whichever it missed unreadable while
       the plate sweeps between them. (The index rail needs no flag: it
       blends against its own backdrop — see system.css.) */
    if (firstDark) {
      var edge = firstDark.getBoundingClientRect().top;
      var dark = edge <= 64;
      if (dark !== lastDark) {
        lastDark = dark;
        body.classList.toggle("on-dark", dark);
        /* the html element only shows through on overscroll — it has to
           match whichever end of the page you are bouncing against */
        root.style.backgroundColor = dark
          ? root.style.getPropertyValue("--bg-deep")
          : root.style.getPropertyValue("--bg");
      }
      var mDark = edge <= vh - 70;
      if (mDark !== lastMeterDark) {
        lastMeterDark = mDark;
        body.classList.toggle("meter-dark", mDark);
      }
    }

  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { frame(); queued = false; });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);

  /* ===========================================================
     4 · SMOOTH SCROLL (progressive enhancement)
     =========================================================== */
  var lenis = null;
  if (!calm && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.7
    });
    /* seed from a real rAF timestamp — priming the loop with 0 makes the
       first delta the whole age of the document, and Lenis then fights any
       programmatic scroll (anchor restore, find-in-page) back to zero */
    requestAnimationFrame(function loop(t) { lenis.raf(t); requestAnimationFrame(loop); });
    lenis.on("scroll", onScroll);
    /* motion.js needs the same instance to keep ScrollTrigger in step with
       it; two smooth-scroll clocks running against each other is what makes
       pinned sections drift by a frame */
    A.lenis = lenis;
  }

  $$("a[href^='#']").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var t = $(id);
      if (!t) return;
      e.preventDefault();
      closeNav();
      if (lenis) lenis.scrollTo(t, { offset: -70, duration: 1.25 });
      else t.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      if (history.replaceState) history.replaceState(null, "", id);
    });
  });

  /* ===========================================================
     5 · RETICLE — the cursor as an instrument.
     Lags and wanders while the page is disordered; locks to the
     pointer as order rises. Same idea, different surface.
     =========================================================== */
  if (fine && !calm) {
    var ret = $(".reticle");
    var mx = 0, my = 0, rx = 0, ry = 0, seen = false;

    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!seen) { rx = mx; ry = my; seen = true; ret.classList.add("on"); }
    }, { passive: true });

    document.addEventListener("pointerleave", function () { ret.classList.remove("on"); });
    document.addEventListener("pointerenter", function () { if (seen) ret.classList.add("on"); });

    (function trail() {
      var order = parseFloat(root.style.getPropertyValue("--order")) || 0;
      /* sloppy at 0.10, near-exact at 0.42 */
      var k = 0.10 + 0.32 * order;
      rx = lerp(rx, mx, k);
      ry = lerp(ry, my, k);
      ret.style.transform = "translate3d(" + rx.toFixed(2) + "px," + ry.toFixed(2) + "px,0)";
      requestAnimationFrame(trail);
    })();

    /* An instrument names what it is pointed at. `data-cue` is authored in
       the HTML so each language writes its own word — the script never
       invents copy. */
    var cue = $("i", ret);
    var hot = "a, button, input, textarea, .fr, .tool, .offer, .quals__list li";
    doc.addEventListener("pointerover", function (e) {
      var t = e.target.closest && e.target.closest(hot);
      if (!t) return;
      ret.classList.add("lock");
      var c = e.target.closest("[data-cue]");
      if (c && cue) { cue.textContent = c.getAttribute("data-cue"); ret.classList.add("cued"); }
    });
    doc.addEventListener("pointerout", function (e) {
      if (!e.target.closest || !e.target.closest(hot)) return;
      ret.classList.remove("lock", "cued");
    });
  }

  /* ===========================================================
     5b · MAGNETISM — the signal buttons lean toward the pointer.
     Rationed on purpose: exactly the elements that carry the yellow
     move this way, so the pull always means "this is the next step".
     =========================================================== */
  if (fine && !calm) {
    $$(".btn--sig, .offer__go, .bar__brand").forEach(function (el) {
      var raf = 0, tx = 0, ty = 0;
      var pull = function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        tx = clamp(dx * 0.28, -10, 10);
        ty = clamp(dy * 0.34, -7, 7);
        if (!raf) raf = requestAnimationFrame(function () {
          raf = 0;
          el.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px)";
        });
      };
      el.addEventListener("pointermove", pull);
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ===========================================================
     7b · THE METHOD STAGE — four steps, in the same order every time.
     The stage is pinned while the four steps pass it, so the reader
     cannot skim past the sequence: they have to walk it. The stage is
     an enhancement over a list that is already complete and readable,
     so if any of this fails the section simply stays a list.
     =========================================================== */
  (function () {
    var proc = $(".proc");
    if (!proc) return;
    var steps = $$(".step", proc);
    var dials = $$(".proc__dial li", proc);
    var spine = $(".proc__spine i", proc);
    if (!steps.length || !dials.length) return;

    var at = -1;
    function pick() {
      var vh = window.innerHeight;
      var line = vh * 0.5;
      var n = 0;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].getBoundingClientRect().top <= line) n = i;
      }
      if (n !== at) {
        at = n;
        for (var j = 0; j < dials.length; j++) {
          dials[j].classList.toggle("on", j === at);
          dials[j].classList.toggle("done", j < at);
        }
        steps.forEach(function (s, k) { s.classList.toggle("at", k === at); });
      }
      if (spine) {
        /* the spine measures the reader's travel through the sequence,
           not through the section — it fills between the first step's
           midpoint and the last step's midpoint.

           Published as a variable rather than written as a transform,
           because the stage is a vertical rail on a wide screen and a
           horizontal bar on a narrow one. The axis is a layout question
           and belongs to the stylesheet; this only reports how far. */
        var a = steps[0].getBoundingClientRect();
        var z = steps[steps.length - 1].getBoundingClientRect();
        var top = a.top + a.height / 2;
        var span = (z.top + z.height / 2) - top;
        spine.style.setProperty("--fill",
          (span > 0 ? clamp((line - top) / span, 0, 1) : 0).toFixed(3));
      }
    }

    var q = false;
    var tick = function () {
      if (q) return;
      q = true;
      requestAnimationFrame(function () { pick(); q = false; });
    };
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    proc.classList.add("proc--live");
    pick();
  })();

  /* ===========================================================
     6 · NAV
     =========================================================== */
  var burger = $(".burger");
  function closeNav() {
    if (!body.classList.contains("nav-open")) return;
    body.classList.remove("nav-open", "is-locked");
    if (burger) { burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", T.navOpen); }
    if (lenis) lenis.start();
  }
  if (burger) {
    burger.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      body.classList.toggle("is-locked", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? T.navShut : T.navOpen);
      if (lenis) { open ? lenis.stop() : lenis.start(); }
    });
  }
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });

  /* ===========================================================
     7 · QUESTIONS
     =========================================================== */
  $$(".q__ask").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".q");
      var open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ===========================================================
     8 · BOOT — the system initialising, then getting out of the way
     =========================================================== */
  (function boot() {
    var box = $(".boot");

    /* Once per visit, not once per document. Replaying the boot on every
       navigation meant every click waited on document.fonts.ready all over
       again — which is exactly the hesitation you feel moving between
       pages. The head script has already set `pre-booted` before paint;
       all that is left here is to skip the sequence and get out of the way. */
    var already = root.classList.contains("pre-booted");
    if (!box || calm || already) {
      body.classList.add("booted");
      if (box && box.parentNode) box.parentNode.removeChild(box);
      startHero();
      return;
    }

    var bar = $(".boot__bar i");
    var num = $(".boot__pct");
    var p = 0, done = false;

    var settle = function () {
      if (done) return;
      done = true;
      p = 1;
      if (bar) bar.style.setProperty("--bp", "1");
      if (num) num.textContent = pct(1);
      try { sessionStorage.setItem("ashtal-booted", "1"); } catch (e) { /* private mode */ }
      setTimeout(function () {
        body.classList.add("booted");
        startHero();
        setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 900);
      }, 260);
    };

    (function climb() {
      if (done) return;
      p = Math.min(p + (0.035 + Math.random() * 0.05), 0.94);
      if (bar) bar.style.setProperty("--bp", p.toFixed(3));
      if (num) num.textContent = pct(p);
      requestAnimationFrame(function () { setTimeout(climb, 45); });
    })();

    var ready = function () { setTimeout(settle, 260); };
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(ready);
    else window.addEventListener("load", ready);
    setTimeout(settle, 3200); /* never hold the page hostage */
  })();

  function startHero() {
    body.classList.add("ready");
    if (!HAS_GSAP || calm) {
      $$(".hero [data-reveal], .hero [data-split='words'], .page-head [data-reveal], .page-head [data-split='words']")
        .forEach(function (el, i) {
          setTimeout(function () { markIn(el); }, calm ? 0 : 90 + i * 110);
        });
    }
    frame();
  }

  /* ===========================================================
     9 · LANGUAGE MEMORY + YEAR
     =========================================================== */
  $$("[data-lang-set]").forEach(function (a) {
    a.addEventListener("click", function () {
      try { localStorage.setItem("ashtal-lang", a.getAttribute("data-lang-set")); } catch (e) { /* private mode */ }
    });
  });
  var yr = $("#yr");
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ===========================================================
     10 · CONTACT FORM — relays the message without exposing an address
     =========================================================== */
  var form = $(".form");
  if (form) {
    var msgBox = $(".form__msg", form);
    var sendBtn = $(".form__send", form);
    var fields = $$("[data-field]", form);
    var t = function (k) { return form.getAttribute("data-" + k) || ""; };

    var showMsg = function (kind, text) {
      if (!msgBox) return;
      msgBox.className = "form__msg form__msg--" + kind + " show";
      msgBox.innerHTML =
        (kind === "ok"
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 1 21h22L12 2Zm0 6 1 7h-2l1-7Zm0 9.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"/></svg>') +
        "<span></span>";
      msgBox.lastChild.textContent = text;
    };

    var validate = function (wrap) {
      var input = $("input, textarea", wrap);
      if (!input) return true;
      var ok = input.checkValidity() && input.value.trim() !== "";
      wrap.classList.toggle("is-bad", !ok);
      return ok;
    };

    fields.forEach(function (wrap) {
      var input = $("input, textarea", wrap);
      if (!input) return;
      input.addEventListener("blur", function () { validate(wrap); });
      input.addEventListener("input", function () { if (wrap.classList.contains("is-bad")) validate(wrap); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!fields.map(validate).every(Boolean)) {
        showMsg("bad", t("msg-invalid"));
        var bad = $(".is-bad input, .is-bad textarea", form);
        if (bad) bad.focus();
        return;
      }

      var hp = form.elements.botcheck;
      if (hp && hp.checked) { showMsg("ok", t("msg-ok")); form.reset(); return; }

      if (!FORM_ACCESS_KEY || FORM_ACCESS_KEY.indexOf("PASTE-") === 0) {
        showMsg("bad", t("msg-unconfigured"));
        return;
      }

      var data = {
        access_key: FORM_ACCESS_KEY,
        subject: t("subject") || "New message from alashtalabdullah.info",
        from_name: "alashtalabdullah.info",
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim()
      };
      if (form.elements.topic) data.topic = form.elements.topic.value.trim();

      form.classList.add("is-sending");
      if (sendBtn) sendBtn.disabled = true;
      if (msgBox) msgBox.className = "form__msg";

      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json().catch(function () { return { success: res.ok }; }); })
        .then(function (out) {
          if (out && out.success) { showMsg("ok", t("msg-ok")); form.reset(); }
          else { showMsg("bad", (out && out.message) || t("msg-fail")); }
        })
        .catch(function () { showMsg("bad", t("msg-fail")); })
        .then(function () {
          form.classList.remove("is-sending");
          if (sendBtn) sendBtn.disabled = false;
        });
    });
  }

  /* boot the engine once, immediately */
  frame();
})();
