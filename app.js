// CollabBoard: sign-up, left-menu app (Dashboard, Find Collabs, My Portfolio).
// No accounts yet: the profile and portfolio are saved in this browser only.
// Add ?test=1 to the URL to load data/test-listings.json instead (offline test data).

const dataFile = new URLSearchParams(location.search).has("test")
  ? "data/test-listings.json"
  : "data/listings.json";

const NICHES = ["Beauty", "Fashion", "Food", "Tech", "Travel", "Fitness", "Finance", "Parenting", "Gaming", "Lifestyle", "General"];
const LANGUAGES = ["Hindi", "English", "Tamil", "Telugu", "Marathi", "Bengali", "Kannada", "Malayalam", "Gujarati", "Punjabi"];
const FOLLOWER_RANGES = [
  ["1000", "Under 1k"],
  ["5000", "1k to 5k"],
  ["10000", "5k to 10k"],
  ["25000", "10k to 25k"],
  ["50000", "25k to 50k"],
  ["100000", "50k to 1 lakh"],
  ["10000000", "Over 1 lakh"],
];

const el = (id) => document.getElementById(id);
let listings = [];

// ---------- storage (may be unavailable in private windows) ----------

const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
let profile = store.get("cb_profile");
let portfolio = store.get("cb_portfolio") || {};
// Saved and applied collabs keep a copy of the listing, so they stay after it expires.
let saved = store.get("cb_saved") || {};
let applied = store.get("cb_applied") || {};
let view = "all";
// Collabs whose Apply button was clicked, so the button can look visited.
let clicked = store.get("cb_clicked") || {};
const STAR = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>`;
const today = () => new Date().toISOString().slice(0, 10);

// ---------- helpers ----------

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatFollowers = (n) => (n >= 100000 ? `${n / 100000} lakh+` : n >= 1000 ? `${n / 1000}k+` : `${n}+`);

const formatCount = (n) => {
  const v = Number(String(n).replace(/[^\d]/g, ""));
  if (!v) return "";
  if (v >= 100000) return `${+(v / 100000).toFixed(1)} lakh`;
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  return String(v);
};

const formatRupees = (n) => {
  const v = Number(String(n).replace(/[^\d]/g, ""));
  return v ? `₹${v.toLocaleString("en-IN")}` : "";
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fillSelect(select, options, placeholder) {
  select.innerHTML = placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : "";
  for (const opt of options) {
    const [value, label] = Array.isArray(opt) ? opt : [opt, opt];
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    select.appendChild(o);
  }
}

// ---------- listing cards (shared by Dashboard and Find Collabs) ----------

function card(l, i = 0) {
  const payClass = l.pay.startsWith("Paid") ? "paid" : l.pay === "Barter" ? "barter" : "";
  const tags = [
    l.pay !== "Not stated" ? `<span class="tag ${payClass}">${escapeHtml(l.pay)}</span>` : "",
    ...l.niches.map((n) => `<span class="tag">${escapeHtml(n)}</span>`),
    ...l.platforms.filter((p) => p !== "Any").map((p) => `<span class="tag">${escapeHtml(p)}</span>`),
    ...l.languages.map((x) => `<span class="tag">${escapeHtml(x)}</span>`),
    l.minFollowers === 0
      ? `<span class="tag fit">No minimum followers</span>`
      : l.minFollowers
        ? `<span class="tag">${formatFollowers(l.minFollowers)} followers</span>`
        : "",
  ].join("");

  const isSaved = !!saved[l.id];
  const appliedOn = applied[l.id] && applied[l.id].at;
  const ctaClass = appliedOn ? "apply done" : "apply";
  const ctaText = appliedOn ? `✓ Applied ${formatDate(appliedOn)}` : `Apply on ${escapeHtml(l.source)}`;
  // "Website" says little, so show the site's name instead.
  const where = l.source === "Website" ? l.hostname : l.source;
  const meta = [escapeHtml(where), l.published && `Posted ${formatDate(l.published)}`].filter(Boolean).join(" · ");

  return `<article class="card" data-id="${escapeHtml(l.id)}" style="--i:${i % 12}">
    <div class="card-head">
      <span class="card-meta">${meta}</span>
      <button type="button" class="star${isSaved ? " on" : ""}" data-save aria-pressed="${isSaved}" aria-label="${isSaved ? "Remove from saved" : "Save for later"}" title="${isSaved ? "Saved" : "Save for later"}">${STAR}</button>
    </div>
    <h3>${escapeHtml(l.title)}</h3>
    <p>${escapeHtml(l.description)}</p>
    <div class="tags">${tags}</div>
    <div class="card-actions">
      <a class="${ctaClass}" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" data-apply title="${appliedOn ? "Open the post again" : ""}">${ctaText}</a>
      ${appliedOn ? `<button type="button" class="undo" data-unapply title="Mark as not applied">Undo</button>` : ""}
    </div>
  </article>`;
}

// ---------- Find Collabs ----------

function matches(l) {
  const q = el("q").value.trim().toLowerCase();
  const niche = el("niche").value;
  const pay = el("pay").value;
  const source = el("source").value;
  const followers = Number(el("followers").value);

  if (q && !`${l.title} ${l.description} ${l.hostname}`.toLowerCase().includes(q)) return false;
  if (niche && !l.niches.includes(niche)) return false;
  if (pay === "paid" && !l.pay.startsWith("Paid")) return false;
  if (pay === "Barter" && !l.pay.includes("arter")) return false;
  if (source && l.source !== source) return false;
  if (followers && l.minFollowers > followers) return false;
  return true;
}

// ---------- Save and Applied tracking ----------

const byId = new Map();
const findListing = (id) => byId.get(id) || (saved[id] && saved[id].listing) || (applied[id] && applied[id].listing);

function toggleSave(id) {
  if (saved[id]) delete saved[id];
  else saved[id] = { at: today(), listing: findListing(id) };
  store.set("cb_saved", saved);
  refresh();
}

function markApplied(id, yes) {
  if (yes) {
    applied[id] = { at: today(), listing: findListing(id) };
    delete saved[id];
    store.set("cb_saved", saved);
  } else {
    delete applied[id];
  }
  store.set("cb_applied", applied);
  refresh();
}

function refresh() {
  el("count-saved").textContent = Object.keys(saved).length;
  el("count-applied").textContent = Object.keys(applied).length;
  renderCollabs();
  if (!el("page-dashboard").hidden) renderDashboard();
}

// When the creator clicks Apply we remember it, and ask once they come back.
const PENDING = "cb_pending_apply";
document.addEventListener("click", (e) => {
  const cardEl = e.target.closest(".card[data-id]");
  if (!cardEl) return;
  const id = cardEl.dataset.id;
  if (e.target.closest("[data-save]")) toggleSave(id);
  else if (e.target.closest("[data-unapply]")) markApplied(id, false);
  else if (e.target.closest("[data-markapplied]")) markApplied(id, true);
  else if (e.target.closest("[data-apply]") && !applied[id]) {
    store.set(PENDING, { id, at: Date.now() });
    clicked[id] = today();
    store.set("cb_clicked", clicked);
  }
});

function askIfApplied() {
  const pending = store.get(PENDING);
  if (!pending || !el("ask").hidden) return;
  // Ignore instant returns (the click itself) and old leftovers.
  const away = Date.now() - pending.at;
  if (away < 1500 || away > 6 * 3600 * 1000) return;
  const l = findListing(pending.id);
  if (!l || applied[pending.id]) return store.remove(PENDING);
  el("ask-text").textContent = l.title;
  el("ask").hidden = false;
  el("ask-yes").focus();
}

function closeAsk(action) {
  const pending = store.get(PENDING);
  store.remove(PENDING);
  el("ask").hidden = true;
  if (!pending) return;
  if (action === "yes") markApplied(pending.id, true);
  if (action === "save" && !saved[pending.id]) toggleSave(pending.id);
}

el("ask-yes").addEventListener("click", () => closeAsk("yes"));
el("ask-save").addEventListener("click", () => closeAsk("save"));
el("ask-no").addEventListener("click", () => closeAsk("no"));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el("ask").hidden) closeAsk("no"); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") askIfApplied(); });
window.addEventListener("focus", askIfApplied);
window.addEventListener("pageshow", askIfApplied); // returning with the browser's Back button

// ---------- pages of results: 3 rows at a time ----------

const ROWS_PER_PAGE = 3;
let pageNo = 1;
let lastItems = [];
let lastEmpty = "";

function columns() {
  const cols = getComputedStyle(el("grid")).gridTemplateColumns.split(" ").filter(Boolean).length;
  return Math.max(1, cols || 1);
}

function showResults(items, emptyText) {
  lastItems = items;
  lastEmpty = emptyText;
  const perPage = columns() * ROWS_PER_PAGE;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  pageNo = Math.min(Math.max(1, pageNo), pages);
  const start = (pageNo - 1) * perPage;
  el("grid").innerHTML = items.length
    ? items.slice(start, start + perPage).map(card).join("")
    : `<div class="empty">${emptyText}</div>`;
  renderPager(pages);
}

function renderPager(pages) {
  const pager = el("pager");
  if (pages <= 1) { pager.innerHTML = ""; return; }
  // Show first, last and the pages around the current one.
  const nums = [...new Set([1, pageNo - 1, pageNo, pageNo + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  let html = `<button type="button" data-goto="${pageNo - 1}" ${pageNo === 1 ? "disabled" : ""}>Previous</button>`;
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) html += `<span class="gap">…</span>`;
    html += `<button type="button" data-goto="${n}" class="${n === pageNo ? "current" : ""}" ${n === pageNo ? 'aria-current="page"' : ""}>${n}</button>`;
  });
  html += `<button type="button" data-goto="${pageNo + 1}" ${pageNo === pages ? "disabled" : ""}>Next</button>`;
  pager.innerHTML = html;
}

el("pager").addEventListener("click", (e) => {
  const b = e.target.closest("[data-goto]");
  if (!b || b.disabled) return;
  pageNo = Number(b.dataset.goto);
  showResults(lastItems, lastEmpty);
  el("page-collabs").scrollIntoView({ behavior: "smooth", block: "start" });
});

// Columns change with screen width, so the page size does too.
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!el("page-collabs").hidden) showResults(lastItems, lastEmpty); }, 150);
});

function setView(v) {
  if (v !== view) pageNo = 1;
  view = v;
  document.querySelectorAll(".tabs [data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === v);
    b.setAttribute("aria-selected", b.dataset.view === v);
  });
  renderCollabs();
}

function renderCollabs() {
  if (view !== "all") {
    const list = view === "saved" ? saved : applied;
    const items = Object.entries(list)
      .sort((a, b) => b[1].at.localeCompare(a[1].at))
      .map(([id, v]) => byId.get(id) || v.listing)
      .filter(Boolean);
    el("count").textContent = view === "saved"
      ? `${items.length} saved for later`
      : `${items.length} applied`;
    showResults(items, view === "saved" ? "Nothing saved yet. Tap Save on any collab to keep it here." : "No applications yet. After you apply, mark the collab as applied to track it here.");
    return;
  }
  const followers = Number(el("followers").value);
  let shown = listings.filter(matches);
  let countText = `${shown.length} of ${listings.length} opportunities`;
  if (followers) {
    // Posts that state a requirement you meet come first; the rest don't say.
    const known = (l) => l.minFollowers !== null && l.minFollowers !== undefined;
    const fits = shown.filter(known);
    const unknown = shown.filter((l) => !known(l));
    shown = [...fits, ...unknown];
    countText = fits.length
      ? `${shown.length} opportunities · ${fits.length} say they accept your follower count`
      : `${shown.length} opportunities · none of these state a follower minimum, so check each post`;
  }
  el("count").textContent = countText;
  showResults(shown, listings.length ? "No opportunities match these filters. Try clearing one." : "No opportunities yet. New ones are added automatically every morning.");
}

function setupCollabs() {
  fillSelect(el("niche"), [...new Set(listings.flatMap((l) => l.niches))].sort(), "All niches");
  fillSelect(el("source"), [...new Set(listings.map((l) => l.source))].sort(), "All sources");
  fillSelect(el("followers"), FOLLOWER_RANGES, "My followers: any");
  // Start from the creator's own profile.
  if (profile) el("followers").value = profile.followers || "";
  ["q", "niche", "pay", "source", "followers"].forEach((id) => el(id).addEventListener("input", () => {
    pageNo = 1;
    if (view !== "all") location.hash = "#/collabs";
    else renderCollabs();
  }));
  document.querySelectorAll(".tabs [data-view]").forEach((b) => b.addEventListener("click", () => {
    location.hash = b.dataset.view === "all" ? "#/collabs" : `#/collabs/${b.dataset.view}`;
  }));
  refresh();
}

