# موقع عبدالله الأشطل — Abdullah Al-Ashtal

أربع صفحات في لغتين، مخرَجها HTML ثابت خالص. **الإنجليزية هي التي تفتح**، والعربية تحت `/ar/`.
Four pages in two languages, output as pure static HTML. **English opens at the root**; Arabic lives under `/ar/`.

**الفكرة الواحدة:** «من الفوضى إلى النظام». الموقع لا يتحدّث عن الفكرة — إنه يؤدّيها.
**The single idea:** *from chaos to order*. The site does not describe the idea; it performs it.

---

## التشغيل — Running

```bash
npm run build     # أو / or: node build.mjs      → يبني docs/
npm run dev       # أو / or: node build.mjs --serve → ثم يخدمها على :4444
```

بلا اعتماديات. لا `npm install` ولا `node_modules` ولا شيء يتقادم.
No dependencies. No `npm install`, no `node_modules`, nothing to rot.

---

## النشر — Deploying

المخرَج `docs/` **ومصدر الموقع في المستودع نفسه**، ويخدمه مضيفان في آنٍ واحد أثناء الانتقال:

The output is `docs/` and **the source sits in the same repository**, served by two hosts at once during the move:

| المضيف | Host | كيف | How |
|---|---|---|---|
| **Vercel** *(المقصود)* | *(intended)* | `vercel.json` في جذر المستودع: `buildCommand: node build.mjs`, `outputDirectory: docs` | |
| GitHub Pages *(مؤقّت)* | *(interim)* | فرع `main` ← مجلّد `/docs`، ويبقى يعمل حتى ينتقل الـDNS | keeps serving until DNS moves |

**دفعة واحدة = نشر.** ولا يوجد CI: الـtoken الحالي بلا صلاحية `workflow`، ولتفعيل GitHub Actions شغّل `gh auth refresh -s workflow` أولاً.
**One push is one deploy.** There is no CI: the current token lacks the `workflow` scope — run `gh auth refresh -s workflow` first if you want GitHub Actions.

### ما يفعله `vercel.json` — What `vercel.json` does

Vercel يقرأ الملف من **جذر المستودع** لا من مجلّد المخرَج. وفيه: تحويلات 301 من العناوين الإنجليزية القديمة، ورؤوس الأمان، وسياسة التخزين المؤقت (سنة كاملة للأصول، وتحقّق دائم لصفحات HTML).
Vercel reads it from the **repository root**, not from the output directory. It carries the 301s from the old English addresses, the security headers, and the cache policy (a year for assets, always-revalidate for HTML).

### الفرع الاحتياطي — The recovery branch

`legacy-template-2026-05` يحمل القالب القديم كما كان قبل هذا البناء.
`legacy-template-2026-05` holds the previous template exactly as it was.

---

## الفكرة — The idea

كل شيء متحرّك مشتقٌّ من رقمٍ واحد اسمه `order`. الجديد أنه صار **يقيس السفر عبر الموقع كلّه، لا عبر الصفحة**: الصفحة الثانية من أربع تمشي من ٢٥٪ إلى ٥٠٪ ولا تتجاوزها.

Everything that moves derives from one number, `order`. What changed is that it now measures travel through the **whole site**, not through one document: page 2 of 4 runs from 25% to 50% and no further.

| الصفحة | Page | `order` |
|---|---|---|
| الفوضى | Chaos | `0.00 → 0.25` |
| السجل | Record | `0.25 → 0.50` |
| الوكلاء | Agents | `0.50 → 0.75` |
| التشغيل | Engage | `0.75 → 1.00` |

ولهذا **لا يستقرّ الحقل تماماً إلا بعد أن يمشي القارئ الصفحات الأربع.** هذا ليس أثراً جانبياً للتقسيم — إنه المكافأة عليه.

Which is why **the field never fully settles until the reader has walked all four.** That is not a side effect of splitting the site up; it is the reward for it.

| عند `order = 0` | at `order = 0` | عند `order = 1` | at `order = 1` |
|---|---|---|---|
| شظايا مبعثرة مائلة | scattered, tilted fragments | شبكة رسمٍ مضبوطة ساكنة | an exact, still drafting grid |
| ورقٌ فاتح | pale paper | فراغٌ داكن | deep void |
| مؤشّر متأخّر | a lagging cursor | مؤشّر مضبوط | a locked instrument |
| بطاقات «الاحتكاك» مائلة | the friction cards sit crooked | مستوية | square |
| التوقيع مفرّغ | the signature is an outline | ممتلئ بالإشارة | filled with the signal |

---

## البنية — Structure

