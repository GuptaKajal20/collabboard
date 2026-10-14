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

// These follow a logged-in creator to other devices.
const SYNCED = ["cb_profile", "cb_saved", "cb_applied", "cb_clicked", "cb_site"];

const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    if (SYNCED.includes(key) && typeof scheduleSync === "function") scheduleSync();
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
    if (window.cpTrack) window.cpTrack("collab_apply", { location: "app" });
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
const TEXT_COLORS = ["#1c1c1a", "#6b6a65", "#ffffff", "#5b4bd6", "#2563eb", "#0f6e56", "#16a34a", "#d85a30", "#e11d74", "#b42318", "#ca8a04", "#f2e27d"];
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
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys.at(-1)] = value;
}

// ----- undo: recent portfolio changes -----
// undoNow is the page as last saved. A change pushes it onto the stack first, unless it continues
// the same edit (same field, within a moment), so a burst of typing or dragging is one step.
const undoStack = [];
const redoStack = [];
let undoNow = null;
let undoKey = null;
let undoLastKey = null;
let undoAt = 0;
const undoSnap = () => JSON.stringify({ blocks: site.blocks, design: site.design || null, theme: site.theme || "violet" });
function recordUndo() {
  const snap = undoSnap();
  if (snap === undoNow) { undoKey = null; return; } // nothing actually changed (e.g. opening the crop tools)
  const same = undoKey && undoKey === undoLastKey && Date.now() - undoAt < 1200;
  if (!same) {
    undoStack.push(undoNow);
    if (undoStack.length > 30) undoStack.shift();
  }
  redoStack.length = 0; // a new change replaces anything that was undone
  undoLastKey = undoKey;
  undoKey = null;
  undoAt = Date.now();
  undoNow = snap;
  updateUndoButtons();
}
function updateUndoButtons() {
  if (el("pf-undo")) el("pf-undo").disabled = !undoStack.length;
  if (el("pf-redo")) el("pf-redo").disabled = !redoStack.length;
}
function undo() { stepHistory(undoStack, redoStack); }
function redo() { stepHistory(redoStack, undoStack); }
// Move one step back (undo) or forward (redo): the current page goes onto the other stack.
function stepHistory(from, to) {
  const prev = from.pop();
  if (!prev) return;
  to.push(undoNow);
  const s = JSON.parse(prev);
  Object.assign(site, { blocks: s.blocks, design: s.design || undefined, theme: s.theme });
  undoNow = prev;
  undoLastKey = null;
  if (selectedId && !findBlock(selectedId)) selectedId = null;
  cropOpen = null;
  saveSite({ record: false });
  renderCanvas();
  renderEditPanel();
  if (window.Designs) window.Designs.render();
  updateUndoButtons();
}