// ---------- Dashboard ----------

function fitsProfile(l) {
  if (!profile) return true;
  const nicheOk = !profile.niche || profile.niche === "General" || l.niches.includes(profile.niche) || l.niches.includes("General");
  const followersOk = !(l.minFollowers > Number(profile.followers));
  return nicheOk && followersOk;
}

function portfolioCompletion() {
  const s = window.Portfolio.migrate(store.get("cb_site"));
  if (!s) return 0;
  const has = (type, test) => s.blocks.some((b) => b.type === type && test(b));
  const checks = [
    has("profile", (b) => b.name && b.bio),
    has("profile", (b) => b.photo),
    has("text", (b) => (b.html || "").replace(/<[^>]+>/g, "").trim().length > 40),
    has("socials", (b) => (b.items || []).some((i) => i.value)),
    has("instagram", (b) => b.handle),
    has("file", (b) => (b.items || []).length > 0),
    has("stats", (b) => (b.items || []).some((i) => i.value)),
    has("rates", (b) => (b.items || []).some((i) => i.price)),
    !!s.publishedAt,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function renderDashboard() {
  const first = (profile.name || "").trim().split(/\s+/)[0];
  el("hello").textContent = `Hi ${first || "there"}`;
  const fits = listings.filter(fitsProfile);
  // Paid first, then those that name the creator's niche, then newest.
  const score = (l) => (l.pay.startsWith("Paid") ? 2 : 0) + (l.niches.includes(profile.niche) ? 1 : 0);
  const best = [...fits].sort((a, b) => score(b) - score(a)).slice(0, 6);
  el("stat-matches").textContent = fits.length;
  el("stat-saved").textContent = Object.keys(saved).length;
  el("stat-applied").textContent = Object.keys(applied).length;
  const pct = portfolioCompletion();
  el("stat-portfolio").textContent = `${pct}%`;
  el("portfolio-callout").hidden = pct >= 80;
  el("dash-grid").innerHTML = best.length
    ? best.map(card).join("")
    : `<div class="empty">No matches yet. New collabs are added every morning.</div>`;
}

// ---------- My Portfolio: module builder ----------

const P = window.Portfolio;
let site = P.migrate(store.get("cb_site"));
let selectedId = null;
const newId = () => Math.random().toString(36).slice(2, 10);
const slugify = (s = "") => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40);
const EMOJIS = ["😊", "😍", "🔥", "✨", "💯", "🙌", "❤️", "👍", "🙏", "🎉", "⭐", "📸", "🎥", "🎬", "💄", "👗", "👟", "🍲", "☕", "📱", "💻", "✈️", "🏖️", "💪", "🧘", "💰", "📈", "🤝", "🌸", "🌿", "🇮🇳", "📍"];
const SIZES = [["14", "Small"], ["16", "Normal"], ["20", "Large"], ["26", "Extra large"], ["34", "Huge"]];

// First visit: start from the sign-up details (and the older form, if it was used).
function starterSite() {
  const old = portfolio || {};
  const name = old.displayName || (profile && profile.name) || "";
  const ig = String(old.igHandle || (profile && profile.instagram) || "").replace(/^@/, "").trim();
  const block = (type, extra = {}) => ({ id: newId(), type, ...P.BLOCKS[type].make(), ...extra });
  return {
    v: 2,
    theme: old.theme || "violet",
    slug: slugify(name),
    blocks: [
      block("profile", { name, bio: old.tagline || "", photo: old.photo || "" }),
      block("text", { html: old.bio ? P.esc(old.bio) : "" }),
      block("socials", { items: ig ? [{ platform: "instagram", value: ig }] : [] }),
      block("stats", { items: [{ label: "Instagram followers", value: old.igFollowers || "" }, { label: "Average Reel views", value: old.avgViews || "" }] }),
      block("rates", { items: [{ label: "Instagram Reel", price: old.rateReel || "" }, { label: "Story", price: old.rateStory || "" }], barter: !!old.openBarter }),
    ],
  };
}

const findBlock = (id) => site.blocks.find((b) => b.id === id);
const hasProfile = () => site.blocks.some((b) => b.type === "profile");

function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys.at(-1)] = value;
}

