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
var seeded = function (i) {
var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
return x - Math.floor(x);
};
var W = 0, H = 0, dpr = 1;
var cols = 0, rows = 0, cw = 0, ch = 0, mx = 0, my = 0;
var bits = [];
var px = -9999, py = -9999, pointerLive = false;
function build() {
W = window.innerWidth;
H = window.innerHeight;
dpr = Math.min(window.devicePixelRatio || 1, 2);
cv.width = Math.round(W * dpr);
cv.height = Math.round(H * dpr);
cv.style.width = W + "px";
cv.style.height = H + "px";
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
gx: mx + (c + 0.5) * cw,
gy: my + (r + 0.5) * ch,
gl: cw * 0.54,
cx: seeded(i * 3 + 1) * W,
cy: seeded(i * 3 + 2) * H,
ca: (seeded(i * 3 + 5) - 0.5) * Math.PI * 1.7,
cl: 10 + seeded(i * 5 + 7) * cw * 0.62,
co: 0.03 + seeded(i * 7 + 11) * 0.15,
ph: seeded(i * 11 + 5) * Math.PI * 2,
sp: 0.22 + seeded(i * 13 + 3) * 0.7,
am: 5 + seeded(i * 17 + 9) * 26
});
i++;
}
}
}
var drawnOrder = -1;
function draw(t) {
var A = window.ASHTAL || { order: 0 };
var o = clamp(A.order || 0, 0, 1);
var p = o < 0.5 ? 4 * o * o * o : 1 - Math.pow(-2 * o + 2, 3) / 2;
var chaos = 1 - p;
drawnOrder = o;
ctx.clearRect(0, 0, W, H);
ctx.lineCap = "butt";
ctx.strokeStyle = "#fff";
ctx.lineWidth = 1;
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
for (var i = 0; i < bits.length; i++) {
var b = bits[i];
var dr = chaos * b.am;
var bx = b.cx + Math.cos(t * b.sp + b.ph) * dr;
var by = b.cy + Math.sin(t * b.sp * 0.78 + b.ph * 1.4) * dr * 0.62;
var x = lerp(bx, b.gx, p);
var y = lerp(by, b.gy, p);
var a = lerp(b.ca, 0, p);
var L = lerp(b.cl, b.gl, p);
var al = lerp(b.co, 0.062, p);
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
build();
if (calm) {
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
if (o > 0.995 && Math.abs(o - drawnOrder) < 0.002) return;
draw((now - t0) / 1000);
})(t0);
var rz;
window.addEventListener("resize", function () {
clearTimeout(rz);
rz = setTimeout(function () { build(); drawnOrder = -1; }, 160);
});
})();