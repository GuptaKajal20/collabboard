// Portfolio modules: definitions, the renderer shared by the builder (app.js) and the
// public page (p.html), plus the live parts (photo carousel, PDF preview and reader).

(function () {
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Only allow real web links (no javascript: and similar).
  const safeUrl = (u = "") => {
    const s = String(u).trim();
    if (!s) return "";
    if (/^mailto:[^\s@]+@[^\s@]+$/i.test(s)) return s;
    const withScheme = /^https?:\/\//i.test(s) ? s : /^[\w-]+(\.[\w-]+)+/.test(s) ? `https://${s}` : "";
    try {
      const url = new URL(withScheme);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  };

  // Uploaded media: our storage links, or small images kept in the draft before sharing is set up.
  const safeMedia = (u = "") => (/^data:image\/(jpeg|png|webp);base64,[\w+/=]+$/.test(u) ? u : safeUrl(u));

  // ---------- social platforms ----------

  const ICONS = "https://cdn.jsdelivr.net/npm/simple-icons@16/icons/";
  const handleOf = (v) => String(v).trim().replace(/^@/, "").replace(/\s+/g, "");
  const PLATFORMS = [
    { id: "instagram", name: "Instagram", icon: "instagram", color: "#E4405F", url: (h) => `https://www.instagram.com/${h}/`, hint: "@username or profile link" },
    { id: "youtube", name: "YouTube", icon: "youtube", color: "#FF0000", url: (h) => `https://www.youtube.com/@${h}`, hint: "@channel or channel link" },
    { id: "facebook", name: "Facebook", icon: "facebook", color: "#0866FF", url: (h) => `https://www.facebook.com/${h}`, hint: "Page name or link" },
    { id: "threads", name: "Threads", icon: "threads", color: "#000000", url: (h) => `https://www.threads.net/@${h}`, hint: "@username" },
    { id: "x", name: "X (Twitter)", icon: "x", color: "#000000", url: (h) => `https://x.com/${h}`, hint: "@username" },
    { id: "linkedin", name: "LinkedIn", text: "in", color: "#0A66C2", url: (h) => `https://www.linkedin.com/in/${h}`, hint: "Profile link" },
    { id: "whatsapp", name: "WhatsApp", icon: "whatsapp", color: "#25D366", url: (h) => { const d = h.replace(/\D/g, ""); return d ? `https://wa.me/${d.length === 10 ? "91" + d : d}` : ""; }, hint: "Phone number" },
    { id: "email", name: "Email", text: "@", color: "#5B4BD6", url: (h) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(h) ? `mailto:${h}` : ""), hint: "you@email.com" },
    { id: "googlereviews", name: "Google Reviews", icon: "google", color: "#4285F4", hint: "Link to your Google reviews" },
    { id: "googlemaps", name: "Google Maps", icon: "googlemaps", color: "#4285F4", hint: "Link to your place" },
    { id: "telegram", name: "Telegram", icon: "telegram", color: "#26A5E4", url: (h) => `https://t.me/${h}`, hint: "@username" },
    { id: "snapchat", name: "Snapchat", icon: "snapchat", color: "#FFFC00", ink: "#000000", url: (h) => `https://www.snapchat.com/add/${h}`, hint: "Username" },
    { id: "pinterest", name: "Pinterest", icon: "pinterest", color: "#BD081C", url: (h) => `https://www.pinterest.com/${h}/`, hint: "Username" },
    { id: "spotify", name: "Spotify", icon: "spotify", color: "#1DB954", hint: "Profile or podcast link" },
    { id: "linktree", name: "Linktree", icon: "linktree", color: "#43E55E", ink: "#000000", url: (h) => `https://linktr.ee/${h}`, hint: "Username" },
    { id: "behance", name: "Behance", icon: "behance", color: "#1769FF", url: (h) => `https://www.behance.net/${h}`, hint: "Username" },
    { id: "dribbble", name: "Dribbble", icon: "dribbble", color: "#EA4C89", url: (h) => `https://dribbble.com/${h}`, hint: "Username" },
    { id: "medium", name: "Medium", icon: "medium", color: "#000000", url: (h) => `https://medium.com/@${h}`, hint: "@username" },
    { id: "substack", name: "Substack", icon: "substack", color: "#FF6719", url: (h) => `https://${h}.substack.com`, hint: "Newsletter name" },
    { id: "twitch", name: "Twitch", icon: "twitch", color: "#9146FF", url: (h) => `https://www.twitch.tv/${h}`, hint: "Username" },
    { id: "discord", name: "Discord", icon: "discord", color: "#5865F2", hint: "Invite link" },
    { id: "reddit", name: "Reddit", icon: "reddit", color: "#FF4500", url: (h) => `https://www.reddit.com/user/${h}`, hint: "Username" },
    { id: "moj", name: "Moj", text: "M", color: "#F2295B", hint: "Profile link" },
    { id: "josh", name: "Josh", text: "J", color: "#FF3E6C", hint: "Profile link" },
    { id: "sharechat", name: "ShareChat", text: "S", color: "#FFB800", ink: "#000000", hint: "Profile link" },
    { id: "website", name: "Website", text: "www", color: "#444441", hint: "https://yoursite.com" },
  ];
  const platformById = (id) => PLATFORMS.find((p) => p.id === id) || PLATFORMS.at(-1);

  // Turns what the creator typed (a handle or a full link) into the profile address.
  function socialUrl(item) {
    const p = platformById(item.platform);
    const v = String(item.value || "").trim();
    if (!v) return "";
    if (/^(https?:\/\/|www\.)/i.test(v) || (/\.[a-z]{2,}\//i.test(v) && !p.url)) return safeUrl(v);
    if (p.id === "email") return p.url(v);
    if (p.url) return safeUrl(p.url(encodeURIComponent(handleOf(v)).replace(/%40/g, "@")));
    return safeUrl(v);
  }

  // Works out the platform from a pasted link (used when converting older portfolios).
  function platformFromUrl(url) {
    let host = "";
    try { host = new URL(safeUrl(url)).hostname.replace(/^www\./, ""); } catch { return "website"; }
    const map = { "instagram.com": "instagram", "youtube.com": "youtube", "youtu.be": "youtube", "facebook.com": "facebook", "threads.net": "threads", "threads.com": "threads", "x.com": "x", "twitter.com": "x", "linkedin.com": "linkedin", "wa.me": "whatsapp", "t.me": "telegram", "pinterest.com": "pinterest", "linktr.ee": "linktree", "behance.net": "behance" };
    return Object.entries(map).find(([h]) => host.endsWith(h))?.[1] || "website";
  }

  const icon = (p) =>
    p.icon
      ? `<span class="pb-ic" style="--c:${p.color};--ink:${p.ink || "#fff"};--m:url('${ICONS}${p.icon}.svg')"></span>`
      : `<span class="pb-ic pb-ic-text" style="--c:${p.color};--ink:${p.ink || "#fff"}">${esc(p.text)}</span>`;

  // ---------- rich text: only bold, italic, lists, headings, uppercase, line breaks, font size and colour survive ----------

  function cleanHtml(html = "") {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const out = document.createElement("div");
    const walk = (src, dst) => {
      for (const n of src.childNodes) {
        if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.textContent)); continue; }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName;
        if (tag === "BR") { dst.appendChild(document.createElement("br")); continue; }
        let target = dst;
        const wrap = (t) => { const e = document.createElement(t); target.appendChild(e); target = e; };
        if (tag === "DIV" || tag === "P") wrap("div");
        if (tag === "UL" || tag === "OL" || tag === "LI") wrap(tag.toLowerCase());
        if (/^H[1-6]$/.test(tag)) wrap("h2");
        if ((n.classList && n.classList.contains("pb-upper")) || (n.style && n.style.textTransform === "uppercase")) { wrap("span"); target.className = "pb-upper"; }
        if (tag === "B" || tag === "STRONG" || /^(bold|[6-9]00)$/.test(n.style ? n.style.fontWeight : "")) wrap("b");
        if (tag === "I" || tag === "EM" || (n.style && n.style.fontStyle === "italic")) wrap("i");
        const px = parseInt(n.style ? n.style.fontSize : "", 10);
        if (px >= 12 && px <= 48) { wrap("span"); target.style.fontSize = `${px}px`; }
        const color = (n.style && n.style.color) || (tag === "FONT" && n.getAttribute("color")) || "";
        if (/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(color.trim())) { wrap("span"); target.style.color = color.trim(); }
        walk(n, target);
      }
    };
    walk(doc.body.firstChild, out);
    return out.innerHTML;
  }
  const textToHtml = (s = "") => esc(s).replace(/\n/g, "<br>");

  // ---------- links ----------

  function linkKind(url) {
    const u = String(url).toLowerCase();
    if (/youtube\.com|youtu\.be|vimeo\.com|\.(mp4|mov|webm)(\?|$)|instagram\.com\/reel/.test(u)) return "Video";
    if (/\.pdf(\?|#|$)/.test(u)) return "PDF";
    if (/drive\.google\.com|docs\.google\.com/.test(u)) return "Google Drive";
    try { return new URL(safeUrl(url)).hostname.replace(/^www\./, ""); } catch { return "Link"; }
  }

  // Zoom and up/down position for any cropped image.
  const cropStyle = (zoom, posY) => {
    const z = Math.max(100, Math.min(250, Number(zoom ?? 100)));
    const y = Math.max(0, Math.min(100, Number(posY ?? 50)));
    return `object-position:50% ${y}%;transform:scale(${z / 100});transform-origin:50% ${y}%`;
  };
  const ASPECTS = { portrait: "4 / 5", square: "1 / 1", landscape: "4 / 3", wide: "16 / 9" };

  const isPdf = (f) => /\.pdf$/i.test(String(f.name || "").trim()) || /\.pdf(\?|#|$)/i.test(String(f.url || ""));

  const formatCount = (n) => {
    const v = Number(String(n).replace(/[^\d.]/g, ""));
    if (!v) return esc(n);
    if (v >= 100000) return `${+(v / 100000).toFixed(1)} lakh`;
    if (v >= 1000) return `${+(v / 1000).toFixed(1)}k`;
    return String(v);
  };
  const formatRupees = (n) => {
    const v = Number(String(n).replace(/[^\d]/g, ""));
    return v ? `₹${v.toLocaleString("en-IN")}` : esc(n);
  };

  // ---------- modules ----------

  const BLOCKS = {
    profile: { name: "Profile header", hint: "Photo, name and a short bio", once: true, make: () => ({ photo: "", photoName: "", name: "", bio: "", radius: 50, posY: 50, zoom: 100, layout: "stack", flip: false }) },
    text: { name: "Text", hint: "Write with bold, italic, sizes and emojis", make: () => ({ html: "" }) },
    link: { name: "Link", hint: "Text, a link and an optional image", make: () => ({ text: "", url: "", image: "", imageName: "", side: "left", imgZoom: 100, imgPosY: 50 }) },
    stats: { name: "Number", hint: "Followers, views, engagement", make: () => ({ items: [{ label: "Instagram followers", value: "" }, { label: "Average Reel views", value: "" }] }) },
    file: { name: "File", hint: "A photo carousel or a PDF", make: () => ({ kind: "", items: [], size: "landscape" }) },
    socials: { name: "Social links", hint: "Icons for Instagram, Facebook, Threads and more", make: () => ({ items: [] }) },
    rates: { name: "Rates", hint: "What you charge", make: () => ({ items: [{ label: "Instagram Reel", price: "" }, { label: "Story", price: "" }], barter: false }) },
    instagram: { name: "Social preview", hint: "A live look at your Instagram, Facebook, YouTube or LinkedIn", make: () => ({ platform: "instagram", value: "" }) },
  };

  // Older portfolios used other block types; convert them once.
  function migrate(site) {
    if (!site || site.v === 2) return site;
    const id = () => Math.random().toString(36).slice(2, 10);
    const out = [];
    let socials = null;
    for (const b of site.blocks || []) {
      switch (b.type) {
        case "profile":
          out.push({ id: b.id, type: "profile", photo: b.photo || "", name: b.name || "", bio: [b.tagline, b.location].filter(Boolean).join("\n"), radius: 50, posY: 50, zoom: 100 });
          break;
        case "heading":
          out.push({ id: b.id, type: "text", html: `<b><span style="font-size:22px">${esc(b.text || "")}</span></b>` });
          break;
        case "text":
        case "brands":
          if (b.html !== undefined) out.push(b);
          else if (b.text) out.push({ id: b.id, type: "text", html: textToHtml(b.text) });
          break;
        case "socials":
          if (b.links) {
            socials = { id: b.id, type: "socials", items: b.links.filter(Boolean).map((u) => ({ platform: platformFromUrl(u), value: u })) };
            out.push(socials);
          } else out.push(b);
          break;
        case "gallery":
          out.push({ id: b.id, type: "file", kind: "images", items: b.items || [] });
          break;
        case "button":
          out.push({ id: b.id, type: "link", text: b.label || "", url: b.url || "", image: "", side: "left" });
          break;
        case "contact": {
          const extra = [b.email && { platform: "email", value: b.email }, b.whatsapp && { platform: "whatsapp", value: b.whatsapp }].filter(Boolean);
          if (!extra.length) break;
          if (socials) socials.items.push(...extra);
          else { socials = { id: b.id || id(), type: "socials", items: extra }; out.push(socials); }
          break;
        }
        case "instagram":
          out.push({ id: b.id, type: "instagram", handle: b.handle || "" });
          break;
        default:
          if (BLOCKS[b.type]) out.push(b);
      }
    }
    return { ...site, v: 2, blocks: out };
  }

  // Draws one module. In the builder, short text fields carry data-edit so they can be typed into directly.
  function renderBlock(b, edit) {
    const ed = (field, placeholder) => (edit ? ` contenteditable="plaintext-only" data-edit="${field}" data-placeholder="${esc(placeholder)}" spellcheck="true"` : "");
    const empty = (msg) => (edit ? `<p class="pb-empty">${msg}</p>` : "");
    switch (b.type) {
      case "profile": {
        const photo = b.photoSample && !edit ? "" : safeMedia(b.photo);
        const radius = Math.max(0, Math.min(50, Number(b.radius ?? 50)));
        const posY = Math.max(0, Math.min(100, Number(b.posY ?? 50)));
        const zoom = Math.max(100, Math.min(250, Number(b.zoom ?? 100)));
        const size = Math.max(64, Math.min(200, Number(b.size ?? 104)));
        const initial = esc((b.name || "?").trim().charAt(0).toUpperCase() || "?");
        const avatar = photo
          ? `<div class="pb-avatar" style="border-radius:${radius}%;--av:${size}px"><img src="${esc(photo)}" alt="" style="${cropStyle(zoom, posY)}"></div>`
          : `<div class="pb-avatar pb-initial" style="border-radius:${radius}%;--av:${size}px">${initial}</div>`;
        const layout = b.layout === "side" ? ` pb-side${b.flip ? " pb-flip" : ""}` : "";
        let layoutCls = layout;
        const sampleTag = b.photoSample && edit && photo ? `<span class="pb-sample-tag">Sample photo · add yours in the panel</span>` : "";
        // Header image (like a cover photo): only when switched on and chosen.
        const coverUrl = b.coverOn ? safeMedia(b.coverImg) : "";
        const cover = coverUrl ? `<div class="pb-cover-img"><img src="${esc(coverUrl)}" alt="" style="${coverStyle(b)}"></div>` : "";
        const nameStyle = b.nameScale || b.nameSpacing ? ` style="${b.nameScale ? `font-size:calc(32px * var(--head-scale, 1) * ${Math.max(0.6, Math.min(1.8, b.nameScale / 100))});` : ""}${b.nameSpacing ? `letter-spacing:${Math.max(-4, Math.min(12, b.nameSpacing)) / 100}em;` : ""}"` : "";
        if (cover) layoutCls = `${layout} pb-on-cover`;
        return `${cover}<header class="pb-profile${layoutCls}">${avatar}${sampleTag}
          <div class="pb-profile-text">
            <h1${ed("name", "Your name")}${nameStyle}>${esc(b.name)}</h1>
            ${b.bio || edit ? `<p class="pb-bio"${ed("bio", "A short bio")}>${esc(b.bio)}</p>` : ""}
          </div>
        </header>`;
      }
      case "text": {
        const html = cleanHtml(b.html);
        return html.replace(/<[^>]+>|\s|&nbsp;/g, "") ? `<div class="pb-rich">${html}</div>` : empty("Write your text in the editor on the right.");
      }
      case "link": {
        const url = safeUrl(b.url);
        const img = safeMedia(b.image);
        if (!url) return empty("Paste a link in the panel on the right.");
        const attrs = edit ? "" : `href="${esc(url)}" target="_blank" rel="noopener noreferrer"`;
        // No image uploaded: show the page's own preview (title, picture), fetched when the link was added.
        const pv = !img && b.preview && b.preview.url ? b.preview : null;
        const pvImg = pv && safeUrl(pv.image);
        const title = b.text || (pv && pv.title) || linkKind(url);
        if (pv) {
          return `<a class="pb-link pb-link-card${pvImg ? "" : " no-img"}" ${attrs}>
            ${pvImg ? `<span class="pb-link-cover${pv.kind === "youtube" ? " is-video" : ""}${pv.kind === "image" ? " is-image" : ""}"><img src="${esc(pvImg)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>` : ""}
            <span class="pb-link-text"><strong>${esc(title)}</strong>${pv.description && pv.kind === "page" ? `<span class="pb-link-desc">${esc(pv.description)}</span>` : ""}<small>${esc(pv.site || linkKind(url))} ↗</small></span>
          </a>`;
        }
        return `<a class="pb-link${img ? ` has-img img-${b.side === "right" ? "right" : "left"}` : ""}" ${attrs}>
          ${img ? `<span class="pb-link-img"><img src="${esc(img)}" alt="" style="${cropStyle(b.imgZoom, b.imgPosY)}"></span>` : ""}
          <span class="pb-link-text"><strong>${esc(title)}</strong><small>${esc(linkKind(url))} ↗</small></span>
        </a>`;
      }
      case "stats": {
        const items = (b.items || []).filter((s) => s.value || edit);
        if (!items.length) return "";
        return `<div class="pb-stats">${items.map((s, i) => `<div><strong${ed(`items.${i}.value`, "0")}>${edit ? esc(s.value) : formatCount(s.value)}</strong><span${ed(`items.${i}.label`, "Label")}>${esc(s.label)}</span></div>`).join("")}</div>`;
      }
      case "file": {
        if (b.kind === "pdf") {
          const pdfs = (b.items || []).filter(isPdf).filter((f) => safeUrl(f.url));
          if (!pdfs.length) return empty("Upload a PDF in the panel on the right.");
          return `<div class="pb-pdfs">${pdfs.map((f) => `<button type="button" class="pb-pdf" data-pdf="${esc(safeUrl(f.url))}" data-name="${esc(f.name || "Document.pdf")}">
            <span class="pb-pdf-thumb"><canvas></canvas></span>
            <span class="pb-pdf-meta"><strong>${esc(f.name || "Document.pdf")}</strong><small>PDF · tap to read</small></span>
          </button>`).join("")}</div>`;
        }
        if (b.kind === "images") {
          const items = (b.items || []).filter((m) => safeMedia(m.url));
          if (!items.length) return empty("Upload photos in the panel on the right.");
          const slides = items
            .map((m) => m.type === "video"
              ? `<div class="pb-slide"><video src="${esc(safeMedia(m.url))}" controls playsinline preload="metadata"></video></div>`
              : `<div class="pb-slide"><button type="button" class="pb-photo"><img src="${esc(safeMedia(m.url))}" alt="" loading="lazy" style="${cropStyle(m.zoom, m.posY)}"></button></div>`)
            .join("");
          const many = items.length > 1;
          return `<div class="pb-carousel" data-carousel style="--ar:${ASPECTS[b.size] || ASPECTS.landscape}">
            <div class="pb-track">${slides}</div>
            ${many ? `<button type="button" class="pb-nav prev" data-car="-1" aria-label="Previous photo">‹</button><button type="button" class="pb-nav next" data-car="1" aria-label="Next photo">›</button>
            <div class="pb-dots">${items.map((_, i) => `<span class="${i ? "" : "on"}"></span>`).join("")}</div>` : ""}
          </div>`;
        }
        return empty("Choose Images or PDF in the panel on the right.");
      }
      case "socials": {
        const items = (b.items || []).map((it) => ({ p: platformById(it.platform), url: socialUrl(it) })).filter((x) => x.url);
        if (!items.length) return empty("Pick your platforms in the panel on the right.");
        return `<div class="pb-socials">${items.map(({ p, url }) => `<a ${edit ? "" : `href="${esc(url)}" ${url.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener noreferrer"'}`} aria-label="${esc(p.name)}" title="${esc(p.name)}">${icon(p)}</a>`).join("")}</div>`;
      }
      case "rates": {
        const items = (b.items || []).filter((r) => r.price || edit);
        if (!items.length && !b.barter) return "";
        return `<ul class="pb-rates">${items.map((r, i) => `<li><span${ed(`items.${i}.label`, "What")}>${esc(r.label)}</span><strong${ed(`items.${i}.price`, "₹ price")}>${edit ? esc(r.price) : formatRupees(r.price)}</strong></li>`).join("")}</ul>${b.barter ? `<p class="pb-note">Open to barter collaborations</p>` : ""}`;
      }
      case "instagram": {
        // "Social preview": profile picture, name, bio and recent posts where the platform allows it.
        const plat = SOCIAL_URL[b.platform] ? b.platform : "instagram";
        const h = handleFor(plat, previewAccounts(b)[plat]);
        if (!h) return empty("Add your handle in the panel on the right.");
        const profile = SOCIAL_URL[plat](h);
        if (plat === "instagram") {
          return `<div class="pb-igp"><iframe src="https://www.instagram.com/${esc(h)}/embed/" loading="lazy" title="Instagram profile of @${esc(h)}" scrolling="no"></iframe>${boxLink(plat, profile, h, edit)}</div>`;
        }
        if (plat === "facebook") {
          const src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(profile)}&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`;
          return `<div class="pb-igp"><iframe src="${esc(src)}" loading="lazy" title="Facebook page" scrolling="no" allow="encrypted-media"></iframe>${boxLink(plat, profile, h, edit)}</div>`;
        }
        const snap = b.social && b.social[plat] && b.social[plat].handle === h ? b.social[plat] : null;
        return `<div class="pb-sp" data-social="${plat}" data-handle="${esc(h)}">${socialCard(plat, h, snap, edit)}${boxLink(plat, profile, h, edit)}</div>`;
      }
      default:
        return "";
    }
  }

  // Header image: zoom plus left/right and up/down. Zooming in leaves room to move sideways.
  function coverStyle(b) {
    const x = Math.max(0, Math.min(100, Number(b.coverX ?? 50)));
    const y = Math.max(0, Math.min(100, Number(b.coverY ?? 50)));
    const z = Math.max(100, Math.min(300, Number(b.coverZoom ?? 100))) / 100;
    return `object-position:${x}% ${y}%;transform:scale(${z});transform-origin:${x}% ${y}%`;
  }

  // ---------- social preview ----------

  const SOCIAL_URL = {
    instagram: (h) => `https://www.instagram.com/${h}/`,
    facebook: (h) => `https://www.facebook.com/${h}`,
    youtube: (h) => `https://www.youtube.com/@${h}`,
    linkedin: (h) => `https://www.linkedin.com/in/${h}`,
    threads: (h) => `https://www.threads.net/@${h}`,
    x: (h) => `https://x.com/${h}`,
  };
  // The handle, from "@name", "name" or (older drafts) a profile link.
  function handleFor(plat, raw) {
    let v = String(raw || "").trim();
    const fromUrl = v.match(/^(?:https?:\/\/)?(?:[\w-]+\.)?(?:instagram\.com|facebook\.com|fb\.com|youtube\.com|linkedin\.com\/in|threads\.(?:net|com)|x\.com|twitter\.com)\/@?([\w.-]+)/i);
    if (fromUrl) v = fromUrl[1];
    v = v.replace(/^@/, "").replace(/\/+$/, "");
    const ok = plat === "linkedin" ? /^[\w-]{3,100}$/ : plat === "youtube" || plat === "facebook" ? /^[\w.-]{2,80}$/ : /^[\w.]{1,30}$/;
    return ok.test(v) ? v : "";
  }
  // A see-through link over the whole preview: clicking anywhere opens the profile, for every platform.
  const boxLink = (plat, url, h) => (`<a class="pb-sp-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open @${esc(h)} on ${esc(platformById(plat).name)}"></a>`);
  // Profile card for YouTube, LinkedIn, Threads and X. snap = what /api/social returned (or null while loading).
  function socialCard(plat, h, snap, edit) {
    const p = platformById(plat);
    const link = (u, inner, cls = "") => (edit ? `<span class="${cls}">${inner}</span>` : `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${inner}</a>`);
    const pic = snap && safeUrl(snap.image);
    const posts = (snap && snap.posts) || [];
    const note = snap && snap.postsNote ? snap.postsNote : "";
    return `<div class="pb-sp-head">
        <span class="pb-sp-pic">${pic ? `<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}${icon(p)}</span>
        <span class="pb-sp-who"><strong>${esc((snap && snap.name) || `@${h}`)}</strong><small>@${esc(h)} · ${esc(p.name)}</small></span>
      </div>
      ${snap && snap.bio ? `<p class="pb-sp-bio">${esc(snap.bio)}</p>` : snap ? "" : `<p class="pb-sp-bio pb-sp-loading">Loading profile…</p>`}
      ${posts.length ? `<div class="pb-sp-posts">${posts.slice(0, 5).map((v) => link(v.url, `<span class="pb-sp-thumb"><img src="${esc(safeUrl(v.image))}" alt="" loading="lazy"></span><span class="pb-sp-title">${esc(v.title)}</span>`, "pb-sp-post")).join("")}</div>` : ""}
      ${note ? `<p class="pb-note">${esc(note)}</p>` : ""}
`;
  }

  // Social preview keeps one account per platform. Older pages saved a single value for one platform.
  function previewAccounts(b) {
    const accounts = { ...(b.accounts || {}) };
    const legacy = b.value ?? b.handle;
    const plat = b.platform || "instagram";
    if (legacy && !(plat in accounts)) accounts[plat] = legacy;
    return accounts;
  }

  function wrapBlock(b, edit, selected) {
    const inner = renderBlock(b, edit);
    if (!edit) return inner ? `<section class="pb-block pb-${b.type}-block">${inner}</section>` : "";
    return `<section class="pb-block pb-${b.type}-block pb-editable${b.id === selected ? " pb-selected" : ""}" data-block="${esc(b.id)}">
      <span class="pb-glow" aria-hidden="true"></span>
      <div class="pb-tools" aria-label="${esc(BLOCKS[b.type] ? BLOCKS[b.type].name : "Module")} tools">
        <span class="pb-grip" draggable="true" title="Drag to move">⠿</span>
        <button type="button" data-move="-1" title="Move up" aria-label="Move up">↑</button>
        <button type="button" data-move="1" title="Move down" aria-label="Move down">↓</button>
        <button type="button" data-remove title="Remove" aria-label="Remove module">✕</button>
      </div>
      ${inner}
    </section>`;
  }

  // The page with its design (background, fonts, cards). fixedBg: the background fills the whole browser window.
  function renderPortfolio(p, { edit = false, selected = null, fixedBg = false } = {}) {
    const blocks = (p.blocks || []).map((b) => wrapBlock(b, edit, selected)).join("");
    const D = window.PortfolioDesign;
    const theme = esc(p.theme || "violet");
    const body = blocks || (edit ? `<p class="pb-empty pb-start">Drag a module here from the right, or click one to add it.</p>` : "");
    if (!D) return `<div class="pb-page pb-theme-${theme}">${body}</div>`;
    D.loadFonts(p.design);
    const a = D.pageAttrs(p.design, p.theme);
    // .pb-frame measures the page width, so layouts fold to one column on narrow screens (and the phone preview).
    return `<div class="pb-root">${D.bgHtml(p.design, { fixed: fixedBg })}<div class="pb-frame"><div class="pb-page pb-theme-${theme} ${a.cls}" style="${a.style}">${body}</div></div></div>`;
  }

  // ---------- live parts: carousel, PDF thumbnails and reader ----------

  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  let pdfLib = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfLib) {
      pdfLib = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `${PDFJS}pdf.min.js`;
        s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.js`; resolve(window.pdfjsLib); };
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return pdfLib;
  }

  async function drawPage(doc, n, canvas, width) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = (width * (window.devicePixelRatio || 1)) / base.width;
    const vp = page.getViewport({ scale });
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.width = `${width}px`;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  }

  const docs = new Map();
  const openDoc = async (url) => {
    if (!docs.has(url)) docs.set(url, loadPdfJs().then((lib) => lib.getDocument(url).promise));
    return docs.get(url);
  };

  async function pdfThumbs(root) {
    for (const btn of root.querySelectorAll(".pb-pdf[data-pdf]")) {
      const canvas = btn.querySelector("canvas");
      if (!canvas || canvas.dataset.done) continue;
      canvas.dataset.done = "1";
      try { await drawPage(await openDoc(btn.dataset.pdf), 1, canvas, 120); } catch { btn.classList.add("no-thumb"); }
    }
  }

  let modal = null;
  async function openPdf(url, name) {
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "pb-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML = `<div class="pb-modal-box"><header><strong></strong><a target="_blank" rel="noopener noreferrer">Open in new tab ↗</a><button type="button" aria-label="Close">✕</button></header><div class="pb-modal-pages"></div></div>`;
      document.body.appendChild(modal);
      const close = () => { modal.hidden = true; document.body.style.overflow = ""; };
      modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest("header button")) close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
    }
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector("strong").textContent = name;
    modal.querySelector("a").href = url;
    const pages = modal.querySelector(".pb-modal-pages");
    pages.innerHTML = `<p class="pb-modal-msg">Opening…</p>`;
    try {
      const doc = await openDoc(url);
      pages.innerHTML = "";
      const width = Math.min(pages.clientWidth - 24, 900);
      for (let n = 1; n <= Math.min(doc.numPages, 40); n++) {
        const c = document.createElement("canvas");
        pages.appendChild(c);
        await drawPage(doc, n, c, width);
      }
    } catch {
      pages.innerHTML = `<p class="pb-modal-msg">This PDF can't be shown here. Use "Open in new tab".</p>`;
    }
  }

  // Wires up carousels and PDFs inside a rendered portfolio. Call after each render.
  function enhance(root, { edit = false } = {}) {
    if (!root.dataset.pbBound) {
      root.dataset.pbBound = "1";
      root.addEventListener("click", (e) => {
        const nav = e.target.closest("[data-car]");
        if (nav) {
          const track = nav.closest("[data-carousel]").querySelector(".pb-track");
          track.scrollBy({ left: Number(nav.dataset.car) * track.clientWidth, behavior: "smooth" });
          return;
        }
        const pdf = !edit && e.target.closest(".pb-pdf[data-pdf]");
        if (pdf) openPdf(pdf.dataset.pdf, pdf.dataset.name);
      });
      root.addEventListener("scroll", (e) => {
        const track = e.target.classList && e.target.classList.contains("pb-track") ? e.target : null;
        if (!track) return;
        const i = Math.round(track.scrollLeft / track.clientWidth);
        track.parentElement.querySelectorAll(".pb-dots span").forEach((d, n) => d.classList.toggle("on", n === i));
      }, true);
    }
    pdfThumbs(root);
    if (window.PortfolioDesign) window.PortfolioDesign.mount(root);
    if (!edit) root.querySelectorAll(".pb-sp[data-social]:not([data-live])").forEach(async (node) => {
      node.dataset.live = "1";
      try {
        const r = await fetch(`/api/social?platform=${node.dataset.social}&handle=${encodeURIComponent(node.dataset.handle)}`);
        const snap = r.ok ? await r.json() : null;
        if (snap && snap.found) node.innerHTML = socialCard(node.dataset.social, node.dataset.handle, snap, false);
      } catch { /* keep the saved copy */ }
    });
  }

  window.Portfolio = { cropStyle, ASPECTS, BLOCKS, PLATFORMS, platformById, socialUrl, renderPortfolio, wrapBlock, previewAccounts, coverStyle, handleFor, socialCard, SOCIAL_URL, migrate, cleanHtml, enhance, safeUrl, safeMedia, isPdf, icon, esc };
})();
