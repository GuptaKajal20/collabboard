// Trend Radar data: collects what's trending for each niche and saves it for the app.
//   YouTube:   official YouTube Data API (needs YOUTUBE_API_KEY). Views, likes, comments.
//   Instagram: public Reels found through the web search we already use (needs TAVILY_API_KEY),
//              plus links to public "trending sounds" round-ups. Instagram shares no view counts.
//
// Usage:
//   YOUTUBE_API_KEY=xxx TAVILY_API_KEY=yyy node scripts/fetch-trends.mjs
//   node scripts/fetch-trends.mjs --only youtube      (or --only instagram)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_YT = join(ROOT, "data", "trends-youtube.json");
const OUT_IG = join(ROOT, "data", "trends-instagram.json");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const today = new Date().toISOString();

// Niches match the app's profile niches. Search words are what creators in that niche post about.
export const NICHES = {
  Beauty: { yt: "skincare|makeup routine|beauty tips", ig: "skincare OR makeup", tags: ["skincare", "skincareindia", "makeup"] },
  Fashion: { yt: "outfit ideas|fashion haul|styling tips", ig: "outfit OR fashion OR styling", tags: ["fashion", "outfitideas", "ootdindia"] },
  Food: { yt: "recipe|street food|cooking", ig: "recipe OR food OR cooking", tags: ["foodie", "indianfood", "recipes"] },
  Fitness: { yt: "workout|fitness|yoga", ig: "workout OR fitness OR yoga", tags: ["fitness", "workout", "yoga"] },
  Tech: { yt: "smartphone review|tech unboxing|gadgets", ig: "tech OR gadget OR unboxing", tags: ["tech", "gadgets", "unboxing"] },
  Travel: { yt: "travel vlog|places to visit|travel guide", ig: "travel OR trip OR vlog", tags: ["travel", "incredibleindia", "travelreels"] },
  Finance: { yt: "personal finance|investing|money tips", ig: "finance OR investing OR money tips", tags: ["personalfinance", "investing", "moneytips"] },
  Lifestyle: { yt: "day in my life|lifestyle vlog|productivity", ig: "day in my life OR lifestyle", tags: ["lifestyle", "dayinmylife", "vlog"] },
  Parenting: { yt: "parenting tips|baby care|mom life", ig: "parenting OR mom life OR baby", tags: ["parenting", "momlife", "parentingtips"] },
  Gaming: { yt: "gaming|gameplay|bgmi", ig: "gaming OR gameplay", tags: ["gaming", "bgmi", "gamer"] },
  // Branded content: how brands are promoted, and which creators they work with.
  Advertisement: { yt: "sponsored|#ad|paid partnership|brand collab|use my code|ad film", ig: "\"paid partnership\" OR #ad OR #sponsored OR #gifted brand", tags: ["ad", "sponsored", "paidpartnership"], promo: true },
};
// Searches run for India. Two language passes (English, Hindi) plus a "posted in the last 2 days" pass,
// so the Today filter always has fresh videos. 6 searches per niche = about 6,000 of 10,000 free daily units.
const SEARCH_LANGS = ["en", "hi"];
const LANG_NAMES = { en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", bn: "Bengali", mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi" };
// Language from the video's own setting, else from the script its title is written in.
function languageOf(snippet, fallback) {
  const code = String(snippet.defaultAudioLanguage || snippet.defaultLanguage || "").toLowerCase().split("-")[0];
  if (LANG_NAMES[code]) return LANG_NAMES[code];
  const t = snippet.title || "";
  if (/[\u0900-\u097F]/.test(t)) return "Hindi";
  if (/[\u0B80-\u0BFF]/.test(t)) return "Tamil";
  if (/[\u0C00-\u0C7F]/.test(t)) return "Telugu";
  if (/[\u0980-\u09FF]/.test(t)) return "Bengali";
  if (/[\u0A80-\u0AFF]/.test(t)) return "Gujarati";
  if (/[\u0C80-\u0CFF]/.test(t)) return "Kannada";
  if (/[\u0D00-\u0D7F]/.test(t)) return "Malayalam";
  if (/[\u0A00-\u0A7F]/.test(t)) return "Punjabi";
  return code && code !== "zxx" ? "Other" : LANG_NAMES[fallback] || "English";
}

