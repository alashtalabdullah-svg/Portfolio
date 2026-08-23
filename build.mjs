/* =============================================================
   الأشطل® — the builder

   Reads src/, writes dist/. Nothing else. No dependencies, no
   framework, no runtime: what lands in dist/ is plain static HTML
   that a browser can open off a USB stick.

   Why this exists at all: four pages in two languages is twelve
   files that share a header, a section index, a meter, an icon
   sprite and about thirty SEO tags each. Maintaining that by hand
   is not "simpler" — it is the same edit twelve times, and the
   twelfth one is the one you forget.

       node build.mjs           build once into dist/
       node build.mjs --serve   build, then serve dist/ on :4444

   Templating is deliberately tiny:
       {{key}}      escaped value
       {{{key}}}    raw HTML
       {{> name}}   include src/partials/name.html
   ============================================================= */

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
/* `docs/` and not `dist/`: GitHub Pages can serve a subfolder of the
   default branch, and `/docs` is the only name it accepts. That makes
   one push both the source commit and the deploy, with no CI and no
   second branch to keep in step. */
const DIST = join(ROOT, "docs");

const site = JSON.parse(readFileSync(join(SRC, "site.json"), "utf8"));
const read = (p) => readFileSync(join(SRC, p), "utf8");
const today = new Date().toISOString().slice(0, 10);

/* ---------- helpers ---------- */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* dotted lookup: {{ui.skip}} reaches ctx.ui.skip */
const dig = (ctx, path) =>
  path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);

function render(tpl, ctx, depth = 0) {
  if (depth > 6) throw new Error("partial recursion too deep");
  /* partials first, so an included file can use the same context */
  tpl = tpl.replace(/\{\{>\s*([\w./-]+)\s*\}\}/g, (_, name) =>
    render(read(`partials/${name}.html`), ctx, depth + 1)
  );
  tpl = tpl.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (m, k) => {
    const v = dig(ctx, k);
    return v == null ? "" : String(v);
  });
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
    const v = dig(ctx, k);
    if (v == null) {
      console.warn(`  ! unresolved token {{${k}}}`);
      return "";
    }
    return esc(v);
  });
}

/* Absolute URL for a page id in a language. Directory-style URLs
   (`/record/`) so every static host resolves them without config
   and without a visible .html extension. */
const pathFor = (langKey, page) => {
  const base = site.langs[langKey].base;           // "/" or "/en/"
  return page.out ? `${base}${page.out}/` : base;
};
const urlFor = (langKey, page) => site.origin + pathFor(langKey, page);

/* ---------- per-page JSON-LD ----------
   Google reads these to build the knowledge panel and the rich
   result. Every block below describes something that is actually
   on the page — schema that describes absent content is the
   fastest way to lose the rich result entirely. */