function saveSite({ changed = true } = {}) {
  if (changed) site.dirty = true;
  const ok = store.set("cb_site", site);
  if (ok === false) note("Your browser is out of space for this draft. Publish to keep big photos safe.", true);
  renderShareBar();
}

function renderCanvas() {
  el("canvas").innerHTML = P.renderPortfolio(site, { edit: true, selected: selectedId });
  P.enhance(el("canvas"), { edit: true });
  renderPalette();
}

// Redraws only one module, so the others (like an Instagram preview) don't reload.
function renderOne(id) {
  const b = findBlock(id);
  const node = document.querySelector(`#canvas [data-block="${id}"]`);
  if (!b || !node) return renderCanvas();
  const tmp = document.createElement("div");
  tmp.innerHTML = P.wrapBlock(b, true, selectedId);
  node.replaceWith(tmp.firstElementChild);
  P.enhance(el("canvas"), { edit: true });
}

function selectBlock(id) {
  selectedId = id;
  document.querySelectorAll("#canvas .pb-editable").forEach((s) => s.classList.toggle("pb-selected", s.dataset.block === id));
  renderEditPanel();
  if (id) showPanel("edit");
}

function insertBlock(type, index) {
  if (P.BLOCKS[type].once && hasProfile()) {
    const existing = site.blocks.find((b) => b.type === type);
    return selectBlock(existing.id);
  }
  const b = { id: newId(), type, ...P.BLOCKS[type].make() };
  // The profile header always goes first.
  const at = type === "profile" ? 0 : index ?? (selectedId ? site.blocks.findIndex((x) => x.id === selectedId) + 1 : site.blocks.length);
  site.blocks.splice(at, 0, b);
  saveSite();
  renderCanvas();
  selectBlock(b.id);
  const node = document.querySelector(`#canvas [data-block="${b.id}"]`);
  if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
}

