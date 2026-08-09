/* =========================================================
   AL-ASHTAL® — behaviour
   Shared by index.html (ar) and en.html (en). No dependencies.

   Behaviour only: menu, scrollspy, disclosures, carousel, marquee,
   language memory and the contact form. Nothing here hides content.
   All animation lives in motion.js, which is loaded after this file.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     ⚙  CONTACT FORM — paste your Web3Forms access key here.
     Get one free at https://web3forms.com (enter your e-mail, they send
     the key). The key is safe to publish; your address is NOT in this
     file and never reaches the browser.
     --------------------------------------------------------- */
  var FORM_ACCESS_KEY = "PASTE-YOUR-WEB3FORMS-ACCESS-KEY-HERE";
  var FORM_ENDPOINT = "https://api.web3forms.com/submit";

  var doc = document;
  var body = doc.body;
  var root = doc.documentElement;
  var isRTL = root.dir === "rtl";
  var raf = window.requestAnimationFrame.bind(window);

  /* -------------------------------------------------------
     1. Sticky rail + scrollspy + menu
     ------------------------------------------------------- */
  var hero = doc.querySelector(".hero");
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll(".rail__nav a[href^='#']"));
  var sections = navLinks
    .map(function (a) { return doc.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  // cached so the scroll handler never reads layout
  var heroH = hero ? hero.offsetHeight : 400;
  window.addEventListener("resize", function () {
    heroH = hero ? hero.offsetHeight : 400;
    sectionTops = sections.map(function (s) { return s.offsetTop; });
  });
  var sectionTops = sections.map(function (s) { return s.offsetTop; });
  window.addEventListener("load", function () {
    heroH = hero ? hero.offsetHeight : 400;
    sectionTops = sections.map(function (s) { return s.offsetTop; });
  });

  var progress = doc.querySelector(".progress");

  function onScroll() {
    var y = window.scrollY;
    body.classList.toggle("rail-on", y > heroH * 0.62);

    if (progress) {
      // scrollHeight is read here only; it is not written, so no layout thrash
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty("--p", max > 0 ? Math.min(y / max, 1).toFixed(4) : "0");
    }

    var line = y + window.innerHeight * 0.4;
    var activeIdx = -1;
    for (var i = 0; i < sectionTops.length; i++) {
      if (sectionTops[i] <= line) activeIdx = i;
    }
    for (var j = 0; j < navLinks.length; j++) {
      navLinks[j].classList.toggle("is-active", j === activeIdx);
    }
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    raf(function () { onScroll(); ticking = false; });
  }, { passive: true });

  var burger = doc.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", String(open));
      body.style.overflow = open ? "hidden" : "";
    });
  }
  function closeMenu() {
    if (!body.classList.contains("nav-open")) return;
    body.classList.remove("nav-open");
    body.style.overflow = "";
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  navLinks.forEach(function (a) { a.addEventListener("click", closeMenu); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* -------------------------------------------------------
     2. Disclosures (FAQ + timeline "read more")
     ------------------------------------------------------- */
  function wireDisclosure(btnSel, itemSel) {
    Array.prototype.forEach.call(doc.querySelectorAll(btnSel), function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(itemSel);
        if (!item) return;
        var open = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
        var more = btn.getAttribute("data-more");
        var less = btn.getAttribute("data-less");
        if (more && less) btn.textContent = open ? less : more;
      });
    });
  }
  wireDisclosure(".faq-item__q", ".faq-item");

  /* -------------------------------------------------------
     2b. Journey chapters (tablist)
     Owns state and accessibility only. Every change fires a
     `chapter:change` event that motion.js upgrades to a GSAP
     transition; without it the CSS crossfade still runs.
     ------------------------------------------------------- */
  var chapters = doc.querySelector("[data-chapters]");
  if (chapters) {
    var tabs = Array.prototype.slice.call(chapters.querySelectorAll(".ch-tab"));
    var panels = Array.prototype.slice.call(chapters.querySelectorAll(".chapter"));
    var fill = chapters.querySelector(".chapters__line i");
    var counter = chapters.querySelector("[data-ch-now]");
    var navBtns = Array.prototype.slice.call(chapters.querySelectorAll("[data-ch-nav]"));
    var current = 0;

    var placeFill = function () {
      if (!fill) return;
      var tab = tabs[current];
      fill.style.setProperty("--ln-top", tab.offsetTop + "px");
      fill.style.setProperty("--ln-h", tab.offsetHeight + "px");
    };

    var show = function (next, focusTab) {
      next = Math.max(0, Math.min(next, panels.length - 1));
      if (next === current) return;
      var dir = next > current ? 1 : -1;
      var from = panels[current];
      var to = panels[next];

      tabs[current].classList.remove("is-active");
      tabs[current].setAttribute("aria-selected", "false");
      tabs[current].setAttribute("tabindex", "-1");
      from.setAttribute("aria-hidden", "true");

      tabs[next].classList.add("is-active");
      tabs[next].setAttribute("aria-selected", "true");
      tabs[next].setAttribute("tabindex", "0");
      to.setAttribute("aria-hidden", "false");

      current = next;
      placeFill();
      if (counter) counter.textContent = String(next + 1);
      navBtns.forEach(function (b) {
        var isPrev = b.getAttribute("data-ch-nav") === "prev";
        b.disabled = isPrev ? current === 0 : current === panels.length - 1;
      });
      if (focusTab) tabs[next].focus();
      // keep the active chip in view on the small-screen rail
      if (tabs[next].scrollIntoView) {
        tabs[next].scrollIntoView({ block: "nearest", inline: "nearest" });
      }

      chapters.dispatchEvent(new CustomEvent("chapter:change", {
        detail: { from: from, to: to, dir: dir, index: current }
      }));
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { show(i); });
    });

    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(current + (btn.getAttribute("data-ch-nav") === "next" ? 1 : -1));
      });
    });
    navBtns.forEach(function (b) {
      if (b.getAttribute("data-ch-nav") === "prev") b.disabled = true;
    });

    // arrow keys walk the tablist; the rail is vertical on desktop and
    // horizontal below it, so both axes are accepted
    chapters.querySelector(".chapters__rail").addEventListener("keydown", function (e) {
      var fwd = isRTL ? "ArrowLeft" : "ArrowRight";
      var back = isRTL ? "ArrowRight" : "ArrowLeft";
      if (e.key === "ArrowDown" || e.key === fwd) { e.preventDefault(); show(current + 1, true); }
      else if (e.key === "ArrowUp" || e.key === back) { e.preventDefault(); show(current - 1, true); }
      else if (e.key === "Home") { e.preventDefault(); show(0, true); }
      else if (e.key === "End") { e.preventDefault(); show(panels.length - 1, true); }
    });

    // swipe the stage on touch devices
    var stage = chapters.querySelector(".chapters__stage");
    var sx = 0, sy = 0, swiping = false;
    stage.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      swiping = true; sx = e.clientX; sy = e.clientY;
    });
    stage.addEventListener("pointerup", function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.clientX - sx;
      if (Math.abs(dx) < 45 || Math.abs(e.clientY - sy) > Math.abs(dx)) return;
      var forward = isRTL ? dx > 0 : dx < 0;
      show(current + (forward ? 1 : -1));
    });
    stage.addEventListener("pointercancel", function () { swiping = false; });

    window.addEventListener("resize", placeFill);
    window.addEventListener("load", placeFill);
    placeFill();
  }

  /* -------------------------------------------------------
     3. Experience carousel
     ------------------------------------------------------- */
  var track = doc.querySelector(".work__track");
  if (track) {
    var step = function () {
      var card = track.querySelector(".work-card");
      return card ? card.getBoundingClientRect().width + 18 : 320;
    };
    Array.prototype.forEach.call(doc.querySelectorAll("[data-work-nav]"), function (btn) {
      btn.addEventListener("click", function () {
        var dir = btn.getAttribute("data-work-nav") === "next" ? 1 : -1;
        if (isRTL) dir *= -1;
        track.scrollBy({ left: dir * step(), behavior: "smooth" });
      });
    });

    var down = false, startX = 0, startLeft = 0, moved = 0;
    track.addEventListener("pointerdown", function (e) {
      down = true; moved = 0;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.classList.add("dragging");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      track.scrollLeft = startLeft - dx;
    });
    var release = function (e) {
      if (!down) return;
      down = false;
      track.classList.remove("dragging");
      try { track.releasePointerCapture(e.pointerId); } catch (err) { /* no-op */ }
    };
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
    track.addEventListener("click", function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* -------------------------------------------------------
     4. Marquee — duplicate once for a seamless loop
     ------------------------------------------------------- */
  Array.prototype.forEach.call(doc.querySelectorAll(".marq__track"), function (t) {
    t.innerHTML += t.innerHTML;
  });

  /* -------------------------------------------------------
     5. Remember language choice
     ------------------------------------------------------- */
  Array.prototype.forEach.call(doc.querySelectorAll("[data-lang-set]"), function (a) {
    a.addEventListener("click", function () {
      try { localStorage.setItem("ashtal-lang", a.getAttribute("data-lang-set")); } catch (e) { /* no-op */ }
    });
  });

  /* -------------------------------------------------------
     5b. Latest posts teaser on the home page
     Reads the same posts.json the studio writes. The articles
     themselves are static HTML — this only saves the reader a click,
     so nothing here matters to search engines.
     ------------------------------------------------------- */
  var teaser = doc.querySelector("[data-latest-posts]");
  if (teaser) {
    var emptyBox = doc.querySelector("[data-posts-empty]");
    var pageLang = root.lang === "ar" ? "ar" : "en";
    var readOf = function (n) {
      if (pageLang === "en") return n + " min read";
      if (n === 1) return "دقيقة قراءة";
      if (n === 2) return "دقيقتا قراءة";
      return n + (n <= 10 ? " دقائق قراءة" : " دقيقة قراءة");
    };
    var moreLabel = pageLang === "ar" ? "اقرأ المقال" : "Read the article";

    fetch("assets/data/posts.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.posts)) return;
        var list = data.posts
          .filter(function (p) { return p[pageLang] && p[pageLang].title; })
          .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })
          .slice(0, 3);
        if (!list.length) return;

        teaser.innerHTML = list.map(function (p) {
          var d = p[pageLang];
          var href = "blog/" + p.slug + (pageLang === "en" ? "-en" : "") + ".html";
          var wordCount = String(d.body || "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).length;
          var mins = Math.max(1, Math.round(wordCount / 200));
          var media = p.cover
            ? '<div class="post-card__media"><img src="' + p.cover + '" alt="" loading="lazy"></div>'
            : "";
          return '<a class="post-card" href="' + href + '">' + media +
            '<div class="post-card__body">' +
              '<div class="post-card__meta"><time datetime="' + p.date + '">' + p.date + "</time></div>" +
              "<h2>" + d.title + "</h2>" +
              "<p>" + (d.excerpt || "") + "</p>" +
              '<span class="post-card__meta">' + readOf(mins) + "</span>" +
              '<span class="post-card__more">' + moreLabel + "</span>" +
            "</div></a>";
        }).join("");

        teaser.hidden = false;
        if (emptyBox) emptyBox.hidden = true;
        teaser.dispatchEvent(new CustomEvent("posts:rendered", { bubbles: true }));
      })
      .catch(function () { /* not published yet — the empty state stays */ });
  }

  /* -------------------------------------------------------
     6. Contact form — relays the message without exposing an address
     ------------------------------------------------------- */
  var form = doc.querySelector(".form");
  if (form) {
    var msgBox = form.querySelector(".form__msg");
    var sendBtn = form.querySelector(".form__send");
    var fields = Array.prototype.slice.call(form.querySelectorAll("[data-field]"));
    var t = function (key) { return form.getAttribute("data-" + key) || ""; };

    var showMsg = function (kind, text) {
      if (!msgBox) return;
      msgBox.className = "form__msg form__msg--" + kind + " show";
      msgBox.innerHTML =
        (kind === "ok"
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 1 21h22L12 2Zm0 6 1 7h-2l1-7Zm0 9.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"/></svg>') +
        "<span>" + text + "</span>";
    };

    var validate = function (wrap) {
      var input = wrap.querySelector("input, textarea");
      if (!input) return true;
      var ok = input.checkValidity() && input.value.trim() !== "";
      wrap.classList.toggle("is-bad", !ok);
      return ok;
    };

    fields.forEach(function (wrap) {
      var input = wrap.querySelector("input, textarea");
      if (!input) return;
      input.addEventListener("blur", function () { validate(wrap); });
      input.addEventListener("input", function () {
        if (wrap.classList.contains("is-bad")) validate(wrap);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var allOk = fields.map(validate).every(Boolean);
      if (!allOk) {
        showMsg("bad", t("msg-invalid"));
        var firstBad = form.querySelector(".is-bad input, .is-bad textarea");
        if (firstBad) firstBad.focus();
        return;
      }

      // honeypot: a bot filled the hidden field — pretend it worked
      var hp = form.querySelector("[name='botcheck']");
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
          if (out && out.success) {
            showMsg("ok", t("msg-ok"));
            form.reset();
          } else {
            showMsg("bad", (out && out.message) || t("msg-fail"));
          }
        })
        .catch(function () { showMsg("bad", t("msg-fail")); })
        .then(function () {
          form.classList.remove("is-sending");
          if (sendBtn) sendBtn.disabled = false;
        });
    });
  }

  /* -------------------------------------------------------
     7. Boot
     ------------------------------------------------------- */
  onScroll();
})();