function jsonLd(langKey, page, L) {
  const url = urlFor(langKey, page);
  const isAr = langKey === "ar";
  const name = site.author[langKey];

  const person = {
    "@type": "Person",
    "@id": site.origin + "/#person",
    name,
    alternateName: site.author[isAr ? "en" : "ar"],
    jobTitle: site.role[langKey],
    description: page[langKey].desc,
    /* There is an established "Abdullah Saleh al-Ashtal" in Google's
       knowledge graph — a Yemeni diplomat with a Wikipedia article — so
       the surname alone resolves to someone else. This says who THIS
       person is precisely enough that the two cannot be conflated. It
       makes no claim about the other entity: disambiguation works by
       being specific about yourself, not by denying someone else. */
    disambiguatingDescription: site.disambiguation[langKey],
    hasOccupation: {
      "@type": "Occupation",
      name: site.role[langKey],
      occupationLocation: { "@type": "City", name: site.city[langKey] },
      skills: isAr
        ? "إدارة العمليات، ضبط الجودة، تحسين الإجراءات، أتمتة سير العمل بوكلاء الذكاء الاصطناعي، إدارة سلاسل الإمداد"
        : "Operations management, quality control, process improvement, AI-agent workflow automation, supply chain management"
    },
    url: site.origin + site.langs[langKey].base,
    image: site.origin + site.image,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.city[langKey],
      addressRegion: isAr ? "المنطقة الشرقية" : "Eastern Province",
      addressCountry: "SA"
    },
    worksFor: { "@type": "Organization", name: site.employer[langKey] },
    alumniOf: { "@type": "CollegeOrUniversity", name: site.university[langKey] },
    knowsLanguage: ["ar", "en"],
    /* the named tools belong here too: "Zapier" and "Salesforce" are
       queries people actually type, and knowsAbout is where an entity
       claims them */
    knowsAbout: (isAr
      ? ["إدارة العمليات", "ضبط الجودة", "تحسين الإجراءات", "أتمتة سير العمل", "وكلاء الذكاء الاصطناعي", "إدارة سلاسل الإمداد", "الرقابة المالية", "قيادة الفرق"]
      : ["Operations management", "Quality control", "Process improvement", "Workflow automation", "AI agents", "Supply chain management", "Financial control", "Team leadership"]
    ).concat(["Claude", "Claude Code", "Manus", "Gemini", "Zapier", "Salesforce"]),
    /* `hasCredential` is deliberately NOT emitted. The certificate list was
       taken off the site at the owner's request, and structured data that
       describes content no page shows is a mismatch Google treats as a
       quality problem — the entity would be claiming credentials a crawler
       cannot find. The data is still in site.json if it ever returns. */
    sameAs: site.social
  };

  /* What he sells, in Google's vocabulary. Without `makesOffer` the
     Person entity says who he is but never what he can be hired for,
     which is the half that service queries actually match against. */
  person.makesOffer = site.services[langKey].map(([n, d]) => ({
    "@type": "Offer",
    itemOffered: {
      "@type": "Service",
      name: n,
      description: d,
      serviceType: n,
      areaServed: { "@type": "Country", name: site.country[langKey] }
    }
  }));

  const blocks = [
    {
      "@context": "https://schema.org",
      "@type": page.id === "home" ? "ProfilePage" : "WebPage",
      "@id": url + "#page",
      url,
      name: page[langKey].title,
      description: page[langKey].desc,
      inLanguage: langKey,
      /* the site node is declared in full here rather than referenced by
         id alone — a dangling @id is a node Google cannot resolve */
      isPartOf: {
        "@type": "WebSite",
        "@id": site.origin + "/#site",
        name,
        url: site.origin + "/",
        inLanguage: ["ar", "en"],
        publisher: { "@id": site.origin + "/#person" }
      },
      about: { "@id": site.origin + "/#person" },
      mainEntity: { "@id": site.origin + "/#person" },
      dateModified: today,
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: site.origin + site.ogImage,
        width: 1200,
        height: 630
      }
    },
    { "@context": "https://schema.org", ...person }
  ];

  /* a breadcrumb on every page but the root — it is what turns the
     grey URL line in a Google result into a readable path */
  if (page.id !== "home") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: L.ui.crumbHome, item: site.origin + site.langs[langKey].base },
        { "@type": "ListItem", position: 2, name: page[langKey].nav, item: url }
      ]
    });
  }

  if (page.id === "contact") {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: langKey,
      mainEntity: site.faq[langKey].map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a }
      }))
    });
    blocks.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: page[langKey].h1,
      itemListElement: site.services[langKey].map(([n, d], i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Service",
          name: n,
          description: d,
          provider: { "@id": site.origin + "/#person" },
          areaServed: { "@type": "Country", name: site.country[langKey] }
        }
      }))
    });
  }

  return blocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join("\n");
}

/* ---------- the section index, shared by the rail and the sheet ---------- */

function navList(langKey, current) {
  return site.pages
    .map((p) => {
      const on = p.id === current ? ' aria-current="page"' : "";
      return `<li><a href="${pathFor(langKey, p)}"${on}><b class="mono">${p.n}</b><span>${esc(p[langKey].nav)}</span></a></li>`;
    })
    .join("\n    ");
}

/* Every page links to the next one by name. Orphan pages are the
   most common own-goal in a multi-page site: a page nothing links
   to is a page the crawler reaches late and ranks low. */
function nextLink(langKey, page, L) {
  const i = site.pages.findIndex((p) => p.id === page.id);
  const nxt = site.pages[(i + 1) % site.pages.length];
  return `<a class="onward" href="${pathFor(langKey, nxt)}" data-cue="${esc(L.ui.next)}">
      <span class="onward__lbl mono">${esc(L.ui.next)} <i>—</i> ${nxt.n}</span>
      <span class="onward__t">${esc(nxt[langKey].nav)}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg>
    </a>`;
}

/* ---------- build ---------- */

const layout = read("layout.html");
const written = [];
/* pages are rendered first and written after the squeeze helpers exist,
   so the shipped HTML goes out stripped in one pass */
