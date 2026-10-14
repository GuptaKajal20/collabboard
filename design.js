// Portfolio design: background (colour, gradient, image, video, animation), global text styling
// and page styling. Shared by the builder (app.html) and the public page (p.html), so both look the same.
// Saved on the portfolio as site.design; older portfolios without it look exactly as before.

(function () {
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  const HEX = /^#[0-9a-f]{6}$/i;
  const hex = (v, d) => (HEX.test(String(v || "")) ? String(v).toLowerCase() : d);

  // ---------- presets ----------

  const COLORS = ["#ffffff", "#f7f6f2", "#f2e27d", "#fde2e4", "#e3f0ff", "#e1f5ee", "#efe9ff", "#fff1e0", "#1c1c1a", "#14213d", "#2b2d42", "#0f3d3e", "#5b4bd6", "#d85a30", "#0f6e56", "#c2185b"];
  const GRADIENTS = [
    ["#fbe7c6", "#f6b6c4"], ["#e0c3fc", "#8ec5fc"], ["#f2e27d", "#f7f6f2"], ["#a1ffce", "#faffd1"],
    ["#ff9a8b", "#ffc3a0", "#fff1e0"], ["#141e30", "#243b55"], ["#0f2027", "#203a43", "#2c5364"], ["#3a1c71", "#d76d77", "#ffaf7b"],
  ];
  // Gradient directions, like the arrows in design tools.
  const DIRS = ["to top left", "to top", "to top right", "to left", "", "to right", "to bottom left", "to bottom", "to bottom right"];
  const angleToDir = (a) => ["to top", "to top right", "to right", "to bottom right", "to bottom", "to bottom left", "to left", "to top left"][Math.round((((Number(a) || 0) % 360) + 360) % 360 / 45) % 8];
  // Module layouts: how the modules are arranged on the page.
  const LAYOUTS = ["classic", "split", "bento", "magazine", "timeline", "poster", "compact", "offset", "ledger", "layered", "report", "pocket"];
  // name, Google Fonts family, weights (empty = the font has one weight), CSS fallback
  const FONTS = {
    inter: ["Inter", "Inter", "400;500;600;700;800", "system-ui, sans-serif"],
    manrope: ["Manrope", "Manrope", "400;500;600;700;800", "system-ui, sans-serif"],
    dmsans: ["DM Sans", "DM Sans", "400;500;700", "system-ui, sans-serif"],
    poppins: ["Poppins", "Poppins", "400;500;600;700;800", "system-ui, sans-serif"],
    outfit: ["Outfit", "Outfit", "400;500;600;700;800", "system-ui, sans-serif"],
    worksans: ["Work Sans", "Work Sans", "400;500;600;700", "system-ui, sans-serif"],
    space: ["Space Grotesk", "Space Grotesk", "400;500;600;700", "system-ui, sans-serif"],
    jakarta: ["Plus Jakarta Sans", "Plus Jakarta Sans", "400;500;600;700;800", "system-ui, sans-serif"],
    montserrat: ["Montserrat", "Montserrat", "400;500;600;700;800", "system-ui, sans-serif"],
    josefin: ["Josefin Sans", "Josefin Sans", "400;600;700", "system-ui, sans-serif"],
    syne: ["Syne", "Syne", "500;600;700;800", "system-ui, sans-serif"],
    bricolage: ["Bricolage Grotesque", "Bricolage Grotesque", "400;600;700;800", "system-ui, sans-serif"],
    lora: ["Lora", "Lora", "400;500;600;700", "Georgia, serif"],
    sourceserif: ["Source Serif 4", "Source Serif 4", "400;600;700", "Georgia, serif"],
    libre: ["Libre Baskerville", "Libre Baskerville", "400;700", "Georgia, serif"],
    playfair: ["Playfair Display", "Playfair Display", "400;600;700;800", "Georgia, serif"],
    fraunces: ["Fraunces", "Fraunces", "400;600;700;800", "Georgia, serif"],
    cormorant: ["Cormorant Garamond", "Cormorant Garamond", "400;500;600;700", "Georgia, serif"],
    dmserif: ["DM Serif Display", "DM Serif Display", "", "Georgia, serif"],
    instrument: ["Instrument Serif", "Instrument Serif", "", "Georgia, serif"],
    bebas: ["Bebas Neue", "Bebas Neue", "", "Impact, sans-serif"],
    archivo: ["Archivo Black", "Archivo Black", "", "Impact, sans-serif"],
  };
  const fontStack = (key) => { const f = FONTS[key] || FONTS.inter; return `'${f[1]}', ${f[3]}`; }; // single quotes: this goes inside style="…"

  const ANIMS = {
    particles: { name: "Floating particles", colors: ["#f2e27d", "#ffffff", "#9fd3ff"], base: "#101322" },
    waves: { name: "Gradient waves", colors: ["#7b6cf6", "#2ec5ce", "#f2e27d"], base: "#0e1726" },
    mesh: { name: "Gradient mesh", colors: ["#ffb3c7", "#a3c4ff", "#fde68a"], base: "#fdf6ef" },
    orbs: { name: "Glowing orbs", colors: ["#c084fc", "#38bdf8", "#f472b6"], base: "#0b0b16" },
    lines: { name: "Flowing lines", colors: ["#f2e27d", "#e8e4ff", "#7dd3c0"], base: "#141413" },
  };
  const ANIM_PALETTES = [
    ["#f2e27d", "#ffffff", "#9fd3ff"], ["#7b6cf6", "#2ec5ce", "#f2e27d"], ["#ffb3c7", "#a3c4ff", "#fde68a"],
    ["#c084fc", "#38bdf8", "#f472b6"], ["#fb923c", "#facc15", "#f43f5e"], ["#34d399", "#22d3ee", "#a7f3d0"],
  ];

  // ---------- the design object ----------

  function normalize(d) {
    const s = d || {};
    const bg = s.bg || {};
    const img = bg.image || {};
    const anim = bg.anim || {};
    const preset = ANIMS[anim.preset] ? anim.preset : "particles";
    const t = s.text || {};
    const look = s.look || {};
    return {
      template: s.template || "",
      bg: {
        type: ["none", "color", "gradient", "image", "video", "anim"].includes(bg.type) ? bg.type : "none",
        color: hex(bg.color, "#f7f6f2"),
        gradient: (() => {
          const g = bg.gradient || {};
          // Older drafts saved { a, b, angle }.
          const colors = (Array.isArray(g.colors) ? g.colors : [g.a, g.b]).map((c) => hex(c, "")).filter(Boolean).slice(0, 3);
          return { colors: colors.length >= 2 ? colors : ["#fbe7c6", "#f6b6c4"], dir: DIRS.includes(g.dir) && g.dir ? g.dir : g.angle !== undefined ? angleToDir(g.angle) : "to bottom right" };
        })(),
        image: { url: String(img.url || ""), zoom: clamp(img.zoom, 100, 300, 100), x: clamp(img.x, 0, 100, 50), y: clamp(img.y, 0, 100, 50), fit: img.fit === "contain" ? "contain" : "cover", credit: img.credit && typeof img.credit === "object" ? Object.fromEntries(["name", "url", "title", "page", "source", "license", "licenseUrl"].map((k) => [k, String(img.credit[k] || "").slice(0, 200)])) : null },
        video: { url: String((bg.video || {}).url || "") },
        anim: { preset, colors: [0, 1, 2].map((i) => hex((anim.colors || [])[i], ANIMS[preset].colors[i])), base: hex(anim.base, ANIMS[preset].base) },
        tone: bg.tone === "light" ? "light" : bg.tone === "dark" ? "dark" : "auto",
        scrim: clamp(bg.scrim, 0, 80, 0),
      },
      text: {
        font: FONTS[t.font] ? t.font : "inter",
        color: hex(t.color, ""),
        headFont: FONTS[t.headFont] ? t.headFont : "",
        headColor: hex(t.headColor, ""),
        headWeight: [400, 500, 600, 700, 800].includes(Number(t.headWeight)) ? Number(t.headWeight) : 700,
        headCase: t.headCase === "upper" ? "upper" : "none",
        headScale: clamp(t.headScale, 70, 150, 100),
        headSpacing: clamp(t.headSpacing, -4, 12, 0),
      },
      look: {
        // Four card styles; older names map onto them.
        cards: ({ solid: "card", brutal: "card", soft: "card", glass: "transparent", "glass-dark": "transparent" })[look.cards] || (["auto", "card", "none", "transparent", "outline"].includes(look.cards) ? look.cards : "auto"),
        layout: LAYOUTS.includes(look.layout) ? look.layout : "classic",
        hover: hex(look.hover, "#f2e27d"),
        cardColor: hex(look.cardColor, "#ffffff"),
        btnColor: hex(look.btnColor, ""),
        lineColor: hex(look.lineColor, ""),
        radius: clamp(look.radius, 0, 32, 16),
        width: clamp(look.width, 520, 900, 720),
        accent: hex(look.accent, ""),
        links: ["card", "pill", "underline"].includes(look.links) ? look.links : "card",
        stats: look.stats === "plain" ? "plain" : "tiles",
        gap: clamp(look.gap, 0, 28, 8),
      },
    };
  }

  // ---------- colour helpers ----------

  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
  const mix = (a, b, t) => { const x = rgb(a); const y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const rgba = (h, a) => `rgba(${rgb(h).join(",")},${a})`;
  const THEMES = { violet: "#5b4bd6", coral: "#d85a30", teal: "#0f6e56", ink: "#2c2c2a" };

  // Is the background behind the modules light or dark? Decides readable text colours.
  function bgTone(d) {
    const b = d.bg;
    if (b.tone !== "auto" && ["image", "video"].includes(b.type)) return b.tone;
    if (b.type === "none") return "light";
    if (b.type === "color") return lum(b.color) > 0.36 ? "light" : "dark";
    if (b.type === "gradient") return b.gradient.colors.reduce((t, c) => t + lum(c), 0) / b.gradient.colors.length > 0.36 ? "light" : "dark";
    if (b.type === "anim") return lum(b.anim.base) > 0.36 ? "light" : "dark";
    return "dark";
  }
  // "auto" module cards: plain on simple light/dark colours, frosted glass on photos, video and animation.
  const cardStyle = (d) => (d.look.cards !== "auto" ? d.look.cards : ["image", "video", "anim"].includes(d.bg.type) ? "transparent" : "none");

  // CSS variables and classes for the page. Module text sits on a card (if any) or straight on the background.
  function pageAttrs(design, theme) {
    const d = normalize(design);
    const cards = cardStyle(d);
    const tone = bgTone(d);
    // Cards: text follows the card colour; otherwise the text follows the background.
    const surface = cards === "card" ? (lum(d.look.cardColor) > 0.36 ? "light" : "dark") : tone;
    const light = surface === "light";
    const accent = d.look.accent || THEMES[theme] || THEMES.violet;
    const ink = d.text.color || (light ? "#1c1c1a" : "#f6f5f0");
    const v = {
      "--k": accent,
      "--k-soft": light ? mix(accent, "#ffffff", 0.88) : rgba(accent, 0.22),
      "--k-ink": light ? mix(accent, "#000000", 0.55) : mix(accent, "#ffffff", 0.6),
      "--ink": ink,
      "--soft": rgba(ink, 0.68),
      "--line": light ? "#e9e7e0" : "rgba(255,255,255,0.18)",
      "--head": d.text.headColor || ink,
      "--font": fontStack(d.text.font),
      "--head-font": fontStack(d.text.headFont || d.text.font),
      "--head-weight": d.text.headWeight,
      "--head-scale": d.text.headScale / 100,
      "--head-spacing": `${d.text.headSpacing / 100}em`,
      "--item-bg": light ? "#ffffff" : "rgba(255,255,255,0.08)",
      "--item-ink": light ? "#1c1c1a" : "#f6f5f0",
      "--radius": `${d.look.radius}px`,
      "--page-max": `${d.look.width}px`,
      "--gap": `${d.look.gap}px`,
      "--hover": d.look.hover,
      "--card-bg": d.look.cardColor,
      "--btn-bg": d.look.btnColor || accent,
      "--btn-ink": lum(d.look.btnColor || accent) > 0.45 ? "#141413" : "#ffffff",
      "--rule": d.look.lineColor || accent,
      "--glass": light ? "rgba(255,255,255,0.58)" : "rgba(10,10,14,0.38)",
    };
    const cls = [
      `pb-cards-${cards}`, `pb-surface-${surface}`, `pb-layout-${d.look.layout}`, `pb-links-${d.look.links}`, `pb-stats-${d.look.stats}`,
      d.text.headCase === "upper" ? "pb-head-upper" : "",
      d.bg.type !== "none" ? "pb-has-bg" : "",
    ].filter(Boolean).join(" ");
    return { cls, style: Object.entries(v).map(([k, val]) => `${k}:${val}`).join(";") };
  }

  // ---------- background ----------

  // Which kind of video link this is, or null if we can't play it as a background.
  function videoSource(url) {
    const u = String(url || "").trim();
    if (!/^https?:\/\//i.test(u)) return null;
    const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/i);
    if (yt) return { kind: "youtube", id: yt[1] };
    const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d{6,})/i);
    if (vimeo) return { kind: "vimeo", id: vimeo[1] };
    if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u) || /videos\.pexels\.com\/video-files\//i.test(u)) return { kind: "file", src: u };
    return null;
  }

  function bgHtml(design, { fixed = false } = {}) {
    const d = normalize(design);
    const b = d.bg;
    if (b.type === "none") return "";
    const tone = bgTone(d);
    let base = b.color;
    let inner = "";
    if (b.type === "gradient") base = `linear-gradient(${b.gradient.dir}, ${b.gradient.colors.join(", ")})`;
    if (b.type === "image") {
      base = "#1c1c1a";
      if (b.image.url && /^(https?:|data:image\/)/i.test(b.image.url)) {
        const z = b.image.zoom / 100;
        inner = `<img class="pb-bg-img" src="${esc(b.image.url)}" alt="" decoding="async" style="object-fit:${b.image.fit};object-position:${b.image.x}% ${b.image.y}%;transform:scale(${z});transform-origin:${b.image.x}% ${b.image.y}%">`;
      }
    }
    if (b.type === "video") {
      base = "#111111";
      if (videoSource(b.video.url)) inner = `<div class="pb-bg-video" data-video="${esc(b.video.url)}"></div>`;
    }
    if (b.type === "anim") {
      base = b.anim.base;
      const [c1, c2, c3] = b.anim.colors;
      const vars = `--c1:${c1};--c2:${c2};--c3:${c3};--base:${b.anim.base}`;
      if (b.anim.preset === "mesh") inner = `<div class="pb-anim-mesh" style="${vars}"><i></i><i></i><i></i><i></i></div>`;
      else if (b.anim.preset === "orbs") inner = `<div class="pb-anim-orbs" style="${vars}"><i></i><i></i><i></i><i></i></div>`;
      else inner = `<canvas class="pb-anim-canvas" data-anim="${b.anim.preset}" data-colors="${[c1, c2, c3].join(",")}" style="${vars}"></canvas>`;
    }
    const scrim = b.scrim ? `<div class="pb-scrim" style="background:${tone === "light" ? "#ffffff" : "#000000"};opacity:${b.scrim / 100}"></div>` : "";
    return `<div class="pb-bg${fixed ? " pb-bg-fixed" : ""}" aria-hidden="true" style="background:${base}">${inner}${scrim}</div>`;
  }

  // "Photo by X (CC BY 2.0) via Openverse": the credit free photos ask for. Links only to http(s).
  function creditHtml(c) {
    if (!c || !c.name) return "";
    const link = (u, t) => (/^https?:\/\//.test(u || "") ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t));
    const what = c.title ? `“${link(c.page, c.title)}”` : "Photo";
    return `${what} by ${link(c.url, c.name)}${c.license ? ` · ${link(c.licenseUrl, c.license)}` : ""}${c.source ? ` · via ${esc(c.source)}` : ""}`;
  }

  // ---------- fonts ----------

  const loadedFonts = new Set();
  function loadFonts(design, extra = []) {
    const d = normalize(design);
    const want = [d.text.font, d.text.headFont, ...extra].filter((k) => k && FONTS[k] && !loadedFonts.has(k));
    if (!want.length) return;
    want.forEach((k) => loadedFonts.add(k));
    const fams = want.map((k) => { const [, fam, w] = FONTS[k]; return `family=${fam.replace(/ /g, "+")}${w ? `:wght@${w}` : ""}`; }).join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fams}&display=swap`;
    document.head.appendChild(link);
  }

  // ---------- live parts: animations and video ----------

  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Runs a canvas animation at ~30fps, only while it's on screen and the tab is visible.
  function runCanvas(canvas) {
    if (canvas.dataset.running) return;
    canvas.dataset.running = "1";
    const ctx = canvas.getContext("2d");
    const colors = (canvas.dataset.colors || "").split(",");
    const kind = canvas.dataset.anim;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let visible = true;
    let parts = [];
    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = kind === "particles" ? Math.round(Math.min(90, (w * h) / 14000)) : 0;
      parts = Array.from({ length: count }, (_, i) => ({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.8, vx: (Math.random() - 0.5) * 0.6, vy: -0.25 - Math.random() * 0.6, c: colors[i % colors.length], p: Math.random() * 6.28 }));
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      if (kind === "particles") {
        for (const p of parts) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
          const a = 0.35 + 0.35 * Math.sin(t / 900 + p.p);
          ctx.beginPath();
          ctx.fillStyle = p.c;
          ctx.globalAlpha = a;
          ctx.shadowColor = p.c;
          ctx.shadowBlur = 8;
          ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else if (kind === "waves") {
        colors.forEach((c, i) => {
          const g = ctx.createLinearGradient(0, 0, w, 0);
          g.addColorStop(0, c);
          g.addColorStop(1, colors[(i + 1) % colors.length]);
          ctx.fillStyle = g;
          ctx.globalAlpha = 0.28;
          ctx.beginPath();
          const base = h * (0.55 + i * 0.12);
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 12) ctx.lineTo(x, base + Math.sin(x / (180 + i * 60) + t / (900 + i * 300)) * (30 + i * 12) + Math.sin(x / 90 + t / 700) * 8);
          ctx.lineTo(w, h);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      } else if (kind === "lines") {
        ctx.lineWidth = 1.1;
        const n = 22;
        for (let i = 0; i < n; i++) {
          ctx.strokeStyle = colors[i % colors.length];
          ctx.globalAlpha = 0.16 + (i % 3) * 0.06;
          ctx.beginPath();
          const y0 = (h / n) * i + h * 0.02;
          for (let x = -20; x <= w + 20; x += 16) {
            const y = y0 + Math.sin(x / 160 + t / 1100 + i * 0.35) * 34 + Math.cos(x / 340 - t / 1600 + i * 0.2) * 22;
            if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };
    size();
    if (reduced()) { draw(4000); return; }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    new ResizeObserver(size).observe(canvas);
    let last = 0;
    const loop = (t) => {
      if (!canvas.isConnected) { io.disconnect(); return; }
      requestAnimationFrame(loop);
      if (!visible || document.hidden || t - last < 33) return;
      last = t;
      draw(t);
    };
    requestAnimationFrame(loop);
  }

  // Background video: muted, looping, behind everything, never clickable. Skipped when the visitor
  // prefers reduced motion or saves data; the background colour shows instead.
  function startVideo(holder) {
    if (holder.dataset.started) return;
    holder.dataset.started = "1";
    const src = videoSource(holder.dataset.video);
    if (!src || reduced() || (navigator.connection && navigator.connection.saveData)) return;
    const start = () => {
      if (src.kind === "file") {
        const v = document.createElement("video");
        Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, preload: "auto" });
        v.setAttribute("muted", "");
        v.setAttribute("playsinline", "");
        v.src = src.src;
        v.onerror = () => v.remove();
        holder.appendChild(v);
        v.play().catch(() => {});
        return;
      }
      const f = document.createElement("iframe");
      f.title = "Background video";
      f.setAttribute("tabindex", "-1");
      f.allow = "autoplay; encrypted-media";
      f.src = src.kind === "youtube"
        ? `https://www.youtube-nocookie.com/embed/${src.id}?autoplay=1&mute=1&loop=1&playlist=${src.id}&controls=0&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3`
        : `https://player.vimeo.com/video/${src.id}?background=1&muted=1&loop=1&autoplay=1`;
      holder.appendChild(f);
      // Cover the area like a photo would (16:9 video).
      const fit = () => {
        const r = holder.getBoundingClientRect();
        const wide = r.width / Math.max(1, r.height) > 16 / 9;
        f.style.width = wide ? `${r.width}px` : `${(r.height * 16) / 9}px`;
        f.style.height = wide ? `${(r.width * 9) / 16}px` : `${r.height}px`;
      };
      fit();
      new ResizeObserver(fit).observe(holder);
    };
    if (document.readyState === "complete") setTimeout(start, 150);
    else window.addEventListener("load", () => setTimeout(start, 150), { once: true });
  }

  function mount(root) {
    root.querySelectorAll("canvas.pb-anim-canvas").forEach(runCanvas);
    root.querySelectorAll(".pb-bg-video[data-video]").forEach(startVideo);
  }

  window.PortfolioDesign = { COLORS, GRADIENTS, DIRS, LAYOUTS, FONTS, ANIMS, ANIM_PALETTES, THEMES, normalize, pageAttrs, bgHtml, bgTone, cardStyle, videoSource, loadFonts, creditHtml, mount, fontStack, lum };
})();