```
build.mjs               المولّد كلّه، بلا اعتماديات — the whole generator, no deps
src/
  site.json             كل حقيقة تتكرّر في أكثر من صفحة — every repeated fact
  layout.html           الهيكل ووسوم SEO مرّة واحدة — the shell and the SEO tags, once
  404.html
  partials/             sprite · bar · idx · foot
  pages/                home|record|ai|contact  ×  .ar.html|.en.html
assets/                 css · js · img · cv  (تُنسخ كما هي — copied verbatim)
docs/                   المخرَج، يُمحى ويُبنى في كل مرّة — output, wiped and rebuilt
vercel.json             إعداد Vercel، يُقرأ من الجذر — Vercel config, read from the root
_archive/               الإصدارات السابقة — previous versions
```

**القاعدة:** ملفات `pages/` لا تحوي إلا `<main>` الخاص بها. أي نصٍّ يظهر في أكثر من صفحة مكانه `site.json`.
**The rule:** files in `pages/` contain nothing but their own `<main>`. Any string that appears on more than one page belongs in `site.json`.

### القوالب — Templating

ثلاثة أشكال فقط، ولا شيء غيرها:

Three forms, and nothing else:

```
{{key}}       قيمة مهروبة        escaped value
{{{key}}}     HTML خام            raw HTML
{{> name}}    تضمين جزء           include src/partials/name.html
```

### كيف تُدار الجهة — How direction is handled

`transform` لا يملك محوراً منطقياً، و`transform-origin` لا يملك كلمة منطقية. الملف الواحد يخدم الاتجاهين عبر متغيّرين:

`transform` has no logical axis and `transform-origin` has no logical keyword. One stylesheet serves both directions through two variables:

```css
:root            { --flip: -1; --start: right; }  /* العربية */
html[dir="ltr"]  { --flip:  1; --start: left;  }  /* English */
```

---

## الحركة — Motion

ثلاث طبقات، كل واحدة تعمل بلا التي فوقها:

Three layers, each working without the one above it:

| الطبقة | Layer | ماذا تملك | What it owns |
|---|---|---|---|
| `system.js` | — | `order`، الإقلاع، القوائم، الأسئلة، النموذج، المؤشّر، المغناطيسية | `order`, boot, nav, questions, form, cursor, magnetism |
| `field.js` | — | الحقل: يقرأ `order` ويرسمه | the field: reads `order` and draws it |
| `motion.js` | — | GSAP: الكشف والتقسيم والربط بالتمرير | GSAP: reveals, splitting, scroll-linking |

`system.js` مكتوب باليد ولا يعتمد على شيء. عندما تصل GSAP يسلّمها الكشف والتقسيم فقط، ويحتفظ بالباقي. وإذا لم تصل — CDN محجوب، متصفح قديم — فلا شيء سُلِّم أصلاً والصفحة تعمل كما كانت.

`system.js` is hand-written and depends on nothing. When GSAP arrives it hands over the reveals and the splitting, and keeps everything else. If GSAP never arrives — blocked CDN, old browser — nothing was handed over and the page works exactly as before.

### ثلاث قواعد في `motion.js` لا تُكسَر — Three rules `motion.js` will not break

1. **العربية تُقسَّم بالسطر والكلمة، لا بالحرف أبداً.** `SplitText` بـ`type: "chars"` يقطع الوصلات فتصير «العمليات» ثمانية حروف سائبة. لا يوجد إعدادٌ يجعل ذلك مقبولاً هنا.
   **Arabic is split by line and by word, never by character.** `SplitText` with `type: "chars"` severs the joins. There is no configuration in which chars are acceptable on this site.

2. **كل كشفٍ هو `from` tween.** لا شيء يُخفى مسبقاً تحت `html.gsap`، فالعنصر الذي لم يصله مُطلِقه يبقى **ظاهراً** لا مخفياً. الصفحة الفارغة عطلٌ أسوأ من الصفحة بلا حركة.
   **Every reveal is a `from` tween.** Nothing is pre-hidden under `html.gsap`, so an element whose trigger never fires stays **visible**. A blank page is a worse failure than an unanimated one.

3. **كل tween ينتهي بـ`clearProps`.** بعد الكشف يعود العنصر إلى تنسيق الستايل شيت، فلا يبقى `transform` سطريّ يصارع الميل أو حالة المرور.
   **Every tween ends with `clearProps`.** Afterwards the element goes back to being styled by the stylesheet, so no inline transform is left fighting the tilt or the hover state.

