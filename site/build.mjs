// Builds the Collab Pro website pages (plain HTML, ready for search engines) from
// site/content.mjs. Run: npm run site. Output goes to the project root.

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, NAV, FOOTER, FEATURES, STEPS, PROBLEMS, FAQS, PAGES } from "./content.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const abs = (path) => `${SITE.url}${path === "/" ? "/" : path}`;

// ---------- icons (simple outline set) ----------
const ICONS = {
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/>',
  filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
  arrow: '<path d="M7 17L17 7M9 7h8v8"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  layout: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 9h17M9 9v11.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8 8.5"/>',
  devices: '<rect x="2.5" y="5" width="14" height="10" rx="2"/><path d="M6 19h7"/><rect x="17.5" y="9" width="4" height="10" rx="1.2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>',
  rupee: '<path d="M7 5h10M7 9h10M7 5h3.5a4 4 0 0 1 0 8H7l7 7"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  spark: '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
};
const icon = (name, size = 22) => `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`;

const logo = `<a class="brand" href="/" aria-label="Collab Pro home">
  <img src="/assets/logo-mark.svg" alt="" width="34" height="34">
  <span class="wordmark">collab<span>pro</span></span>
</a>`;

// ---------- page frame ----------
function head(p) {
  const title = p.path === "/" ? `${SITE.name}: Find brand collaborations and build your free creator portfolio` : `${p.title} | ${SITE.name}`;
  const canonical = abs(p.path);
  const ld = [];
  if (p.path === "/") {
    ld.push({ "@context": "https://schema.org", "@type": "Organization", name: SITE.name, url: SITE.url, logo: `${SITE.url}/assets/logo-mark.svg`, description: SITE.description });
    ld.push({ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url, inLanguage: "en-IN", description: SITE.description });
  } else if (!p.noindex) {
    ld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: abs("/") },
      { "@type": "ListItem", position: 2, name: p.title, item: canonical },
    ] });
  }
  if (p.faqLd) ld.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faqLd.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(p.description)}">
  <meta name="robots" content="${p.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}">
  ${p.noindex ? "" : `<link rel="canonical" href="${canonical}">`}
  <meta name="theme-color" content="#0c0a1d">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE.name}">
  <meta property="og:locale" content="${SITE.locale}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(p.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE.url}/assets/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Collab Pro: find brand collabs and build your portfolio, free">
  <meta name="twitter:card" content="summary_large_image">
  ${SITE.searchConsoleVerification ? `<meta name="google-site-verification" content="${esc(SITE.searchConsoleVerification)}">` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/site.css">
  ${ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n  ")}
  <script>document.documentElement.classList.add("js");${p.path === "/" ? 'if(location.hash.startsWith("#/"))location.replace("/app"+location.hash);' : ""}</script>
  <script src="/cp-config.js"></script>
</head>`;
}

function header(active) {
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap nav-wrap">
    ${logo}
    <nav class="nav" id="site-nav" aria-label="Main">
      <ul>${NAV.map((n) => `<li><a href="${n.href}"${n.href === active ? ' aria-current="page"' : ""}>${esc(n.label)}</a></li>`).join("")}</ul>
      <div class="nav-cta">
        <a class="btn btn-ghost" href="/signin">Sign in</a>
        <a class="btn btn-primary" href="/signup" data-track="sign_up_click" data-track-where="header">Sign up free</a>
      </div>
    </nav>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><span></span><span></span></button>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      ${logo}
      <p>${esc(SITE.tagline)}</p>
      <a class="btn btn-primary" href="/signup" data-track="sign_up_click" data-track-where="footer">Create your free account</a>
    </div>
    ${FOOTER.map((c) => `<nav aria-label="${esc(c.title)}"><h2>${esc(c.title)}</h2><ul>${c.links.map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join("")}</ul></nav>`).join("")}
  </div>
  <div class="wrap foot-bottom">
    <span>© ${new Date().getFullYear()} ${SITE.name}. Made for creators in India.</span>
    <button type="button" class="link" data-open-consent hidden>Cookie settings</button>
  </div>
</footer>
<div class="consent" id="consent" role="dialog" aria-live="polite" aria-label="Cookie notice" hidden>
  <p>We'd like to use analytics cookies to understand how creators use Collab Pro. Nothing is collected unless you agree.</p>
  <div><button type="button" class="btn btn-ghost" data-consent="no">No thanks</button><button type="button" class="btn btn-primary" data-consent="yes">Allow analytics</button></div>
</div>`;
}

const page = (p, body) => `${head(p)}
<body class="${p.bodyClass || ""}">
${p.bare ? "" : header(p.path)}
<main id="main">
${body}
</main>
${p.bare ? "" : footer()}
<div class="cursor" aria-hidden="true"></div>
${(p.scripts || []).map((s) => `<script src="${s}"></script>`).join("\n")}
<script src="/site.js" defer></script>
</body>
</html>
`;

// ---------- shared sections ----------
const pageHero = (eyebrow, h1, lead, extra = "") => `<section class="page-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>${esc(eyebrow)}</span></nav>
    <h1 data-reveal>${h1}</h1>
    <p class="lead" data-reveal>${lead}</p>
    ${extra}
  </div>
</section>`;

const ctaBand = (h = "Your next collab could be one tap away.", t = "Create a free account, find openings that fit you, and publish a portfolio brands can open from anywhere.") => `<section class="cta-band">
  <div class="wrap cta-inner" data-reveal>
    <h2>${h}</h2>
    <p>${t}</p>
    <div class="cta-row">
      <a class="btn btn-primary btn-lg" href="/signup" data-track="sign_up_click" data-track-where="cta-band">Sign up free</a>
      <a class="btn btn-ghost btn-lg" href="/signin">I already have an account</a>
    </div>
  </div>
</section>`;

const featureCard = (f) => `<article class="feature" data-reveal>
  <div class="feature-ic">${icon(f.icon)}</div>
  <h3>${esc(f.title)}${f.status === "soon" ? ' <span class="pill soon">Coming next</span>' : ""}</h3>
  <p>${esc(f.short)}</p>
</article>`;

const stepsList = (steps = STEPS) => `<ol class="steps">${steps.map((s, i) => `<li data-reveal><span class="step-n">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></li>`).join("")}</ol>`;

const faqList = (items) => `<div class="faq">${items.map((f) => `<details data-reveal><summary><h3>${esc(f.q)}</h3><span class="plus" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join("")}</div>`;

// A product preview of a portfolio (sample content, clearly labelled).
const portfolioMock = (o = {}) => `<div class="mock-portfolio theme-${o.theme || "violet"}${o.side ? " side" : ""}" ${o.id ? `id="${o.id}"` : ""}>
  <span class="tag-example">${o.label || "Example portfolio"}</span>
  <div class="mp-head">
    <div class="mp-avatar" aria-hidden="true">${o.initial || "Y"}</div>
    <div>
      <p class="mp-name">${esc(o.name || "Your name")}</p>
      <p class="mp-bio">${esc(o.bio || "Skincare and everyday makeup for Indian skin")}</p>
    </div>
  </div>
  <div class="mp-socials" aria-hidden="true"><span class="s ig"></span><span class="s yt"></span><span class="s li"></span></div>
  <div class="mp-stats"><div><strong>${o.s1 || "12.4k"}</strong><span>Instagram followers</span></div><div><strong>${o.s2 || "8k"}</strong><span>Avg Reel views</span></div></div>
  <div class="mp-gallery" aria-hidden="true"><span></span><span></span><span></span></div>
  <ul class="mp-rates"><li><span>Instagram Reel</span><strong>${o.r1 || "₹5,000"}</strong></li><li><span>Story</span><strong>${o.r2 || "₹1,500"}</strong></li></ul>