function moveBlock(id, to) {
  const from = site.blocks.findIndex((b) => b.id === id);
  if (from < 0) return;
  const [b] = site.blocks.splice(from, 1);
  site.blocks.splice(Math.max(0, Math.min(to > from ? to - 1 : to, site.blocks.length)), 0, b);
  saveSite();
  renderCanvas();
}

// ----- right panel -----

function showPanel(name) {
  document.querySelectorAll(".panel-tabs [data-panel]").forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
  for (const p of ["add", "edit", "look"]) el(`panel-${p}`).hidden = p !== name;
}

function renderPalette() {
  el("palette").innerHTML = Object.entries(P.BLOCKS)
    .map(([type, d]) => {
      const off = d.once && hasProfile();
      return `<button type="button" class="pal-item${off ? " off" : ""}" draggable="${!off}" data-add="${type}" ${off ? 'title="Already on your page. Click to edit it."' : ""}><strong>${escapeHtml(d.name)}</strong><span>${off ? "Already on your page" : escapeHtml(d.hint)}</span></button>`;
    })
    .join("");
}

const field = (label, name, value, attrs = "") => `<label>${label}<input data-f="${name}" value="${escapeHtml(value ?? "")}" ${attrs}></label>`;
const slider = (label, name, value, min, max, unit = "") => `<label class="slider">${label}<span class="slider-row"><input type="range" data-f="${name}" data-num min="${min}" max="${max}" value="${value}"><output>${value}${unit}</output></span></label>`;

