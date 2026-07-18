import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript" };

createServer(async (req, res) => {
  const p = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  // styles.css is served from the plugin root (one level up) for @font-face checks
  const fsPath = p === "/styles.css" ? join(root, "..", "styles.css") : join(root, p);
  try {
    const data = await readFile(fsPath);
    const ext = p.slice(p.lastIndexOf("."));
    res.writeHead(200, { "content-type": types[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}, ).listen(8137, () => console.log("test server on http://localhost:8137"));
