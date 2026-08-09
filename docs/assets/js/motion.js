(function () {
"use strict";
var A = window.ASHTAL || {};
var root = document.documentElement;
var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (calm || !window.gsap || !window.ScrollTrigger) return;
var gsap = window.gsap;
var ST = window.ScrollTrigger;
var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
function bail(err) {
try {
root.classList.remove("gsap");
gsap.set("[data-reveal], [data-split='words'], .hero__fig, .plot", { clearProps: "all" });
$$("[data-reveal], .fr, .step, .entry, .tool, .offer, .say, .flow__n, .guards li").forEach(function (el) {
if (A.reveal) A.reveal(el);
});
} catch (e) {  }
if (window.console) console.warn("[motion] disabled:", err && err.message);
}
try {
gsap.registerPlugin(ST);
var HAS_SPLIT = !!window.SplitText;
if (HAS_SPLIT) gsap.registerPlugin(window.SplitText);
if (window.Flip) gsap.registerPlugin(window.Flip);
var EASE = "expo.out";
if (window.Lenis && A.lenis) {
A.lenis.on("scroll", ST.update);
gsap.ticker.lagSmoothing(0);
}
function splitLines(el) {
if (!HAS_SPLIT) {
if (A.splitWords && !el.classList.contains("split")) A.splitWords(el);
return null;
}
return new window.SplitText(el, {
type: "lines,words",
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
var vars = scatter
? { yPercent: 55, rotate: function (i) { return (i % 2 ? 4 : -5); }, opacity: 0, filter: "blur(8px)", duration: 1.5, stagger: 0.08 }
: { yPercent: 42, opacity: 0, filter: "blur(5px)", duration: 1.15, stagger: 0.09 };
vars.ease = EASE;
vars.clearProps = "all";
var inHero = el.closest(".hero, .page-head");
if (inHero) {
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
onStart: function () { batch.forEach(function (el) { if (A.reveal) A.reveal(el); }); }
});
}
});
});
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
var fig = document.querySelector(".hero__fig");
if (fig) {
gsap.to(fig, {
yPercent: -11, ease: "none",
scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
});
}
var flow = document.querySelector(".flow");
if (flow) {
gsap.set(flow, { "--draw": 0 });
gsap.to(flow, {
"--draw": 1, ease: "none",
scrollTrigger: { trigger: flow, start: "top 72%", end: "bottom 62%", scrub: 0.5 }
});
}
var onward = document.querySelector(".onward");
if (onward) {
gsap.from(onward.querySelector(".onward__t"), {
yPercent: 30, opacity: 0, duration: 1.1, ease: EASE, clearProps: "all",
scrollTrigger: { trigger: onward, start: "top 92%", once: true }
});
}
if (document.fonts && document.fonts.ready) {
document.fonts.ready.then(function () { ST.refresh(); });
}
window.addEventListener("load", function () { ST.refresh(); });
} catch (err) {
bail(err);
}
})();