وفوق ذلك: إن أخفق إعداد `motion.js` لأي سبب، يزيل الصنف `html.gsap` بنفسه ويعيد الصفحة إلى مسارها الأصلي.
On top of that: if `motion.js` setup throws for any reason, it removes the `html.gsap` class itself and hands the page back to its original path.

### انتقال الصفحات — Page transitions

`@view-transition { navigation: auto }` مع تسمية القطع الثابتة (`bar` · `idx` · `meter` · `plot` · `grain`)، فتعبر معك بدل أن تُهدَم وتُبنى. المتصفحات التي لا تدعمها تنتقل انتقالاً عادياً — أي كما تفعل اليوم بالضبط.

`@view-transition { navigation: auto }` with the persistent chrome named, so it crosses over instead of being torn down and rebuilt. Browsers without support navigate normally — exactly what they do today.

---

## الحقل — The field

`canvas` مثبَّتة خلف الصفحة. كل شظية تحمل عنوانين: حيث تركتها الفوضى، وحيث تنتمي.

A fixed `canvas` behind the page. Every fragment holds two addresses — where chaos left it, and where it belongs.

- **`mix-blend-mode: difference`** — الحقل مثبَّت واللوح الداكن يمرّ *فوقه*، فأي راية «فاتح/داكن» ستكون صحيحة أعلى الشاشة وخاطئة أسفلها طوال زمن التسليم. الطرح يحسمها بكسل بكسل.
  The field is fixed and the dark plate sweeps *across* it, so any light/dark flag would be right at the top of the screen and wrong at the bottom. Difference resolves it per pixel.
- **العشوائية مُبذَّرة** — كل موضع من دالّة تجزئة ثابتة: الفوضى مؤلَّفة لا مصادَفة.
  Every position comes from a fixed hash: the disorder is *composed*, not accidental.
- **يتوقّف عن الرسم عند الاكتمال** — عند `order = 1` لا انجراف يُحرَّك، فتتوقّف الحلقة. السكون ثمرة القصة وسبب أن هذا لا يكلّف شيئاً.
  At `order = 1` there is no drift left, so the loop stops. Stillness is both the payoff and the reason this costs nothing.

---

## محركات البحث — Search engines

كل ما يلي مبنيٌّ في `build.mjs`، فلا يمكن أن يُنسى في صفحة:

All of the following is generated in `build.mjs`, so it cannot be forgotten on one page:

- عنوان ووصف فريدان لكل صفحة، بأطوالٍ لا تُبتَر في نتائج البحث
  a unique title and description per page, at lengths the SERP will not truncate
- `canonical` صريح، و`hreflang` متبادل كامل (ar · en · x-default) على **كل** صفحة — والتبادل شرط: جوجل يتجاهل أي إشارة من طرفٍ واحد
  an explicit `canonical`, and a complete reciprocal `hreflang` set on **every** page — reciprocity is required; Google ignores one-sided signals
- `robots: max-image-preview:large, max-snippet:-1` — الصورة العريضة والمقتطف الطويل لا يُمنحان تلقائياً، بل يُطلَبان
  the wide thumbnail and the long snippet are opt-in, not defaults
- JSON-LD: `ProfilePage` · `Person` (بـ`hasCredential` لكل شهادة و`knowsAbout`) · `BreadcrumbList` · `FAQPage` · `ItemList` من `Service`
- `sitemap.xml` مولَّد ببدائل اللغة لكل رابط، و`robots.txt`، وصفحة 404
  a generated `sitemap.xml` carrying language alternates per URL, `robots.txt`, and a 404 page
- `og.png` بمقاس 1200×630، و`apple-touch-icon`، و`site.webmanifest`
- عنوان `h1` واحد لكل صفحة، وتسلسل عناوين سليم، و`aria-labelledby` لكل قسم
  exactly one `h1` per page, a sound heading hierarchy, and an `aria-labelledby` on every section
- كل صورة بنصٍّ بديل وبأبعادٍ صريحة (منعاً لإزاحة التخطيط)، وتحميل مسبق لصورة الغلاف وحدها
  every image with alt text and explicit dimensions (against layout shift), and a preload for the cover image only
- **ربط داخلي مقصود:** كل صفحة تُسمّي التالية في ذيلها، وتشير من دعواها إلى دليلها في صفحةٍ أخرى. الصفحة التي لا يشير إليها شيء تصل إليها العناكب أخيراً وترتّبها أدنى.
  **deliberate internal linking:** every page names the next in its footer and points from a claim to its proof on another page. A page nothing links to is reached last and ranked lowest.

للتحقق: `_archive/` غير مرتبط من أي مكان، وغير مذكور في `robots.txt` — لأن سطر `Disallow` ينشر العنوان لمن يقرأ الملف.
`_archive/` is linked from nowhere and named in no `Disallow` line: a `Disallow` line publishes the address it is trying to hide.