</div>`;

const collabMock = (title, meta, pay) => `<div class="mock-collab">
  <div class="mc-top"><span>${esc(meta)}</span><span class="mc-star" aria-hidden="true">${icon("star", 16)}</span></div>
  <p>${esc(title)}</p>
  <div class="mc-tags"><span class="t ${pay === "Paid" ? "paid" : "barter"}">${pay}</span><span class="t">Instagram</span></div>
  <span class="mc-apply" aria-hidden="true">Apply on Instagram</span>
</div>`;

const heroVisual = `<div class="hero-visual" aria-label="Product preview: a creator portfolio next to brand collaboration openings" role="img">
  <div class="hv-glow" aria-hidden="true"></div>
  <div class="hv-portfolio float-a">${portfolioMock({ label: "Product preview" })}</div>
  <div class="hv-collabs">
    <div class="float-b">${collabMock("Skincare brand looking for Reels creators", "Instagram · Example", "Paid")}</div>
    <div class="float-c">${collabMock("Café in Pune inviting food creators", "Google Form · Example", "Barter")}</div>
    <div class="float-d">${collabMock("D2C fashion label wants UGC videos", "LinkedIn · Example", "Paid")}</div>
  </div>
</div>`;

const liveCollabs = (n = 6) => `<div class="live-collabs" data-live-collabs="${n}">
  <noscript><p class="muted">Turn on JavaScript to see today's openings, or sign up to browse the full feed.</p></noscript>
  <p class="muted live-loading">Loading today's openings…</p>
</div>
<p class="fine center">Openings are found automatically on the public web and aren't checked by a person. Never pay to join a campaign.</p>`;

const portfolioDemo = `<div class="pf-demo" data-reveal>
  <div class="pf-demo-controls" role="group" aria-label="Try the portfolio styles">
    <p class="ctl-label">Colour</p>
    <div class="chips" data-demo="theme">
      <button type="button" class="chip on" data-val="violet"><span class="sw violet"></span>Violet</button>
      <button type="button" class="chip" data-val="coral"><span class="sw coral"></span>Coral</button>
      <button type="button" class="chip" data-val="teal"><span class="sw teal"></span>Teal</button>
      <button type="button" class="chip" data-val="ink"><span class="sw ink"></span>Ink</button>
    </div>
    <p class="ctl-label">Layout</p>
    <div class="chips" data-demo="layout">
      <button type="button" class="chip on" data-val="stack">Image on top</button>
      <button type="button" class="chip" data-val="side">Side by side</button>
    </div>
    <p class="fine">This is a live preview of the real builder's styles. In the app you also drag modules, type on the page, crop photos and publish.</p>
  </div>
  <div class="pf-demo-stage">${portfolioMock({ id: "demo-portfolio", label: "Try it" })}</div>
</div>`;

