// Social preview from just a handle: profile picture, name, bio and (where the platform allows) recent posts.
// GET /api/social?platform=youtube&handle=mkbhd
//   → { platform, handle, url, name, bio, image, posts: [{ title, url, image, date }], postsNote }
// Platforms that block other sites still return the profile link, so the page can show a simple card.

import { getPage, meta, decode, send } from "./_fetch.js";

const PROFILE = {
  instagram: (h) => `https://www.instagram.com/${h}/`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
  x: (h) => `https://x.com/${h}`,
};
const HANDLE = { linkedin: /^[\w-]{3,100}$/, youtube: /^[\w.-]{3,30}$/, facebook: /^[\w.-]{2,80}$/, default: /^[\w.]{1,30}$/ };
const BOT = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

// Page titles like "NASA (@nasa) • Instagram photos and videos" → "NASA".
const cleanName = (t, h) => t.replace(/\s*\(@?[\w.]+\)\s*.*$/, "").replace(/\s*[|•·-]\s*(Instagram|Threads|LinkedIn|X|Facebook|YouTube).*$/i, "").trim() || `@${h}`;

async function youtube(h) {
  const page = await getPage(PROFILE.youtube(h), { ua: BROWSER, maxBytes: 3_000_000 });
  if (!page) return null;
  const html = page.text;
  const channel = (html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/channel\/(UC[\w-]{22})/) || [])[1];
  const out = { name: meta(html, ["og:title"]), bio: meta(html, ["og:description"]), image: meta(html, ["og:image"]), posts: [] };
  if (channel) {
    // YouTube's public video feed for the channel: the latest uploads.
    const feed = await getPage(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`, { accept: "application/xml" });
    if (feed) {
      out.posts = [...feed.text.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 5).map(([, e]) => {
        const id = (e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
        return id && { title: decode((e.match(/<title>([^<]*)<\/title>/) || [])[1] || ""), url: `https://www.youtube.com/watch?v=${id}`, image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, date: (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "" };
      }).filter(Boolean);
    }
  }
  return out;
}

async function generic(platform, h) {
  const page = await getPage(PROFILE[platform](h), { ua: BOT });
  if (!page) return null;
  const html = page.text;
  const name = meta(html, ["og:title", "twitter:title"]);
  if (!name || /log ?in|sign ?up|page not found|isn't available/i.test(name)) return null;
  return { name: cleanName(name, h), bio: meta(html, ["og:description", "description"]).replace(/See (the latest|Instagram).*$/i, "").trim(), image: meta(html, ["og:image"]), posts: [] };
}

const NOTES = {
  instagram: "", facebook: "",
  youtube: "",
  linkedin: "LinkedIn doesn't let other sites show your posts.",
  threads: "Threads doesn't let other sites show your posts.",
  x: "X doesn't let other sites show your posts.",
};

export default async function handler(req, res) {
  const q = new URL(req.url, "http://x").searchParams;
  const platform = q.get("platform");
  const handle = String(q.get("handle") || "").trim().replace(/^@/, "");
  if (!PROFILE[platform]) return send(res, 400, { error: "platform" });
  if (!(HANDLE[platform] || HANDLE.default).test(handle)) return send(res, 400, { error: "handle" });
  let data = null;
  try { data = platform === "youtube" ? await youtube(handle) : await generic(platform, handle); } catch { data = null; }
  const base = { platform, handle, url: PROFILE[platform](handle), postsNote: NOTES[platform] };
  if (!data) return send(res, 200, { ...base, found: false, name: `@${handle}`, bio: "", image: "", posts: [] }, 1800);
  send(res, 200, { ...base, found: true, name: data.name || `@${handle}`, bio: (data.bio || "").slice(0, 300), image: /^https:/.test(data.image || "") ? data.image : "", posts: data.posts || [] }, 21600);
}