// A video must mention at least one of these words (title, tags or description) to count for a niche.
const MUST = {
  Beauty: /skin|makeup|make-up|beauty|lipstick|\blips?\b|serum|sunscreen|\bspf\b|hair|grwm|\bglow|acne|foundation|\bnails?\b|moistur|cleanser|face ?(wash|pack|mask)|kajal|mehendi|mehndi/,
  Fashion: /outfit|fashion|styl|ootd|haul|\bdress|saree|sari\b|kurta|lehenga|\bwear\b|\blooks?\b|sneaker|jewel|wardrobe|thrift/,
  Food: /recipe|\bfood|cook|kitchen|\beat|chef|\bdish|curry|biryani|snack|cake|dessert|restaurant|khana|street food|paneer|chai|maggi/,
  Fitness: /workout|fitness|\bgym|yoga|exercise|\babs\b|fat loss|weight loss|muscle|cardio|stretch|protein|pilates|run(ning)?\b/,
  Tech: /phone|iphone|android|\btech|gadget|laptop|unbox|review|samsung|pixel|oneplus|earbuds|smartwatch|\bai\b|camera|\bpc\b|setup|\bapp\b/,
  Travel: /travel|\btrip|\btour|visit|places|vlog|beach|hotel|flight|trek|road ?trip|destination|explore/,
  Finance: /money|financ|invest|stock|mutual fund|\bsip\b|\btax|salary|budget|saving|crypto|\bloan|credit card|\brich\b|income|trading|share market/,
  Lifestyle: /day in (my|the) life|vlog|routine|lifestyle|productiv|morning|night|\bhome\b|self ?care|\blife\b|aesthetic/,
  Parenting: /\bbaby|\bkids?\b|child|\bmom|\bmum|\bparent|toddler|pregnan|newborn|family|mother|father|dad\b/,
  Gaming: /\bgame|gaming|gameplay|bgmi|pubg|minecraft|\bgta|free ?fire|valorant|fortnite|roblox|gamer|cod\b|esports/,
  Advertisement: /#ad\b|#ads\b|#sponsored|sponsor|paid partnership|paid promotion|in (paid )?(collaboration|partnership) with|partnered with|use (my )?code|discount code|promo code|coupon|#gifted|pr package|ad film|\bad\b|advert|commercial|\btvc\b|campaign|brand/,
};

// Hashtags written in a title or description, so a search for #sunscreen finds them.
const hashtags = (text = "") => [...new Set((text.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) => t.slice(1).toLowerCase()))];
// The brand a sponsored video names, e.g. "in partnership with Nykaa" or "sponsored by @mamaearth".
function brandOf(text = "") {
  const m = text.match(/(?:sponsored by|in (?:paid )?(?:partnership|collaboration) with|partnered with|thanks to|brought to you by|powered by)\s+@?([A-Z0-9][\w&.'-]*(?: [A-Z0-9][\w&.'-]*){0,2})/i);
  return m ? m[1].replace(/[.,'-]+$/, "").slice(0, 40) : null;
}
// Titles in scripts our audiences don't read (Vietnamese, Chinese, Japanese, Korean, Arabic, Thai).
const FOREIGN = /[\u1EA0-\u1EF9đĐơƠưƯ\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0600-\u06ff\u0e00-\u0e7f]/;
const relevant = (niche, text) => MUST[niche].test(text.toLowerCase()) && !FOREIGN.test(text);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (f, fallback) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return fallback; } };

