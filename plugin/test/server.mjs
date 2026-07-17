import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript" };

createServer(async (req, res) => {
  const p = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  // styles.css는 플러그인 루트(상위)에서 서빙 (@font-face 검증용)
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