function saveSite({ changed = true, record = true } = {}) {
  if (changed && record && undoNow !== null) recordUndo();
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
// Scroll a photo carousel in the builder to photo i (no animation).
function showSlide(id, i) {
  const track = document.querySelector(`#canvas [data-block="${id}"] .pb-track`);
  if (!track) return;
  track.style.scrollBehavior = "auto";
  track.scrollLeft = i * track.clientWidth;
  track.style.scrollBehavior = "";
}

function renderOne(id) {
  const b = findBlock(id);
  const node = document.querySelector(`#canvas [data-block="${id}"]`);
  if (!b || !node) return renderCanvas();
  const tmp = document.createElement("div");
  tmp.innerHTML = P.wrapBlock(b, true, selectedId);
  node.replaceWith(tmp.firstElementChild);
  P.enhance(el("canvas"), { edit: true });
  const m = (cropOpen || "").match(/^items\.(\d+)$/);
  if (m && b.type === "file" && id === selectedId) showSlide(id, Number(m[1]));
}

// A header image switched on but never chosen goes back off when the creator moves on.
function tidyHeaderSwitch(exceptId) {
  for (const b of site.blocks) {
    if (b.type === "profile" && b.coverOn && !b.coverImg && b.id !== exceptId) {
      b.coverOn = false;
      saveSite({ record: false });
      renderOne(b.id);
    }
  }
}

function selectBlock(id) {
  tidyHeaderSwitch(id);
  if (id !== selectedId) cropOpen = null;
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
  if (name !== "edit") tidyHeaderSwitch(null);
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

const REQ = `<span class="req-mark" aria-hidden="true">*</span>`;
const field = (label, name, value, attrs = "") => `<label><span class="lbl">${label}</span><input data-f="${name}" value="${escapeHtml(value ?? "")}" ${attrs}></label>`;
// Range sliders show their filled part, so the chosen value is easy to read (see --fill in styles.css).
const fill = (value, min, max) => `--fill:${(((value - min) / (max - min)) * 100).toFixed(1)}%`;
const slider = (label, name, value, min, max, unit = "") => `<label class="slider"><span class="lbl">${label}</span><span class="slider-row"><input type="range" data-f="${name}" data-num data-unit="${unit}" min="${min}" max="${max}" step="1" value="${value}" style="${fill(value, min, max)}"><output>${value}${unit}</output></span></label>`;
// A row of choices that sets one field, e.g. layout or image side.
const seg = (fieldName, current, options, attrs = "") =>
  `<div class="seg wide" role="group" ${attrs}>${options.map(([v, label, disabled]) => `<button type="button" data-set="${fieldName}" data-val="${v}" class="${String(current) === String(v) ? "active" : ""}" ${disabled ? "disabled" : ""}>${label}</button>`).join("")}</div>`;

// Which crop editor is open: "photo", "image" or "items.<n>".
let cropOpen = null;

// Zoom and position fields for each kind of image.
function cropFields(key) {
  if (key === "photo") return { zoom: "zoom", posY: "posY" };
  if (key === "image") return { zoom: "imgZoom", posY: "imgPosY" };
  return { zoom: `${key}.zoom`, posY: `${key}.posY` };
}
const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

function cropEditor(b, key, url, ratio, radius, frame = true) {
  const f = cropFields(key);
  const zoom = getPath(b, f.zoom) ?? 100;
  const posY = getPath(b, f.posY) ?? 50;
  return `<div class="crop-box">
    ${frame ? `<div class="crop-frame" data-crop-preview="${key}" style="aspect-ratio:${ratio};${radius != null ? `border-radius:${radius}%;` : ""}"><img src="${escapeHtml(P.safeMedia(url))}" alt="" style="${P.cropStyle(zoom, posY)}"></div>` : ""}
    ${slider("Zoom", f.zoom, zoom, 100, 250, "%")}
    ${slider("Up / down", f.posY, posY, 0, 100, "%")}
  </div>`;
}

// One image slot: "+ Add image" when empty, otherwise thumbnail, file name, Crop and ✕.
function imagePicker(label, url, name, uploadKey, cropKey, required = false) {
  const head = `<span class="lbl">${label}${required ? REQ : ""}</span>`;
  if (!url) return `<div class="pick-field">${head}<label class="pick"><input type="file" accept="image/png,image/jpeg,image/webp" data-upload="${uploadKey}"><span>＋ Add image</span></label></div>`;
  return `<div class="pick-field">${head}<div class="picked">
    <img src="${escapeHtml(P.safeMedia(url))}" alt="">
    <span class="fname">${escapeHtml(name || "Image")}</span>
    ${cropKey ? `<button type="button" class="mini${cropOpen === cropKey ? " on" : ""}" data-crop="${cropKey}">Crop</button>` : ""}
    <button type="button" class="x" data-clear="${uploadKey}" aria-label="Remove image">✕</button>
  </div></div>`;
}

// Social preview asks only for the handle. [platform, what's shown before it, placeholder]
const SOCIAL_PREVIEW = [
  ["instagram", "@", "yourname"],
  ["facebook", "facebook.com/", "yourpage"],
  ["youtube", "@", "yourchannel"],
  ["linkedin", "linkedin.com/in/", "your-name"],
  ["threads", "@", "yourname"],
  ["x", "@", "yourname"],
];

function renderEditPanel() {
  const b = selectedId && findBlock(selectedId);
  const panel = el("panel-edit");
  if (!b) {
    panel.innerHTML = `<p class="fine">Click a module on your page to edit it, or add one from the Add tab.</p>`;
    return;
  }
  const rows = (items, a, bKey, aLabel, bLabel) =>
    items.map((it, i) => `<div class="row-edit"><input data-f="items.${i}.${a}" value="${escapeHtml(it[a] ?? "")}" placeholder="${aLabel}" aria-label="${aLabel}"><input data-f="items.${i}.${bKey}" value="${escapeHtml(it[bKey] ?? "")}" placeholder="${bLabel}" aria-label="${bLabel}"><button type="button" class="x" data-del-row="${i}" aria-label="Remove row">✕</button></div>`).join("") +
    `<button type="button" class="btn small" data-add-row>+ Add row</button>`;
  let body = "";
  switch (b.type) {
    case "profile":
      body = imagePicker("Profile photo", b.photo, b.photoName, "photo", "photo") +
        (b.photo && cropOpen === "photo" ? cropEditor(b, "photo", b.photo, "1 / 1", b.radius ?? 50) : "") +
        slider("Photo size", "size", b.size ?? 104, 64, 200, "px") +
        (b.photo ? slider("Corner roundness", "radius", b.radius ?? 50, 0, 50, "") : "") +
        `<div class="pick-field"><span class="lbl">Layout</span>${seg("layout", b.layout || "stack", [["stack", "Image on top"], ["side", "Side by side"]])}</div>` +
        (b.layout === "side" ? seg("flip", !!b.flip, [[false, "Text on right"], [true, "Text on left"]]) : "") +
        field(`Name${REQ}`, "name", b.name, 'aria-required="true"') +
        `<label>Bio<textarea data-f="bio" rows="4">${escapeHtml(b.bio || "")}</textarea></label>` +
        `<div class="sub-box"><p class="panel-label">Name style</p>${slider("Font size", "nameScale", b.nameScale ?? 100, 60, 180, "%")}${slider("Letter spacing", "nameSpacing", b.nameSpacing ?? 0, -4, 12, "")}</div>` +
        `<div class="sub-box"><label class="toggle-row"><span class="lbl">Header image</span><input type="checkbox" role="switch" class="toggle" data-f="coverOn" ${b.coverOn ? "checked" : ""} aria-checked="${b.coverOn ? "true" : "false"}"></label>
          ${b.coverOn ? imagePicker("Image", b.coverImg, b.coverImgName, "coverImg", null) +
            (b.coverImg ? slider("Zoom", "coverZoom", b.coverZoom ?? 100, 100, 300, "%") + slider("Left / right", "coverX", b.coverX ?? 50, 0, 100, "%") + slider("Up / down", "coverY", b.coverY ?? 50, 0, 100, "%") : `<form class="dz-search" data-cover-link><input type="url" name="url" placeholder="Or paste an image link" aria-label="Header image link"><button type="submit" class="btn small">Use</button></form>
              <form class="dz-search" data-cover-search><input type="search" name="q" placeholder="Search free photos" aria-label="Search free photos"><button type="submit" class="btn small primary">Search</button></form><div class="dz-results" id="cover-results"></div>`) : ""}
        </div>`;
      break;
    case "text":
      body = `<div class="rte-bar" role="toolbar" aria-label="Text formatting">
          <button type="button" data-cmd="bold" title="Bold" aria-label="Bold"><b>B</b></button>
          <button type="button" data-cmd="italic" title="Italic" aria-label="Italic"><i>I</i></button>
          <button type="button" data-cmd="ul" title="Bulleted list" aria-label="Bulleted list"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="7" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="5" cy="17" r="1.6"/><path d="M10 7h10M10 12h10M10 17h10"/></svg></button>
          <button type="button" data-cmd="ol" title="Numbered list" aria-label="Numbered list"><svg viewBox="0 0 24 24" aria-hidden="true"><text x="2.5" y="9" font-size="7" font-weight="700">1</text><text x="2.5" y="19" font-size="7" font-weight="700">2</text><path d="M10 7h10M10 12h10M10 17h10"/></svg></button>
          <button type="button" data-color-toggle title="Text colour" aria-label="Text colour" aria-expanded="false"><span class="rte-a">A</span></button>
          <select data-style aria-label="Text style" title="Text style"><option value="normal">Normal</option><option value="heading">Heading</option><option value="upper">UPPERCASE</option></select>
          <select data-size aria-label="Text size" title="Text size">${SIZES.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>
          <button type="button" data-emoji-toggle title="Emoji" aria-label="Emoji">😊</button>
        </div>
        <div class="rte-colors" hidden><p class="fine">Select words, then pick a colour.</p><div class="dz-swatches">${TEXT_COLORS.map((c) => `<button type="button" class="dz-sw" data-text-color="${c}" style="background:${c}" aria-label="Colour ${c}" title="${c}"></button>`).join("")}<label class="dz-custom" title="Custom colour"><input type="color" data-text-color-custom value="#5b4bd6" aria-label="Custom text colour"><span aria-hidden="true">+</span></label></div></div>
        <div class="emoji-grid" hidden>${EMOJIS.map((e) => `<button type="button" data-emoji="${e}">${e}</button>`).join("")}</div>
        <div class="rte" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Text" data-placeholder="Write here">${P.cleanHtml(b.html || "")}</div>`;
      break;
    case "link":
      body = field(`Link${REQ}`, "url", b.url, `placeholder="Paste any YouTube, website or image link" inputmode="url" aria-required="true" class="${b.url && !P.safeUrl(b.url) ? "invalid" : ""}"`) +
        `<p class="fine" id="link-status">${linkStatus(b)}</p>` +
        field("Text", "text", b.text, `placeholder="${escapeHtml((b.preview && b.preview.title) || "e.g. Watch my latest campaign")}"`) +
        imagePicker("Image", b.image, b.imageName, "image", "image") +
        (b.image && cropOpen === "image" ? cropEditor(b, "image", b.image, "4 / 3") : "") +
        (b.image ? seg("side", b.side === "right" ? "right" : "left", [["left", "Image left"], ["right", "Image right"]]) : "") +
        `<p class="fine">${b.image ? "Your image shows instead of the link's own preview." : "No image? The link's own preview shows automatically."}</p>`;
      break;
    case "stats":
      body = rows(b.items || [], "label", "value", "e.g. Instagram followers", "e.g. 12400");
      break;
    case "file": {
      const has = (b.items || []).length > 0;
      body = seg("kind", b.kind || "", [["images", "Images", has && b.kind !== "images"], ["pdf", "PDF", has && b.kind !== "pdf"]], 'aria-label="File type"');
      if (b.kind === "images") {
        const sel = /^items\.(\d+)$/.test(cropOpen || "") ? Number(cropOpen.split(".")[1]) : -1;
        body += `<div class="pick-field"><span class="lbl">Size</span>${seg("size", b.size || "landscape", [["portrait", "4:5"], ["square", "1:1"], ["landscape", "4:3"], ["wide", "16:9"]])}</div>
          <div class="thumbs">${(b.items || []).map((m, i) => `<div class="thumb${sel === i ? " on" : ""}">
              <button type="button" class="thumb-btn" data-crop="items.${i}" ${sel === i ? `data-crop-preview="items.${i}"` : ""} title="Edit ${escapeHtml(m.name || "photo")}" aria-pressed="${sel === i}">${m.type === "video" ? `<video src="${escapeHtml(P.safeMedia(m.url))}" muted></video>` : `<img src="${escapeHtml(P.safeMedia(m.url))}" alt="${escapeHtml(m.name || "")}" style="${P.cropStyle(m.zoom, m.posY)}">`}</button>
              <button type="button" class="x" data-del-item="${i}" aria-label="Remove ${escapeHtml(m.name || "photo")}">✕</button>
            </div>`).join("")}
            <label class="thumb add" title="Add images"><input type="file" accept="image/png,image/jpeg,image/webp" multiple data-upload="images"><span aria-hidden="true">＋</span><span class="sr">Add images</span></label>
          </div>` +
          (sel < 0 && (b.items || []).length ? `<p class="fine">Click a photo to select it, then adjust its zoom and position.</p>` : "") +
          (sel >= 0 && b.items[sel] && b.items[sel].type !== "video" ? `<p class="fine">Editing photo ${sel + 1} of ${b.items.length}.</p>` + cropEditor(b, `items.${sel}`, b.items[sel].url, P.ASPECTS[b.size || "landscape"], null, false) : "");
      } else if (b.kind === "pdf") {
        body += (b.items || []).map((f, i) => `<div class="picked"><span class="pdf-ic" aria-hidden="true">PDF</span><span class="fname">${escapeHtml(f.name || "Document.pdf")}</span><button type="button" class="x" data-del-item="${i}" aria-label="Remove ${escapeHtml(f.name || "PDF")}">✕</button></div>`).join("") +
          `<label class="pick"><input type="file" accept=".pdf,application/pdf" data-upload="pdf"><span>＋ Add PDF</span></label>`;
      }
      break;
    }
    case "socials":
      body = (b.items || []).map((it, i) => {
        const p = P.platformById(it.platform);
        return `<div class="social-row">${P.icon(p)}<label class="grow"><span class="sr">${escapeHtml(p.name)}</span><input data-f="items.${i}.value" value="${escapeHtml(it.value || "")}" placeholder="${escapeHtml(p.name)}: ${escapeHtml(p.hint)}"></label><button type="button" class="x" data-del-row="${i}" aria-label="Remove ${escapeHtml(p.name)}">✕</button></div>`;
      }).join("") +
        `<input type="search" data-search placeholder="Search Instagram, Facebook, Google Reviews…" aria-label="Search platforms">
        <div class="platforms" id="platform-list">${platformButtons("")}</div>`;
      break;
    case "rates":
      body = rows(b.items || [], "label", "price", "e.g. Instagram Reel", "₹ price") +
        `<label class="check"><input type="checkbox" data-f="barter" ${b.barter ? "checked" : ""}> Open to barter collabs</label>`;
      break;
    case "instagram": {
      const plat = b.platform || "instagram";
      const accounts = P.previewAccounts(b);
      const [, pre, ph] = SOCIAL_PREVIEW.find(([id]) => id === plat) || SOCIAL_PREVIEW[0];
      const p = P.platformById(plat);
      const value = P.handleFor(plat, accounts[plat]) || accounts[plat] || "";
      const check = previewCheck(plat, value, b);
      body = `<div class="pick-field"><span class="lbl">Platform</span>
        <div class="plat-pick" role="group" aria-label="Platform">${SOCIAL_PREVIEW.map(([id]) => {
          const q = P.platformById(id);
          const set = !!P.handleFor(id, accounts[id]);
          return `<button type="button" data-set="platform" data-val="${id}" class="${plat === id ? "active" : ""}" title="${escapeHtml(q.name)}${set ? " (handle saved)" : ""}" aria-label="${escapeHtml(q.name)}${set ? ", handle saved" : ""}" aria-pressed="${plat === id}">${P.icon(q)}<span>${escapeHtml(q.name)}</span></button>`;
        }).join("")}</div></div>` +
        `<label><span class="lbl">Your ${escapeHtml(p.name)} handle${REQ}</span><span class="handle-field"><span class="handle-pre">${escapeHtml(pre)}</span><input data-f="accounts.${plat}" value="${escapeHtml(value)}" placeholder="${escapeHtml(ph)}" autocapitalize="none" autocomplete="off" spellcheck="false" aria-required="true" class="${check.ok === false ? "invalid" : ""}"></span></label>
        <p class="fine plat-check${check.ok === false ? " error" : ""}" id="plat-check">${escapeHtml(check.text)}</p>`;
      break;
    }
  }
  const sample = window.Designs && window.Designs.isUntouchedSample(b) ? `<p class="sample-note">This is sample content from your template. Edit it to make it yours.</p>` : "";
  panel.innerHTML = `${sample}<h2 class="edit-title">${escapeHtml(P.BLOCKS[b.type] ? P.BLOCKS[b.type].name : "Module")}</h2><div class="edit-fields">${body}</div><p class="upload-note" id="upload-note" hidden></p>`;
  if (b.type === "text") setupTextEditor(b);
}

// What we can tell about a Social preview handle as it's typed.
function previewCheck(plat, raw, b) {
  const v = String(raw || "").trim();
  const name = P.platformById(plat).name;
  if (!v) return { ok: null, text: `Add your ${name} handle to show your profile.` };
  const h = P.handleFor(plat, v);
  if (!h) return { ok: false, text: `Use just your ${name} handle, like ${plat === "linkedin" ? "riya-sharma" : "@riyacreates"}.` };
  if (plat === "instagram") return { ok: true, text: "Shows your Instagram profile picture, bio and latest posts." };
  if (plat === "facebook") return { ok: true, text: "Shows your public Facebook page with its latest posts. Personal profiles can't be shown." };
  const snap = b && b.social && b.social[plat];
  if (!snap || snap.handle !== h) return { ok: true, text: "Looking up your profile…" };
  if (!snap.found) return { ok: true, text: `${name} didn't share this profile with us right now, so your page shows a profile card with a link.` };
  return { ok: true, text: `Found ${snap.name}.${snap.posts && snap.posts.length ? ` Showing ${snap.posts.length} recent videos.` : ` ${snap.postsNote || ""}`}` };
}

// Fetch profile details for a handle (picture, bio, recent videos) and keep a copy with the page.
let socialTimer = null;
function lookupSocial(b) {
  clearTimeout(socialTimer);
  const plat = b.platform || "instagram";
  const h = P.handleFor(plat, P.previewAccounts(b)[plat]);
  if (!h || ["instagram", "facebook"].includes(plat)) return;
  if (b.social && b.social[plat] && b.social[plat].handle === h) return;
  socialTimer = setTimeout(async () => {
    let snap = null;
    try { const r = await fetch(`/api/social?platform=${plat}&handle=${encodeURIComponent(h)}`); snap = r.ok ? await r.json() : null; } catch { snap = null; }
    if (!snap) snap = { platform: plat, handle: h, found: false, name: `@${h}`, bio: "", image: "", posts: [], postsNote: "" };
    b.social = { ...(b.social || {}), [plat]: snap };
    saveSite();
    renderOne(b.id);
    const n = el("plat-check");
    if (n && selectedId === b.id) n.textContent = previewCheck(plat, h, b).text;
  }, 600);
}

// Link preview: fetched once when the link is added, then saved with the page.
const linkStatus = (b) => (!b.url ? "Paste a link to see its preview." : !P.safeUrl(b.url) ? "That doesn't look like a web link." : b.image ? "Using your image." : b.preview && b.preview.url === P.safeUrl(b.url) ? (b.preview.title || b.preview.kind === "image" ? "Preview ready." : "This site doesn't share a preview, so a simple card shows.") : "Getting the preview…");
let previewTimer = null;
function lookupLink(b) {
  clearTimeout(previewTimer);
  const url = P.safeUrl(b.url);
  if (!url || (b.preview && b.preview.url === url)) return;
  previewTimer = setTimeout(async () => {
    let pv = null;
    try { const r = await fetch(`/api/preview?url=${encodeURIComponent(url)}`); pv = r.ok ? await r.json() : null; } catch { pv = null; }
    if (P.safeUrl(b.url) !== url) return; // the link changed meanwhile
    b.preview = pv ? { ...pv, url } : { url, kind: "page", title: "", description: "", image: "", site: new URL(url).hostname.replace(/^www\./, "") };
    saveSite();
    renderOne(b.id);
    const n = el("link-status");
    if (n && selectedId === b.id) n.textContent = linkStatus(b);
  }, 700);
}

function updateCropPreviews(b) {
  el("panel-edit").querySelectorAll("[data-crop-preview]").forEach((frame) => {
    const f = cropFields(frame.dataset.cropPreview);
    frame.querySelector("img").setAttribute("style", P.cropStyle(getPath(b, f.zoom), getPath(b, f.posY)));
    if (frame.dataset.cropPreview === "photo") frame.style.borderRadius = `${b.radius ?? 50}%`;
  });
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
  // Colour only the selected words. It stays even if the page's text colour changes in Designs.
  const colorize = (c) => {
    restore();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, c);
    document.execCommand("styleWithCSS", false, false);
    remember();
    commit();
  };
  const colors = panel.querySelector(".rte-colors");
  colors.addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });
  colors.addEventListener("click", (e) => { const b = e.target.closest("[data-text-color]"); if (b) colorize(b.dataset.textColor); });
  colors.querySelector("[data-text-color-custom]").addEventListener("change", (e) => colorize(e.target.value));

  panel.querySelector(".rte-bar").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.emojiToggle !== undefined) {
      const g = panel.querySelector(".emoji-grid");
      g.hidden = !g.hidden;
      return;
    }
    if (btn.dataset.colorToggle !== undefined) {
      const c = panel.querySelector(".rte-colors");
      c.hidden = !c.hidden;
      btn.setAttribute("aria-expanded", String(!c.hidden));
      return;
    }
    restore();
    if (btn.dataset.cmd === "bold") document.execCommand("bold");
    if (btn.dataset.cmd === "italic") document.execCommand("italic");
    if (btn.dataset.cmd === "ul") document.execCommand("insertUnorderedList");
    if (btn.dataset.cmd === "ol") document.execCommand("insertOrderedList");
    remember();
    commit();
    showFormat();
  });
  panel.querySelector("[data-size]").addEventListener("change", (e) => {
    const px = e.target.value;
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
  // Show the formatting of the selected text: its size in the menu, and B / I / lists lit up.
  const sizeMenu = panel.querySelector("[data-size]");
  function showFormat() {
    const sel = getSelection();
    if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return;
    const node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const px = Math.round(parseFloat(getComputedStyle(node).fontSize));
    const near = SIZES.reduce((best, [v]) => (Math.abs(v - px) < Math.abs(best - px) ? Number(v) : best), 16);
    sizeMenu.value = String(near);
    const blk = blockOf(sel.anchorNode);
    styleMenu.value = blk && blk.tagName === "H2" ? "heading" : upperOf(sel.anchorNode) ? "upper" : "normal";
    for (const [cmd, q] of [["bold", "bold"], ["italic", "italic"], ["ul", "insertUnorderedList"], ["ol", "insertOrderedList"]]) {
      const b = panel.querySelector(`[data-cmd="${cmd}"]`);
      const on = document.queryCommandState(q);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    }
  }
  editor.addEventListener("keyup", showFormat);
  editor.addEventListener("mouseup", showFormat);
  editor.addEventListener("focus", () => setTimeout(showFormat));
  sizeMenu.addEventListener("change", () => setTimeout(showFormat));

  // Style: Normal text, Heading (uses the heading font and colour from Designs → Text) or UPPERCASE.
  const styleMenu = panel.querySelector("[data-style]");
  const blockOf = (node) => { let n = node && (node.nodeType === 3 ? node.parentElement : node); while (n && n !== editor && !/^(H2|DIV|P|LI)$/.test(n.tagName)) n = n.parentElement; return n === editor ? null : n; };
  const upperOf = (node) => { let n = node && (node.nodeType === 3 ? node.parentElement : node); while (n && n !== editor) { if (n.classList.contains("pb-upper")) return n; n = n.parentElement; } return null; };
  styleMenu.addEventListener("change", () => {
    const v = styleMenu.value;
    restore();
    const sel = getSelection();
    if (v === "heading") {
      document.execCommand("formatBlock", false, "h2");
    } else if (v === "upper") {
      if (sel.isCollapsed) { // nothing selected: make the whole line uppercase
        const line = blockOf(sel.anchorNode);
        if (line) { const r = document.createRange(); r.selectNodeContents(line); sel.removeAllRanges(); sel.addRange(r); }
      }
      const span = document.createElement("span");
      span.className = "pb-upper";
      const range = sel.getRangeAt(0);
      span.appendChild(range.extractContents());
      range.insertNode(span);
    } else {
      // Normal: headings become plain lines and uppercase is removed.
      const up = upperOf(sel.anchorNode);
      if (up) up.replaceWith(...up.childNodes);
      editor.querySelectorAll(".pb-upper").forEach((u) => { if (sel.containsNode(u, true)) u.replaceWith(...u.childNodes); });
      if (blockOf(sel.anchorNode) && blockOf(sel.anchorNode).tagName === "H2") document.execCommand("formatBlock", false, "div");
    }
    remember();
    commit();
    setTimeout(showFormat);
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
    let v = e.target.type === "checkbox" ? e.target.checked : e.target.dataset.num !== undefined ? Number(e.target.value) : e.target.value;
    if (f.startsWith("accounts.")) {
      // Pasted a profile link? Keep just the handle.
      const plat = b.platform || "instagram";
      const h = P.handleFor(plat, v);
      if (h && h !== v.trim().replace(/^@/, "")) { v = h; e.target.value = h; }
    }
    setPath(b, f, v);
    undoKey = `${b.id}:${f}`;
    if (f === "coverX" && (b.coverZoom ?? 100) < 130) {
      b.coverZoom = 130;
      const z = panel.querySelector('[data-f="coverZoom"]');
      if (z) { z.value = 130; z.nextElementSibling.textContent = "130%"; z.style.cssText = fill(130, 100, 300); }
    }
    if (e.target.type === "range") {
      e.target.nextElementSibling.textContent = `${v}${e.target.dataset.unit || ""}`;
      e.target.style.cssText = fill(v, Number(e.target.min), Number(e.target.max));
      updateCropPreviews(b);
      // One photo in a carousel: change just that photo, in place, and keep it in view.
      const m = f.match(/^items\.(\d+)\.(zoom|posY)$/);
      if (m && b.type === "file") {
        const i = Number(m[1]);
        const img = document.querySelector(`#canvas [data-block="${b.id}"] .pb-slide:nth-child(${i + 1}) img`);
        if (img) img.setAttribute("style", P.cropStyle(b.items[i].zoom, b.items[i].posY));
        showSlide(b.id, i);
        saveSite();
        return;
      }
    }
    if (f.startsWith("accounts.")) {
      const c = previewCheck(b.platform || "instagram", v, b);
      e.target.classList.toggle("invalid", c.ok === false);
      const n = el("plat-check");
      n.textContent = c.text;
      n.classList.toggle("error", c.ok === false);
      lookupSocial(b);
    }
    if (f === "url") {
      e.target.classList.toggle("invalid", !!e.target.value.trim() && !P.safeUrl(e.target.value));
      const n = el("link-status");
      if (n) n.textContent = linkStatus(b);
      lookupLink(b);
    }
    saveSite();
    renderOne(b.id);
    if (f === "coverOn") renderEditPanel();
  });
  // Header image: paste a link, or pick a free photo.
  panel.addEventListener("submit", async (e) => {
    const b = findBlock(selectedId);
    if (!b) return;
    if (e.target.matches("[data-cover-link]")) {
      e.preventDefault();
      const url = P.safeUrl(e.target.elements.url.value);
      if (!url) return note("Please paste a full image link starting with https://", true);
      Object.assign(b, { coverImg: url, coverImgName: "Image from a link", coverX: 50, coverY: 50, coverZoom: 100 });
    } else if (e.target.matches("[data-cover-search]")) {
      e.preventDefault();
      const box = el("cover-results");
      box.innerHTML = `<p class="fine">Searching…</p>`;
      try {
        const photos = await window.Designs.findPhotos(e.target.elements.q.value);
        box.innerHTML = photos.length ? photos.map((p, i) => `<button type="button" class="dz-ph" data-cover-pick="${i}"><img src="${escapeHtml(p.thumb)}" alt="${escapeHtml(p.alt)}" loading="lazy"></button>`).join("") : `<p class="fine">No photos found. Try another word.</p>`;
        box.photos = photos;
      } catch (err) {
        box.innerHTML = `<p class="fine error">${escapeHtml(err.message)}</p>`;
      }
      return;
    } else return;
    saveSite();
    renderOne(b.id);
    renderEditPanel();
  });
  panel.addEventListener("click", (e) => {
    const b = findBlock(selectedId);
    const t = e.target.closest("button");
    if (!b || !t || t.disabled) return;
    if (t.dataset.coverPick !== undefined) {
      const p = el("cover-results").photos[Number(t.dataset.coverPick)];
      Object.assign(b, { coverImg: p.url, coverImgName: p.title || "Free photo", coverX: 50, coverY: 50, coverZoom: 100, coverCredit: { name: p.photographer, url: p.photographerUrl, source: p.source, license: p.license } });
      saveSite();
      renderOne(b.id);
      renderEditPanel();
      return;
    }
    if (t.dataset.addRow !== undefined) b.items.push({});
    else if (t.dataset.delRow !== undefined) b.items.splice(Number(t.dataset.delRow), 1);
    else if (t.dataset.delItem !== undefined) {
      b.items.splice(Number(t.dataset.delItem), 1);
      cropOpen = null;
    } else if (t.dataset.clear) {
      const key = t.dataset.clear;
      b[key] = "";
      b[`${key}Name`] = "";
      if (key === "photo") b.photoSample = false;
      if (cropOpen === key) cropOpen = null;
    } else if (t.dataset.crop) cropOpen = /^items\./.test(t.dataset.crop) ? t.dataset.crop : cropOpen === t.dataset.crop ? null : t.dataset.crop;
    else if (t.dataset.set) {
      const raw = t.dataset.val;
      b[t.dataset.set] = raw === "true" ? true : raw === "false" ? false : raw;
    } else if (t.dataset.platform) b.items.push({ platform: t.dataset.platform, value: "" });
    else return;
    saveSite();
    renderOne(b.id);
    renderEditPanel();
    if (t.dataset.platform) {
      const inputs = panel.querySelectorAll(".social-row input");
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
        if (kind === "photo") Object.assign(b, { photo: await uploadImage(file, 600), photoName: file.name, zoom: 100, posY: 50, photoSample: false });
        else if (kind === "image") Object.assign(b, { image: await uploadImage(file, 800), imageName: file.name, imgZoom: 100, imgPosY: 50 });
        else if (kind === "images") b.items.push({ type: "image", url: await uploadImage(file, 1600), name: file.name, zoom: 100, posY: 50 });
        else if (kind === "pdf") b.items.push({ type: "pdf", url: await uploadPdf(file), name: file.name });
        else if (kind === "coverImg") Object.assign(b, { coverImg: await uploadImage(file, 1600), coverImgName: file.name, coverX: 50, coverY: 50, coverZoom: 100, coverOn: true });
      }
      // Open the crop tools straight away for a newly chosen image.
      if (kind === "photo" || kind === "image") cropOpen = kind;
      if (kind === "images") cropOpen = `items.${b.items.length - 1}`;
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
    // Links don't open while editing, except a Social preview, which opens the profile like the live page does.
    const a = e.target.closest("a");
    if (a && !a.classList.contains("pb-sp-link")) e.preventDefault();
    if (selectedId !== id) selectBlock(id);
  });

  // Typing straight onto the page (name, bio, numbers, rates).
  canvas.addEventListener("input", (e) => {
    const f = e.target.dataset && e.target.dataset.edit;
    const block = e.target.closest(".pb-editable");
    if (!f || !block) return;
    const b = findBlock(block.dataset.block);
    setPath(b, f, e.target.innerText.replace(/\n$/, ""));
    undoKey = `${b.id}:${f}`;
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
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url.replace(/^https?:\/\//, ""))}</a>`;
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
  ensureSlug();
  const samples = window.Designs ? site.blocks.filter((b) => window.Designs.isUntouchedSample(b)) : [];
  if (samples.length && !confirm(`${samples.length === 1 ? "One module still has" : `${samples.length} modules still have`} sample text from your template (${samples.map((b) => P.BLOCKS[b.type].name).join(", ")}). Publish anyway?`)) return;
  btn.disabled = true;
  btn.textContent = "Publishing…";
  try {
    // Taken by someone else? Try riya-sharma-2, -3…
    if (!(await Cloud.slugFree(site.slug))) {
      const base = site.slug.replace(/-\d+$/, "").slice(0, 36);
      let n = 2;
      while (n < 50 && !(await Cloud.slugFree(`${base}-${n}`))) n++;
      if (n >= 50) throw new Error("Couldn't find a free link. Please try again.");
      site.slug = `${base}-${n}`;
    }
    const { dirty, publishedAt, ...data } = site;
    await Cloud.publish(site.slug, data);
    if (!site.publishedAt && window.cpTrack) window.cpTrack("portfolio_publish", { first: true });
    site.publishedAt = new Date().toISOString();
    site.dirty = false;
    saveSite({ changed: false });
  } catch (err) {
    bar.hidden = false;
    bar.innerHTML = `<span class="dot pending"></span><span class="error">${escapeHtml(err.message || "Could not publish. Please try again.")}</span>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Publish";
  }
}

// The link button: shows the portfolio link, copies it, and lets the creator change the link name.
// The link name comes from the creator's name (riya-sharma); a number is added if it's taken.
function ensureSlug() {
  if (validSlug(site.slug || "")) return;
  let base = slugify((findBlock((site.blocks.find((b) => b.type === "profile") || {}).id) || {}).name || (profile && profile.name) || "");
  if (base.length < 3) base = `${base || "creator"}-portfolio`.replace(/^-/, "");
  site.slug = base.slice(0, 40);
  saveSite({ record: false });
}
function updateLinkPop() {
  ensureSlug();
  el("pf-linkurl").textContent = shareUrl().replace(/^https?:\/\//, "");
}
function openLinkPop() {
  el("pf-linkpop").hidden = false;
  el("pf-link").setAttribute("aria-expanded", "true");
  updateLinkPop();
}
function setupLinkPop() {
  const pop = el("pf-linkpop");
  el("pf-link").addEventListener("click", () => (pop.hidden ? openLinkPop() : ((pop.hidden = true), el("pf-link").setAttribute("aria-expanded", "false"))));
  document.addEventListener("click", (e) => { if (!pop.hidden && !e.target.closest(".pf-linkwrap")) { pop.hidden = true; el("pf-link").setAttribute("aria-expanded", "false"); } });
  el("pf-copy").addEventListener("click", async () => {
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); el("pf-copy").textContent = "Copied"; setTimeout(() => { el("pf-copy").textContent = "Copy"; }, 1500); } catch { prompt("Copy your link:", url); }
  });
  el("pf-undo").addEventListener("click", undo);
  el("pf-redo").addEventListener("click", redo);
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (!(e.metaKey || e.ctrlKey) || !["z", "y"].includes(key) || el("page-portfolio").hidden) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return; // let text fields undo their own typing
    e.preventDefault();
    if (key === "y" || e.shiftKey) redo(); else undo();
  });
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

  tidyHeaderSwitch(null);
  renderCanvas();
  renderEditPanel();
  setupCanvas();
  setupPanel();

  document.querySelectorAll(".panel-tabs [data-panel]").forEach((b) => b.addEventListener("click", () => showPanel(b.dataset.panel)));

  // Adjustable split: drag the handle (or use arrow keys) to share the width between preview and editor.
  // Remembered on this device; double-click puts it back to 40 / 60.
  const builder = document.querySelector("#page-portfolio .builder");
  const handle = el("split-handle");
  const setSplit = (pct, save = true) => {
    const v = Math.round(Math.max(25, Math.min(75, pct)));
    builder.style.setProperty("--split", v);
    handle.setAttribute("aria-valuenow", v);
    handle.setAttribute("aria-valuetext", `Preview ${v}%, editor ${100 - v}%`);
    if (save) store.set("cb_split", v);
  };
  setSplit(Number(store.get("cb_split")) || 40, false);
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("dragging");
    document.body.classList.add("splitting");
    const r = builder.getBoundingClientRect();
    const move = (ev) => setSplit(((ev.clientX - r.left) / r.width) * 100);
    const up = () => {
      handle.classList.remove("dragging");
      document.body.classList.remove("splitting");
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
  handle.addEventListener("dblclick", () => setSplit(40));
  handle.addEventListener("keydown", (e) => {
    const now = Number(builder.style.getPropertyValue("--split")) || 40;
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") setSplit(now - step);
    else if (e.key === "ArrowRight") setSplit(now + step);
    else if (e.key === "Home") setSplit(25);
    else if (e.key === "End") setSplit(75);
    else return;
    e.preventDefault();
  });

  // Scale the preview so the whole page width fits the preview column.
  const fitCanvas = () => {
    const c = el("canvas");
    const avail = c.parentElement.clientWidth - 16;
    const cz = Math.min(1, avail / (c.dataset.device === "mobile" ? 390 : 960));
    c.style.setProperty("--cz", cz.toFixed(3));
    // The background stays in view: as tall as the visible preview area.
    const visible = Math.min(c.parentElement.clientHeight || innerHeight, innerHeight);
    c.style.setProperty("--bgh", `${Math.round(visible / cz)}px`);
  };
  new ResizeObserver(fitCanvas).observe(el("canvas").parentElement);
  document.querySelectorAll(".seg [data-device]").forEach((b) => b.addEventListener("click", () => {
    el("canvas").dataset.device = b.dataset.device;
    fitCanvas();
    document.querySelectorAll(".seg [data-device]").forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
  }));

  setupLinkPop();
  if (window.Designs) window.Designs.init();
  undoNow = undoSnap();
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



  el("pf-preview").addEventListener("click", () => {
    store.set("cb_site", site);
    window.open("p.html?draft=1", "_blank", "noopener");
  });
  el("pf-publish").addEventListener("click", publish);
}

// ---------- sign-up, log-in and syncing across devices ----------

// With Supabase set up, creators have email and password accounts and their data
// follows them to any device. Without it, everything stays in this browser.
const ACCOUNTS = Cloud.ready;
var signedIn = false; // "var" so early saves can check it safely
let signupMode = "signup"; // "signup", or "complete" when logged in but no profile yet

function showAuth(which) {
  for (const id of ["signup", "login", "newpass"]) el(id).hidden = id !== which;
  document.querySelectorAll("#auth-switch [data-auth]").forEach((b) => b.classList.toggle("active", b.dataset.auth === which));
  el("auth-switch").hidden = !ACCOUNTS || which === "newpass" || signupMode === "complete";
  el("signup").querySelector(".account-fields").hidden = !ACCOUNTS || signupMode === "complete";
  el("signup").querySelector("h2").textContent = signupMode === "complete" ? "Finish your profile" : "Create your profile";
  for (const id of ["signup-error", "login-error", "newpass-error"]) el(id).hidden = true;
}

function authNote(text) {
  el("auth-note").hidden = !text;
  el("auth-note").textContent = text || "";
}

function formError(id, text) {
  el(id).textContent = text;
  el(id).hidden = !text;
}

// Everything that should follow the creator to other devices.
function collectState() {
  return { profile, saved, applied, clicked, site: site || null };
}

let syncTimer = null;
function scheduleSync() {
  if (!signedIn) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 1200);
}
async function syncNow() {
  clearTimeout(syncTimer);
  if (!signedIn) return;
  try { await Cloud.saveState(collectState()); } catch { /* retried on the next change */ }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") syncNow(); });

// After logging in: use the account's saved data, or upload what this browser has.
async function loadAccount(user) {
  signedIn = true;
  let state = null;
  try { state = await Cloud.loadState(); } catch { state = null; }
  if (state && state.profile) {
    profile = state.profile;
    saved = state.saved || {};
    applied = state.applied || {};
    clicked = state.clicked || {};
    if (state.site) site = P.migrate(state.site);
    store.set("cb_profile", profile);
    store.set("cb_saved", saved);
    store.set("cb_applied", applied);
    store.set("cb_clicked", clicked);
    if (site) store.set("cb_site", site);
  } else if (!profile && user.user_metadata && user.user_metadata.profile) {
    profile = user.user_metadata.profile;
  }
  if (profile) {
    profile.email = user.email;
    await syncNow();
  }
}

function setupSignup() {
  const form = el("signup");
  fillSelect(form.niche, NICHES, "Choose your niche");
  fillSelect(form.followers, FOLLOWER_RANGES, "Choose a range");
  fillSelect(form.language, LANGUAGES);

  if (ACCOUNTS) {
    form.querySelector(".account-fields").hidden = false;
    el("signup-fine").textContent = "Use this email and password to log in on any device.";
    el("logout").hidden = false;
    el("reset").hidden = true;
  }

  document.querySelectorAll("#auth-switch [data-auth]").forEach((b) => b.addEventListener("click", () => { authNote(""); showAuth(b.dataset.auth); }));
  form.addEventListener("input", () => formError("signup-error", ""));
  el("login").addEventListener("input", () => formError("login-error", ""));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const needAccount = ACCOUNTS && signupMode === "signup";
    const missing = [];
    if (!data.name.trim()) missing.push("your name");
    if (needAccount && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) missing.push("a valid email");
    if (needAccount && (data.password || "").length < 8) missing.push("a password of at least 8 characters");
    if (!data.niche) missing.push("your niche");
    if (!data.followers) missing.push("your followers");
    if (missing.length) return formError("signup-error", `Please add ${missing.join(", ")}.`);

    const { email, password, ...details } = data;
    profile = { ...details, name: details.name.trim(), createdAt: new Date().toISOString().slice(0, 10) };
    store.set("cb_profile", profile);

    if (needAccount) {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Creating your account…";
      try {
        const res = await Cloud.signUp(email.trim(), password, profile);
        if (res.needsConfirm) {
          authNote(`Almost done. We sent a link to ${email.trim()}. Open it to confirm your email, then log in here.`);
          showAuth("login");
          el("login").email.value = email.trim();
          return;
        }
        await loadAccount(res.user);
      } catch (err) {
        return formError("signup-error", err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Create my profile";
      }
    } else if (signedIn) {
      try { localStorage.removeItem("cb_pending_name"); } catch { /* ignore */ }
      if (window.cpTrack) window.cpTrack("profile_complete", {});
      await syncNow();
    }
    startApp();
    location.hash = "#/dashboard";
  });

  el("login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const email = f.email.value.trim();
    if (!email || !f.password.value) return formError("login-error", "Please enter your email and password.");
    const btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Logging in…";
    try {
      const user = await Cloud.logIn(email, f.password.value);
      await loadAccount(user);
      authNote("");
      if (profile) {
        startApp();
        location.hash = "#/dashboard";
      } else {
        signupMode = "complete";
        showAuth("signup");
      }
    } catch (err) {
      formError("login-error", err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Log in";
    }
  });

  el("forgot").addEventListener("click", async () => {
    const email = el("login").email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return formError("login-error", "Type your email above first, then click Forgot your password.");
    try {
      await Cloud.sendReset(email);
      authNote(`We sent a reset link to ${email}. Open it on this device to choose a new password.`);
    } catch (err) {
      formError("login-error", err.message);
    }
  });

  el("newpass").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = e.target.password.value;
    if (pw.length < 8) return formError("newpass-error", "Your password needs at least 8 characters.");
    try {
      await Cloud.setPassword(pw);
      authNote("Password saved. You're logged in.");
      const user = await Cloud.user();
      await loadAccount(user);
      if (profile) { startApp(); location.hash = "#/dashboard"; }
      else { signupMode = "complete"; showAuth("signup"); }
    } catch (err) {
      formError("newpass-error", err.message);
    }
  });

  if (ACCOUNTS) {
    Cloud.onRecovery(() => {
      el("app").hidden = true;
      el("onboarding").hidden = false;
      showAuth("newpass");
    });
  }
}

el("logout").addEventListener("click", async () => {
  await syncNow();
  await Cloud.logOut();
  for (const k of ["cb_profile", "cb_saved", "cb_applied", "cb_clicked", "cb_site", "cb_portfolio", "cb_pending_apply"]) store.remove(k);
  location.href = "/";
});

// ---------- menu and pages ----------

const PAGES = ["dashboard", "collabs", "trends", "portfolio"];

function showPage() {
  const [, page, sub] = location.hash.match(/^#\/(\w+)(?:\/(\w+))?/) || [];
  const current = PAGES.includes(page) ? page : "dashboard";
  for (const p of PAGES) el(`page-${p}`).hidden = p !== current;
  document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("active", a.dataset.page === current));
  (current === "portfolio" ? document.querySelector("#page-portfolio .pf-top") : document.querySelector(".main")).prepend(el("menu-open"));
  if (current === "dashboard") renderDashboard();
  if (current === "collabs") setView(["saved", "applied"].includes(sub) ? sub : "all");
  if (current === "trends" && window.TrendRadar) window.TrendRadar.open(profile);
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
  if (ACCOUNTS) {
    const user = await Cloud.user().catch(() => null);
    if (user) {
      await loadAccount(user);
      if (!profile) {
        // Just signed up: ask for niche, followers and the rest, with the name filled in.
        signupMode = "complete";
        let pending = null;
        try { pending = JSON.parse(localStorage.getItem("cb_pending_name")); } catch { pending = null; }
        el("signup").name.value = pending || (user.user_metadata && user.user_metadata.name) || "";
      }
    } else {
      // Logged out: the website's sign-in page handles it.
      location.replace(`/signin?next=${encodeURIComponent("/app" + (location.hash || ""))}`);
      return;
    }
  }
  if (profile && (!ACCOUNTS || signedIn)) startApp();
  else {
    el("onboarding").hidden = false;
    showAuth("signup");
  }
  askIfApplied();
}

init();
