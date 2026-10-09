// Fetches brand collaboration opportunities from the Brave Search API,
// cleans and tags them, and writes data/listings.json for the website.
//
// Usage:
//   BRAVE_API_KEY=xxx node scripts/fetch-listings.mjs
//   node scripts/fetch-listings.mjs --fixture scripts/fixture.json   (offline test, writes data/test-listings.json)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IS_TEST = process.argv.includes("--fixture");
const OUT = join(ROOT, "data", IS_TEST ? "test-listings.json" : "listings.json");
const MAX_AGE_DAYS = 30;

const QUERIES = [
  '"influencer collaboration" form India',
  '"collab with us" influencer docs.google.com/forms',
  '"looking for creators" brand collaboration India',
  '"looking for influencers" India campaign',
  '"UGC creators" wanted India brand',
  '"creator program" apply India brand',
  '"influencer marketing" "apply now" India creators',
  '"barter collaboration" influencers India',
];

// Anything asking the creator to pay is treated as a scam and dropped.
const SCAM_WORDS = [
  "registration fee", "joining fee", "pay to join", "security deposit",
  "processing fee", "pay rs", "pay ₹", "advance payment from", "earn daily",
  "work from home", "task based", "telegram task",
];

// Results that are clearly not opportunities (guides, rate cards, news).
const NOISE_WORDS = [
  "how to", "rate card", "top 10", "top 20", "best influencer", "agencies in",
  "what is", "guide", "statistics", "report", "salary",
];

const NICHES = {
  Beauty: ["beauty", "skincare", "skin care", "makeup", "cosmetic", "haircare", "hair care"],
  Fashion: ["fashion", "clothing", "apparel", "ethnic wear", "jewellery", "jewelry", "footwear"],
  Food: ["food", "recipe", "restaurant", "snack", "beverage", "cafe", "kitchen"],
  Tech: ["tech", "gadget", "smartphone", "app ", "software", "electronics"],
  Travel: ["travel", "hotel", "hostel", "trip", "tourism", "stay"],
  Fitness: ["fitness", "gym", "yoga", "health", "wellness", "nutrition"],
  Finance: ["finance", "fintech", "investing", "money", "trading", "insurance"],
  Parenting: ["parenting", "mom", "baby", "kids"],
  Gaming: ["gaming", "esports", "gamer"],
  Lifestyle: ["lifestyle", "home decor", "decor"],
};

const LANGUAGES = ["Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Kannada", "Malayalam", "Gujarati", "Punjabi"];

const stripTags = (s = "") =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

const has = (text, words) => words.some((w) => text.includes(w));

function detectPay(text) {
  const paid = /\bpaid\b|₹|\brs\.?\s?\d|\binr\b|per reel|per post|remuneration|compensation|stipend/.test(text);
  const barter = /barter|free product|gifted|pr package|product in exchange|hamper/.test(text);
  if (paid && barter) return "Paid + barter";
  if (paid) return "Paid";
  if (barter) return "Barter";
  return "Not stated";
}

function detectSource(hostname, url) {
  if (url.includes("docs.google.com/forms") || url.includes("forms.gle")) return "Google Form";
  if (hostname.includes("linkedin.com")) return "LinkedIn";
  if (hostname.includes("instagram.com")) return "Instagram";
  if (hostname.includes("t.me") || hostname.includes("telegram")) return "Telegram";
  return "Website";
}

function detectPlatform(text) {
  const out = [];
  if (/instagram|reel/.test(text)) out.push("Instagram");
  if (/youtube|shorts/.test(text)) out.push("YouTube");
  if (/\bugc\b/.test(text)) out.push("UGC");
  if (/linkedin/.test(text)) out.push("LinkedIn");
  return out.length ? out : ["Any"];
}

function detectMinFollowers(text) {
  const m = text.match(/(\d+(?:\.\d+)?)\s?(k|lakh|l)\+?\s?(?:followers|subscribers)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === "k" ? n * 1000 : n * 100000;
}

function parseDate(result) {
  if (result.page_age) {
    const d = new Date(result.page_age);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  return null;
}

function toListing(result, today) {
  const url = result.url;
  if (!url) return null;
  const title = stripTags(result.title);
  const description = stripTags(result.description);
  const text = `${title} ${description}`.toLowerCase();

  if (has(text, SCAM_WORDS)) return null;
  if (has(title.toLowerCase(), NOISE_WORDS)) return null;

  const hostname = (result.meta_url && result.meta_url.hostname) || new URL(url).hostname;
  const niches = Object.entries(NICHES).filter(([, words]) => has(text, words)).map(([n]) => n);
  const languages = LANGUAGES.filter((l) => text.includes(l.toLowerCase()));

  return {
    id: url.replace(/[?#].*$/, "").replace(/\/$/, ""),
    title,
    description,
    url,
    hostname: hostname.replace(/^www\./, ""),
    source: detectSource(hostname, url),
    niches: niches.length ? niches : ["General"],
    platforms: detectPlatform(text),
    pay: detectPay(text),
    minFollowers: detectMinFollowers(text),
    languages,
    published: parseDate(result),
    firstSeen: today,
  };
}

async function braveSearch(query, key) {
  const params = new URLSearchParams({ q: query, country: "IN", count: "20", freshness: "pm" });
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
  });
  if (!res.ok) throw new Error(`Brave API ${res.status} for "${query}": ${await res.text()}`);
  const data = await res.json();
  return (data.web && data.web.results) || [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadExisting() {
  try {
    const data = JSON.parse(await readFile(OUT, "utf8"));
    return data.listings || [];
  } catch {
    return [];
  }
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const fixtureIdx = process.argv.indexOf("--fixture");
  let results = [];

  if (fixtureIdx !== -1) {
    results = JSON.parse(await readFile(process.argv[fixtureIdx + 1], "utf8")).web.results;
  } else {
    const key = process.env.BRAVE_API_KEY;
    if (!key) {
      console.error("Missing BRAVE_API_KEY. Get a free key at https://brave.com/search/api/");
      process.exit(1);
    }
    for (const q of QUERIES) {
      try {
        const r = await braveSearch(q, key);
        console.log(`${r.length} results for ${q}`);
        results.push(...r);
      } catch (err) {
        console.error(err.message);
      }
      await sleep(1100); // free plan allows about 1 request per second
    }
  }

  const byId = new Map();
  for (const old of await loadExisting()) byId.set(old.id, old);
  for (const r of results) {
    const l = toListing(r, today);
    if (!l) continue;
    const old = byId.get(l.id);
    byId.set(l.id, old ? { ...l, firstSeen: old.firstSeen } : l);
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString().slice(0, 10);
  const listings = [...byId.values()]
    .filter((l) => (l.published || l.firstSeen) >= cutoff)
    .sort((a, b) => (b.published || b.firstSeen).localeCompare(a.published || a.firstSeen));

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ updated: today, count: listings.length, listings }, null, 2) + "\n");
  console.log(`Saved ${listings.length} listings to ${OUT.replace(ROOT + "/", "")}`);
}

main();