const showcase = `<div class="showcase">
  ${portfolioMock({ theme: "coral", name: "Skincare creator · Mumbai", bio: "Honest reviews for oily, Indian skin", initial: "S" })}
  ${portfolioMock({ theme: "teal", name: "Home chef · Hyderabad", bio: "Quick Telugu recipes, 30 minutes or less", initial: "H", s1: "6.1k", s2: "15k", r1: "₹3,000", r2: "₹900" })}
  ${portfolioMock({ theme: "ink", name: "Tech reviewer · Bengaluru", bio: "Budget phones and gadgets, explained simply", initial: "T", s1: "28k", s2: "40k", r1: "₹12,000", r2: "₹3,000" })}
</div>
<p class="fine center">These are illustrative example portfolios, not real creators. Yours will show your own details.</p>`;

// ---------- pages ----------
const live = FEATURES.filter((f) => f.status === "live");
const soon = FEATURES.filter((f) => f.status === "soon");
const pages = [];

pages.push({
  path: "/", file: "index.html", title: "Home", bodyClass: "home",
  description: "Collab Pro helps influencers and content creators in India discover brand collaboration opportunities every day and build a free, shareable portfolio, all in one place.",
  faqLd: FAQS.slice(0, 6),
  body: `<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow" data-reveal>${icon("spark", 16)} For influencers and content creators</p>
      <h1 data-reveal>Find brand collabs.<br><span class="grad">Build your portfolio.</span><br>All in one place.</h1>
      <p class="lead" data-reveal>Collab Pro collects fresh brand collaboration openings from across the web every morning and gives you a free portfolio builder, so you can find the right deals and pitch with a link brands love to open.</p>
      <div class="cta-row" data-reveal>
        <a class="btn btn-primary btn-lg" href="/signup" data-track="sign_up_click" data-track-where="hero">Sign up free</a>
        <a class="btn btn-ghost btn-lg" href="/signin">Sign in</a>
      </div>
      <ul class="hero-points" data-reveal><li>${icon("check", 18)} Free portfolio</li><li>${icon("check", 18)} No commission</li><li>${icon("check", 18)} Works on any phone</li></ul>
    </div>
    ${heroVisual}
  </div>
</section>

<section class="section" id="problem">
  <div class="wrap">
    <p class="eyebrow" data-reveal>The problem</p>
    <h2 class="h2" data-reveal>Creators spend more time searching than creating.</h2>
    <div class="cards-3">${PROBLEMS.map((p) => `<article class="card" data-reveal><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join("")}</div>
  </div>
</section>

<section class="section alt" id="solution">
  <div class="wrap split">
    <div>
      <p class="eyebrow" data-reveal>Our solution</p>
      <h2 class="h2" data-reveal>One home for your creator workflow.</h2>
      <p class="lead" data-reveal>Collab Pro brings discovery, tracking and your portfolio together. Find an opening, apply at the source, track it, and send your portfolio link, without switching between five apps.</p>
      <ul class="ticks" data-reveal>
        <li>${icon("radar", 20)} A daily feed of brand openings, filtered for you</li>
        <li>${icon("star", 20)} Saved and Applied lists that stay in sync on every device</li>
        <li>${icon("layout", 20)} A drag-and-drop portfolio with your own public link</li>
      </ul>
    </div>
    <div class="flow" data-reveal aria-hidden="true">
      <div class="flow-node">${icon("radar")}<span>Discover</span></div><div class="flow-line"></div>
      <div class="flow-node">${icon("arrow")}<span>Apply</span></div><div class="flow-line"></div>
      <div class="flow-node">${icon("star")}<span>Track</span></div><div class="flow-line"></div>
      <div class="flow-node">${icon("link")}<span>Share portfolio</span></div>
    </div>
  </div>
</section>

<section class="section" id="discover">
  <div class="wrap">
    <div class="section-head">
      <div><p class="eyebrow" data-reveal>Discover brand collaborations</p>
      <h2 class="h2" data-reveal>Today's openings, straight from the source.</h2></div>
      <a class="link-arrow" href="/discover-collaborations">How discovery works ${icon("arrow", 18)}</a>
    </div>
    ${liveCollabs(6)}
  </div>
</section>

<section class="section alt" id="portfolio">
  <div class="wrap">
    <div class="section-head">
      <div><p class="eyebrow" data-reveal>Build your free portfolio</p>
      <h2 class="h2" data-reveal>A portfolio brands can open in one tap.</h2></div>
      <a class="link-arrow" href="/creator-portfolio">See everything it can do ${icon("arrow", 18)}</a>
    </div>
    ${portfolioDemo}
  </div>
</section>

<section class="section" id="how">
  <div class="wrap split">
    <div>
      <p class="eyebrow" data-reveal>How it works</p>
      <h2 class="h2" data-reveal>From sign-up to your first pitch in minutes.</h2>
      <a class="link-arrow" href="/how-it-works">Read the full guide ${icon("arrow", 18)}</a>
    </div>
    ${stepsList()}
  </div>
</section>

<section class="section alt" id="why">
  <div class="wrap">
    <p class="eyebrow" data-reveal>Why Collab Pro</p>
    <h2 class="h2" data-reveal>Built around how creators actually work.</h2>
    <div class="cards-4">
      <article class="card" data-reveal>${icon("rupee")}<h3>Free, no commission</h3><p>Your portfolio is free, and you apply directly to brands. We're never in the middle of your deal.</p></article>
      <article class="card" data-reveal>${icon("radar")}<h3>Fresh every morning</h3><p>New openings are collected every day, so the feed doesn't go stale.</p></article>
      <article class="card" data-reveal>${icon("filter")}<h3>Made for every size</h3><p>Filter by your follower count and see openings with no minimum.</p></article>
      <article class="card" data-reveal>${icon("devices")}<h3>Phone-first</h3><p>Everything works in your phone's browser, from finding collabs to publishing your portfolio.</p></article>
    </div>
  </div>
</section>

<section class="section" id="features">
  <div class="wrap">
    <div class="section-head">
      <div><p class="eyebrow" data-reveal>Explore features</p>
      <h2 class="h2" data-reveal>Everything in one place, and more on the way.</h2></div>
      <a class="link-arrow" href="/features">All features ${icon("arrow", 18)}</a>
    </div>
    <div class="features">${[...live.slice(0, 6), ...soon.slice(0, 2)].map(featureCard).join("")}</div>
  </div>
</section>

<section class="section alt" id="showcase">
  <div class="wrap">
    <p class="eyebrow" data-reveal>Creator showcase</p>
    <h2 class="h2" data-reveal>Portfolios that look as good as your content.</h2>
    ${showcase}
  </div>
</section>

<section class="section" id="faq">
  <div class="wrap narrow">
    <p class="eyebrow" data-reveal>FAQ</p>
    <h2 class="h2" data-reveal>Questions creators ask.</h2>
    ${faqList(FAQS.slice(0, 6))}
    <p class="center"><a class="link-arrow" href="/faq">See all questions ${icon("arrow", 18)}</a></p>
  </div>
</section>
${ctaBand()}`,
});

pages.push({
  path: "/about", file: "about.html", title: "About us",
  description: "Why we're building Collab Pro: one place for creators in India to discover brand collaborations and build a professional portfolio.",
  body: `${pageHero("About us", "We're building the home base for <span class=\"grad\">creator careers.</span>", "Collab Pro exists so creators spend less time searching and more time creating.")}
<section class="section"><div class="wrap narrow prose">
  <h2>Our mission</h2>
  <p>Make it simple for every creator in India, at any follower count, to find real brand opportunities and present their work professionally.</p>
  <h2>Our vision</h2>
  <p>A creator's entire working life (discovering deals, applying, tracking, pitching and showcasing their work) should live in one place they control, on the phone in their pocket.</p>
  <h2>The problem we're solving</h2>
  ${PROBLEMS.map((p) => `<h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>`).join("")}
  <h2>What we believe</h2>
  <ul>
    <li><strong>Creators should keep their deals.</strong> You apply directly to brands, and we take no commission.</li>
    <li><strong>Honesty beats hype.</strong> We tell you openings are found automatically and not yet verified, and we never show made-up numbers.</li>
    <li><strong>Small creators matter.</strong> Filters and follower information help creators of every size find openings that fit.</li>
  </ul>
  <p><a class="link-arrow" href="/contact">Talk to us ${icon("arrow", 18)}</a></p>
</div></section>
${ctaBand()}`,
});

pages.push({
  path: "/discover-collaborations", file: "discover-collaborations.html", title: "Discover brand collaborations",
  description: "Find brand collaboration opportunities for influencers in India: a daily feed of paid and barter openings from brand forms and public posts, with filters by niche and follower count.",
  body: `${pageHero("Discover collaborations", "Brand collaboration opportunities, <span class=\"grad\">found for you daily.</span>", "Stop checking ten places. Collab Pro searches the public web every morning for brands looking for creators and puts every opening in one feed.", `<div class="cta-row"><a class="btn btn-primary btn-lg" href="/signup" data-track="sign_up_click" data-track-where="discover-hero">Browse the full feed</a></div>`)}
<section class="section"><div class="wrap">
  <h2 class="h2" data-reveal>A sample of today's openings</h2>
  ${liveCollabs(9)}
</div></section>
<section class="section alt"><div class="wrap">
  <h2 class="h2" data-reveal>How discovery works</h2>
  <div class="cards-3">
    <article class="card" data-reveal>${icon("radar")}<h3>We search every morning</h3><p>Brand application forms, public posts and creator calls are collected from across the web each day.</p></article>
    <article class="card" data-reveal>${icon("filter")}<h3>We clean and tag</h3><p>Duplicates, old posts, guides and obvious scams are filtered out. Each opening is tagged by niche, platform, paid or barter and follower minimum where stated.</p></article>
    <article class="card" data-reveal>${icon("arrow")}<h3>You apply at the source</h3><p>Tap Apply to open the brand's own post or form. No middleman and no commission.</p></article>
  </div>
</div></section>
<section class="section"><div class="wrap">
  <h2 class="h2" data-reveal>Tools that come with the feed</h2>
  <div class="features">${FEATURES.filter((f) => f.group === "Discover").map(featureCard).join("")}</div>
  <div class="note-card" data-reveal>${icon("check")}<p><strong>Stay safe:</strong> openings are found automatically and aren't checked by a person yet. Read the original post carefully and never pay a brand or agency to join a campaign.</p></div>
</div></section>
${ctaBand("Find your next brand collaboration.", "Sign up free to browse every opening, filter for your niche, and track what you apply to.")}`,
});

pages.push({
  path: "/creator-portfolio", file: "creator-portfolio.html", title: "Free creator portfolio builder",
  description: "Build a free influencer portfolio website with Collab Pro: drag-and-drop modules, photo carousels, PDF media kits, social previews and rates, published to your own shareable link.",
  body: `${pageHero("Creator portfolio", "A free portfolio <span class=\"grad\">that works as hard as you do.</span>", "Drag in modules, type straight onto the page, and publish to your own link. No design skills, no website builder, no cost.", `<div class="cta-row"><a class="btn btn-primary btn-lg" href="/signup" data-track="sign_up_click" data-track-where="portfolio-hero">Build my portfolio</a></div>`)}
<section class="section"><div class="wrap">${portfolioDemo}</div></section>
<section class="section alt"><div class="wrap">
  <h2 class="h2" data-reveal>Eight modules, endless combinations</h2>
  <div class="modules">
    ${[["layout", "Profile header", "Photo with crop and shape, your name and bio, stacked or side by side."], ["spark", "Text", "Bold, italic, sizes and emojis, formatted line by line."], ["link", "Link", "Text and a link, with an optional image on the left or right."], ["radar", "Number", "Followers, views and engagement, big and clear."], ["image", "File", "Photo carousels in four sizes, or PDFs brands can read without leaving."], ["star", "Social links", "Brand-coloured icons for Instagram, YouTube, LinkedIn, Google Reviews and more."], ["rupee", "Rates", "Your prices per Reel, Story or video, and whether you're open to barter."], ["devices", "Social preview", "A live look at your Instagram, Facebook page, YouTube video or LinkedIn post."]].map(([i, t, d]) => `<article class="module" data-reveal>${icon(i)}<h3>${t}</h3><p>${d}</p></article>`).join("")}
  </div>
</div></section>
<section class="section"><div class="wrap">
  <h2 class="h2" data-reveal>Example portfolios</h2>
  ${showcase}
</div></section>
<section class="section alt"><div class="wrap narrow prose">
  <h2>Why creators need a portfolio</h2>
  <p>When a brand replies to your pitch, the next question is usually "Can you share your media kit?" A Collab Pro portfolio answers that with one link: who you are, your numbers, your best work, your rates and how to reach you, on a page that looks right on any phone.</p>
  <p>It's also a single place to keep everything current. Update your follower count or rates once, and everyone with your link sees the latest version.</p>
</div></section>
${ctaBand("Make a portfolio brands remember.", "It's free and takes a few minutes. Publish when you're ready.")}`,
});

pages.push({
  path: "/features", file: "features.html", title: "Features",
  description: "Every Collab Pro feature for creators: daily brand collaboration discovery, filters, save and apply tracking, a drag-and-drop portfolio builder, public links and what's coming next.",
  body: `${pageHero("Features", "Everything a creator needs, <span class=\"grad\">in one place.</span>", "Discovery, tracking and your portfolio, working together, with more tools on the way.")}
${["Discover", "Portfolio", "Workflow"].map((g, i) => `<section class="section${i % 2 ? " alt" : ""}"><div class="wrap">
  <h2 class="h2" data-reveal>${g === "Discover" ? "Discover collaborations" : g === "Portfolio" ? "Build your portfolio" : "Your workflow"}</h2>
  <div class="feature-rows">${FEATURES.filter((f) => f.group === g).map((f) => `<article class="feature-row" data-reveal><div class="feature-ic">${icon(f.icon)}</div><div><h3>${esc(f.title)}</h3><p>${esc(f.long)}</p></div></article>`).join("")}</div>
</div></section>`).join("")}
<section class="section"><div class="wrap">
  <h2 class="h2" data-reveal>Coming next</h2>
  <p class="lead" data-reveal>Ideas we're working on. They aren't available yet, and plans can change.</p>
  <div class="feature-rows">${soon.map((f) => `<article class="feature-row soon" data-reveal><div class="feature-ic">${icon(f.icon)}</div><div><h3>${esc(f.title)} <span class="pill soon">Coming next</span></h3><p>${esc(f.long)}</p></div></article>`).join("")}</div>
</div></section>
${ctaBand()}`,
});

pages.push({
  path: "/how-it-works", file: "how-it-works.html", title: "How it works",
  description: "How Collab Pro works for creators: sign up free, discover brand collaborations, apply at the source, build your portfolio and share your public link.",
  body: `${pageHero("How it works", "From sign-up to your <span class=\"grad\">first pitch.</span>", "Five simple steps, all in your browser.")}
<section class="section"><div class="wrap narrow">${stepsList()}</div></section>
<section class="section alt"><div class="wrap narrow prose">
  <h2>Tips for better results</h2>
  <ul>
    <li><strong>Set your follower range honestly.</strong> Filters then highlight openings that state a minimum you meet.</li>
    <li><strong>Star first, apply later.</strong> Save openings while you browse, then apply in one sitting.</li>
    <li><strong>Mark what you applied to.</strong> When you return after applying, Collab Pro asks. Keep that list accurate so you can follow up.</li>
    <li><strong>Put your numbers near the top.</strong> Brands look for followers, views and rates first.</li>
    <li><strong>Add a PDF media kit.</strong> Brands can read it inside your portfolio without downloading anything.</li>
  </ul>
  <p><a class="link-arrow" href="/faq">Read the FAQ ${icon("arrow", 18)}</a></p>
</div></section>
${ctaBand()}`,
});

pages.push({
  path: "/faq", file: "faq.html", title: "Frequently asked questions", faqLd: FAQS,
  description: "Answers about Collab Pro: whether it's free, where collaboration openings come from, eligibility, portfolio privacy, editing and getting started.",
  body: `${pageHero("FAQ", "Questions, <span class=\"grad\">answered.</span>", "Everything about portfolios, collaboration openings, eligibility and getting started.")}
<section class="section"><div class="wrap narrow">${faqList(FAQS)}<p class="center muted">Still curious? <a href="/contact">Contact us</a>.</p></div></section>
${ctaBand()}`,
});

pages.push({
  path: "/contact", file: "contact.html", title: "Contact us",
  description: "Contact the Collab Pro team with questions, feedback, partnership enquiries or to report a listing.",
  scripts: ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js", "/supabase-config.js", "/cloud.js"],
  body: `${pageHero("Contact us", "We'd love to <span class=\"grad\">hear from you.</span>", "Questions, feedback, a listing that looks wrong, or an idea for a feature. Send us a message.")}
<section class="section"><div class="wrap contact-grid">
  <form class="form-card" id="contact-form" novalidate>
    <div class="field"><label for="c-name">Your name <span class="req">*</span></label><input id="c-name" name="name" autocomplete="name" required></div>
    <div class="field"><label for="c-email">Email <span class="req">*</span></label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="c-topic">Topic</label><select id="c-topic" name="topic"><option>General question</option><option>Feedback or idea</option><option>Report a listing</option><option>Brand or partnership</option><option>My account</option></select></div>
    <div class="field"><label for="c-msg">Message <span class="req">*</span></label><textarea id="c-msg" name="message" rows="6" required></textarea></div>
    <p class="form-msg" id="contact-msg" role="status" hidden></p>
    <button class="btn btn-primary btn-lg" type="submit">Send message</button>
  </form>
  <aside class="contact-side">
    <h2>Before you write</h2>
    <p>Many answers are in our <a href="/faq">FAQ</a>.</p>
    <h2>Report a listing</h2>
    <p>If an opening asks you to pay, looks fake or is broken, choose "Report a listing" and paste its link in your message. We'll remove it.</p>
    <h2>Your data</h2>
    <p>To ask for your account and data to be deleted, choose "My account" and write from the email you signed up with.</p>
  </aside>
</div></section>`,
});

pages.push({
  path: "/privacy-policy", file: "privacy-policy.html", title: "Privacy policy",
  description: "How Collab Pro collects, uses and protects creators' personal data.",
  body: `${pageHero("Privacy policy", "Privacy policy", `Last updated ${today}.`)}
<section class="section"><div class="wrap narrow prose legal">
  <p>This policy explains what personal data Collab Pro ("we", "us") collects when you use our website and app, why, and the choices you have. By using Collab Pro you agree to this policy.</p>
  <h2>1. Data we collect</h2>
  <ul>
    <li><strong>Account details:</strong> your name and email address, and a password that is stored only in encrypted (hashed) form by our authentication provider.</li>
    <li><strong>Profile details you give us:</strong> niche, follower range, city, language and Instagram handle.</li>
    <li><strong>Your activity in the app:</strong> collaboration openings you save, mark as applied or open.</li>
    <li><strong>Portfolio content:</strong> text, links, numbers, images, PDFs and social handles you add. Anything you publish is public.</li>
    <li><strong>Contact messages:</strong> what you send through our contact form.</li>
    <li><strong>Analytics (only with consent):</strong> if you allow analytics cookies, pages visited and actions such as sign-up clicks, collected through Google Analytics.</li>
    <li><strong>Data stored in your browser:</strong> settings like your menu preference, and a working copy of your data so the app is fast.</li>
  </ul>
  <h2>2. How we use it</h2>
  <ul>
    <li>To run your account and keep your data in sync across devices.</li>
    <li>To show collaboration openings that fit your profile.</li>
    <li>To publish your portfolio at your chosen link when you click Publish.</li>
    <li>To reply to messages and keep the service safe, for example removing scam listings.</li>
    <li>With your consent, to understand usage and improve Collab Pro.</li>
  </ul>
  <h2>3. Public portfolios</h2>
  <p>When you publish, your portfolio and everything in it can be viewed by anyone with the link and may be indexed by search engines. Don't publish anything you want to keep private. You can change or unpublish your content at any time by contacting us.</p>
  <h2>4. Collaboration openings</h2>
  <p>Openings are collected from publicly available web pages. We link to the original source; we don't control those sites and their own privacy policies apply when you visit them.</p>
  <h2>5. Who processes data for us</h2>
  <ul>
    <li><strong>Supabase:</strong> authentication, database and file storage.</li>
    <li><strong>Vercel:</strong> website hosting.</li>
    <li><strong>Google Analytics:</strong> usage analytics, only if you consent.</li>
    <li><strong>Tavily:</strong> searching the public web for openings. It doesn't receive your personal data.</li>
  </ul>
  <p>We don't sell your personal data.</p>
  <h2>6. Cookies and similar storage</h2>
  <p>We use browser storage that's needed to keep you logged in and the app working. Analytics cookies are used only if you click "Allow analytics" and you can change your choice any time through "Cookie settings" in the footer.</p>
  <h2>7. Your choices and rights</h2>
  <p>You can access and edit most of your data in the app. To request a copy, correction or deletion of your data, or to withdraw consent, contact us through our <a href="/contact">contact page</a>. We'll respond within a reasonable time and in line with applicable law, including India's Digital Personal Data Protection Act, 2023.</p>
  <h2>8. Security and retention</h2>
  <p>We use access rules so that only you can change your private data, and passwords are never stored in plain text. We keep your data while your account is active and delete it when you ask us to, unless we must keep it by law.</p>
  <h2>9. Children</h2>
  <p>Collab Pro is not intended for children under 18 without the involvement of a parent or guardian.</p>
  <h2>10. Changes</h2>
  <p>We may update this policy. We'll change the date at the top and, for significant changes, tell you in the app.</p>
  <h2>11. Contact</h2>
  <p>Questions about privacy? Use our <a href="/contact">contact page</a>.</p>
</div></section>`,
});

pages.push({
  path: "/terms-of-service", file: "terms-of-service.html", title: "Terms of service",
  description: "The terms for using Collab Pro, including accounts, collaboration listings, portfolios and acceptable use.",
  body: `${pageHero("Terms of service", "Terms of service", `Last updated ${today}.`)}
<section class="section"><div class="wrap narrow prose legal">
  <p>These terms govern your use of Collab Pro. By creating an account or using the service, you agree to them.</p>
  <h2>1. The service</h2>
  <p>Collab Pro provides a feed of brand collaboration openings collected from the public web, tools to save and track openings, and a portfolio builder with public links. The portfolio and current features are free. We may add, change or remove features.</p>
  <h2>2. Your account</h2>
  <p>Give accurate information and keep your password safe. You're responsible for activity on your account. You must be 18 or older, or use Collab Pro with a parent's or guardian's involvement.</p>
  <h2>3. Collaboration listings</h2>
  <ul>
    <li>Listings are gathered automatically from third-party public sources. We don't verify them and we aren't a party to any deal between you and a brand.</li>
    <li>We don't guarantee that any opening is genuine, available, paid or suitable. Check every opening yourself.</li>
    <li>Never pay a brand, agency or anyone else to join a campaign. Report suspicious listings through our contact page.</li>
  </ul>
  <h2>4. Your portfolio content</h2>
  <p>You keep ownership of what you add. You give us permission to store, display and publish it so the service works, including showing published portfolios publicly. Only add content you have the rights to, and don't post anything unlawful, misleading, hateful, sexual involving minors, or that infringes others' rights.</p>
  <h2>5. Acceptable use</h2>
  <p>Don't misuse Collab Pro: no scraping our service, interfering with its security, impersonating others, or using it to spam or defraud brands or creators.</p>
  <h2>6. Third-party sites</h2>
  <p>Links and embeds (for example Instagram, Facebook, YouTube, LinkedIn and brand forms) are provided by third parties whose terms apply.</p>
  <h2>7. Disclaimers and liability</h2>
  <p>Collab Pro is provided "as is". To the extent allowed by law, we aren't liable for losses arising from listings, third-party sites, or deals you make with brands.</p>
  <h2>8. Ending use</h2>
  <p>You can stop using Collab Pro and ask us to delete your account at any time. We may suspend accounts that break these terms.</p>
  <h2>9. Changes and law</h2>
  <p>We may update these terms and will change the date above. These terms are governed by the laws of India.</p>
  <h2>10. Contact</h2>
  <p>Questions? Use our <a href="/contact">contact page</a>.</p>
</div></section>`,
});

// ---------- sign up, sign in, password pages (kept out of search) ----------
const authScripts = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js", "/supabase-config.js", "/cloud.js", "/site-auth.js"];
const pw = (id, label, autocomplete, hint = "") => `<div class="field"><label for="${id}">${label} <span class="req">*</span></label>
  <div class="pw"><input id="${id}" name="password" type="password" autocomplete="${autocomplete}" required minlength="8"${hint ? ` aria-describedby="${id}-hint"` : ""}><button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false">Show</button></div>
  ${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ""}</div>`;
const authShell = (inner, aside) => `<section class="auth">
  <div class="auth-side">
    ${logo}
    ${aside}
  </div>
  <div class="auth-main">
    <a class="back" href="/">← Back to home</a>
    ${inner}
  </div>
</section>`;
const authAside = `<h2>Find brand collabs.<br><span class="grad">Build your portfolio.</span></h2>
  <ul class="ticks"><li>${icon("radar", 20)} Fresh openings every morning</li><li>${icon("layout", 20)} Free drag-and-drop portfolio</li><li>${icon("lock", 20)} One account on every device</li></ul>
  <div class="auth-preview">${portfolioMock({ label: "Product preview" })}</div>`;

pages.push({
  path: "/signup", file: "signup.html", title: "Sign up", noindex: true, bare: true, bodyClass: "auth-page", scripts: authScripts,
  description: "Create your free Collab Pro account.",
  body: authShell(`<form class="auth-form" id="signup-form" data-auth="signup" novalidate>
    <h1>Create your free account</h1>
    <p class="muted">Already have one? <a href="/signin" data-swap>Sign in</a></p>
    <div class="field"><label for="su-name">Your name <span class="req">*</span></label><input id="su-name" name="name" autocomplete="name" required></div>
    <div class="field"><label for="su-email">Email <span class="req">*</span></label><input id="su-email" name="email" type="email" autocomplete="email" required></div>
    ${pw("su-pass", "Password", "new-password", "At least 8 characters.")}
    <label class="check"><input type="checkbox" name="terms" required> I agree to the <a href="/terms-of-service" target="_blank">Terms</a> and <a href="/privacy-policy" target="_blank">Privacy policy</a></label>
    <p class="form-msg" role="alert" hidden></p>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Create account</button>
  </form>`, authAside),
});

pages.push({
  path: "/signin", file: "signin.html", title: "Sign in", noindex: true, bare: true, bodyClass: "auth-page", scripts: authScripts,
  description: "Sign in to Collab Pro.",
  body: authShell(`<form class="auth-form" id="signin-form" data-auth="signin" novalidate>
    <h1>Welcome back</h1>
    <p class="muted">New here? <a href="/signup" data-swap>Create a free account</a></p>
    <div class="field"><label for="si-email">Email <span class="req">*</span></label><input id="si-email" name="email" type="email" autocomplete="email" required></div>
    ${pw("si-pass", "Password", "current-password")}
    <p class="row-end"><a href="/forgot-password">Forgot password?</a></p>
    <p class="form-msg" role="alert" hidden></p>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Sign in</button>
  </form>`, authAside),
});

pages.push({
  path: "/forgot-password", file: "forgot-password.html", title: "Reset your password", noindex: true, bare: true, bodyClass: "auth-page", scripts: authScripts,
  description: "Reset your Collab Pro password.",
  body: authShell(`<form class="auth-form" id="forgot-form" data-auth="forgot" novalidate>
    <h1>Reset your password</h1>
    <p class="muted">Enter your account email and we'll send you a link to choose a new password.</p>
    <div class="field"><label for="fp-email">Email <span class="req">*</span></label><input id="fp-email" name="email" type="email" autocomplete="email" required></div>
    <p class="form-msg" role="alert" hidden></p>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Send reset link</button>
    <p class="muted center"><a href="/signin">Back to sign in</a></p>
  </form>`, authAside),
});

pages.push({
  path: "/reset-password", file: "reset-password.html", title: "Choose a new password", noindex: true, bare: true, bodyClass: "auth-page", scripts: authScripts,
  description: "Choose a new Collab Pro password.",
  body: authShell(`<form class="auth-form" id="reset-form" data-auth="reset" novalidate>
    <h1>Choose a new password</h1>
    ${pw("rp-pass", "New password", "new-password", "At least 8 characters.")}
    <p class="form-msg" role="alert" hidden></p>
    <button class="btn btn-primary btn-lg btn-block" type="submit">Save new password</button>
  </form>`, authAside),
});

// ---------- write everything ----------
for (const p of pages) await writeFile(join(ROOT, p.file), page(p, p.body));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>
`;
await writeFile(join(ROOT, "sitemap.xml"), sitemap);
await writeFile(join(ROOT, "cp-config.js"), `// Generated from site/content.mjs by npm run site.\nwindow.CP_CONFIG = ${JSON.stringify({ ga4Id: SITE.ga4Id })};\n`);
await writeFile(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
console.log(`Built ${pages.length} pages, sitemap.xml and robots.txt`);
