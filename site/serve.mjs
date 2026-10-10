// Local preview server that behaves like Vercel: /about serves about.html and
// /p/name serves p.html. Run: npm run serve, then open http://localhost:8766
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8766;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".xml": "application/xml", ".txt": "text/plain", ".pdf": "application/pdf" };

const exists = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.startsWith("/p/")) path = "/p.html";
  const base = normalize(join(ROOT, path)).replace(/\/$/, "");
  if (!base.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  const candidates = path === "/" ? [join(ROOT, "index.html")] : [base, `${base}.html`, join(base, "index.html")];
  for (const file of candidates) {
    if (await exists(file)) {
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(await readFile(file));
      return;
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
}).listen(PORT, () => console.log(`Collab Pro preview: http://localhost:${PORT}`));