const pending = [];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const page of site.pages) {
  for (const langKey of Object.keys(site.langs)) {
    const L = site.langs[langKey];
    const other = langKey === "ar" ? "en" : "ar";
    const meta = page[langKey];

    const idx = site.pages.findIndex((p) => p.id === page.id);

    /* The hero portrait is the largest element the home page paints, so
       it is the LCP candidate. Preloading it on that page only — and
       nowhere else — is the single biggest Core Web Vitals win here. */
    const preload =
      page.id === "home"
        ? `<link rel="preload" as="image" href="/assets/img/abdullah-cutout.webp" type="image/webp" fetchpriority="high">`
        : "";

    const ctx = {
      ...site,
      ...L,
      lang: L.code,
      pageId: page.id,
      n: page.n,
      pageIndex: idx,
      pageCount: site.pages.length,
      pc: langKey === "ar" ? "٪" : "%",
      preload,
      /* Home is the only page whose last section is still paper, so it is
         the only one that needs the dark plate to sweep in beneath the
         footer. On the other three the footer simply continues a dark
         section, and a plate there would show paper down both margins. */
      footClass: page.id === "home" ? "takeover" : "",
      title: meta.title,
      desc: meta.desc,
      ogDesc: meta.og,
      h1: meta.h1,
      navLabel: meta.nav,
      canonical: urlFor(langKey, page),
      altAr: urlFor("ar", page),
      altEn: urlFor("en", page),
      /* x-default names the version served to an unmatched locale — it has
         to follow whichever language owns the root, or Google is told the
         fallback lives somewhere the root does not point. */
      xdefault: urlFor(site.primary, page),
      otherHref: pathFor(other, page),
      otherCode: site.langs[other].code,
      otherSwatch: site.langs[other].swatch,
      homeHref: site.langs[langKey].base,
      ogImageAbs: site.origin + site.ogImage,
      author: site.author[langKey],
      role: site.role[langKey],
      city: site.city[langKey],
      country: site.country[langKey],
      year: new Date().getFullYear(),
      body: read(`pages/${page.id}.${langKey}.html`),
      navList: navList(langKey, page.id),
      onward: nextLink(langKey, page, L),
      jsonld: jsonLd(langKey, page, L),
      /* A visible trail that matches the BreadcrumbList in the structured
         data. Google cross-checks the two, and the one on the page is what
         turns the grey URL line in a result into a readable path. */
      crumbs:
        page.id === "home"
          ? ""
          : `<nav class="crumbs" aria-label="${esc(L.ui.crumbHome)}">
  <ol>
    <li><a href="${L.base}">${esc(L.ui.crumbHome)}</a></li>
    <li aria-current="page">${esc(meta.nav)}</li>
  </ol>
</nav>`
    };

    /* derived from the language's own `base`, never hard-coded: flipping
       which language owns the root is then a one-line change in site.json
       and not a hunt through the builder */
    pending.push({
      dir: join(DIST, L.base.replace(/^\/|\/$/g, ""), page.out),
      html: render(layout, ctx)
    });
    written.push(pathFor(langKey, page));
  }
}

/* ---------- assets ---------- */
cpSync(join(ROOT, "assets"), join(DIST, "assets"), { recursive: true });

/* =============================================================
   STRIPPING THE SHIPPED COPY

   Read this before expecting more of it than it gives.

   Code cannot be hidden from a browser. The browser has to receive the
   HTML, the CSS and the JavaScript in order to draw anything at all, and
   DevTools shows exactly what the browser received. Blocking right-click,
   trapping F12 or detecting DevTools does not change that — every one of
   those is defeated by View Source, by disabling JavaScript, by the
   network tab, or by `curl`. They only ever succeed at annoying real
   visitors and breaking keyboard access.

   What is real: the *reasoning* is worth more than the syntax, and the
   reasoning lives in the comments. This file keeps every comment in
   `src/` and `assets/` — where they are meant to be read by whoever
   maintains this — and ships a copy with them removed.

   The stripping is comment-only and string-aware. It will not touch a
   `//` inside "https://…", and it will not collapse a newline that
   JavaScript needs. Correctness first; the site working is worth more
   than a few saved bytes.
   ============================================================= */

/* Walk the source once, tracking whether we are inside a string, a
   template literal, a regex or a comment. A naive regex-based stripper
   eats the `//` in "https://api.web3forms.com/submit" and takes the
   contact form down with it. */
