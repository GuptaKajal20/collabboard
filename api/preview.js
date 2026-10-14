// Link preview for the Link module: title, description and image of any public page.
// GET /api/preview?url=https://…  →  { url, kind: "page"|"image"|"youtube", title, description, image, site }

import { getPage, meta, decode, send } from "./_fetch.js";

const yt = (u) => (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/i) || [])[1];

export default async function handler(req, res) {
  const raw = new URL(req.url, "http://x").searchParams.get("url") || "";
  const id = yt(raw);
  if (id) {
    // YouTube's own oEmbed gives the title and channel.
    const o = await getPage(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { accept: "application/json" });
    let info = {};
    try { info = JSON.parse(o ? o.text : "{}"); } catch { /* use defaults */ }
    return send(res, 200, { url: raw, kind: "youtube", title: info.title || "YouTube video", description: info.author_name || "", image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, site: "YouTube" }, 86400);
  }
  const page = await getPage(raw);
  if (!page) return send(res, 422, { error: "unreachable" }, 600);
  const host = new URL(page.url).hostname.replace(/^www\./, "");
  if (/^image\//i.test(page.type)) return send(res, 200, { url: page.url, kind: "image", title: "", description: "", image: page.url, site: host }, 86400);
  const html = page.text;
  const title = meta(html, ["og:title", "twitter:title"]) || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "");
  let image = meta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
  if (image) { try { image = new URL(image, page.url).href; } catch { image = ""; } }
  if (image && !/^https?:/i.test(image)) image = "";
  send(res, 200, {
    url: page.url,
    kind: "page",
    title: title.slice(0, 160),
    description: meta(html, ["og:description", "twitter:description", "description"]).slice(0, 240),
    image,
    site: meta(html, ["og:site_name"]) || host,
  }, 86400);
}
