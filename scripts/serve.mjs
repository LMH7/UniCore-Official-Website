import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../site/", import.meta.url)));
const option = (key) =>
  process.argv.includes(key)
    ? process.argv[process.argv.indexOf(key) + 1]
    : undefined;
const port = Number(option("--port") || process.env.PORT || 4173);
const host = option("--host") || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const file = path.resolve(
      root,
      "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
    );
    if (!file.startsWith(root + path.sep) || pathname.includes("\\")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error("Not a file");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      req.method === "HEAD"
        ? undefined
        : await readFile(path.join(root, "404.html")),
    );
  }
});
server.on("error", (error) => {
  console.error(
    `无法启动预览：${error.message}。可改用 npm run dev -- --port 4174`,
  );
  process.exit(1);
});
server.listen(port, host, () =>
  console.log(`NEXCORE 网站预览：http://${host}:${port}\n按 Ctrl+C 停止。`),
);
