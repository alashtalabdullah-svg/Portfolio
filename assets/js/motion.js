/* =============================================================
   الأشطل® — THE MOTION LAYER

   GSAP sits on top of a page that is already complete without it.
   system.js owns `order`, the meter, the boot, the navigation, the
   questions and the form; if this file never runs — CDN blocked,
   old browser, reduced motion — none of that changes and nothing
   is hidden. Everything here is addition.

   Three rules this file will not break:

   1 · Arabic is split by LINE and by WORD, never by character.
       SplitText with type "chars" severs the joins and «العمليات»
       renders as eight loose letters. There is no configuration in
       which chars are acceptable on this site.

   2 · Every reveal is a `from` tween. Nothing is pre-hidden by CSS
       under `html.gsap`, so an element whose trigger never fires
       stays visible instead of staying invisible. A blank page is
       a worse failure than an unanimated one.

   3 · Every tween ends with clearProps. Once the reveal is done the
       element goes back to being styled by the stylesheet, so the
       hover states, the chaos tilt and the layout are never left
       fighting an inline transform.
   ============================================================= */
(function () {
  "use strict";

  var A = window.ASHTAL || {};
  var root = document.documentElement;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (calm || !window.gsap || !window.ScrollTrigger) return;

  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* If any of the setup below throws, the page must not be left in a
     half-animated state: drop the flag so the stylesheet's own reveal
     rules apply again, and clear anything GSAP already wrote. */
  function bail(err) {
    try {
      root.classList.remove("gsap");
      gsap.set("[data-reveal], [data-split='words'], .hero__fig, .plot", { clearProps: "all" });
      $$("[data-reveal], .fr, .step, .entry, .tool, .offer, .say, .flow__n, .guards li").forEach(function (el) {
        if (A.reveal) A.reveal(el);
      });
    } catch (e) { /* nothing left to do */ }
    if (window.console) console.warn("[motion] disabled:", err && err.message);
  }

  try {
    gsap.registerPlugin(ST);
    var HAS_SPLIT = !!window.SplitText;
    if (HAS_SPLIT) gsap.registerPlugin(window.SplitText);
    if (window.Flip) gsap.registerPlugin(window.Flip);

    var EASE = "expo.out";

    /* ---------------------------------------------------------
       0 · Lenis ↔ ScrollTrigger
       Lenis moves the page on its own clock. Without this, every
       trigger fires against a scroll position that is one frame
       stale and pinned sections drift.
       --------------------------------------------------------- */
    if (window.Lenis && A.lenis) {
      A.lenis.on("scroll", ST.update);
      gsap.ticker.lagSmoothing(0);
    }

    /* ---------------------------------------------------------
       1 · HEADINGS — masked line reveal
       The line mask is the single most recognisable move in this
       kind of work, and it is the one that suits Arabic best:
       whole lines rise out of an overflow-hidden box, so no glyph
       is ever cut and no join is ever broken.
       --------------------------------------------------------- */
    function splitLines(el) {
      if (!HAS_SPLIT) {
        /* no SplitText — fall back to the engine's own word splitter,
           which system.js stood down from when GSAP appeared */
        if (A.splitWords && !el.classList.contains("split")) A.splitWords(el);
        return null;
      }
      /* NO `mask: "lines"`.
         The line mask is an overflow-hidden box sized to the line, and
         Arabic does not fit in one: the tail of ى, the bowl of ج ح خ,
         the loop of ع, and the hamza riding above أ all sit outside it.
         Masking cut them off — «الفوضى» lost its tail and «الأشطل» lost
         its hamza. The rise now happens unmasked, which costs a little
         of the effect and none of the letters. */
      return new window.SplitText(el, {
        type: "lines,words",     /* never "chars" — see rule 1 */
        linesClass: "ln",
        wordsClass: "wd",
        autoSplit: true
      });
    }

    $$("[data-split='words']").forEach(function (el) {
      var scatter = el.hasAttribute("data-scatter");
      var split = splitLines(el);
      var targets = split ? split.lines : el.querySelectorAll(".wi");
      if (!targets || !targets.length) return;

      /* the hero title is the thesis in one motion: its words arrive
         from where chaos left them and take their place on the line */
      /* Unmasked, so the travel is shorter and carries a blur instead of
         relying on a hard edge to hide the start of the move. */
      var vars = scatter
        ? { yPercent: 55, rotate: function (i) { return (i % 2 ? 4 : -5); }, opacity: 0, filter: "blur(8px)", duration: 1.5, stagger: 0.08 }
        : { yPercent: 42, opacity: 0, filter: "blur(5px)", duration: 1.15, stagger: 0.09 };

      vars.ease = EASE;
      vars.clearProps = "all";

      var inHero = el.closest(".hero, .page-head");
      if (inHero) {
        /* above the fold: play once the boot screen has stood down,
           not on a scroll position the reader has not reached */
        vars.delay = 0.15;
        vars.paused = true;
        var tw = gsap.from(targets, vars);
        var kick = function () { tw.play(); };
        if (document.body.classList.contains("ready")) kick();
        else {
          var poll = setInterval(function () {
            if (document.body.classList.contains("ready")) { clearInterval(poll); kick(); }
          }, 80);
          setTimeout(function () { clearInterval(poll); kick(); }, 4000);
        }
      } else {
        vars.scrollTrigger = { trigger: el, start: "top 88%", once: true };
        gsap.from(targets, vars);
      }
    });

    /* ---------------------------------------------------------
       2 · REVEALS — batched, so a grid resolves item by item
       ScrollTrigger.batch groups whatever enters together in the
       same frame, which is what makes a four-card row look like
       one considered movement rather than four separate ones.
       --------------------------------------------------------- */
    var GROUPS = [
      { sel: ".fr", y: 40, stagger: 0.09 },
      { sel: ".step", y: 34, stagger: 0.1 },
      { sel: ".entry", y: 44, stagger: 0.12 },
      { sel: ".tool", y: 34, stagger: 0.07 },
      { sel: ".offer", y: 44, stagger: 0.1 },
      { sel: ".say", y: 40, stagger: 0.14 },
      { sel: ".flow__n", y: 30, stagger: 0.1 },
      { sel: ".guards li", y: 30, stagger: 0.09 },
      { sel: ".quals__list li", y: 26, stagger: 0.05 },
      { sel: ".hero__reads li", y: 26, stagger: 0.08 }
    ];
    var claimed = [];

    GROUPS.forEach(function (g) {
      var els = $$(g.sel);
      if (!els.length) return;
      claimed = claimed.concat(els);
      ST.batch(els, {
        start: "top 90%",
        once: true,
        onEnter: function (batch) {
          gsap.from(batch, {
            y: g.y, opacity: 0, filter: "blur(6px)",
            duration: 1.05, ease: EASE, stagger: g.stagger,
            clearProps: "all",
            /* the state classes and the counters stay in one place —
               system.js owns them, this only says when */
            onStart: function () { batch.forEach(function (el) { if (A.reveal) A.reveal(el); }); }
          });
        }
      });
    });

    /* anything marked for reveal that no group above claimed */
    $$("[data-reveal]").forEach(function (el) {
      if (claimed.indexOf(el) !== -1) return;
      if (el.closest(".hero") || el.closest(".page-head")) {
        gsap.from(el, { y: 26, opacity: 0, duration: 1, ease: EASE, delay: 0.35, clearProps: "all",
          onStart: function () { if (A.reveal) A.reveal(el); } });
        return;
      }
      gsap.from(el, {
        y: 30, opacity: 0, filter: "blur(6px)", duration: 1.05, ease: EASE, clearProps: "all",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onStart: function () { if (A.reveal) A.reveal(el); }
      });
    });

    /* ---------------------------------------------------------
       3 · SCRUBBED DETAIL
       Everything below is tied to the scrollbar rather than to a
       threshold, so it moves at exactly the reader's speed.
       --------------------------------------------------------- */

    /* the portrait drifts against the copy beside it */
    var fig = document.querySelector(".hero__fig");
    if (fig) {
      gsap.to(fig, {
        yPercent: -11, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      });
    }

    /* the spine of the AI page draws itself as the route is read */
    var flow = document.querySelector(".flow");
    if (flow) {
      gsap.set(flow, { "--draw": 0 });
      gsap.to(flow, {
        "--draw": 1, ease: "none",
        scrollTrigger: { trigger: flow, start: "top 72%", end: "bottom 62%", scrub: 0.5 }
      });
    }

    /* the big onward link leans toward its arrow as it comes into view */
    var onward = document.querySelector(".onward");
    if (onward) {
      gsap.from(onward.querySelector(".onward__t"), {
        yPercent: 30, opacity: 0, duration: 1.1, ease: EASE, clearProps: "all",
        scrollTrigger: { trigger: onward, start: "top 92%", once: true }
      });
    }

    /* ---------------------------------------------------------
       4 · KEEP MEASUREMENTS HONEST
       Arabic web fonts land late and taller than the fallback, so
       every trigger measured before they arrive is measured against
       the wrong layout.
       --------------------------------------------------------- */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ST.refresh(); });
    }
    window.addEventListener("load", function () { ST.refresh(); });

  } catch (err) {
    bail(err);
  }
})();