function renderEditPanel() {
  const b = selectedId && findBlock(selectedId);
  const panel = el("panel-edit");
  if (!b) {
    panel.innerHTML = `<p class="fine">Click a module on your page to edit it, or add one from the Add tab.</p>`;
    return;
  }
  const title = `<p class="panel-label">${escapeHtml(P.BLOCKS[b.type] ? P.BLOCKS[b.type].name : "Module")}</p>`;
  const rows = (items, a, bKey, aLabel, bLabel) =>
    items.map((it, i) => `<div class="row-edit"><input data-f="items.${i}.${a}" value="${escapeHtml(it[a] ?? "")}" placeholder="${aLabel}" aria-label="${aLabel}"><input data-f="items.${i}.${bKey}" value="${escapeHtml(it[bKey] ?? "")}" placeholder="${bLabel}" aria-label="${bLabel}"><button type="button" class="x" data-del-row="${i}" aria-label="Remove row">✕</button></div>`).join("") +
    `<button type="button" class="btn small" data-add-row>+ Add row</button>`;
  let body = "";
  switch (b.type) {
    case "profile":
      body = `<label>Profile photo<input type="file" accept="image/png,image/jpeg,image/webp" data-upload="photo"></label>` +
        (b.photo
          ? `<div class="crop-preview" style="border-radius:${b.radius ?? 50}%"><img src="${escapeHtml(P.safeMedia(b.photo))}" alt="" style="object-position:50% ${b.posY ?? 50}%;transform:scale(${(b.zoom ?? 100) / 100});transform-origin:50% ${b.posY ?? 50}%"></div>` +
            slider("Zoom", "zoom", b.zoom ?? 100, 100, 250, "%") +
            slider("Move up or down", "posY", b.posY ?? 50, 0, 100, "%") +
            slider("Shape: square to circle", "radius", b.radius ?? 50, 0, 50, "") +
            `<button type="button" class="link-btn" data-clear="photo">Remove photo</button>`
          : "") +
        field("Name", "name", b.name) +
        `<label>Bio <span class="opt">Enter starts a new line</span><textarea data-f="bio" rows="4" placeholder="Skincare and makeup for Indian skin&#10;Pune · Hindi and English">${escapeHtml(b.bio || "")}</textarea></label>`;
      break;
    case "text":
      body = `<div class="rte-bar" role="toolbar" aria-label="Text formatting">
          <button type="button" data-cmd="bold" title="Bold" aria-label="Bold"><b>B</b></button>
          <button type="button" data-cmd="italic" title="Italic" aria-label="Italic"><i>I</i></button>
          <button type="button" data-cmd="normal" title="Normal text" aria-label="Normal text">Normal</button>
          <select data-size aria-label="Text size"><option value="">Size</option>${SIZES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
          <button type="button" data-emoji-toggle title="Emoji" aria-label="Emoji">😊</button>
        </div>
        <div class="emoji-grid" hidden>${EMOJIS.map((e) => `<button type="button" data-emoji="${e}">${e}</button>`).join("")}</div>
        <div class="rte" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Text" data-placeholder="Write here. Select words to make them bold, italic or bigger.">${P.cleanHtml(b.html || "")}</div>
        <p class="fine">Select part of your text, then choose bold, italic or a size.</p>`;
      break;
    case "link": {
      const missing = (v) => (!String(v || "").trim() ? `<span class="req">Required</span>` : "");
      const badUrl = b.url && !P.safeUrl(b.url) ? `<span class="req">Check this address</span>` : "";
      body = field(`Text ${missing(b.text)}`, "text", b.text, 'placeholder="Watch my latest campaign"') +
        field(`Link ${missing(b.url) || badUrl}`, "url", b.url, 'placeholder="YouTube, PDF, Google Drive or any link" inputmode="url"') +
        `<label>Image <span class="opt">optional</span><input type="file" accept="image/png,image/jpeg,image/webp" data-upload="image"></label>` +
        (b.image
          ? `<div class="seg wide" role="group" aria-label="Image side"><button type="button" data-side="left" class="${b.side !== "right" ? "active" : ""}">Image left</button><button type="button" data-side="right" class="${b.side === "right" ? "active" : ""}">Image right</button></div><button type="button" class="link-btn" data-clear="image">Remove image</button>`
          : `<p class="fine">Without an image, the text is centred.</p>`);
      break;
    }
    case "stats":
      body = rows(b.items || [], "label", "value", "e.g. Instagram followers", "e.g. 12400");
      break;
    case "file":
      if (!b.kind) {
        body = `<p class="fine">What do you want to add?</p><div class="choice">
          <button type="button" data-kind="images"><strong>Images</strong><span>PNG or JPG, shown as a carousel</span></button>
          <button type="button" data-kind="pdf"><strong>PDF</strong><span>A preview visitors can open and read</span></button></div>`;
      } else if (b.kind === "images") {
        body = `<label>Add photos<input type="file" accept="image/png,image/jpeg,image/webp" multiple data-upload="images"></label>
          <p class="fine">Select several at once. They show as a swipeable carousel.</p>
          <div class="thumbs">${(b.items || []).map((m, i) => `<div class="thumb">${m.type === "video" ? `<video src="${escapeHtml(P.safeMedia(m.url))}" muted></video>` : `<img src="${escapeHtml(P.safeMedia(m.url))}" alt="">`}<button type="button" class="x" data-del-item="${i}" aria-label="Remove">✕</button></div>`).join("")}</div>`;
      } else {
        body = `<label>Add a PDF<input type="file" accept=".pdf,application/pdf" data-upload="pdf"></label>
          <p class="fine">${Cloud.ready ? "Up to 50 MB. Visitors tap the preview to read it." : "PDF uploads turn on after sharing is set up."}</p>
          ${(b.items || []).map((f, i) => `<div class="file-row"><span>📄 ${escapeHtml(f.name || "Document.pdf")}</span><button type="button" class="x" data-del-item="${i}" aria-label="Remove">✕</button></div>`).join("")}`;
      }
      if (b.kind && !(b.items || []).length) body += `<button type="button" class="link-btn" data-kind="">Change to ${b.kind === "pdf" ? "images" : "PDF"}</button>`;
      break;
    case "socials":
      body = (b.items || []).map((it, i) => {
        const p = P.platformById(it.platform);
        return `<div class="social-row">${P.icon(p)}<label class="grow"><span class="sr">${escapeHtml(p.name)}</span><input data-f="items.${i}.value" value="${escapeHtml(it.value || "")}" placeholder="${escapeHtml(p.name)}: ${escapeHtml(p.hint)}"></label><button type="button" class="x" data-del-row="${i}" aria-label="Remove ${escapeHtml(p.name)}">✕</button></div>`;
      }).join("") +
        `<p class="panel-label">Add a platform</p>
        <input type="search" data-search placeholder="Search Instagram, Facebook, Google Reviews…" aria-label="Search platforms">
        <div class="platforms" id="platform-list">${platformButtons("")}</div>`;
      break;
    case "rates":
      body = rows(b.items || [], "label", "price", "e.g. Instagram Reel", "₹ price") +
        `<label class="check"><input type="checkbox" data-f="barter" ${b.barter ? "checked" : ""}> Open to barter collabs</label>`;
      break;
    case "instagram":
      body = field("Instagram username", "handle", b.handle, 'placeholder="@yourname" autocapitalize="none"') +
        `<p class="fine">Your account must be public. Instagram shows your photo, bio and latest posts; what appears is decided by Instagram.</p>`;
      break;
  }
  panel.innerHTML = `${title}<div class="edit-fields">${body}</div><p class="upload-note" id="upload-note" hidden></p>`;
  if (b.type === "text") setupTextEditor(b);
}

function platformButtons(q) {
  const s = q.trim().toLowerCase();
  const list = P.PLATFORMS.filter((p) => !s || p.name.toLowerCase().includes(s) || p.id.includes(s));
  return list.length
    ? list.map((p) => `<button type="button" data-platform="${p.id}">${P.icon(p)}<span>${escapeHtml(p.name)}</span></button>`).join("")
    : `<p class="fine">No match. Use "Website" for any other link.</p>`;
}

// ----- the text editor -----

