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
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not saved */ }
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

function card(l) {
  const payClass = l.pay.startsWith("Paid") ? "paid" : l.pay === "Barter" ? "barter" : "";
  const tags = [
    `<span class="tag ${payClass}">${escapeHtml(l.pay)}</span>`,
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
  const when = l.published ? `Posted ${formatDate(l.published)}` : `Found ${formatDate(l.firstSeen)}`;

  return `<article class="card${appliedOn ? " is-applied" : ""}" data-id="${escapeHtml(l.id)}">
    <div class="card-head"><span>${escapeHtml(l.source)} · ${escapeHtml(l.hostname)}</span><span title="${l.published ? "Date on the original post" : "Date we found it; the post shows no date"}">${when}</span></div>
    <h3>${escapeHtml(l.title)}</h3>
    <p>${escapeHtml(l.description)}</p>
    <div class="tags">${appliedOn ? `<span class="tag applied">Applied ${formatDate(appliedOn)}</span>` : ""}${tags}</div>
    <div class="card-actions">
      <a class="apply" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" data-apply>${appliedOn ? "Open post again" : `Apply on ${escapeHtml(l.source)}`}</a>
      <button type="button" class="save${isSaved ? " on" : ""}" data-save aria-pressed="${isSaved}">${isSaved ? "Saved" : "Save"}</button>
    </div>
    ${appliedOn ? `<button type="button" class="link-btn undo" data-unapply>Not applied? Undo</button>` : `<button type="button" class="link-btn undo" data-markapplied>Already applied? Mark it</button>`}
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
  else if (e.target.closest("[data-apply]") && !applied[id]) store.set(PENDING, { id, at: Date.now() });
});

function askIfApplied() {
  const pending = store.get(PENDING);
  if (!pending || !el("ask").hidden) return;
  // Ignore very quick returns (an accidental click) and old leftovers.
  const away = Date.now() - pending.at;
  if (away < 4000 || away > 6 * 3600 * 1000) return;
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

function setView(v) {
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
    el("grid").innerHTML = items.length
      ? items.map(card).join("")
      : `<div class="empty">${view === "saved" ? "Nothing saved yet. Tap Save on any collab to keep it here." : "No applications yet. After you apply, mark the collab as applied to track it here."}</div>`;
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
  el("grid").innerHTML = shown.length
    ? shown.map(card).join("")
    : `<div class="empty">${listings.length ? "No opportunities match these filters. Try clearing one." : "No opportunities yet. New ones are added automatically every morning."}</div>`;
}

function setupCollabs() {
  fillSelect(el("niche"), [...new Set(listings.flatMap((l) => l.niches))].sort(), "All niches");
  fillSelect(el("source"), [...new Set(listings.map((l) => l.source))].sort(), "All sources");
  fillSelect(el("followers"), FOLLOWER_RANGES, "My followers: any");
  // Start from the creator's own profile.
  if (profile) el("followers").value = profile.followers || "";
  ["q", "niche", "pay", "source", "followers"].forEach((id) => el(id).addEventListener("input", () => setView("all")));
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
  const keys = ["photo", "displayName", "tagline", "bio", "niche", "city", "igHandle", "igFollowers", "rateReel", "brands", "samples", "email"];
  const done = keys.filter((k) => portfolio[k] && String(portfolio[k]).trim()).length;
  return Math.round((done / keys.length) * 100);
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

// ---------- My Portfolio ----------

const PF_FIELDS = ["displayName", "tagline", "bio", "niche", "city", "languages", "igHandle", "igFollowers", "ytHandle", "ytFollowers", "avgViews", "rateReel", "rateStory", "rateYt", "rateUgc", "brands", "samples", "email", "whatsapp"];

function renderKit() {
  const p = portfolio;
  const theme = p.theme || "violet";
  const name = p.displayName || profile.name || "Your name";
  const meta = [p.niche, p.city, p.languages].filter(Boolean).map(escapeHtml).join(" · ");

  const stats = [
    p.igFollowers && ["Instagram", formatCount(p.igFollowers)],
    p.ytFollowers && ["YouTube", formatCount(p.ytFollowers)],
    p.avgViews && ["Avg Reel views", formatCount(p.avgViews)],
  ].filter(Boolean);

  const rates = [
    ["Instagram Reel", formatRupees(p.rateReel)],
    ["Story", formatRupees(p.rateStory)],
    ["YouTube video", formatRupees(p.rateYt)],
    ["UGC video", formatRupees(p.rateUgc)],
  ].filter(([, v]) => v);

  const samples = (p.samples || "").split("\n").map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)).slice(0, 6);
  const handles = [
    p.igHandle && `Instagram ${escapeHtml(p.igHandle)}`,
    p.ytHandle && `YouTube ${escapeHtml(p.ytHandle)}`,
  ].filter(Boolean);

  el("kit").className = `kit theme-${theme}`;
  el("kit").innerHTML = `
    <header class="kit-head">
      ${p.photo ? `<img class="kit-photo" src="${p.photo}" alt="">` : `<div class="kit-photo kit-initial">${escapeHtml(name.charAt(0).toUpperCase())}</div>`}
      <div>
        <h2>${escapeHtml(name)}</h2>
        ${p.tagline ? `<p class="kit-tagline">${escapeHtml(p.tagline)}</p>` : ""}
        ${meta ? `<p class="kit-meta">${meta}</p>` : ""}
      </div>
    </header>
    ${stats.length ? `<div class="kit-stats">${stats.map(([k, v]) => `<div><strong>${v}</strong><span>${k}</span></div>`).join("")}</div>` : ""}
    ${p.bio ? `<section><h4>About</h4><p>${escapeHtml(p.bio)}</p></section>` : ""}
    ${rates.length || p.openBarter ? `<section><h4>Rates</h4><ul class="kit-rates">${rates.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join("")}</ul>${p.openBarter ? `<p class="kit-note">Open to barter collaborations</p>` : ""}</section>` : ""}
    ${p.brands ? `<section><h4>Brands I've worked with</h4><p>${escapeHtml(p.brands)}</p></section>` : ""}
    ${samples.length ? `<section><h4>Best work</h4><ul class="kit-links">${samples.map((s) => `<li><a href="${escapeHtml(s)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60))}</a></li>`).join("")}</ul></section>` : ""}
    <footer class="kit-contact">
      ${[p.email && escapeHtml(p.email), p.whatsapp && `WhatsApp ${escapeHtml(p.whatsapp)}`, ...handles].filter(Boolean).join(" · ") || "Add your email or WhatsApp so brands can reach you"}
    </footer>`;
}

function savePortfolio() {
  store.set("cb_portfolio", portfolio);
  renderKit();
}

// Shrinks an uploaded photo so it fits in browser storage.
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 320;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const s = Math.min(img.width, img.height);
      canvas.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function setupPortfolio() {
  const form = el("pf-form");
  fillSelect(form.niche, NICHES, "Choose niche");
  // First visit: start from the sign-up details.
  if (!Object.keys(portfolio).length && profile) {
    portfolio = {
      displayName: profile.name,
      niche: profile.niche,
      city: profile.city,
      languages: profile.language,
      igHandle: profile.instagram,
      theme: "violet",
    };
  }
  for (const k of PF_FIELDS) if (portfolio[k] !== undefined) form[k].value = portfolio[k];
  form.openBarter.checked = !!portfolio.openBarter;
  const theme = form.querySelector(`input[name="theme"][value="${portfolio.theme || "violet"}"]`);
  if (theme) theme.checked = true;

  form.addEventListener("input", async (e) => {
    const t = e.target;
    if (t.name === "photo") {
      if (t.files[0]) {
        try { portfolio.photo = await readPhoto(t.files[0]); } catch { /* unreadable image */ }
      }
    } else if (t.name === "openBarter") {
      portfolio.openBarter = t.checked;
    } else if (t.name) {
      portfolio[t.name] = t.value;
    }
    savePortfolio();
  });
  el("download").addEventListener("click", () => window.print());
  renderKit();
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

el("reset").addEventListener("click", () => {
  if (!confirm("Remove your profile and portfolio from this device?")) return;
  store.remove("cb_profile");
  store.remove("cb_portfolio");
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
