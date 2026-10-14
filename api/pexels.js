// Free photo search for portfolio backgrounds (Designs → Background → Image).
// Runs on Vercel so the Pexels key stays private. Set PEXELS_API_KEY in Vercel → Settings → Environment Variables.
// GET /api/pexels?q=beach&page=1  →  { photos: [{ id, thumb, url, alt, avg, photographer, photographerUrl, page }], more }

export default async function handler(req, res) {
  const params = new URL(req.url, "http://x").searchParams;
  const q = String(params.get("q") || "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(20, Number(params.get("page")) || 1));
  const key = process.env.PEXELS_API_KEY;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!key) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "not-configured" }));
  }
  const url = q
    ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}`
    : `https://api.pexels.com/v1/curated?per_page=24&page=${page}`;
  try {
    const r = await fetch(url, { headers: { Authorization: key } });
    if (!r.ok) {
      res.statusCode = r.status === 429 ? 429 : 502;
      return res.end(JSON.stringify({ error: r.status === 429 ? "busy" : "upstream" }));
    }
    const data = await r.json();
    const photos = (data.photos || []).map((p) => ({
      id: p.id,
      thumb: p.src.medium,
      url: p.src.large2x,
      alt: p.alt || "",
      avg: p.avg_color || "",
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      page: p.url,
    }));
    // Same search, same answer for a day: fewer calls to Pexels.
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
    res.end(JSON.stringify({ photos, more: !!data.next_page }));
  } catch {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "upstream" }));
  }
}