function setupTextEditor(b) {
  const panel = el("panel-edit");
  const editor = panel.querySelector(".rte");
  let range = null;
  const remember = () => {
    const sel = getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode)) range = sel.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    editor.focus();
    if (range) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); }
  };
  const commit = () => {
    b.html = P.cleanHtml(editor.innerHTML);
    saveSite();
    renderOne(b.id);
  };
  editor.addEventListener("input", commit);
  editor.addEventListener("keyup", remember);
  editor.addEventListener("mouseup", remember);
  editor.addEventListener("blur", remember);
  // Keep the text selection when the toolbar is clicked.
  panel.querySelector(".rte-bar").addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
  panel.querySelector(".emoji-grid").addEventListener("mousedown", (e) => e.preventDefault());

  panel.querySelector(".rte-bar").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.emojiToggle !== undefined) {
      const g = panel.querySelector(".emoji-grid");
      g.hidden = !g.hidden;
      return;
    }
    restore();
    if (btn.dataset.cmd === "bold") document.execCommand("bold");
    if (btn.dataset.cmd === "italic") document.execCommand("italic");
    if (btn.dataset.cmd === "normal") document.execCommand("removeFormat");
    remember();
    commit();
  });
  panel.querySelector("[data-size]").addEventListener("change", (e) => {
    const px = e.target.value;
    e.target.value = "";
    if (!px) return;
    restore();
    // The browser marks the selection with <font size="7">; we swap that for an exact size.
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("fontSize", false, "7");
    editor.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      span.append(...f.childNodes);
      f.replaceWith(span);
    });
    remember();
    commit();
  });
  panel.querySelector(".emoji-grid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-emoji]");
    if (!btn) return;
    restore();
    document.execCommand("insertText", false, btn.dataset.emoji);
    remember();
    commit();
  });
}

// ----- uploads -----

function shrinkImage(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not read that image"))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = URL.createObjectURL(file);
  });
}

const blobToDataUrl = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });

async function uploadImage(file, maxSide) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error("Please choose a PNG or JPG image.");
  // Before sharing is set up, small copies are kept in this browser's draft.
  if (!Cloud.ready) return blobToDataUrl(await shrinkImage(file, Math.min(maxSide, 900)));
  const blob = await shrinkImage(file, maxSide);
  return Cloud.upload(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
}

async function uploadPdf(file) {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) throw new Error("Please choose a .pdf file.");
  if (!Cloud.ready) throw new Error("PDF uploads turn on after sharing is set up.");
  return Cloud.upload(file);
}

function note(text, isError) {
  const n = el("upload-note");
  if (!n) return;
  n.hidden = !text;
  n.textContent = text || "";
  n.classList.toggle("error", !!isError);
}

