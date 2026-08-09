/* =============================================================
   الأشطل® — THE FIELD
   The thesis, drawn.

   Every fragment on this canvas holds two addresses: where chaos
   left it, and where it belongs. `order` decides which one is true.
   At 0 the viewport is debris — crooked, uneven, drifting, flinching
   away from the pointer. At 1 it is a drafting grid — plumb lines,
   identical ticks, dead still. The reader moves it between the two
   by doing nothing but reading.

   Two rules this file obeys:
   · it reads `order`, it never writes it — system.js owns that number
   · when the system is settled it stops drawing entirely. Stillness
     is the payoff of the story AND the reason this costs nothing.

   Blending is `difference` against white, so the field never needs to
   know whether the paper or the void is underneath it: over light it
   resolves dark, over dark it resolves light. That matters because the
   dark plate in section 03 sweeps *across* a fixed canvas — any flag
   we set would be right at the top of the screen and wrong at the
   bottom for the whole length of the handover.
   ============================================================= */
(function () {
  "use strict";

  var cv = document.querySelector(".plot");
  if (!cv || !cv.getContext) return;

  var ctx = cv.getContext("2d");
  if (!ctx) return;

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* the same hash system.js uses — the disorder is composed, not random,
     so the field looks identical on every visit and every machine */
  var seeded = function (i) {
    var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  var W = 0, H = 0, dpr = 1;
  var cols = 0, rows = 0, cw = 0, ch = 0, mx = 0, my = 0;
  var bits = [];
  var px = -9999, py = -9999, pointerLive = false;

  /* ---------- layout: build both addresses for every fragment ---------- */
  function build() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* The grid is derived from the viewport, not fixed, so the ordered
       state is always proportioned to the screen it resolves on.

       Kept deliberately coarse. A dense field reads as noise behind the
       copy at the chaos end and as graph paper at the order end; sparse,
       it reads as debris and then as a drafting grid — which is the whole
       point. Density is the first thing to lower, never the last. */
    cols = clamp(Math.round(W / 178), 3, 9);
    rows = clamp(Math.round(H / 108), 4, 10);

    var gut = clamp(W * 0.05, 20, 90);
    cw = (W - gut * 2) / cols;
    ch = (H - gut * 1.2) / rows;
    mx = gut;
    my = gut * 0.6;

    bits.length = 0;
    var i = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        bits.push({
          /* where it belongs */
          gx: mx + (c + 0.5) * cw,
          gy: my + (r + 0.5) * ch,
          gl: cw * 0.54,
          /* where chaos left it */
          cx: seeded(i * 3 + 1) * W,
          cy: seeded(i * 3 + 2) * H,
          ca: (seeded(i * 3 + 5) - 0.5) * Math.PI * 1.7,
          cl: 10 + seeded(i * 5 + 7) * cw * 0.62,
          co: 0.03 + seeded(i * 7 + 11) * 0.15,
          /* how it drifts while it is still loose */
          ph: seeded(i * 11 + 5) * Math.PI * 2,
          sp: 0.22 + seeded(i * 13 + 3) * 0.7,
          am: 5 + seeded(i * 17 + 9) * 26
        });
        i++;
      }
    }
  }

  /* ---------- draw ---------- */
  var drawnOrder = -1;

  function draw(t) {
    var A = window.ASHTAL || { order: 0 };
    var o = clamp(A.order || 0, 0, 1);
    /* eased so the middle of the page carries most of the visible sorting,
       and the last stretch is spent settling rather than travelling */
    var p = o < 0.5 ? 4 * o * o * o : 1 - Math.pow(-2 * o + 2, 3) / 2;
    var chaos = 1 - p;
    drawnOrder = o;

    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;

    /* the plumb lines — nothing at chaos, a full drafting grid at order */
    if (p > 0.02) {
      ctx.globalAlpha = 0.05 * p;
      ctx.beginPath();
      for (var c = 0; c <= cols; c++) {
        var x = Math.round(mx + c * cw) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      ctx.stroke();
    }

    /* the fragments */
    for (var i = 0; i < bits.length; i++) {
      var b = bits[i];

      /* drift dies with chaos — at order the field does not breathe */
      var dr = chaos * b.am;
      var bx = b.cx + Math.cos(t * b.sp + b.ph) * dr;
      var by = b.cy + Math.sin(t * b.sp * 0.78 + b.ph * 1.4) * dr * 0.62;

      var x = lerp(bx, b.gx, p);
      var y = lerp(by, b.gy, p);
      var a = lerp(b.ca, 0, p);
      var L = lerp(b.cl, b.gl, p);
      var al = lerp(b.co, 0.062, p);

      /* loose fragments flinch away from the pointer; settled ones do not.
         A system that still reacts to whoever walks past it is not settled. */
      if (pointerLive && chaos > 0.03) {
        var ddx = x - px, ddy = y - py;
        var d2 = ddx * ddx + ddy * ddy;
        if (d2 < 26000 && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var push = (1 - d / 161) * 34 * chaos;
          x += (ddx / d) * push;
          y += (ddy / d) * push;
          al += (1 - d / 161) * 0.16 * chaos;
        }
      }

      var hx = Math.cos(a) * L * 0.5;
      var hy = Math.sin(a) * L * 0.5;

      ctx.globalAlpha = al;
      ctx.beginPath();
      ctx.moveTo(x - hx, y - hy);
      ctx.lineTo(x + hx, y + hy);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /* ---------- run ---------- */
  build();

  if (calm) {
    /* no motion at all: render the settled grid once and leave it there */
    window.ASHTAL = window.ASHTAL || {};
    var still = function () {
      var keep = window.ASHTAL.order;
      window.ASHTAL.order = 1;
      draw(0);
      window.ASHTAL.order = keep;
    };
    still();
    window.addEventListener("resize", function () { build(); still(); });
    return;
  }

  if (fine) {
    window.addEventListener("pointermove", function (e) {
      px = e.clientX; py = e.clientY; pointerLive = true;
    }, { passive: true });
    document.addEventListener("pointerleave", function () { pointerLive = false; });
  }

  var t0 = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;

    var A = window.ASHTAL || { order: 0 };
    var o = clamp(A.order || 0, 0, 1);
    /* Once the field is sorted it is genuinely finished: no drift left to
       animate, so we stop clearing and repainting a full viewport every
       frame and only wake up if the reader scrolls back out of order. */
    if (o > 0.995 && Math.abs(o - drawnOrder) < 0.002) return;

    draw((now - t0) / 1000);
  })(t0);

  var rz;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { build(); drawnOrder = -1; }, 160);
  });
})();
