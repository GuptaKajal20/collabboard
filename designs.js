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

  let section = "templates";
  let bgView = null;
  let imgSource = "pexels";
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
    const view = bgView || (b.type === "none" ? "color" : b.type);
    const types = [["color", "Colour"], ["gradient", "Gradient"], ["image", "Image"], ["video", "Video"], ["anim", "Animated"]];
    let body = `<div class="dz-types" role="tablist">${types.map(([v, l]) => `<button type="button" data-bgview="${v}" class="${view === v ? "active" : ""}${b.type === v ? " live" : ""}" role="tab" aria-selected="${view === v}">${l}</button>`).join("")}</div>`;
    body += b.type !== "none" ? `<p class="fine dz-current">Showing: <strong>${{ color: "Colour", gradient: "Gradient", image: "Image", video: "Video", anim: "Animated" }[b.type]}</strong> · <button type="button" class="link-btn" data-act="bg-none">Back to plain white</button></p>` : `<p class="fine dz-current">Showing: <strong>Plain white</strong></p>`;

    if (view === "color") body += group("Colour", swatches("bg.color", D.COLORS, b.type === "color" ? b.color : ""));
    if (view === "gradient") {
      body += group("Presets", `<div class="dz-swatches">${D.GRADIENTS.map(([a, c, ang]) => `<button type="button" class="dz-sw dz-grad${b.type === "gradient" && b.gradient.a === a && b.gradient.b === c ? " on" : ""}" data-act="grad" data-a="${a}" data-b="${c}" data-angle="${ang}" style="background:linear-gradient(${ang}deg,${a},${c})" aria-label="Gradient ${a} to ${c}"></button>`).join("")}</div>`);
      body += group("Your own", `<div class="dz-two"><label><span class="lbl">From</span><input type="color" data-color="bg.gradient.a" value="${b.gradient.a}"></label><label><span class="lbl">To</span><input type="color" data-color="bg.gradient.b" value="${b.gradient.b}"></label></div>${range("Direction", "bg.gradient.angle", b.gradient.angle, 0, 360, "°")}`);
    }
    if (view === "image") body += imageTab(b);
    if (view === "video") body += videoTab(b);
    if (view === "anim") {
      body += `<div class="dz-anims">${Object.entries(D.ANIMS).map(([k, a]) => {
        const on = b.type === "anim" && b.anim.preset === k;
        const c = on ? b.anim.colors : a.colors;
        return `<button type="button" class="dz-anim${on ? " on" : ""}" data-act="anim" data-val="${k}"><span class="dz-anim-sw dz-anim-${k}" style="--c1:${c[0]};--c2:${c[1]};--c3:${c[2]};--base:${on ? b.anim.base : a.base}"></span><span>${h(a.name)}</span></button>`;
      }).join("")}</div>`;
      if (b.type === "anim") {
        body += group("Colours", `<div class="dz-swatches">${D.ANIM_PALETTES.map((p, i) => `<button type="button" class="dz-sw dz-pal" data-act="pal" data-i="${i}" style="background:linear-gradient(90deg,${p.join(",")})" aria-label="Palette ${i + 1}"></button>`).join("")}</div>
          <div class="dz-three">${[0, 1, 2].map((i) => `<label><span class="lbl">Colour ${i + 1}</span><input type="color" data-color="bg.anim.colors.${i}" value="${b.anim.colors[i]}"></label>`).join("")}</div>
          <label class="dz-inline"><span class="lbl">Background</span><input type="color" data-color="bg.anim.base" value="${b.anim.base}"></label>`, "Animations are slow and subtle, and stay still for visitors who turn off motion.");
      }
    }
    if (["image", "video", "anim"].includes(b.type) && view === b.type) body += readability(d);
    return body;
  }

  function readability(d) {
    const b = d.bg;
    const tone = ["image", "video"].includes(b.type)
      ? `<div class="pick-field"><span class="lbl">This ${b.type === "image" ? "photo" : "video"} is mostly</span>${segRow("bg.tone", b.tone === "auto" ? "dark" : b.tone, [["dark", "Dark"], ["light", "Light"]])}</div>` : "";
    return group("Readability", `${tone}${range("Dim the background", "bg.scrim", b.scrim, 0, 80, "%")}
      <label><span class="lbl">Module cards</span>${cardSelect(d.look.cards)}</label>`, "Keep text easy to read over busy backgrounds.");
  }
  const cardSelect = (v) => `<select data-select="look.cards">${[["auto", "Auto (recommended)"], ["none", "No cards"], ["solid", "White cards"], ["glass", "Frosted glass"], ["glass-dark", "Dark glass"], ["soft", "Soft tint"], ["outline", "Outline"], ["brutal", "Bold border"]].map(([k, l]) => `<option value="${k}" ${k === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;

  function imageTab(b) {
    const img = b.image;
    let body = `<div class="seg wide dz-seg" role="tablist">${[["pexels", "Free photos"], ["upload", "Upload"], ["url", "Paste link"]].map(([v, l]) => `<button type="button" data-imgsrc="${v}" class="${imgSource === v ? "active" : ""}">${l}</button>`).join("")}</div>`;
    if (imgSource === "pexels") {
      body += `<form class="dz-search" data-form="pexels"><input type="search" name="q" value="${h(pexels.q)}" placeholder="Search e.g. beach, pastel, city" aria-label="Search free photos"><button type="submit" class="btn small primary">Search</button></form>
        <div class="dz-results" id="dz-pexels">${pexelsResults()}</div>
        <p class="fine"><a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Photos provided by Pexels</a>. Free to use.</p>`;
    }
    if (imgSource === "upload") body += `<label class="pick"><input type="file" accept="image/png,image/jpeg,image/webp" data-bgupload><span>＋ Upload from your device</span></label><p class="upload-note" id="dz-upload-note" hidden></p>`;
    if (imgSource === "url") body += `<form class="dz-search" data-form="imgurl"><input type="url" name="url" placeholder="https://…/photo.jpg" aria-label="Image link"><button type="submit" class="btn small primary">Use</button></form><p class="fine" id="dz-url-note">Paste a direct link to a JPG, PNG or WebP image.</p>`;
    if (img.url && b.type === "image") {
      const z = img.zoom / 100;
      body += group("Position", `<div class="dz-frame" id="dz-frame" title="Drag to choose what shows"><img src="${h(img.url)}" alt="" draggable="false" style="object-fit:${img.fit};object-position:${img.x}% ${img.y}%;transform:scale(${z});transform-origin:${img.x}% ${img.y}%"><span class="dz-frame-hint">Drag to move</span></div>
        ${range("Zoom", "bg.image.zoom", img.zoom, 100, 300, "%")}${range("Left / right", "bg.image.x", img.x, 0, 100, "%")}${range("Up / down", "bg.image.y", img.y, 0, 100, "%")}
        <div class="pick-field"><span class="lbl">Fit</span>${segRow("bg.image.fit", img.fit, [["cover", "Fill the page"], ["contain", "Show whole photo"]])}</div>
        <button type="button" class="btn small" data-act="img-reset">Reset position</button>
        ${img.credit && img.credit.name ? `<p class="fine">Photo by <a href="${h(img.credit.url)}" target="_blank" rel="noopener noreferrer">${h(img.credit.name)}</a> on Pexels</p>` : ""}`);
    }
    return body;
  }

  function pexelsResults() {
    if (pexels.busy && !pexels.items.length) return `<p class="fine dz-loading"><span class="tr-spinner" aria-hidden="true"></span> Searching…</p>`;
    if (pexels.error) return `<p class="fine error">${h(pexels.error)}</p>`;
    if (!pexels.items.length) return pexels.q ? `<p class="fine">No photos found for “${h(pexels.q)}”. Try another word.</p>` : `<p class="fine">Search to see free photos.</p>`;
    return pexels.items.map((p) => `<button type="button" class="dz-ph" data-pexel="${p.id}" title="Photo by ${h(p.photographer)}" style="background:${h(p.avg || "#ddd")}"><img src="${h(p.thumb)}" alt="${h(p.alt || "Photo")}" loading="lazy"></button>`).join("") +
      (pexels.more ? `<button type="button" class="btn small dz-more" data-act="pexels-more" ${pexels.busy ? "disabled" : ""}>${pexels.busy ? "Loading…" : "More photos"}</button>` : "");
  }

  async function searchPexels(q, more = false) {
    pexels = more ? { ...pexels, busy: true, error: "" } : { q, items: [], page: 1, busy: true, error: "", more: false };
    if ($("dz-pexels")) $("dz-pexels").innerHTML = pexelsResults();
    try {
      const page = more ? pexels.page + 1 : 1;
      const res = await fetch(`/api/pexels?q=${encodeURIComponent(pexels.q)}&page=${page}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error === "not-configured" ? "Free photo search is being set up. Meanwhile, upload a photo or paste a link." : "Couldn't reach the photo library. Please try again.");
      pexels = { ...pexels, items: [...pexels.items, ...(data.photos || [])], page, busy: false, more: !!data.more };
    } catch (err) {
      pexels = { ...pexels, busy: false, error: err.message };
    }
    if ($("dz-pexels")) $("dz-pexels").innerHTML = pexelsResults();
  }

  function setImage(url, credit = null) {
    change((d) => { d.bg.type = "image"; d.bg.image = { url, zoom: 100, x: 50, y: 50, fit: "cover", credit }; if (d.bg.scrim === 0) d.bg.scrim = 20; }, { panel: true });
  }

  function videoTab(b) {
    const v = b.video.url;
    const src = D.videoSource(v);
    return group("Video link", `<form class="dz-search" data-form="video"><input type="url" name="url" value="${h(v)}" placeholder="YouTube, Vimeo or .mp4 link" aria-label="Video link"><button type="submit" class="btn small primary">Use</button></form>
      <p class="fine${v && !src ? " error" : ""}" id="dz-video-note">${v && !src ? "We can't play this link as a background. Use a YouTube or Vimeo link, or a direct .mp4 / .webm file." : b.type === "video" ? "Plays muted and on loop behind your page. Visitors who turn off motion see the colour instead." : "Supported: YouTube, Vimeo, and direct .mp4 or .webm files (for example from Pexels Videos)."}</p>
      ${b.type === "video" ? `<button type="button" class="btn small" data-act="video-remove">Remove video</button>` : ""}`);
  }

  // ---------- Text ----------

  function textTab() {
    const t = design().text;
    return `<p class="fine">These apply to your whole page. To colour or style a few words, select them in a Text module.</p>` +
      group("Body text", `<label><span class="lbl">Font</span>${fontSelect("text.font", t.font, false)}</label>
        <p class="dz-font-sample" style="font-family:${D.fontStack(t.font)}">The quick brown fox jumps over the lazy dog.</p>
        <div class="pick-field"><span class="lbl">Colour</span>${swatches("text.color", ["#1c1c1a", "#3f3f46", "#14213d", "#4a1b0c", "#04342c", "#ffffff", "#f6f5f0", "#fde68a"], t.color, autoChip("text.color", !t.color))}</div>`) +
      group("Headings", `<label><span class="lbl">Font</span>${fontSelect("text.headFont", t.headFont, true)}</label>
        <p class="dz-font-sample dz-head-sample" style="font-family:${D.fontStack(t.headFont || t.font)};font-weight:${t.headWeight};${t.headCase === "upper" ? "text-transform:uppercase;" : ""}letter-spacing:${t.headSpacing / 100}em">Your Name</p>
        <div class="pick-field"><span class="lbl">Colour</span>${swatches("text.headColor", ["#1c1c1a", "#5b4bd6", "#d85a30", "#0f6e56", "#9d174d", "#1d4ed8", "#ffffff", "#f2e27d"], t.headColor, autoChip("text.headColor", !t.headColor))}</div>
        <div class="pick-field"><span class="lbl">Weight</span>${segRow("text.headWeight", t.headWeight, [[400, "Regular"], [600, "Semi-bold"], [700, "Bold"], [800, "Heavy"]])}</div>
        <div class="pick-field"><span class="lbl">Letters</span>${segRow("text.headCase", t.headCase, [["none", "Normal"], ["upper", "UPPERCASE"]])}</div>
        ${range("Size", "text.headScale", t.headScale, 70, 150, "%")}${range("Letter spacing", "text.headSpacing", t.headSpacing, -4, 12, "")}`, "Your name, link titles and big numbers.");
  }

  // ---------- Page ----------

  function pageTab() {
    const l = design().look;
    return group("Accent colour", `${swatches("look.accent", Object.values(D.THEMES).concat(["#e11d74", "#2563eb", "#ea580c", "#16a34a"]), l.accent || D.THEMES[site.theme] || "", "")}`, "Buttons, numbers and highlights.") +
      group("Modules", `<label><span class="lbl">Cards</span>${cardSelect(l.cards)}</label>
        ${range("Corner roundness", "look.radius", l.radius, 0, 32, "px")}
        ${range("Space between modules", "look.gap", l.gap, 0, 28, "px")}
        <div class="pick-field"><span class="lbl">Links look like</span>${segRow("look.links", l.links, [["card", "Cards"], ["pill", "Buttons"], ["underline", "Lines"]])}</div>
        <div class="pick-field"><span class="lbl">Numbers look like</span>${segRow("look.stats", l.stats, [["tiles", "Tiles"], ["plain", "Plain"]])}</div>`) +
      group("Layout", `<div class="pick-field"><span class="lbl">Align</span>${segRow("look.align", l.align, [["center", "Centre"], ["left", "Left"]])}</div>
        ${range("Page width", "look.width", l.width, 520, 900, "px")}
        <label class="check"><input type="checkbox" data-check="look.cover" ${l.cover ? "checked" : ""}> Colour banner behind your photo</label>`);
  }

  // ---------- Templates ----------

  // A small drawing of the template: background, photo, name in its font, and its module style.
  function thumb(tpl) {
    const d = D.normalize(tpl.design);
    const a = D.pageAttrs(d, "violet");
    const b = d.bg;
    const bg = b.type === "color" ? b.color : b.type === "gradient" ? `linear-gradient(${b.gradient.angle}deg,${b.gradient.a},${b.gradient.b})`
      : b.type === "anim" ? `radial-gradient(circle at 20% 25%, ${b.anim.colors[0]}88, transparent 45%), radial-gradient(circle at 80% 30%, ${b.anim.colors[1]}77, transparent 45%), radial-gradient(circle at 50% 90%, ${b.anim.colors[2]}77, transparent 50%), ${b.anim.base}` : "#ffffff";
    const s = T.SAMPLES[tpl.cat];
    const side = tpl.profile.layout === "side";
    return `<div class="tpl-thumb" style="background:${bg}">
      <div class="pb-page tpl-mini ${a.cls}" style="${a.style}">
        <div class="tpl-head${side ? " side" : ""}"><img src="${h(tpl.photo)}" alt="" loading="lazy" style="border-radius:${tpl.profile.radius}%"><div><b>${h(s.name)}</b><i></i></div></div>
        <div class="pb-block tpl-bar"><i></i><i></i><i class="short"></i></div>
        <div class="pb-block tpl-row"><span></span><span></span></div>
        <div class="pb-block tpl-link"><span class="pb-link"><span class="pb-link-text"><strong>${h(s.link)}</strong></span></span></div>
      </div>
    </div>`;
  }

  function templatesTab() {
    const list = T.TEMPLATES.filter((x) => x.cat === tplCat);
    D.loadFonts(null, [...new Set(list.flatMap((x) => [x.design.text.font, x.design.text.headFont]))]);
    const current = design().template;
    const cat = T.CATEGORIES.find(([k]) => k === tplCat);
    return `${site.templateUndo ? `<div class="dz-undo"><span>Template applied.</span><button type="button" class="btn small" data-act="tpl-undo">Undo</button></div>` : ""}
      <div class="dz-cats" role="tablist">${T.CATEGORIES.map(([k, l]) => `<button type="button" data-tplcat="${k}" class="${k === tplCat ? "active" : ""}" role="tab">${l}</button>`).join("")}</div>
      <p class="fine">${h(cat[2])}. Your text, photos and links stay when you switch.</p>
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
    site.templateUndo = { design: clone(site.design || null), theme: site.theme, added: m.added, filled: m.filled, profId: m.profId, profBefore: m.profBefore, samples };
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

  // Undo: previous design comes back; modules the template added go away unless they've been edited since.
  function undoTemplate() {
    const u = site.templateUndo;
    if (!u) return;
    site.design = u.design ? D.normalize(u.design) : undefined;
    site.theme = u.theme;
    site.blocks = site.blocks.filter((b) => !(u.added.includes(b.id) && (b.type === "profile" ? !b.name && !b.bio : u.samples[b.id] === sampleKey(b) || isEmpty(b))));
    for (const f of u.filled) {
      const i = site.blocks.findIndex((b) => b.id === f.id);
      if (i >= 0 && u.samples[f.id] === sampleKey(site.blocks[i])) site.blocks[i] = f.before;
    }
    const prof = site.blocks.find((b) => b.id === u.profId);
    if (prof) {
      const keepPhoto = !prof.photoSample; // they uploaded their own since
      Object.assign(prof, { layout: u.profBefore.layout, size: u.profBefore.size, radius: u.profBefore.radius });
      if (!keepPhoto) Object.assign(prof, { photo: u.profBefore.photo || "", photoName: u.profBefore.photoName || "", photoSample: u.profBefore.photoSample });
    }
    site.templateUndo = null;
    saveSite();
    renderCanvas();
    render();
  }

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

  function render() {
    const host = $("dz-body");
    if (!host) return;
    document.querySelectorAll("[data-dz]").forEach((b) => { b.classList.toggle("active", b.dataset.dz === section); b.setAttribute("aria-selected", String(b.dataset.dz === section)); });
    $("dz-page-static").hidden = section !== "page";
    host.innerHTML = section === "templates" ? templatesTab() : section === "background" ? bgTab() : section === "text" ? textTab() : pageTab();
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
      if (t.dataset.dz) { section = t.dataset.dz; render(); return; }
      if (t.dataset.bgview) {
        bgView = t.dataset.bgview;
        const d = design();
        // Colour and gradient always work, so choosing them shows them straight away.
        if (bgView === "color" && d.bg.type !== "color") change((x) => { x.bg.type = "color"; });
        if (bgView === "gradient" && d.bg.type !== "gradient") change((x) => { x.bg.type = "gradient"; });
        if (bgView === "image" && d.bg.image.url && d.bg.type !== "image") change((x) => { x.bg.type = "image"; });
        if (bgView === "video" && D.videoSource(d.bg.video.url) && d.bg.type !== "video") change((x) => { x.bg.type = "video"; });
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
        if (p) setImage(p.url, { name: p.photographer, url: p.photographerUrl || p.page });
        return;
      }
      switch (t.dataset.act) {
        case "bg-none": change((d) => { d.bg.type = "none"; }, { panel: true }); break;
        case "grad": change((d) => { d.bg.type = "gradient"; d.bg.gradient = { a: t.dataset.a, b: t.dataset.b, angle: Number(t.dataset.angle) }; }, { panel: true }); break;
        case "anim": change((d) => { const a = D.ANIMS[t.dataset.val]; const keep = d.bg.type === "anim"; d.bg.type = "anim"; if (!keep || d.bg.anim.preset !== t.dataset.val) d.bg.anim = { preset: t.dataset.val, colors: [...a.colors], base: a.base }; }, { panel: true }); break;
        case "pal": change((d) => { d.bg.anim.colors = [...D.ANIM_PALETTES[Number(t.dataset.i)]]; }, { panel: true }); break;
        case "img-reset": change((d) => { Object.assign(d.bg.image, { zoom: 100, x: 50, y: 50, fit: "cover" }); }, { panel: true }); break;
        case "video-remove": change((d) => { d.bg.type = d.bg.image.url ? "image" : "color"; d.bg.video.url = ""; }, { panel: true }); bgView = null; render(); break;
        case "pexels-more": searchPexels(pexels.q, true); break;
        case "tpl-undo": undoTemplate(); break;
      }
    });
    panel.addEventListener("input", (e) => {
      const r = e.target;
      if (r.dataset.range) {
        const v = Number(r.value);
        r.style.setProperty("--fill", `${(((v - r.min) / (r.max - r.min)) * 100).toFixed(1)}%`);
        r.nextElementSibling.textContent = `${v}${r.dataset.unit}`;
        change((d) => setPathValue(d, r.dataset.range, v));
        if (r.dataset.range.startsWith("bg.image")) syncImageControls();
        if (r.dataset.range.startsWith("text.head")) updateHeadSample();
      }
      if (r.dataset.color) {
        const path = r.dataset.color;
        change((d) => {
          const parts = path.split(".");
          if (parts[2] === "colors") d.bg.anim.colors[Number(parts[3])] = r.value;
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
    panel.innerHTML = `<div class="dz-nav" role="tablist" aria-label="Design sections">
        <button type="button" data-dz="templates" role="tab">Templates</button><button type="button" data-dz="background" role="tab">Background</button><button type="button" data-dz="text" role="tab">Text</button><button type="button" data-dz="page" role="tab">Page</button>
      </div><div id="dz-body"></div><div id="dz-page-static" hidden></div>`;
    old.forEach((n) => { if (isThemes(n)) n.hidden = true; $("dz-page-static").appendChild(n); });
    bind();
    render();
  }

  // Shown in a module's editor while it still has untouched template sample content.
  window.Designs = { init, render, refresh, isUntouchedSample, showSection: (s) => { section = s; render(); } };
})();
