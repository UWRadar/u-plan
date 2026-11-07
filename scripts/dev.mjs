import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { buildExtension, root } from "./build.mjs";
import { createRatingProvider } from "../src/provider.ts";
import { validLookup } from "../src/model.ts";

await buildExtension();
const entries = new Map();
const lookup = createRatingProvider({
  async get(key) { return entries.get(key); },
  async set(key, entry) {
    if (entries.size >= 500) entries.delete(entries.keys().next().value);
    entries.set(key, entry);
  },
});
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".json": "application/json; charset=utf-8" };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost:3011");
    if (url.pathname === "/api/ratings") {
      const origin = req.headers.origin;
      if ((origin && !["http://127.0.0.1:3011", "http://localhost:3011"].includes(origin)) || req.headers["sec-fetch-site"] === "cross-site") { res.writeHead(403).end(); return; }
      const query = { name: url.searchParams.get("name"), campus: url.searchParams.get("campus") };
      if (req.method !== "GET" || !validLookup(query)) { res.writeHead(400).end("Invalid name or campus"); return; }
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(await lookup(query.name, query.campus))); return;
    }
    const relative = decodeURIComponent(url.pathname === "/" ? "/demo/" : url.pathname);
    const scope = ["demo", "dist-dev", "images"].find(folder => relative.startsWith(`/${folder}/`));
    if (!scope) { res.writeHead(404).end("Not found"); return; }
    const full = path.resolve(root, "." + relative);
    if (!full.startsWith(path.resolve(root, scope) + path.sep)) { res.writeHead(403).end(); return; }
    const file = (await stat(full)).isDirectory() ? path.join(full, "index.html") : full;
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-src 'self' http://localhost:3010 http://127.0.0.1:3010; object-src 'none'; base-uri 'self'" });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end("Not found"); }
});
server.listen(3011, "127.0.0.1", () => console.log("Local prototype: http://127.0.0.1:3011/demo/ — no cloud services"));
let timer;
watch(path.join(root, "src"), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => buildExtension().catch(console.error), 200); });
process.on("SIGINT", () => server.close(() => process.exit(0)));