function setupPanel() {
  const panel = el("panel-edit");
  panel.addEventListener("input", (e) => {
    const b = findBlock(selectedId);
    if (!b) return;
    if (e.target.dataset.search !== undefined) {
      el("platform-list").innerHTML = platformButtons(e.target.value);
      return;
    }
    const f = e.target.dataset.f;
    if (!f) return;
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.dataset.num !== undefined ? Number(e.target.value) : e.target.value;
    setPath(b, f, v);
    if (e.target.type === "range") {
      e.target.nextElementSibling.textContent = `${v}${f === "radius" ? "" : "%"}`;
      const prev = panel.querySelector(".crop-preview");
      if (prev) {
        prev.style.borderRadius = `${b.radius}%`;
        const img = prev.querySelector("img");
        img.style.objectPosition = `50% ${b.posY}%`;
        img.style.transform = `scale(${b.zoom / 100})`;
        img.style.transformOrigin = `50% ${b.posY}%`;
      }
    }
    saveSite();
    renderOne(b.id);
    // Show or hide "Required" hints without moving the cursor.
    if (b.type === "link") {
      panel.querySelectorAll("label").forEach((l) => {
        const input = l.querySelector('[data-f="text"],[data-f="url"]');
        if (!input) return;
        let req = l.querySelector(".req");
        const msg = !input.value.trim() ? "Required" : input.dataset.f === "url" && !P.safeUrl(input.value) ? "Check this address" : "";
        if (msg && !req) { req = document.createElement("span"); req.className = "req"; input.before(req); }
        if (req) { if (msg) req.textContent = msg; else req.remove(); }
      });
    }
  });
  panel.addEventListener("click", (e) => {
    const b = findBlock(selectedId);
    const t = e.target.closest("button");
    if (!b || !t) return;
    if (t.dataset.addRow !== undefined) b.items.push({});
    else if (t.dataset.delRow !== undefined) b.items.splice(Number(t.dataset.delRow), 1);
    else if (t.dataset.delItem !== undefined) b.items.splice(Number(t.dataset.delItem), 1);
    else if (t.dataset.clear) b[t.dataset.clear] = "";
    else if (t.dataset.kind !== undefined) b.kind = t.dataset.kind;
    else if (t.dataset.side) b.side = t.dataset.side;
    else if (t.dataset.platform) b.items.push({ platform: t.dataset.platform, value: "" });
    else return;
    saveSite();
    renderOne(b.id);
    renderEditPanel();
    if (t.dataset.platform) {
      const inputs = panel.querySelectorAll('.social-row input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
  });
  panel.addEventListener("change", async (e) => {
    const input = e.target;
    if (!input.dataset.upload || !input.files.length) return;
    const b = findBlock(selectedId);
    const files = [...input.files];
    const kind = input.dataset.upload;
    note(`Uploading ${files.length > 1 ? `${files.length} files` : "your file"}…`);
    try {
      for (const file of files) {
        if (kind === "photo") { b.photo = await uploadImage(file, 600); b.zoom = 100; b.posY = 50; }
        else if (kind === "image") b.image = await uploadImage(file, 800);
        else if (kind === "images") b.items.push({ type: "image", url: await uploadImage(file, 1600), name: file.name });
        else if (kind === "pdf") b.items.push({ type: "pdf", url: await uploadPdf(file), name: file.name });
      }
      saveSite();
      renderOne(b.id);
      renderEditPanel();
    } catch (err) {
      note(err.message || "Upload failed. Please try again.", true);
    }
  });
}

// ----- canvas: select, type, move, drag and drop -----

function setupCanvas() {
  const canvas = el("canvas");

  canvas.addEventListener("click", (e) => {
    const block = e.target.closest(".pb-editable");
    if (!block) return;
    const id = block.dataset.block;
    const t = e.target.closest("button");
    if (t && t.dataset.move) {
      const i = site.blocks.findIndex((b) => b.id === id);
      const to = i + Number(t.dataset.move);
      if (to < 0 || to >= site.blocks.length) return;
      const [b] = site.blocks.splice(i, 1);
      site.blocks.splice(to, 0, b);
      saveSite();
      renderCanvas();
      return;
    }
    if (t && t.dataset.remove !== undefined) {
      site.blocks = site.blocks.filter((b) => b.id !== id);
      if (selectedId === id) selectedId = null;
      saveSite();
      renderCanvas();
      renderEditPanel();
      return;
    }
    if (e.target.closest("a")) e.preventDefault(); // links don't open while editing
    if (selectedId !== id) selectBlock(id);
  });

  // Typing straight onto the page (name, bio, numbers, rates).
  canvas.addEventListener("input", (e) => {
    const f = e.target.dataset && e.target.dataset.edit;
    const block = e.target.closest(".pb-editable");
    if (!f || !block) return;
    const b = findBlock(block.dataset.block);
    setPath(b, f, e.target.innerText.replace(/\n$/, ""));
    saveSite();
    // Keep the panel in step with what's typed on the page.
    const twin = el("panel-edit").querySelector(`[data-f="${f}"]`);
    if (twin && twin !== document.activeElement) twin.value = e.target.innerText.replace(/\n$/, "");
  });

  const line = document.createElement("div");
  line.className = "drop-line";
  let dropIndex = null;
  const indexAt = (y) => {
    const blocks = [...canvas.querySelectorAll(".pb-editable")];
    for (let i = 0; i < blocks.length; i++) {
      const r = blocks[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return blocks.length;
  };

  document.addEventListener("dragstart", (e) => {
    const pal = e.target.closest && e.target.closest("[data-add]");
    const grip = e.target.closest && e.target.closest(".pb-grip");
    if (pal) {
      if (pal.classList.contains("off")) return e.preventDefault();
      e.dataTransfer.setData("text/plain", `new:${pal.dataset.add}`);
    } else if (grip) {
      const block = grip.closest(".pb-editable");
      e.dataTransfer.setData("text/plain", `move:${block.dataset.block}`);
      e.dataTransfer.setDragImage(block, 20, 20);
      block.classList.add("pb-dragging");
    } else return;
    e.dataTransfer.effectAllowed = "move";
  });
  document.addEventListener("dragend", () => {
    line.remove();
    canvas.querySelectorAll(".pb-dragging").forEach((b) => b.classList.remove("pb-dragging"));
  });
  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropIndex = indexAt(e.clientY);
    const blocks = [...canvas.querySelectorAll(".pb-editable")];
    const page = canvas.querySelector(".pb-page");
    if (!blocks.length) page.appendChild(line);
    else if (dropIndex < blocks.length) blocks[dropIndex].before(line);
    else blocks.at(-1).after(line);
  });
  canvas.addEventListener("dragleave", (e) => { if (!canvas.contains(e.relatedTarget)) line.remove(); });
  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    line.remove();
    const data = e.dataTransfer.getData("text/plain");
    if (data.startsWith("new:")) insertBlock(data.slice(4), dropIndex);
    else if (data.startsWith("move:")) moveBlock(data.slice(5), dropIndex);
  });

  el("palette").addEventListener("click", (e) => {
    const pal = e.target.closest("[data-add]");
    if (pal) insertBlock(pal.dataset.add);
  });
}

// ----- preview, device size, theme, link, publish -----

function shareUrl() {
  return `${location.origin}/p/${site.slug}`;
}

function renderShareBar() {
  const bar = el("pf-share");
  if (!bar) return;
  if (!site.publishedAt) { bar.hidden = true; return; }
  bar.hidden = false;
  const url = shareUrl();
  bar.innerHTML = `<span class="dot${site.dirty ? " pending" : ""}"></span>
    <span>${site.dirty ? "You have changes that aren't public yet. Click Publish to update your link." : "Your portfolio is live:"}</span>
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url.replace(/^https?:\/\//, ""))}</a>
    <button type="button" class="btn small" id="copy-link">Copy link</button>`;
  el("copy-link").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(url); el("copy-link").textContent = "Copied"; } catch { prompt("Copy your link:", url); }
  });
}

const validSlug = (s) => /^[a-z0-9][a-z0-9-]{2,39}$/.test(s);