// "PT1M5S" -> 65
function seconds(iso = "") {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

// ---------- YouTube ----------

async function yt(path, params, key) {
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qs}`);
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function fetchYouTube(key) {
  const month = new Date(Date.now() - 30 * 864e5).toISOString();
  const fresh = new Date(Date.now() - 2 * 864e5).toISOString();
  const items = new Map();
  // Fresh videos for every niche first, so Today is covered even if the daily limit is reached later.
  const passes = [
    ...["short", "long"].map((format) => ({ format, since: fresh, lang: null })),
    ...SEARCH_LANGS.flatMap((lang) => ["short", "long"].map((format) => ({ format, since: month, lang }))),
  ];
  for (const pass of passes) {
    for (const [niche, n] of Object.entries(NICHES)) {
      try {
        const params = { part: "id", type: "video", q: n.yt, regionCode: "IN", order: "viewCount", publishedAfter: pass.since, videoDuration: pass.format === "short" ? "short" : "medium", maxResults: "25", safeSearch: "moderate" };
        if (pass.lang) params.relevanceLanguage = pass.lang;
        const search = await yt("search", params, key);
        const ids = (search.items || []).map((i) => i.id.videoId).filter(Boolean);
        if (!ids.length) continue;
        const details = await yt("videos", { part: "snippet,statistics,contentDetails,paidProductPlacementDetails", id: ids.join(",") }, key);
        for (const v of details.items || []) {
          const sn = v.snippet;
          const desc = (sn.description || "").slice(0, 1500);
          // YouTube marks videos the creator declared as paid promotion.
          const paid = !!(v.paidProductPlacementDetails && v.paidProductPlacementDetails.hasPaidProductPlacement);
          if (!(n.promo && paid) && !relevant(niche, `${sn.title} ${(sn.tags || []).join(" ")} ${desc.slice(0, 300)}`)) continue;
          if (FOREIGN.test(sn.title)) continue;
          const brand = brandOf(`${sn.title}\n${desc}`);
          const len = seconds(v.contentDetails.duration);
          const s = v.statistics || {};
          items.set(`${v.id}|${niche}`, {
            id: v.id,
            niche,
            lang: languageOf(sn, pass.lang),
            format: pass.format === "short" && len <= 180 ? "short" : "long",
            title: sn.title,
            channel: sn.channelTitle,
            channelId: sn.channelId,
            published: sn.publishedAt,
            thumb: (sn.thumbnails.high || sn.thumbnails.medium || sn.thumbnails.default || {}).url,
            seconds: len,
            views: +s.viewCount || 0,
            likes: s.likeCount !== undefined ? +s.likeCount : null, // some channels hide likes
            comments: s.commentCount !== undefined ? +s.commentCount : null,
            tags: [...new Set([...(sn.tags || []).slice(0, 12).map((t) => t.toLowerCase()), ...hashtags(`${sn.title} ${desc}`).slice(0, 12)])],
            ...(paid ? { paid: true } : {}),
            ...(brand ? { brand } : {}),
          });
        }
        console.log(`YouTube ${niche} ${pass.format} ${pass.lang || "last 2 days"}: ${ids.length}`);
      } catch (err) {
        console.error(err.message);
        if (/quota/i.test(err.message)) return [...items.values()];
      }
      await sleep(150);
    }
  }
  return [...items.values()];
}

// ---------- Instagram (via web search) ----------

async function tavily(body, key) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ search_depth: "basic", topic: "general", max_results: 20, ...body }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).results || [];
}

const COLLAB_WORDS = /\bcollab|collaboration|\bapply\b|fill (the|this) form|influencers? wanted|creators? wanted|looking for (creators|influencers)|barter|paid partnership opportunit|registration/i;
const HIRING_WORDS = /\bapply\b|fill (the|this) form|influencers? wanted|creators? wanted|looking for (creators|influencers)|registration/i;
const clean = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function fetchInstagram(key, previous) {
  const reels = new Map((previous.reels || []).map((r) => [r.code, r]));
  for (const [niche, n] of Object.entries(NICHES)) {
    try {
      const results = await tavily({ query: `instagram reels ${n.ig} India`, include_domains: ["instagram.com"], time_range: "week" }, key);
      for (const r of results) {
        const m = String(r.url).match(/instagram\.com\/(?:([\w.]+)\/)?(reel|p)\/([\w-]+)/i);
        if (!m) continue;
        const code = m[3];
        const text = `${r.title || ""} ${r.content || ""}`;
        // Brand calls ("apply", "DM for paid…") belong in Find Collabs, not trends.
        if ((n.promo ? HIRING_WORDS : COLLAB_WORDS).test(text)) continue;
        // Account name: from the link, or from a page title like "Name (@handle) • Instagram".
        const account = (m[1] && !/^(reels?|p|explore)$/i.test(m[1]) ? m[1] : (text.match(/@([\w.]{2,30})/) || [])[1]) || null;
        const old = reels.get(code);
        reels.set(code, {
          code, kind: m[2].toLowerCase() === "reel" ? "reel" : "post", url: `https://www.instagram.com/${m[2].toLowerCase()}/${code}/`, niche,
          caption: clean(r.content).slice(0, 220), found: old ? old.found : today.slice(0, 10),
          ...(account ? { account: account.toLowerCase() } : {}),
          tags: hashtags(text).slice(0, 15),
          ...(n.promo ? { brand: brandOf(text) || undefined } : {}),
        });
      }
      console.log(`Instagram ${niche}: ${results.length} results`);
    } catch (err) {
      console.error(err.message);
    }
    await sleep(400);
  }
  // Keep the last 30 days, newest first.
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const kept = [...reels.values()].filter((r) => r.found >= cutoff).sort((a, b) => b.found.localeCompare(a.found));

  // Public round-ups of trending sounds (we link to them; we don't copy their lists).
  let sounds = previous.sounds || [];
  try {
    const results = await tavily({ query: "Instagram trending audio this week reels sounds", time_range: "week", max_results: 8 }, key);
    const fresh = results
      .filter((r) => !/instagram\.com/.test(r.url))
      .map((r) => ({ title: clean(r.title).slice(0, 120), url: r.url, source: new URL(r.url).hostname.replace(/^www\./, ""), found: today.slice(0, 10) }));
    if (fresh.length) sounds = fresh.slice(0, 6);
  } catch (err) {
    console.error(err.message);
  }
  return { reels: kept, sounds };
}

