// Shared by /api/preview and /api/social: fetch a public web page safely.
// Only http(s), only public internet addresses (never this server's own network), size and time limits.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVATE = [
  /^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^198\.1[89]\./, /^22[4-9]\.|^2[3-5]\d\./,
  /^::1$/, /^::$/, /^f[cd]/i, /^fe[89ab]/i, /^::ffff:(0|10|127|169\.254|172\.(1[6-9]|2\d|3[01])|192\.168)\./i,
];
const isPrivate = (ip) => PRIVATE.some((re) => re.test(ip));

export async function safeUrl(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.local$|\.internal$/i.test(host)) return null;
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!ips.length || ips.some(isPrivate)) return null;
  return u;
}

const UA = "Mozilla/5.0 (compatible; CollabProPreview/1.0; +https://collabboard-blush.vercel.app)";

// Fetches a page (following up to 4 redirects, each one checked again). Returns { url, type, text } or null.
export async function getPage(raw, { maxBytes = 1_500_000, ua = UA, accept = "text/html,application/xhtml+xml,*/*;q=0.5" } = {}) {
  let url = await safeUrl(raw);
  for (let hop = 0; url && hop < 5; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch(url, { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": ua, Accept: accept, "Accept-Language": "en-IN,en;q=0.9" } });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = await safeUrl(new URL(res.headers.get("location"), url).href);
        continue;
      }
      if (!res.ok) return null;
      const type = res.headers.get("content-type") || "";
      if (/^image\//i.test(type)) return { url: url.href, type, text: "" };
      // Read only the start of the page; the tags we need are near the top.
      const reader = res.body.getReader();
      const chunks = [];
      let size = 0;
      while (size < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
      }
      reader.cancel().catch(() => {});
      return { url: url.href, type, text: new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c)))) };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
export const decode = (s = "") => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m)).trim();

// <meta property="og:title" content="…"> and friends, in either attribute order.
export function meta(html, names) {
  for (const n of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${n}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m && m[1].trim()) return decode(m[1]);
  }
  return "";
}

export function send(res, status, body, cacheSeconds = 0) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (cacheSeconds) res.setHeader("Cache-Control", `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`);
  res.end(JSON.stringify(body));
}
