// Portfolio blocks: definitions and the renderer shared by the builder (app.js)
// and the public portfolio page (p.html).

(function () {
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Only allow real web links (no javascript: and similar).
  const safeUrl = (u = "") => {
    const s = String(u).trim();
    if (!s) return "";
    const withScheme = /^https?:\/\//i.test(s) ? s : /^[\w-]+(\.[\w-]+)+/.test(s) ? `https://${s}` : "";
    try {
      const url = new URL(withScheme);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  };

  // Uploaded media: our storage links, or small images kept in the draft before sharing is set up.
  const safeMedia = (u = "") => (/^data:image\/(jpeg|png|webp);base64,/.test(u) ? u : safeUrl(u));

  const PLATFORMS = [
    ["instagram.com", "Instagram"],
    ["youtube.com", "YouTube"],
    ["youtu.be", "YouTube"],
    ["linkedin.com", "LinkedIn"],
    ["x.com", "X"],
    ["twitter.com", "X"],
    ["facebook.com", "Facebook"],
    ["threads.net", "Threads"],
    ["threads.com", "Threads"],
    ["snapchat.com", "Snapchat"],
    ["moj", "Moj"],
    ["josh", "Josh"],
    ["pinterest.", "Pinterest"],
    ["behance.net", "Behance"],
    ["spotify.com", "Spotify"],
    ["wa.me", "WhatsApp"],
  ];
  const platformOf = (url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const hit = PLATFORMS.find(([h]) => host.includes(h));
      return hit ? hit[1] : host;
    } catch {
      return "Link";
    }
  };

  // Instagram post or reel link -> its embed address (no API key needed).
  const instagramEmbed = (u) => {
    const m = String(u).match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/i);
    return m ? `https://www.instagram.com/${m[1].toLowerCase() === "tv" ? "p" : m[1].toLowerCase()}/${m[2]}/embed` : "";
  };

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
  const lines = (s = "") => esc(s).replace(/\n/g, "<br>");

  // Every block type: its menu name, a short hint, and its starting content.
  const BLOCKS = {
    profile: { name: "Profile header", hint: "Photo, name and one line about you", make: () => ({ photo: "", name: "", tagline: "", location: "" }) },
    heading: { name: "Heading", hint: "A section title", make: () => ({ text: "About me" }) },
    text: { name: "Text", hint: "A paragraph you write", make: () => ({ text: "Write something about you, your audience or your content." }) },
    socials: { name: "Social links", hint: "Instagram, YouTube, LinkedIn and more", make: () => ({ links: [""] }) },
    instagram: { name: "Instagram posts", hint: "Show 3 or 4 of your posts or reels", make: () => ({ handle: "", posts: ["", "", ""] }) },
    gallery: { name: "Photos and videos", hint: "Upload your best work", make: () => ({ items: [] }) },
    stats: { name: "Numbers", hint: "Followers, views, engagement", make: () => ({ items: [{ label: "Instagram followers", value: "" }, { label: "Average Reel views", value: "" }] }) },
    rates: { name: "Rates", hint: "What you charge", make: () => ({ items: [{ label: "Instagram Reel", price: "" }, { label: "Story", price: "" }], barter: false }) },
    brands: { name: "Brands I've worked with", hint: "Names of past collaborations", make: () => ({ text: "" }) },
    button: { name: "Button", hint: "A link people can tap", make: () => ({ label: "Book a collab", url: "" }) },
    contact: { name: "Contact", hint: "Email and WhatsApp", make: () => ({ email: "", whatsapp: "" }) },
  };

  // Draws one block. In the builder, text fields carry data-edit so they can be typed into directly.
  function renderBlock(b, edit) {
    const ed = (field, placeholder) => (edit ? ` contenteditable="plaintext-only" data-edit="${field}" data-placeholder="${esc(placeholder)}" spellcheck="true"` : "");
    switch (b.type) {
      case "profile": {
        const photo = safeMedia(b.photo);
        const initial = esc((b.name || "?").trim().charAt(0).toUpperCase() || "?");
        return `<header class="pb-profile">
          ${photo ? `<img class="pb-avatar" src="${photo}" alt="">` : `<div class="pb-avatar pb-initial">${initial}</div>`}
          <h1${ed("name", "Your name")}>${esc(b.name)}</h1>
          <p class="pb-tagline"${ed("tagline", "One line about what you create")}>${esc(b.tagline)}</p>
          ${b.location || edit ? `<p class="pb-location"${ed("location", "City · languages")}>${esc(b.location)}</p>` : ""}
        </header>`;
      }
      case "heading":
        return `<h2 class="pb-heading"${ed("text", "Section title")}>${esc(b.text)}</h2>`;
      case "text":
        return `<p class="pb-text"${ed("text", "Write something")}>${edit ? esc(b.text) : lines(b.text)}</p>`;
      case "socials": {
        const links = (b.links || []).map(safeUrl).filter(Boolean);
        if (!links.length) return edit ? `<p class="pb-empty">Paste your profile links in the panel on the right.</p>` : "";
        return `<div class="pb-socials">${links.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(platformOf(u))}</a>`).join("")}</div>`;
      }
      case "instagram": {
        const embeds = (b.posts || []).map(instagramEmbed).filter(Boolean).slice(0, 4);
        const handle = String(b.handle || "").replace(/^@/, "").replace(/[^\w.]/g, "");
        const head = handle
          ? `<a class="pb-ig-head" href="https://www.instagram.com/${esc(handle)}/" target="_blank" rel="noopener noreferrer"><span class="pb-ig-logo" aria-hidden="true"></span>@${esc(handle)}<span class="pb-ig-follow">View profile</span></a>`
          : "";
        if (!embeds.length) return edit ? `${head}<p class="pb-empty">Paste 3 or 4 Instagram post or reel links in the panel on the right.</p>` : head;
        return `${head}<div class="pb-ig-grid">${embeds.map((src) => `<iframe src="${esc(src)}" loading="lazy" scrolling="no" allowtransparency="true" title="Instagram post"></iframe>`).join("")}</div>`;
      }
      case "gallery": {
        const items = (b.items || []).filter((m) => safeMedia(m.url));
        if (!items.length) return edit ? `<p class="pb-empty">Upload photos or videos in the panel on the right.</p>` : "";
        return `<div class="pb-gallery">${items
          .map((m, i) =>
            m.type === "video"
              ? `<video src="${esc(safeMedia(m.url))}" controls playsinline preload="metadata"></video>`
              : `<button type="button" class="pb-photo" data-zoom="${i}"><img src="${esc(safeMedia(m.url))}" alt="" loading="lazy"></button>`)
          .join("")}</div>`;
      }
      case "stats": {
        const items = (b.items || []).filter((s) => s.value || edit);
        if (!items.length) return "";
        return `<div class="pb-stats">${items.map((s, i) => `<div><strong${ed(`items.${i}.value`, "0")}>${edit ? esc(s.value) : formatCount(s.value)}</strong><span${ed(`items.${i}.label`, "Label")}>${esc(s.label)}</span></div>`).join("")}</div>`;
      }
      case "rates": {
        const items = (b.items || []).filter((r) => r.price || edit);
        return `<ul class="pb-rates">${items.map((r, i) => `<li><span${ed(`items.${i}.label`, "What")}>${esc(r.label)}</span><strong${ed(`items.${i}.price`, "₹ price")}>${edit ? esc(r.price) : formatRupees(r.price)}</strong></li>`).join("")}</ul>${b.barter ? `<p class="pb-note">Open to barter collaborations</p>` : ""}`;
      }
      case "brands":
        return `<p class="pb-brands"${ed("text", "Brand names, separated by commas")}>${esc(b.text)}</p>`;
      case "button": {
        const url = safeUrl(b.url);
        return `<div class="pb-button-row"><a class="pb-button" ${url && !edit ? `href="${esc(url)}" target="_blank" rel="noopener noreferrer"` : ""}><span${ed("label", "Button text")}>${esc(b.label)}</span></a></div>`;
      }
      case "contact": {
        const email = String(b.email || "").trim();
        const wa = String(b.whatsapp || "").replace(/[^\d]/g, "");
        const parts = [
          email && `<a href="mailto:${esc(email)}">${esc(email)}</a>`,
          wa && `<a href="https://wa.me/${wa.length === 10 ? "91" + wa : wa}" target="_blank" rel="noopener noreferrer">WhatsApp ${esc(b.whatsapp)}</a>`,
        ].filter(Boolean);
        if (!parts.length) return edit ? `<p class="pb-empty">Add your email or WhatsApp in the panel on the right.</p>` : "";
        return `<div class="pb-contact"><h3>Work with me</h3><p>${parts.join(" · ")}</p></div>`;
      }
      default:
        return "";
    }
  }

  // The whole page. Builder mode wraps each block with a handle and tools.
  function renderPortfolio(p, { edit = false, selected = null } = {}) {
    const blocks = (p.blocks || [])
      .map((b) => {
        const inner = renderBlock(b, edit);
        if (!edit) return inner ? `<section class="pb-block pb-${b.type}-block">${inner}</section>` : "";
        return `<section class="pb-block pb-${b.type}-block pb-editable${b.id === selected ? " pb-selected" : ""}" data-block="${esc(b.id)}">
          <div class="pb-tools" aria-label="${esc(BLOCKS[b.type] ? BLOCKS[b.type].name : "Block")} tools">
            <span class="pb-grip" draggable="true" title="Drag to move">⠿</span>
            <button type="button" data-move="-1" title="Move up" aria-label="Move up">↑</button>
            <button type="button" data-move="1" title="Move down" aria-label="Move down">↓</button>
            <button type="button" data-remove title="Remove" aria-label="Remove block">✕</button>
          </div>
          ${inner}
        </section>`;
      })
      .join("");
    return `<div class="pb-page pb-theme-${esc(p.theme || "violet")}">${blocks || (edit ? `<p class="pb-empty pb-start">Drag a block here from the right, or click one to add it.</p>` : "")}</div>`;
  }

  window.Portfolio = { BLOCKS, renderPortfolio, safeUrl, safeMedia, instagramEmbed, platformOf, esc };
})();