// ---------- main ----------

async function main() {
  await mkdir(join(ROOT, "data"), { recursive: true });
  if (process.argv.includes("--refilter")) {
    const d = await readJson(OUT_YT, null);
    if (!d) return console.log("No YouTube file to refilter.");
    const before = d.items.length;
    const seen = new Map();
    for (const v of d.items.filter((x) => (x.paid || relevant(x.niche, `${x.title} ${x.channel} ${(x.tags || []).join(" ")}`)))) {
      const k = `${v.id}|${v.niche}`;
      const { country, ...rest } = v;
      if (!rest.lang) rest.lang = languageOf({ title: v.title }, "en");
      if (!seen.has(k) || seen.get(k).views < rest.views) seen.set(k, rest);
    }
    d.items = [...seen.values()];
    delete d.countries;
    d.count = d.items.length;
    await writeFile(OUT_YT, JSON.stringify(d) + "\n");
    return console.log(`Refiltered YouTube: ${before} -> ${d.items.length}`);
  }
  const tags = Object.fromEntries(Object.entries(NICHES).map(([k, v]) => [k, v.tags]));

  if (only !== "instagram") {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) console.log("Skipping YouTube: no YOUTUBE_API_KEY.");
    else {
      const fresh = await fetchYouTube(key);
      const previous = await readJson(OUT_YT, { items: [] });
      // New numbers replace old ones; older videos stay until they are 30 days old.
      const cutoff = Date.now() - 30 * 864e5;
      const merged = new Map();
      for (const v of previous.items || []) {
        if (Date.parse(v.published) < cutoff || !(v.paid || relevant(v.niche, `${v.title} ${v.channel} ${(v.tags || []).join(" ")}`))) continue;
        const { country, ...rest } = v;
        if (!rest.lang) rest.lang = languageOf({ title: v.title }, "en");
        merged.set(`${v.id}|${v.niche}`, rest);
      }
      for (const v of fresh) merged.set(`${v.id}|${v.niche}`, v);
      const items = [...merged.values()];
      if (items.length) {
        await writeFile(OUT_YT, JSON.stringify({ updated: today, count: items.length, items }) + "\n");
        console.log(`Saved ${items.length} YouTube videos`);
      }
    }
  }

  if (only !== "youtube") {
    const key = process.env.TAVILY_API_KEY;
    if (!key) console.log("Skipping Instagram: no TAVILY_API_KEY.");
    else {
      const previous = await readJson(OUT_IG, {});
      // Web searches are limited each month, so Instagram refreshes every 3 days.
      const age = previous.updated ? (Date.now() - Date.parse(previous.updated)) / 864e5 : Infinity;
      if (age < 2.5 && !process.argv.includes("--force")) console.log("Instagram refreshed recently; skipping.");
      else {
        const ig = await fetchInstagram(key, previous);
        await writeFile(OUT_IG, JSON.stringify({ updated: today, tags, ...ig }, null, 1) + "\n");
        console.log(`Saved ${ig.reels.length} Instagram posts and ${ig.sounds.length} sound round-ups`);
      }
    }
  }
}

main();
