// Loads data/listings.json and renders filterable listing cards.
// Add ?test=1 to the URL to load data/test-listings.json instead (offline test data).

const dataFile = new URLSearchParams(location.search).has("test")
  ? "data/test-listings.json"
  : "data/listings.json";

const el = (id) => document.getElementById(id);
const controls = ["q", "niche", "pay", "source", "followers"].map(el);
let listings = [];

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatFollowers = (n) => (n >= 100000 ? `${n / 100000} lakh+` : n >= 1000 ? `${n / 1000}k+` : `${n}+`);

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fillSelect(select, values) {
  for (const v of values) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  }
}

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

  return `<article class="card">
    <div class="card-head"><span>${escapeHtml(l.source)} · ${escapeHtml(l.hostname)}</span><span>${formatDate(l.published || l.firstSeen)}</span></div>
    <h2>${escapeHtml(l.title)}</h2>
    <p>${escapeHtml(l.description)}</p>
    <div class="tags">${tags}</div>
    <a class="apply" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">Apply on ${escapeHtml(l.source)}</a>
  </article>`;
}

function render() {
  const followers = Number(el("followers").value);
  let shown = listings.filter(matches);
  let countText = `${shown.length} of ${listings.length} opportunities`;
  if (followers) {
    // Posts that state a requirement you meet come first; the rest don't say.
    const fits = shown.filter((l) => l.minFollowers !== null && l.minFollowers !== undefined);
    const unknown = shown.filter((l) => l.minFollowers === null || l.minFollowers === undefined);
    shown = [...fits, ...unknown];
    countText = `${fits.length} match your follower count · ${unknown.length} don't say a minimum`;
  }
  el("count").textContent = countText;
  el("grid").innerHTML = shown.length
    ? shown.map(card).join("")
    : `<div class="empty">${listings.length ? "No opportunities match these filters. Try clearing one." : "No opportunities yet. New ones are added automatically every morning."}</div>`;
}

async function init() {
  try {
    const res = await fetch(dataFile, { cache: "no-store" });
    const data = await res.json();
    listings = data.listings || [];
    if (data.updated) el("updated").textContent = `Updated ${formatDate(data.updated)}`;
  } catch {
    listings = [];
  }
  fillSelect(el("niche"), [...new Set(listings.flatMap((l) => l.niches))].sort());
  fillSelect(el("source"), [...new Set(listings.map((l) => l.source))].sort());
  controls.forEach((c) => c.addEventListener("input", render));
  render();
}

init();