async function publish() {
  const btn = el("pf-publish");
  const bar = el("pf-share");
  if (!Cloud.ready) {
    bar.hidden = false;
    bar.innerHTML = `<span class="dot pending"></span><span>Public links turn on after the one-time Supabase setup. Use Preview to see your portfolio meanwhile.</span>`;
    return;
  }
  if (!validSlug(site.slug || "")) {
    showPanel("look");
    el("pf-slug").focus();
    el("slug-note").textContent = "Choose your link name first: at least 3 lowercase letters, numbers or dashes.";
    el("slug-note").classList.add("error");
    return;
  }
  btn.disabled = true;
  btn.textContent = "Publishing…";
  try {
    if (!(await Cloud.slugFree(site.slug))) throw new Error("That link name is taken. Try another.");
    const { dirty, publishedAt, ...data } = site;
    await Cloud.publish(site.slug, data);
    site.publishedAt = new Date().toISOString();
    site.dirty = false;
    saveSite({ changed: false });
  } catch (err) {
    bar.hidden = false;
    bar.innerHTML = `<span class="dot pending"></span><span class="error">${escapeHtml(err.message || "Could not publish. Please try again.")}</span>`;
    if (/link name/.test(err.message || "")) showPanel("look");
  } finally {
    btn.disabled = false;
    btn.textContent = "Publish";
  }
}

async function setupPortfolio() {
  if (!site) site = starterSite();
  if (Cloud.ready && !site.publishedAt) {
    try {
      const mine = await Cloud.loadMine();
      if (mine) site = { ...P.migrate(mine.data), slug: mine.slug, publishedAt: mine.updated_at, dirty: false };
    } catch { /* offline: keep the draft */ }
  }
  saveSite({ changed: false });

  renderCanvas();
  renderEditPanel();
  setupCanvas();
  setupPanel();

  document.querySelectorAll(".panel-tabs [data-panel]").forEach((b) => b.addEventListener("click", () => showPanel(b.dataset.panel)));

  document.querySelectorAll(".seg [data-device]").forEach((b) => b.addEventListener("click", () => {
    el("canvas").dataset.device = b.dataset.device;
    document.querySelectorAll(".seg [data-device]").forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
  }));

  const markTheme = () => document.querySelectorAll("#themes [data-theme]").forEach((b) => b.classList.toggle("active", b.dataset.theme === (site.theme || "violet")));
  markTheme();
  el("themes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme]");
    if (!b) return;
    site.theme = b.dataset.theme;
    markTheme();
    saveSite();
    renderCanvas();
  });

  el("pf-slug").value = site.slug || "";
  el("pf-slug").addEventListener("input", (e) => {
    const clean = slugify(e.target.value);
    if (clean !== e.target.value) e.target.value = clean;
    site.slug = clean;
    el("slug-note").classList.remove("error");
    el("slug-note").textContent = validSlug(clean) ? `Your link: ${location.host}/p/${clean}` : "At least 3 lowercase letters, numbers or dashes.";
    saveSite();
  });

  el("pf-preview").addEventListener("click", () => {
    store.set("cb_site", site);
    window.open("p.html?draft=1", "_blank", "noopener");
  });
  el("pf-publish").addEventListener("click", publish);
}

// ---------- sign-up ----------

function setupSignup() {
  const form = el("signup");
  fillSelect(form.niche, NICHES, "Choose your niche");
  fillSelect(form.followers, FOLLOWER_RANGES, "Choose a range");
  fillSelect(form.language, LANGUAGES);

  form.addEventListener("input", () => { el("signup-error").hidden = true; });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const missing = [];
    if (!data.name.trim()) missing.push("your name");
    if (!data.niche) missing.push("your niche");
    if (!data.followers) missing.push("your followers");
    if (missing.length) {
      el("signup-error").textContent = `Please add ${missing.join(", ")}.`;
      el("signup-error").hidden = false;
      return;
    }
    profile = { ...data, name: data.name.trim(), createdAt: new Date().toISOString().slice(0, 10) };
    store.set("cb_profile", profile);
    startApp();
    location.hash = "#/dashboard";
  });
}

// ---------- menu and pages ----------

const PAGES = ["dashboard", "collabs", "portfolio"];

function showPage() {
  const [, page, sub] = location.hash.match(/^#\/(\w+)(?:\/(\w+))?/) || [];
  const current = PAGES.includes(page) ? page : "dashboard";
  for (const p of PAGES) el(`page-${p}`).hidden = p !== current;
  document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("active", a.dataset.page === current));
  if (current === "dashboard") renderDashboard();
  if (current === "collabs") setView(["saved", "applied"].includes(sub) ? sub : "all");
  window.scrollTo(0, 0);
}

let appStarted = false;
function startApp() {
  el("onboarding").hidden = true;
  el("app").hidden = false;
  el("side-name").textContent = profile.name;
  if (appStarted) return showPage();
  appStarted = true;
  setupCollabs();
  setupPortfolio();
  window.addEventListener("hashchange", showPage);
  showPage();
}

// ---------- collapsible left menu (remembered on this device) ----------

function setMenu(collapsed) {
  el("app").classList.toggle("menu-collapsed", collapsed);
  el("menu-toggle").setAttribute("aria-expanded", String(!collapsed));
  el("menu-open").hidden = !collapsed;
  store.set("cb_menu_collapsed", collapsed);
  // Wider content area means more cards per row.
  if (!el("page-collabs").hidden) showResults(lastItems, lastEmpty);
}
el("menu-toggle").addEventListener("click", () => setMenu(true));
el("menu-open").addEventListener("click", () => setMenu(false));
if (store.get("cb_menu_collapsed")) setMenu(true);

el("reset").addEventListener("click", () => {
  if (!confirm("Remove your profile and portfolio from this device?")) return;
  store.remove("cb_profile");
  store.remove("cb_portfolio");
  store.remove("cb_site");
  location.hash = "";
  location.reload();
});

async function init() {
  try {
    const res = await fetch(dataFile, { cache: "no-store" });
    const data = await res.json();
    listings = data.listings || [];
    for (const l of listings) byId.set(l.id, l);
    if (data.updated) el("updated").textContent = `Updated ${formatDate(data.updated)}.`;
  } catch {
    listings = [];
  }
  setupSignup();
  if (profile) startApp();
  else el("onboarding").hidden = false;
  askIfApplied();
}

init();
