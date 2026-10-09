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

  // ---------- rich text: only bold, italic, line breaks and font size survive ----------

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
        if (tag === "B" || tag === "STRONG" || /^(bold|[6-9]00)$/.test(n.style ? n.style.fontWeight : "")) wrap("b");
        if (tag === "I" || tag === "EM" || (n.style && n.style.fontStyle === "italic")) wrap("i");
        const px = parseInt(n.style ? n.style.fontSize : "", 10);
        if (px >= 12 && px <= 48) { wrap("span"); target.style.fontSize = `${px}px`; }
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
    profile: { name: "Profile header", hint: "Photo, name and a short bio", once: true, make: () => ({ photo: "", name: "", bio: "", radius: 50, posY: 50, zoom: 100 }) },
    text: { name: "Text", hint: "Write with bold, italic, sizes and emojis", make: () => ({ html: "" }) },
    link: { name: "Link", hint: "Text, a link and an optional image", make: () => ({ text: "", url: "", image: "", side: "left" }) },
    stats: { name: "Number", hint: "Followers, views, engagement", make: () => ({ items: [{ label: "Instagram followers", value: "" }, { label: "Average Reel views", value: "" }] }) },
    file: { name: "File", hint: "A photo carousel or a PDF", make: () => ({ kind: "", items: [] }) },
    socials: { name: "Social links", hint: "Icons for Instagram, Facebook, Threads and more", make: () => ({ items: [] }) },
    rates: { name: "Rates", hint: "What you charge", make: () => ({ items: [{ label: "Instagram Reel", price: "" }, { label: "Story", price: "" }], barter: false }) },
    instagram: { name: "Instagram preview", hint: "Your profile, bio and latest posts", make: () => ({ handle: "" }) },
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
        const photo = safeMedia(b.photo);
        const radius = Math.max(0, Math.min(50, Number(b.radius ?? 50)));
        const posY = Math.max(0, Math.min(100, Number(b.posY ?? 50)));
        const zoom = Math.max(100, Math.min(250, Number(b.zoom ?? 100)));
        const initial = esc((b.name || "?").trim().charAt(0).toUpperCase() || "?");
        const avatar = photo
          ? `<div class="pb-avatar" style="border-radius:${radius}%"><img src="${esc(photo)}" alt="" style="object-position:50% ${posY}%;transform:scale(${zoom / 100});transform-origin:50% ${posY}%"></div>`
          : `<div class="pb-avatar pb-initial" style="border-radius:${radius}%">${initial}</div>`;
        return `<header class="pb-profile">${avatar}
          <h1${ed("name", "Your name")}>${esc(b.name)}</h1>
          ${b.bio || edit ? `<p class="pb-bio"${ed("bio", "A short bio. Press Enter for a new line.")}>${esc(b.bio)}</p>` : ""}
        </header>`;
      }
      case "text": {
        const html = cleanHtml(b.html);
        return html.replace(/<[^>]+>|\s|&nbsp;/g, "") ? `<div class="pb-rich">${html}</div>` : empty("Write your text in the editor on the right.");
      }
      case "link": {
        const url = safeUrl(b.url);
        const img = safeMedia(b.image);
        if (!b.text || !url) return empty("Add the link text and address in the panel on the right.");
        const attrs = edit ? "" : `href="${esc(url)}" target="_blank" rel="noopener noreferrer"`;
        return `<a class="pb-link${img ? ` has-img img-${b.side === "right" ? "right" : "left"}` : ""}" ${attrs}>
          ${img ? `<img src="${esc(img)}" alt="">` : ""}
          <span class="pb-link-text"><strong>${esc(b.text)}</strong><small>${esc(linkKind(url))} ↗</small></span>
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
              : `<div class="pb-slide"><button type="button" class="pb-photo"><img src="${esc(safeMedia(m.url))}" alt="" loading="lazy"></button></div>`)
            .join("");
          const many = items.length > 1;
          return `<div class="pb-carousel" data-carousel>
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
        return `<ul class="pb-rates">${items.map((r, i) => `<li><span${ed(`items.${i}.label`, "What")}>${esc(r.label)}</span><strong${ed(`items.${i}.price`, "₹ price")}>${edit ? esc(r.price) : formatRupees(r.price)}</strong></li>`).join("")}</ul>${b.barter ? `<p class="pb-note">Open to barter collaborations</p>` : ""}`;
      }
      case "instagram": {
        const h = handleOf(b.handle).replace(/[^\w.]/g, "");
        if (!h) return empty("Type your Instagram username in the panel on the right.");
        return `<div class="pb-igp">
          <iframe src="https://www.instagram.com/${esc(h)}/embed/" loading="lazy" title="Instagram profile of @${esc(h)}" scrolling="no"></iframe>
          <a class="pb-ig-link" ${edit ? "" : `href="https://www.instagram.com/${esc(h)}/" target="_blank" rel="noopener noreferrer"`}>${icon(platformById("instagram"))}View @${esc(h)} on Instagram</a>
        </div>`;
      }
      default:
        return "";
    }
  }

  function wrapBlock(b, edit, selected) {
    const inner = renderBlock(b, edit);
    if (!edit) return inner ? `<section class="pb-block pb-${b.type}-block">${inner}</section>` : "";
    return `<section class="pb-block pb-${b.type}-block pb-editable${b.id === selected ? " pb-selected" : ""}" data-block="${esc(b.id)}">
      <div class="pb-tools" aria-label="${esc(BLOCKS[b.type] ? BLOCKS[b.type].name : "Module")} tools">
        <span class="pb-grip" draggable="true" title="Drag to move">⠿</span>
        <button type="button" data-move="-1" title="Move up" aria-label="Move up">↑</button>
        <button type="button" data-move="1" title="Move down" aria-label="Move down">↓</button>
        <button type="button" data-remove title="Remove" aria-label="Remove module">✕</button>
      </div>
      ${inner}
    </section>`;
  }

  function renderPortfolio(p, { edit = false, selected = null } = {}) {
    const blocks = (p.blocks || []).map((b) => wrapBlock(b, edit, selected)).join("");
    return `<div class="pb-page pb-theme-${esc(p.theme || "violet")}">${blocks || (edit ? `<p class="pb-empty pb-start">Drag a module here from the right, or click one to add it.</p>` : "")}</div>`;
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
  }

  window.Portfolio = { BLOCKS, PLATFORMS, platformById, socialUrl, renderPortfolio, wrapBlock, migrate, cleanHtml, enhance, safeUrl, safeMedia, isPdf, icon, esc };
})();
