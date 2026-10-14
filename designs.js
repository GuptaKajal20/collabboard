// My Portfolio → Designs tab: Templates, Background, Text and Page settings.
// Works on site.design (see design.js). Every change redraws the live preview straight away and is saved
// with the draft, so the published page looks the same. Uses app.js helpers (site, saveSite, renderCanvas…).

(function () {
  const D = window.PortfolioDesign;
  const T = window.PortfolioTemplates;
  const $ = (id) => document.getElementById(id);
  const h = (s) => window.Portfolio.esc(s);
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  const abs = (path) => (/^https?:|^data:/.test(path) ? path : `${location.origin}${path}`);

  let section = null; // which Designs section is open (one at a time; all closed at first)
  let bgView = null;
  let imgSource = "upload";
  let tplCat = "business";
  let pexels = { q: "", items: [], page: 1, busy: false, error: "", more: false };

  const design = () => (site.design = D.normalize(site.design));

  // ---------- applying changes to the live preview ----------

  // Updates the background and page styling in place, so modules (and their embeds) don't reload.
  function refresh() {
    const root = document.querySelector("#canvas .pb-root");
    if (!root) return renderCanvas();
    const d = design();
    D.loadFonts(d);
    const page = root.querySelector(".pb-page");
    const a = D.pageAttrs(d, site.theme);
    page.className = `pb-page pb-theme-${site.theme || "violet"} ${a.cls}`;
    page.setAttribute("style", a.style);
    const oldBg = root.querySelector(":scope > .pb-bg");
    const tmp = document.createElement("div");
    tmp.innerHTML = D.bgHtml(d);
    const fresh = tmp.firstElementChild;
    // Same photo, new position: move it instead of reloading it.
    const oldImg = oldBg && oldBg.querySelector(".pb-bg-img");
    const newImg = fresh && fresh.querySelector(".pb-bg-img");
    if (oldImg && newImg && oldImg.getAttribute("src") === newImg.getAttribute("src")) {
      oldImg.setAttribute("style", newImg.getAttribute("style"));
      const s = oldBg.querySelector(".pb-scrim");
      const ns = fresh.querySelector(".pb-scrim");
      if (s) s.remove();
      if (ns) oldBg.appendChild(ns);
      return;
    }
    const sig = fresh ? fresh.outerHTML : "";
    if (oldBg && oldBg.dataset.sig === sig) return;
    if (oldBg) oldBg.remove();
    if (fresh) {
      fresh.dataset.sig = sig;
      root.prepend(fresh);
      D.mount(root);
    }
  }

  function change(fn, { panel = false } = {}) {
    const d = design();
    const was = d.bg.type;
    fn(d);
    // Moving onto a busy background (photo, video, animation): make sure modules sit on readable cards.
    if (d.bg.type !== was && ["image", "video", "anim"].includes(d.bg.type) && ["none", "outline"].includes(d.look.cards)) d.look.cards = "auto";
    site.design = D.normalize(d);
    saveSite();
    refresh();
    if (panel) render();
  }

  // ---------- small UI pieces ----------

  const swatches = (field, colors, current, extra = "") =>
    `<div class="dz-swatches" role="group">${colors.map((c) => `<button type="button" class="dz-sw${c === current ? " on" : ""}" data-pick="${field}" data-val="${c}" style="background:${c}" title="${c}" aria-label="Colour ${c}"></button>`).join("")}${extra}
      <label class="dz-custom" title="Custom colour"><input type="color" data-color="${field}" value="${current && /^#[0-9a-f]{6}$/i.test(current) ? current : "#888888"}" aria-label="Custom colour"><span aria-hidden="true">+</span></label></div>`;
  const autoChip = (field, on) => `<button type="button" class="dz-auto${on ? " on" : ""}" data-pick="${field}" data-val="">Auto</button>`;
  const range = (label, field, value, min, max, unit = "") =>
    `<label class="slider"><span class="lbl">${label}</span><span class="slider-row"><input type="range" data-range="${field}" data-unit="${unit}" min="${min}" max="${max}" value="${value}" style="--fill:${(((value - min) / (max - min)) * 100).toFixed(1)}%"><output>${value}${unit}</output></span></label>`;
  const segRow = (field, current, options) =>
    `<div class="seg wide dz-seg" role="group">${options.map(([v, l]) => `<button type="button" data-pick="${field}" data-val="${v}" class="${String(current) === String(v) ? "active" : ""}">${l}</button>`).join("")}</div>`;
  const fontSelect = (field, current, allowSame) =>
    `<select data-select="${field}" aria-label="Font">${allowSame ? `<option value="">Same as body text</option>` : ""}${Object.entries(D.FONTS).map(([k, f]) => `<option value="${k}" ${k === current ? "selected" : ""}>${h(f[0])}</option>`).join("")}</select>`;
  const group = (title, body, hint = "") => `<div class="dz-group"><p class="panel-label">${title}</p>${hint ? `<p class="fine">${hint}</p>` : ""}${body}</div>`;

  // ---------- Background ----------

  function bgTab() {
    const d = design();
    const b = d.bg;
    // Images and videos share one "media" section.
    const kind = (t) => (t === "image" || t === "video" ? "media" : t);
    const view = bgView || (b.type === "none" ? "color" : kind(b.type));
    const types = [["color", "Colour"], ["gradient", "Gradient"], ["media", "Image & video"], ["anim", "Animated"]];
    let body = `<div class="dz-types" role="tablist">${types.map(([v, l]) => `<button type="button" data-bgview="${v}" class="${view === v ? "active" : ""}" role="tab" aria-selected="${view === v}">${l}</button>`).join("")}</div>`;

    if (view === "color") body += swatches("bg.color", D.COLORS, b.type === "color" ? b.color : "");
    if (view === "gradient") {
      const g = b.gradient;
      const on = b.type === "gradient";
      body += `<div class="dz-swatches">${D.GRADIENTS.map((cols, i) => `<button type="button" class="dz-sw${on && cols.join() === g.colors.join() ? " on" : ""}" data-act="grad" data-i="${i}" style="background:linear-gradient(to right,${cols.join(",")})" aria-label="Gradient ${i + 1}"></button>`).join("")}</div>
        <div class="dz-grad-edit">
          <div class="dz-grad-stops">${g.colors.map((c, i) => `<label class="dz-stop"><input type="color" data-color="bg.gradient.colors.${i}" value="${c}" aria-label="Colour ${i + 1}"><span>${c}</span>${g.colors.length > 2 ? `<button type="button" class="dz-stop-x" data-act="grad-del" data-i="${i}" aria-label="Remove colour ${i + 1}">✕</button>` : ""}</label>`).join("")}
            ${g.colors.length < 3 ? `<button type="button" class="dz-add" data-act="grad-add">+ Colour</button>` : ""}</div>
          <div class="dz-dirs" role="group" aria-label="Direction">${D.DIRS.map((dir) => dir ? `<button type="button" data-act="grad-dir" data-dir="${dir}" class="${on && g.dir === dir ? "on" : ""}" aria-label="${dir.replace("to ", "Towards ")}" title="${dir.replace("to ", "Towards ")}">${{ "to top left": "↖", "to top": "↑", "to top right": "↗", "to left": "←", "to right": "→", "to bottom left": "↙", "to bottom": "↓", "to bottom right": "↘" }[dir]}</button>` : `<span></span>`).join("")}</div>
        </div>`;
    }
    if (view === "media") body += mediaTab(b);
    if (view === "anim") {
      body += `<div class="dz-anims">${Object.entries(D.ANIMS).map(([k, a]) => {
        const on = b.type === "anim" && b.anim.preset === k;
        const c = on ? b.anim.colors : a.colors;
        return `<button type="button" class="dz-anim${on ? " on" : ""}" data-act="anim" data-val="${k}"><span class="dz-anim-sw dz-anim-${k}" style="--c1:${c[0]};--c2:${c[1]};--c3:${c[2]};--base:${on ? b.anim.base : a.base}"></span><span>${h(a.name)}</span></button>`;
      }).join("")}</div>`;
      if (b.type === "anim") {
        body += group("Colours", `<div class="dz-swatches">${D.ANIM_PALETTES.map((p, i) => `<button type="button" class="dz-sw dz-pal" data-act="pal" data-i="${i}" style="background:linear-gradient(90deg,${p.join(",")})" aria-label="Palette ${i + 1}"></button>`).join("")}</div>
          <div class="dz-pickers">${[0, 1, 2].map((i) => `<input type="color" data-color="bg.anim.colors.${i}" value="${b.anim.colors[i]}" aria-label="Animation colour ${i + 1}" title="Animation colour ${i + 1}">`).join("")}<input type="color" data-color="bg.anim.base" value="${b.anim.base}" aria-label="Background colour" title="Background colour"></div>`);
      }
    }
    if (["image", "video", "anim"].includes(b.type) && view === kind(b.type)) body += readability(d);
    return body;
  }

  function readability(d) {
    const b = d.bg;
    const tone = ["image", "video"].includes(b.type)
      ? `<div class="pick-field"><span class="lbl">This ${b.type === "image" ? "photo" : "video"} is mostly</span>${segRow("bg.tone", b.tone === "auto" ? "dark" : b.tone, [["dark", "Dark"], ["light", "Light"]])}</div>` : "";
    return group("Readability", `${tone}${range("Dim the background", "bg.scrim", b.scrim, 0, 80, "%")}`);
  }
  // The four module card styles (Page section).
  const CARDS = [["card", "With card"], ["none", "Without card"], ["transparent", "Transparent"], ["outline", "Outline"]];
  const cardPicker = (d) => `<div class="dz-cards" role="group" aria-label="Module cards">${CARDS.map(([k, l]) => `<button type="button" data-pick="look.cards" data-val="${k}" class="dz-card-opt dz-card-${k}${D.cardStyle(d) === k ? " on" : ""}"><span class="dz-card-demo"><i></i><i></i></span><span>${l}</span></button>`).join("")}</div>`;

  // Image & video: upload either from the device, paste an image / video / YouTube link, or pick a free photo.
  function mediaTab(b) {
    const img = b.image;
    let body = `<div class="seg wide dz-seg" role="tablist">${[["upload", "Upload"], ["url", "Paste link"], ["pexels", "Free photos"]].map(([v, l]) => `<button type="button" data-imgsrc="${v}" class="${imgSource === v ? "active" : ""}">${l}</button>`).join("")}</div>`;
    if (imgSource === "upload") body += `<label class="pick"><input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" data-bgmedia><span>＋ Upload an image or video</span></label><p class="upload-note" id="dz-media-note" hidden></p>`;
    if (imgSource === "url") body += `<form class="dz-search" data-form="medialink"><input type="url" name="url" placeholder="Paste an image, video or YouTube link" aria-label="Image or video link"><button type="submit" class="btn small primary">Use</button></form><p class="fine" id="dz-media-link-note" hidden></p>`;
    if (imgSource === "pexels") {
      body += `<form class="dz-search" data-form="pexels"><input type="search" name="q" value="${h(pexels.q)}" placeholder="Search e.g. beach, pastel, city" aria-label="Search free photos"><button type="submit" class="btn small primary">Search</button></form>
        <div class="dz-results" id="dz-pexels">${pexelsResults()}</div>
        <p class="fine" id="dz-source">${sourceNote()}</p>`;
    }
    // Adjusting a chosen photo (not while pasting a link).
    if (b.type === "image" && img.url && imgSource !== "url") {
      body += group("Adjust", `${range("Zoom", "bg.image.zoom", img.zoom, 100, 300, "%")}${range("Up / down", "bg.image.y", img.y, 0, 100, "%")}
        <div class="pick-field"><span class="lbl">Fit</span>${segRow("bg.image.fit", img.fit, [["cover", "Fill the page"], ["contain", "Show whole photo"]])}</div>
        <button type="button" class="btn small" data-act="img-reset">Reset</button>
        ${img.credit && img.credit.name ? `<p class="fine">${D.creditHtml(img.credit)}</p>` : ""}`);
    }
    if (b.type === "video" && imgSource !== "url") body += `<button type="button" class="btn small" data-act="video-remove">Remove video</button>`;
    return body;
  }

  function pexelsResults() {
    if (pexels.busy && !pexels.items.length) return `<p class="fine dz-loading"><span class="tr-spinner" aria-hidden="true"></span> Searching…</p>`;
    if (pexels.error) return `<p class="fine error">${h(pexels.error)}</p>`;
    if (!pexels.items.length) return pexels.q ? `<p class="fine">No photos found for “${h(pexels.q)}”. Try another word.</p>` : `<p class="fine">Search to see free photos.</p>`;
    return pexels.items.map((p) => `<button type="button" class="dz-ph" data-pexel="${p.id}" title="Photo by ${h(p.photographer)}" style="background:${h(p.avg || "#ddd")}"><img src="${h(p.thumb)}" alt="${h(p.alt || "Photo")}" loading="lazy"></button>`).join("") +
      (pexels.more ? `<button type="button" class="btn small dz-more" data-act="pexels-more" ${pexels.busy ? "disabled" : ""}>${pexels.busy ? "Loading…" : "More photos"}</button>` : "");
  }

  // Free photos: Pexels when its key is set up on the server, otherwise Openverse
  // (Creative Commons photos, no key needed, searched straight from the browser).
  let pexelsReady = null;
  const openverse = async (q, page) => {
    const qs = new URLSearchParams({ q: q || "abstract background", page, page_size: 20, license_type: "commercial,modification", category: "photograph", mature: "false" });
    const res = await fetch(`https://api.openverse.org/v1/images/?${qs}`);
    if (res.status === 429) throw new Error("Too many searches for now. Please wait a minute and try again.");
    if (!res.ok) throw new Error("Couldn't reach the photo library. Please try again.");
    const data = await res.json();
    const lic = (r) => `${r.license === "cc0" ? "CC0" : r.license === "pdm" ? "Public domain" : `CC ${String(r.license).toUpperCase()}`}${r.license_version && !["cc0", "pdm"].includes(r.license) ? ` ${r.license_version}` : ""}`;
    return {
      more: page < (data.page_count || 1),
      photos: (data.results || []).filter((r) => r.url && /^https:/.test(r.url)).map((r) => ({
        id: r.id, thumb: r.thumbnail, url: r.url, alt: r.title || "", avg: "",
        photographer: r.creator || "Unknown", photographerUrl: r.creator_url || r.foreign_landing_url, page: r.foreign_landing_url,
        title: r.title || "", source: "Openverse", license: lic(r), licenseUrl: r.license_url || "",
      })),
    };
  };
  const pexelsApi = async (q, page) => {
    const res = await fetch(`/api/pexels?q=${encodeURIComponent(q)}&page=${page}`);
    if (res.status === 503) { pexelsReady = false; return null; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error("Couldn't reach the photo library. Please try again.");
    pexelsReady = true;
    return { more: !!data.more, photos: (data.photos || []).map((p) => ({ ...p, source: "Pexels", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/" })) };
  };

  let searchId = 0;
  async function searchPexels(q, more = false) {
    const id = ++searchId; // only the latest search may show its results
    pexels = more ? { ...pexels, busy: true, error: "" } : { q, items: [], page: 1, busy: true, error: "", more: false };
    if ($("dz-pexels")) $("dz-pexels").innerHTML = pexelsResults();
    try {
      const page = more ? pexels.page + 1 : 1;
      const data = (pexelsReady !== false && (await pexelsApi(pexels.q, page))) || (await openverse(pexels.q, page));
      if (id !== searchId) return;
      pexels = { ...pexels, items: [...pexels.items, ...data.photos], page, busy: false, more: data.more };
    } catch (err) {
      if (id !== searchId) return;
      pexels = { ...pexels, busy: false, error: err.message || "Couldn't reach the photo library. Please try again." };
    }
    if ($("dz-pexels")) $("dz-pexels").innerHTML = pexelsResults();
    const src = $("dz-source");
    if (src) src.innerHTML = sourceNote();
  }

  const sourceNote = () => (pexelsReady
    ? `<a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Photos provided by Pexels</a>. Free to use.`
    : `Free Creative Commons photos from <a href="https://openverse.org" target="_blank" rel="noopener noreferrer">Openverse</a>. The photographer's credit is shown on your page.`);

  function setImage(url, credit = null) {
    change((d) => { d.bg.type = "image"; d.bg.image = { url, zoom: 100, x: 50, y: 50, fit: "cover", credit }; if (d.bg.scrim === 0) d.bg.scrim = 20; }, { panel: true });
  }

  function videoTab(b) {
    const v = b.video.url;
    const src = D.videoSource(v);
    const uploaded = src && src.kind === "file";
    return `<label class="pick"><input type="file" accept="video/mp4,video/webm,video/quicktime" data-bgvideo><span>＋ Upload a video (MP4, up to 50 MB)</span></label>
      <form class="dz-search" data-form="video"><input type="url" name="url" value="${uploaded ? "" : h(v)}" placeholder="Or paste a YouTube link" aria-label="YouTube link"><button type="submit" class="btn small primary">Use</button></form>
      <p class="fine${v && !src ? " error" : ""}" id="dz-video-note">${v && !src ? "That link can't play as a background. Use a YouTube link or upload a video." : b.type === "video" ? `Playing${uploaded ? " your uploaded video" : ""}, muted and on loop.` : ""}</p>
      ${b.type === "video" ? `<button type="button" class="btn small" data-act="video-remove">Remove video</button>` : ""}`;
  }

  // ---------- Text ----------

  function textTab() {
    const t = design().text;
    return `<div class="dz-box"><p class="dz-box-title">Headings</p>
        <label><span class="lbl">Font</span>${fontSelect("text.headFont", t.headFont, true)}</label>
        <p class="dz-font-sample dz-head-sample" style="font-family:${D.fontStack(t.headFont || t.font)};font-weight:${t.headWeight};${t.headCase === "upper" ? "text-transform:uppercase;" : ""}">Your Name</p>
        <div class="pick-field"><span class="lbl">Colour</span>${swatches("text.headColor", ["#1c1c1a", "#5b4bd6", "#d85a30", "#0f6e56", "#9d174d", "#1d4ed8", "#ffffff", "#f2e27d"], t.headColor, autoChip("text.headColor", !t.headColor))}</div>
        <div class="pick-field"><span class="lbl">Weight</span>${segRow("text.headWeight", t.headWeight, [[400, "Regular"], [600, "Semi-bold"], [700, "Bold"], [800, "Heavy"]])}</div>
        <div class="pick-field"><span class="lbl">Letters</span>${segRow("text.headCase", t.headCase, [["none", "Normal"], ["upper", "UPPERCASE"]])}</div>
      </div>
      <div class="dz-box"><p class="dz-box-title">Body text</p>
        <label><span class="lbl">Font</span>${fontSelect("text.font", t.font, false)}</label>
        <p class="dz-font-sample" style="font-family:${D.fontStack(t.font)}">The quick brown fox jumps over the lazy dog.</p>
        <div class="pick-field"><span class="lbl">Colour</span>${swatches("text.color", ["#1c1c1a", "#3f3f46", "#14213d", "#4a1b0c", "#04342c", "#ffffff", "#f6f5f0", "#fde68a"], t.color, autoChip("text.color", !t.color))}</div>
      </div>`;
  }

  // ---------- Page ----------

  function pageTab() {
    const d = design();
    const l = d.look;
    const CARD_COLORS = ["#ffffff", "#f7f6f2", "#fff8e1", "#fde2e4", "#e3f0ff", "#e1f5ee", "#1c1c1a", "#14213d"];
    const INK = ["#5b4bd6", "#141413", "#e11d74", "#2563eb", "#0f6e56", "#ea580c", "#f2e27d", "#ffffff"];
    return group("Module cards", cardPicker(d) + (D.cardStyle(d) === "card" ? `<div class="pick-field"><span class="lbl">Card colour</span>${swatches("look.cardColor", CARD_COLORS, l.cardColor)}</div>` : "")) +
      group("Links look like", segRow("look.links", l.links, [["card", "Cards"], ["pill", "Buttons"], ["underline", "Lines"]]) +
        (l.links === "pill" ? `<div class="pick-field"><span class="lbl">Button colour</span>${swatches("look.btnColor", INK, l.btnColor || l.accent || D.THEMES[site.theme] || "")}</div>` : "") +
        (l.links === "underline" ? `<div class="pick-field"><span class="lbl">Line colour</span>${swatches("look.lineColor", INK, l.lineColor || l.accent || D.THEMES[site.theme] || "")}</div>` : "")) +
      group("Hover colour", swatches("look.hover", ["#f2e27d", "#ffb4a2", "#a5b4fc", "#86efac", "#7dd3fc", "#f9a8d4", "#1c1c1a", "#ffffff"], l.hover), "The glow when visitors point at a link or card.");
  }

  // ---------- Templates ----------

  // A small drawing of the template: background, photo, name in its font, and its module style.
  function thumb(tpl) {
    const d = D.normalize(tpl.design);
    const a = D.pageAttrs(d, "violet");
    const b = d.bg;
    const bg = b.type === "color" ? b.color : b.type === "gradient" ? `linear-gradient(${b.gradient.dir},${b.gradient.colors.join(",")})`
      : b.type === "anim" ? `radial-gradient(circle at 20% 25%, ${b.anim.colors[0]}88, transparent 45%), radial-gradient(circle at 80% 30%, ${b.anim.colors[1]}77, transparent 45%), radial-gradient(circle at 50% 90%, ${b.anim.colors[2]}77, transparent 50%), ${b.anim.base}` : "#ffffff";
    const s = T.SAMPLES[tpl.cat];
    const side = tpl.profile.layout === "side";
    // Same layout classes as the real page, so split/bento/timeline… show their real arrangement.
    return `<div class="tpl-thumb" style="background:${bg}">
      <div class="pb-page tpl-mini ${a.cls}" style="${a.style}">
        <section class="pb-block pb-profile-block"><div class="tpl-head${side ? " tpl-side" : ""}"><img src="${h(tpl.photo)}" alt="" loading="lazy" style="border-radius:${tpl.profile.radius}%"><div><b>${h(s.name)}</b><i></i></div></div></section>
        <section class="pb-block pb-text-block tpl-bar"><i></i><i></i><i class="short"></i></section>
        <section class="pb-block pb-stats-block tpl-row"><span></span><span></span></section>
        <section class="pb-block pb-link-block tpl-link"><span class="pb-link"><span class="pb-link-text"><strong>${h(s.link)}</strong></span></span></section>
        <section class="pb-block pb-rates-block tpl-bar"><i></i><i class="short"></i></section>
      </div>
    </div>`;
  }

  function templatesTab() {
    const list = T.TEMPLATES.filter((x) => x.cat === tplCat);
    D.loadFonts(null, [...new Set(list.flatMap((x) => [x.design.text.font, x.design.text.headFont]))]);
    const current = design().template;
    const cat = T.CATEGORIES.find(([k]) => k === tplCat);
    return `<div class="dz-cats" role="tablist">${T.CATEGORIES.map(([k, l]) => `<button type="button" data-tplcat="${k}" class="${k === tplCat ? "active" : ""}" role="tab">${l}</button>`).join("")}</div>
      <p class="fine">${h(cat[2])}.</p>
      <div class="tpl-grid">${list.map((tpl) => `<article class="tpl-card${tpl.id === current ? " on" : ""}">
        <button type="button" class="tpl-open" data-tpl-preview="${tpl.id}" aria-label="Preview ${h(tpl.name)}">${thumb(tpl)}</button>
        <div class="tpl-meta"><strong>${h(tpl.name)}</strong>${tpl.id === current ? `<span class="tpl-inuse">In use</span>` : ""}<span>${h(tpl.about)}</span></div>
        <div class="tpl-actions"><button type="button" class="btn small" data-tpl-preview="${tpl.id}">Preview</button><button type="button" class="btn small primary" data-tpl-use="${tpl.id}">Use</button></div>
      </article>`).join("")}</div>`;
  }

  // Is this module still empty?
  const isEmpty = (b) => {
    switch (b.type) {
      case "text": return !String(b.html || "").replace(/<[^>]+>|&nbsp;|\s/g, "");
      case "link": return !b.text && !b.url;
      case "stats": return !(b.items || []).some((i) => i.value);
      case "rates": return !(b.items || []).some((i) => i.price);
      case "socials": return !(b.items || []).length;
      case "instagram": return !Object.values(window.Portfolio.previewAccounts(b)).some(Boolean);
      default: return false;
    }
  };

  // Sample content for a module type; withNumbers fills numbers and prices (previews only).
  function sampleFields(type, cat, withNumbers) {
    const s = T.SAMPLES[cat];
    if (type === "text") return { html: s.text };
    if (type === "link") return { text: s.link, url: withNumbers ? "https://example.com" : "" };
    if (type === "stats") return { items: s.stats.map(([label, value]) => ({ label, value: withNumbers ? value : "" })) };
    if (type === "rates") return { items: s.rates.map(([label, price]) => ({ label, price: withNumbers ? price : "" })) };
    if (type === "socials") return withNumbers ? { items: [{ platform: "instagram", value: "creator" }, { platform: "youtube", value: "@creator" }, { platform: "email", value: "hello@example.com" }] } : { items: [] };
    return {};
  }

  // The creator's page with the template applied. Rules: keep everything they made; fill only what's
  // empty or missing. preview = also fill name, bio, numbers and prices with samples, without saving.
  function merged(tpl, preview) {
    const blocks = clone(site.blocks);
    const added = [];
    const filled = [];
    const make = (type, extra) => ({ id: Math.random().toString(36).slice(2, 10), type, ...window.Portfolio.BLOCKS[type].make(), ...extra });
    let prof = blocks.find((b) => b.type === "profile");
    if (!prof) {
      prof = make("profile", { name: (typeof profile !== "undefined" && profile && profile.name) || "" });
      blocks.unshift(prof);
      added.push(prof.id);
    }
    const profBefore = { layout: prof.layout, size: prof.size, radius: prof.radius, photo: prof.photo, photoName: prof.photoName, photoSample: prof.photoSample };
    prof.layout = tpl.profile.layout;
    prof.size = tpl.profile.size;
    prof.radius = tpl.profile.radius;
    if (!prof.photo || prof.photoSample) Object.assign(prof, { photo: abs(tpl.photo), photoName: "Sample photo", photoSample: !preview || !prof.photo || prof.photoSample, zoom: 100, posY: 50 });
    if (preview) {
      if (!prof.name) prof.name = T.SAMPLES[tpl.cat].name;
      if (!prof.bio) prof.bio = T.SAMPLES[tpl.cat].bio;
      prof.photoSample = false;
    }
    let after = blocks.indexOf(prof);
    for (const type of tpl.mods) {
      const existing = blocks.find((b) => b.type === type);
      if (existing) {
        if (isEmpty(existing) || isUntouchedSample(existing)) {
          const sample = sampleFields(type, tpl.cat, preview);
          if (Object.keys(sample).length) { filled.push({ id: existing.id, before: clone(existing) }); Object.assign(existing, sample); }
        }
        after = Math.max(after, blocks.indexOf(existing));
        continue;
      }
      const b = make(type, sampleFields(type, tpl.cat, preview));
      blocks.splice(after + 1, 0, b);
      after += 1;
      added.push(b.id);
    }
    return { blocks, added, filled, profId: prof.id, profBefore };
  }

  function applyTemplate(id) {
    const tpl = T.TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    const m = merged(tpl, false);
    const samples = {};
    for (const b of m.blocks) if (m.added.includes(b.id) || m.filled.some((f) => f.id === b.id)) samples[b.id] = sampleKey(b);
    site.templateSamples = { ...(site.templateSamples || {}), ...samples };
    site.blocks = m.blocks;
    site.design = D.normalize({ ...clone(tpl.design), template: tpl.id });
    saveSite();
    renderCanvas();
    render();
    if (window.cpTrack) window.cpTrack("template_apply", { template: tpl.id });
  }

  // What a sample module looks like, to tell later whether the creator has edited it.
  const sampleKey = (b) => JSON.stringify([b.html, b.text, b.url, b.items]);
  const isUntouchedSample = (b) => !!(site.templateSamples && site.templateSamples[b.id] && site.templateSamples[b.id] === sampleKey(b));

  // Full-size preview in a dialog, with the creator's own content and samples only where empty.
  function preview(id) {
    const tpl = T.TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    const list = T.TEMPLATES.filter((x) => x.cat === tpl.cat);
    const i = list.indexOf(tpl);
    const m = merged(tpl, true);
    const fake = { ...site, blocks: m.blocks, design: D.normalize({ ...clone(tpl.design), template: tpl.id }) };
    let box = $("tpl-modal");
    if (!box) {
      box = document.createElement("div");
      box.id = "tpl-modal";
      box.className = "tpl-modal";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      document.body.appendChild(box);
      box.addEventListener("click", (e) => {
        if (e.target === box || e.target.closest("[data-tpl-close]")) return closePreview();
        const go = e.target.closest("[data-tpl-go]");
        if (go) return preview(go.dataset.tplGo);
        const use = e.target.closest("[data-tpl-use]");
        if (use) { closePreview(); applyTemplate(use.dataset.tplUse); }
        const dev = e.target.closest("[data-tpl-device]");
        if (dev) { box.querySelector(".tpl-stage").dataset.device = dev.dataset.tplDevice; box.querySelectorAll("[data-tpl-device]").forEach((x) => x.classList.toggle("active", x === dev)); }
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.hidden) closePreview(); });
    }
    const device = (box.querySelector(".tpl-stage") || {}).dataset?.device || "desktop";
    box.hidden = false;
    box.setAttribute("aria-label", `${tpl.name} template preview`);
    box.innerHTML = `<div class="tpl-modal-box">
      <header>
        <div><strong>${h(tpl.name)}</strong> <span class="fine">${h(T.CATEGORIES.find(([k]) => k === tpl.cat)[1])} · ${i + 1} of ${list.length}</span></div>
        <div class="seg" role="group" aria-label="Preview size"><button type="button" data-tpl-device="desktop" class="${device === "desktop" ? "active" : ""}">Desktop</button><button type="button" data-tpl-device="mobile" class="${device === "mobile" ? "active" : ""}">Mobile</button></div>
        <button type="button" class="x" data-tpl-close aria-label="Close preview">✕</button>
      </header>
      <p class="fine tpl-modal-note">Your own text, photos and links are kept. Empty spots show sample content here; numbers and prices are never added to your page.</p>
      <div class="tpl-stage" data-device="${device}"><div class="tpl-stage-page">${window.Portfolio.renderPortfolio(fake)}</div></div>
      <footer>
        <button type="button" class="btn" data-tpl-go="${list[(i - 1 + list.length) % list.length].id}">‹ Previous</button>
        <button type="button" class="btn primary" data-tpl-use="${tpl.id}">Use this template</button>
        <button type="button" class="btn" data-tpl-go="${list[(i + 1) % list.length].id}">Next ›</button>
      </footer>
    </div>`;
    window.Portfolio.enhance(box.querySelector(".tpl-stage-page"));
    box.querySelector("[data-tpl-use]").focus();
  }
  function closePreview() { const box = $("tpl-modal"); if (box) { box.hidden = true; box.innerHTML = ""; } }

  // ---------- panel ----------

  const SECTIONS = [["templates", "Templates"], ["background", "Background"], ["text", "Text"], ["page", "Page"]];
  function render() {
    const host = $("dz-body");
    if (!host) return;
    host.innerHTML = SECTIONS.map(([k, l]) => `<section class="dz-acc${section === k ? " open" : ""}">
        <button type="button" class="dz-acc-head" data-dz="${k}" aria-expanded="${section === k}"><span>${l}</span><span class="dz-chev" aria-hidden="true"></span></button>
        ${section === k ? `<div class="dz-acc-body">${k === "templates" ? templatesTab() : k === "background" ? bgTab() : k === "text" ? textTab() : pageTab()}</div>` : ""}
      </section>`).join("");
    setupDrag();
  }

  // Drag inside the frame to pick which part of the photo shows.
  function setupDrag() {
    const frame = $("dz-frame");
    if (!frame) return;
    frame.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      frame.setPointerCapture(e.pointerId);
      const r = frame.getBoundingClientRect();
      const sx = e.clientX;
      const sy = e.clientY;
      const { x: x0, y: y0 } = design().bg.image;
      const lim = (v) => Math.round(Math.max(0, Math.min(100, v)));
      const move = (ev) => {
        // Dragging right shows more of the left side, like moving a photo under a window.
        const dx = ((ev.clientX - sx) / r.width) * 150;
        const dy = ((ev.clientY - sy) / r.height) * 150;
        change((d) => { d.bg.image.x = lim(x0 - dx); d.bg.image.y = lim(y0 - dy); });
        syncImageControls();
      };
      const up = () => { frame.removeEventListener("pointermove", move); frame.removeEventListener("pointerup", up); frame.removeEventListener("pointercancel", up); };
      frame.addEventListener("pointermove", move);
      frame.addEventListener("pointerup", up);
      frame.addEventListener("pointercancel", up);
    });
  }

  // Keep the frame and sliders in step while dragging, without redrawing the panel.
  function syncImageControls() {
    const img = design().bg.image;
    const fi = document.querySelector("#dz-frame img");
    if (fi) fi.setAttribute("style", `object-fit:${img.fit};object-position:${img.x}% ${img.y}%;transform:scale(${img.zoom / 100});transform-origin:${img.x}% ${img.y}%`);
    for (const [f, v] of [["bg.image.x", img.x], ["bg.image.y", img.y], ["bg.image.zoom", img.zoom]]) {
      const r = document.querySelector(`[data-range="${f}"]`);
      if (!r) continue;
      r.value = v;
      r.style.setProperty("--fill", `${(((v - r.min) / (r.max - r.min)) * 100).toFixed(1)}%`);
      r.nextElementSibling.textContent = `${v}${r.dataset.unit}`;
    }
  }

  const setPathValue = (obj, path, v) => { const k = path.split("."); let o = obj; for (const p of k.slice(0, -1)) o = o[p] ??= {}; o[k.at(-1)] = v; };
  const numeric = (path) => /scrim|zoom|\.x$|\.y$|angle|headScale|headSpacing|headWeight|radius|width|gap/.test(path);

  function bind() {
    const panel = $("panel-look");
    panel.addEventListener("click", async (e) => {
      const t = e.target.closest("button");
      if (!t || t.disabled) return;
      if (t.dataset.dz) { section = section === t.dataset.dz ? null : t.dataset.dz; render(); return; }
      if (t.dataset.bgview) {
        bgView = t.dataset.bgview;
        const d = design();
        // Colour and gradient always work, so choosing them shows them straight away.
        if (bgView === "color" && d.bg.type !== "color") change((x) => { x.bg.type = "color"; });
        if (bgView === "gradient" && d.bg.type !== "gradient") change((x) => { x.bg.type = "gradient"; });
        if (bgView === "media" && !["image", "video"].includes(d.bg.type)) {
          if (d.bg.image.url) change((x) => { x.bg.type = "image"; });
          else if (D.videoSource(d.bg.video.url)) change((x) => { x.bg.type = "video"; });
        }
        render();
        return;
      }
      if (t.dataset.imgsrc) { imgSource = t.dataset.imgsrc; render(); if (imgSource === "pexels" && !pexels.items.length && !pexels.busy) searchPexels(pexels.q || "abstract background"); return; }
      if (t.dataset.tplcat) { tplCat = t.dataset.tplcat; render(); return; }
      if (t.dataset.tplPreview) return preview(t.dataset.tplPreview);
      if (t.dataset.tplUse) return applyTemplate(t.dataset.tplUse);
      if (t.dataset.pick) {
        const path = t.dataset.pick;
        let v = t.dataset.val;
        if (numeric(path)) v = Number(v);
        // The four original colour themes stay themes; any other colour is a custom accent.
        if (path === "look.accent") {
          const theme = Object.keys(D.THEMES).find((k) => D.THEMES[k] === v);
          if (theme) site.theme = theme;
          change((d) => { d.look.accent = theme ? "" : v; }, { panel: true });
          return;
        }
        change((d) => { setPathValue(d, path, v); if (path === "bg.color") d.bg.type = "color"; }, { panel: true });
        return;
      }
      if (t.dataset.pexel) {
        const p = pexels.items.find((x) => String(x.id) === t.dataset.pexel);
        if (p) setImage(p.url, { name: p.photographer, url: p.photographerUrl || p.page, title: p.title || "", page: p.page || "", source: p.source, license: p.license, licenseUrl: p.licenseUrl });
        return;
      }
      switch (t.dataset.act) {
        case "bg-none": change((d) => { d.bg.type = "none"; }, { panel: true }); break;
        case "grad": change((d) => { d.bg.type = "gradient"; d.bg.gradient.colors = [...D.GRADIENTS[Number(t.dataset.i)]]; }, { panel: true }); break;
        case "grad-dir": change((d) => { d.bg.type = "gradient"; d.bg.gradient.dir = t.dataset.dir; }, { panel: true }); break;
        case "grad-add": change((d) => { d.bg.type = "gradient"; d.bg.gradient.colors.push("#ffffff"); }, { panel: true }); break;
        case "grad-del": change((d) => { d.bg.gradient.colors.splice(Number(t.dataset.i), 1); }, { panel: true }); break;
        case "anim": change((d) => { const a = D.ANIMS[t.dataset.val]; const keep = d.bg.type === "anim"; d.bg.type = "anim"; if (!keep || d.bg.anim.preset !== t.dataset.val) d.bg.anim = { preset: t.dataset.val, colors: [...a.colors], base: a.base }; }, { panel: true }); break;
        case "pal": change((d) => { d.bg.anim.colors = [...D.ANIM_PALETTES[Number(t.dataset.i)]]; }, { panel: true }); break;
        case "img-reset": change((d) => { Object.assign(d.bg.image, { zoom: 100, x: 50, y: 50, fit: "cover" }); }, { panel: true }); break;
        case "video-remove": change((d) => { d.bg.type = d.bg.image.url ? "image" : "none"; d.bg.video.url = ""; }, { panel: true }); render(); break;
        case "pexels-more": searchPexels(pexels.q, true); break;
      }
    });
    panel.addEventListener("input", (e) => {
      const r = e.target;
      if (r.dataset.range) {
        const v = Number(r.value);
        r.style.setProperty("--fill", `${(((v - r.min) / (r.max - r.min)) * 100).toFixed(1)}%`);
        r.nextElementSibling.textContent = `${v}${r.dataset.unit}`;
        if (typeof undoKey !== "undefined") undoKey = `design:${r.dataset.range}`;
        change((d) => setPathValue(d, r.dataset.range, v));
        if (r.dataset.range.startsWith("bg.image")) syncImageControls();
        if (r.dataset.range.startsWith("text.head")) updateHeadSample();
      }
      if (r.dataset.color) {
        const path = r.dataset.color;
        if (typeof undoKey !== "undefined") undoKey = `design:${path}`;
        change((d) => {
          const parts = path.split(".");
          if (parts[1] === "anim" && parts[2] === "colors") d.bg.anim.colors[Number(parts[3])] = r.value;
          else if (parts[1] === "gradient" && parts[2] === "colors") { d.bg.gradient.colors[Number(parts[3])] = r.value; const stop = r.parentNode.querySelector("span"); if (stop) stop.textContent = r.value; const pv = document.querySelector(".dz-grad-preview"); if (pv) pv.style.background = `linear-gradient(${d.bg.gradient.dir}, ${d.bg.gradient.colors.join(", ")})`; }
          else setPathValue(d, path, r.value);
          if (path === "bg.color") d.bg.type = "color";
          if (path.startsWith("bg.gradient")) d.bg.type = "gradient";
        });
      }
    });
    panel.addEventListener("change", async (e) => {
      const s = e.target;
      if (s.dataset.select) change((d) => setPathValue(d, s.dataset.select, s.value), { panel: true });
      if (s.dataset.check) change((d) => setPathValue(d, s.dataset.check, s.checked));
      if (s.dataset.color) render(); // mark the picked swatch
      if (s.dataset.bgmedia !== undefined && s.files.length) {
        const note = $("dz-media-note");
        const file = s.files[0];
        note.hidden = false;
        note.classList.remove("error");
        try {
          if (/^image\//.test(file.type)) {
            note.textContent = "Uploading…";
            setImage(await uploadImage(file, 2000));
          } else if (/^video\/(mp4|webm|quicktime)$/.test(file.type)) {
            if (file.size > 50 * 1024 * 1024) throw new Error("That video is over 50 MB. Try a shorter clip.");
            if (!window.Cloud || !Cloud.ready) throw new Error("Video uploads turn on once you're signed in. Meanwhile, paste a YouTube link.");
            note.textContent = "Uploading your video…";
            const url = await Cloud.upload(file);
            change((d) => { d.bg.type = "video"; d.bg.video.url = url; if (d.bg.scrim === 0) d.bg.scrim = 20; }, { panel: true });
          } else throw new Error("Please choose a JPG, PNG, WebP image or an MP4, WebM, MOV video.");
        } catch (err) { note.textContent = err.message || "Upload failed. Please try again."; note.classList.add("error"); }
        return;
      }
      if (s.dataset.bgvideo !== undefined && s.files.length) {
        const note = $("dz-video-note");
        const file = s.files[0];
        note.classList.remove("error");
        if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) { note.textContent = "Please choose an MP4, WebM or MOV video."; note.classList.add("error"); return; }
        if (file.size > 50 * 1024 * 1024) { note.textContent = "That video is over 50 MB. Try a shorter clip."; note.classList.add("error"); return; }
        if (!window.Cloud || !Cloud.ready) { note.textContent = "Video uploads turn on once your account is set up. Meanwhile, paste a YouTube link."; note.classList.add("error"); return; }
        note.textContent = "Uploading your video…";
        try {
          const url = await Cloud.upload(file);
          change((d) => { d.bg.type = "video"; d.bg.video.url = url; if (d.bg.scrim === 0) d.bg.scrim = 20; }, { panel: true });
        } catch (err) { note.textContent = err.message || "Upload failed. Please try again."; note.classList.add("error"); }
      }
      if (s.dataset.bgupload !== undefined && s.files.length) {
        const n = $("dz-upload-note");
        n.hidden = false;
        n.classList.remove("error");
        n.textContent = "Uploading…";
        try { setImage(await uploadImage(s.files[0], 2000)); } catch (err) { n.textContent = err.message || "Upload failed. Please try again."; n.classList.add("error"); }
      }
    });
    panel.addEventListener("submit", (e) => {
      const f = e.target.dataset.form;
      if (!f) return;
      e.preventDefault();
      const val = e.target.elements[f === "pexels" ? "q" : "url"].value.trim();
      if (f === "pexels") { if (val) searchPexels(val); return; }
      if (f === "medialink") {
        const note = $("dz-media-link-note");
        const show = (t, err) => { note.hidden = false; note.textContent = t; note.classList.toggle("error", !!err); };
        if (!/^https?:\/\/\S+$/i.test(val)) return show("Please paste a full link starting with https://", true);
        if (D.videoSource(val)) {
          change((d) => { d.bg.type = "video"; d.bg.video.url = val; if (d.bg.scrim === 0) d.bg.scrim = 20; }, { panel: true });
          return;
        }
        show("Checking the link…");
        const test = new Image();
        test.onload = () => setImage(val);
        test.onerror = () => show("That link didn't open as an image or video. Use a direct image link, a YouTube link, or an .mp4 link.", true);
        test.src = val;
        return;
      }
      if (f === "imgurl") {
        const note = $("dz-url-note");
        if (!/^https?:\/\/\S+$/i.test(val)) { note.textContent = "Please paste a full link starting with https://"; note.classList.add("error"); return; }
        note.textContent = "Checking the image…";
        note.classList.remove("error");
        const test = new Image();
        test.onload = () => setImage(val);
        test.onerror = () => { note.textContent = "That link didn't open as an image. Use a direct link to a .jpg, .png or .webp file."; note.classList.add("error"); };
        test.src = val;
      }
      if (f === "video") {
        if (!D.videoSource(val)) {
          change((d) => { d.bg.video.url = val; }, { panel: true });
          return;
        }
        change((d) => { d.bg.type = "video"; d.bg.video.url = val; if (d.bg.scrim === 0) d.bg.scrim = 20; }, { panel: true });
      }
    });
  }

  function updateHeadSample() {
    const t = design().text;
    const s = document.querySelector(".dz-head-sample");
    if (s) s.style.letterSpacing = `${t.headSpacing / 100}em`;
  }

  function init() {
    const panel = $("panel-look");
    if (!panel || panel.dataset.dzReady) return;
    panel.dataset.dzReady = "1";
    // The link name (and the original colour themes, now part of Accent colour) move under "Page".
    const old = [...panel.children];
    const isThemes = (n) => n.id === "themes" || (n.classList.contains("panel-label") && n.textContent.trim() === "Colour");
    panel.innerHTML = `<div id="dz-body"></div><div id="dz-old" hidden></div>`;
    old.forEach((n) => $("dz-old").appendChild(n));
    void isThemes;
    bind();
    render();
  }

  // Shown in a module's editor while it still has untouched template sample content.
  // Free photo search for other parts of the editor (the Profile Header's header image).
  async function findPhotos(q) {
    const data = (pexelsReady !== false && (await pexelsApi(q, 1))) || (await openverse(q, 1));
    return data.photos;
  }

  window.Designs = { init, render, refresh, isUntouchedSample, findPhotos, showSection: (s) => { section = s; render(); } };
})();