function stripComments(src, kind) {
  let out = "";
  let i = 0;
  const n = src.length;
  const js = kind === "js";
  while (i < n) {
    const c = src[i], d = src[i + 1];

    if (c === "/" && d === "*") {                 // block comment
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (js && c === "/" && d === "/") {           // line comment
      const end = src.indexOf("\n", i);
      i = end === -1 ? n : end;                   // keep the newline: ASI
      continue;
    }
    if (c === '"' || c === "'" || (js && c === "`")) {
      const q = c;
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === q) { j++; break; }
        j++;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const squeezeCss = (s) =>
  stripComments(s, "css")
    .replace(/\s*\n\s*/g, "")   /* CSS has no line-sensitive syntax at all */
    .replace(/\s{2,}/g, " ")
    .trim();

const squeezeJs = (s) =>
  stripComments(s, "js")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)            /* newlines stay — automatic semicolons need them */
    .join("\n");

/* HTML: comments out, per-line indentation out, newlines kept. A newline
   between two inline elements renders as one space, and collapsing it
   away would join Arabic words that must stay apart. */
const squeezeHtml = (s) =>
  s
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

for (const p of pending) {
  mkdirSync(p.dir, { recursive: true });
  writeFileSync(join(p.dir, "index.html"), squeezeHtml(p.html), "utf8");
}

let saved = 0;
for (const [dir, fn] of [["css", squeezeCss], ["js", squeezeJs]]) {
  const d = join(DIST, "assets", dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const before = readFileSync(p, "utf8");
    const after = fn(before);
    writeFileSync(p, after, "utf8");
    saved += before.length - after.length;
  }
}

/* ---------- sitemap ----------
   Every URL carries the full alternate set including itself; Google
   treats a one-sided hreflang as unconfirmed and quietly ignores it. */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${site.pages
  .flatMap((p) =>
    Object.keys(site.langs).map(
      (l) => `  <url>
    <loc>${urlFor(l, p)}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${urlFor("ar", p)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${urlFor("en", p)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(site.primary, p)}"/>
    <image:image>
      <image:loc>${site.origin + site.ogImage}</image:loc>
      <image:title>${esc(site.author[l])} — ${esc(site.role[l])}</image:title>
    </image:image>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.id === "home" ? (l === site.primary ? "1.0" : "0.9") : "0.8"}</priority>
  </url>`
    )
  )
  .join("\n")}
</urlset>
`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap, "utf8");

writeFileSync(
  join(DIST, "robots.txt"),
  `# Everything published here is open to crawlers — nothing is disallowed.
# A Disallow line publishes the address it is trying to hide to anyone
# who reads this file, so unlinked material is simply left out instead.

User-agent: *
Allow: /

Sitemap: ${site.origin}/sitemap.xml
`,
  "utf8"
);

/* ---------- 404 ----------
   Arabic shell, both languages inside: a visitor who mistypes a URL
   has not told us which language they wanted. */
writeFileSync(
  join(DIST, "404.html"),
  render(read("404.html"), {
    ...site,
    ...site.langs[site.primary],
    lang: site.primary,
    pageId: "e404",
    year: new Date().getFullYear()
  }),
  "utf8"
);

/* ---------- GitHub Pages ----------
   CNAME must live in the published output, not just in the repo settings:
   a deploy that ships without it drops the custom domain back to
   github.io and every indexed URL 404s until someone notices.

   .nojekyll turns off the Jekyll pass Pages runs by default, which would
   otherwise silently refuse to serve anything whose name starts with an
   underscore — `_headers` here, and any future partial. */
writeFileSync(join(DIST, "CNAME"), "alashtalabdullah.info\n", "utf8");
writeFileSync(join(DIST, ".nojekyll"), "", "utf8");

/* ---------- IndexNow ----------
   A crawler finds a change when it next happens to look. IndexNow
   inverts that: the key file below proves ownership of the host, and
   `node build.mjs --ping` tells Bing and Yandex the moment something
   changes rather than waiting to be discovered.

   Worth being straight about the limit: Google does not participate in
   IndexNow. For Google, the sitemap plus Search Console is still the
   route. This covers the rest, and it costs one file and one request. */
writeFileSync(join(DIST, site.indexNowKey + ".txt"), site.indexNowKey, "utf8");

/* ---------- llms.txt ----------
   Answer engines increasingly read a site before a person does, and they
   reward a plain-text map of what is where. This is not a ranking signal
   in the classic sense; it is discoverability in the channel that is
   replacing the classic sense. */
writeFileSync(
  join(DIST, "llms.txt"),
  `# ${site.author.en} (${site.author.ar})

> ${site.role.en} based in ${site.city.en}, ${site.country.en}. Five years across
> import coordination, operations leadership, administrative supervision and
> quality control, plus practical deployment of AI agents and workflow
> automation (Claude Code, Manus, Gemini) with human review at every output.
> The site is bilingual: English at the root, Arabic under /ar/.

## Pages (English)
${site.pages.map((p) => `- [${p.en.nav}](${urlFor("en", p)}): ${p.en.desc}`).join("\n")}

## Pages (Arabic)
${site.pages.map((p) => `- [${p.ar.nav}](${urlFor("ar", p)}): ${p.ar.desc}`).join("\n")}

## Documents
- [Curriculum vitae, Arabic](${site.origin}/assets/cv/cv-ar.pdf)
- [Curriculum vitae, English](${site.origin}/assets/cv/cv-en.pdf)

## Contact
- ${urlFor("en", site.pages.find((p) => p.id === "contact"))} (English) · ${urlFor("ar", site.pages.find((p) => p.id === "contact"))} (Arabic)
- LinkedIn: ${site.social[0]}
`,
  "utf8"
);

/* ---------- host configuration ----------
   Deployment is Vercel now, and Vercel reads `vercel.json` from the REPO
   root, not from the output directory — so routing, redirects and cache
   headers all live in the committed file at the top of this project.
   Nothing host-specific is emitted here any more: the Netlify and Apache
   hedges only littered a public directory with config that no server on
   this domain would ever read.

   CNAME stays, below: GitHub Pages keeps serving the domain until DNS
   moves, and a deploy without it would drop the custom domain. */

/* ---------- legacy redirects ----------
   English used to live at /en.html, and then under /en/. Both addresses
   are vacated now that English owns the root, and both may sit in a
   bookmark, a history or an index.

   `vercel.json` answers these with a real 301, which is the better
   answer — but only on Vercel. These static stubs are what keeps the
   same URLs alive on GitHub Pages, which serves the domain until DNS
   moves. A redirect that only works on the host you have not switched
   to yet is not a redirect. Where both exist Vercel's 301 wins and
   these are never reached. */
if (site.primary === "en") {
  const stub = (to) =>
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Redirecting…</title>
<link rel="canonical" href="${site.origin}${to}">
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url=${to}">
</head><body><p>This page moved to <a href="${to}">${to}</a>.</p></body></html>
`;

  writeFileSync(join(DIST, "en.html"), stub("/"), "utf8");
  for (const p of site.pages) {
    const dir = join(DIST, "en", p.out);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), stub(pathFor("en", p)), "utf8");
  }
}