---

## الطباعة العربية — Arabic typography

ثلاث قواعد مقصودة، فلا «تُصلَح»:

Three deliberate rules — do not "fix" them:

1. **لا تباعد أحرف على العربية إطلاقاً.** `letter-spacing` يفكّ الوصلات فتتناثر الكلمة.
   **Never `letter-spacing` on Arabic.** It prises apart the joins.
2. **النص يُقسَّم بالكلمة أو بالسطر، لا بالحرف.**
   **Split by word or line, never by character.**
3. **`.mono` صوتُ التسمية، لا الخطّ الأحادي بالضرورة.** IBM Plex Mono بلا تغطية عربية لكنه *يملك* المسافة U+0020، فلافتةٌ مختلطة تأخذ حروفها من عائلة وفراغاتها من أخرى وتنفتح فجواتها. في `dir="ltr"` لا وصلات تُقطَع، فيأخذ `.mono` الخطّ الأحادي وتباعده الحقيقي.
   **`.mono` is the label *voice*, not necessarily the monospaced face.** Plex Mono has no Arabic coverage but *does* own U+0020. Under `dir="ltr"` there are no joins to sever, so `.mono` gets the real monospaced face with real tracking.

---

## نموذج التواصل — Contact form

يمرّ عبر [Web3Forms](https://web3forms.com) دون كشف البريد في الصفحة.
Relays through [Web3Forms](https://web3forms.com) without exposing the address in the page.

افتح `assets/js/system.js` وضع المفتاح في الثابت قرب أعلى الملف:
Open `assets/js/system.js` and paste the key into the constant near the top:

```js
var FORM_ACCESS_KEY = "ضع-المفتاح-هنا";
```

قبل ذلك يعرض النموذج «غير مُفعَّل بعد» ويحيل إلى لينكدإن — ولا يُرسل شيئاً في الفراغ. والمفتاح آمن للنشر: عنوان الوجهة لا يصل المتصفّح.
Until then the form says "not switched on yet" and points to LinkedIn — it never posts into the void. The key is safe to publish: the destination address never reaches the browser.

---

## ما الذي يبقى إذا سقط كل شيء — What survives when everything fails

| لو سقط | If this fails | تبقى الصفحة | the page still |
|---|---|---|---|
| GSAP | GSAP | تكشف بـ`IntersectionObserver` وانتقالات CSS | reveals via `IntersectionObserver` and CSS transitions |
| جافاسكربت بالكامل | JavaScript entirely | مقروءة كاملة؛ `html:not(.js)` يلغي كل إخفاء | fully readable; `html:not(.js)` cancels every hidden state |
| Lenis | Lenis | تمرير أصلي وكل الحركة سليمة | native scrolling, every animation intact |
| خطوط Google | Google Fonts | خطوط النظام مع احتياطي عربي صريح | system fonts with an explicit Arabic fallback |
| `<canvas>` | `<canvas>` | الحقل يغيب ولا شيء غيره يتأثّر | the field is absent, nothing else changes |
| انتقال الصفحات | view transitions | انتقال عادي بين الصفحات | ordinary navigation |

**`prefers-reduced-motion`** له مسارٌ حقيقي لا تعطيل: لا إقلاع، ولا تناثر، ولا مؤشّر، ولا انجراف — والحقل يُرسم مرّة واحدة مرتّباً ويبقى ساكناً.
**`prefers-reduced-motion`** gets a real path, not a disablement: no boot, no scatter, no cursor, no drift — and the field is rendered once, settled, and left still.

---

## ملاحظات — Notes

- الإشارة الصفراء مُقنَّنة. ثماني أيقونات صفراء زينة؛ أيقونة واحدة تحت المؤشّر إشارة.
  The yellow is rationed. Eight yellow icons is decoration; one under the pointer is a signal.
- المغناطيسية مقصورة على ما يحمل الأصفر، فيكون الانجذاب دائماً بمعنى «هذه الخطوة التالية».
  Magnetism is limited to what carries the yellow, so the pull always means *this is the next step*.
- الصفحة الرئيسية وحدها آخر قسمٍ فيها ورقيّ، فهي وحدها التي يحمل ذيلها `takeover`.
  Home is the only page whose last section is paper, so it is the only one whose footer carries `takeover`.

**إجراء معلّق:** تسجيل الموقع في Search Console وBing ورفع `sitemap.xml`.
**Pending:** register the site in Search Console and Bing, and submit `sitemap.xml`.