console.log(`built ${written.length} pages → docs/  (${(saved / 1024).toFixed(1)}KB of comments and indentation stripped from the shipped copy)`);
written.forEach((u) => console.log("  " + u));

/* ---------- tell the engines that participate ---------- */
if (process.argv.includes("--ping")) {
  const host = new URL(site.origin).host;
  const body = {
    host,
    key: site.indexNowKey,
    keyLocation: `${site.origin}/${site.indexNowKey}.txt`,
    urlList: site.pages.flatMap((p) => Object.keys(site.langs).map((l) => urlFor(l, p)))
  };
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    });
    /* 200 accepted · 202 accepted, key validation pending */
    console.log(`\nIndexNow: ${res.status} ${res.statusText} — submitted ${body.urlList.length} URLs`);
  } catch (e) {
    console.log("\nIndexNow: could not reach the endpoint — " + e.message);
  }
}

/* ---------- optional dev server ---------- */
if (process.argv.includes("--serve")) {
  const { createServer } = await import("node:http");
  const types = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".webp": "image/webp", ".pdf": "application/pdf", ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8"
  };
  const { statSync } = await import("node:fs");
  createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    let f = join(DIST, p);
    /* directory URLs (`/ai/`) resolve to their index, the same way every
       static host resolves them — otherwise local testing passes on
       paths that would 404 in production */
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) {
      res.writeHead(404, { "Content-Type": types[".html"] });
      return res.end(readFileSync(join(DIST, "404.html")));
    }
    const ext = f.slice(f.lastIndexOf("."));
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(readFileSync(f));
  }).listen(4444, () => console.log("\nserving dist/ → http://localhost:4444"));
}
