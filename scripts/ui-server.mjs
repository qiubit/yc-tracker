import { createServer, request as httpRequest } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, normalize, sep } from "node:path";

const PORT = Number.parseInt(process.env.UI_PORT ?? "3000", 10);
const HOST = process.env.UI_HOST ?? "127.0.0.1";
const API_TARGET = process.env.API_TARGET ?? "http://127.0.0.1:3001";
const ROOT = resolve(process.cwd(), process.env.UI_ROOT ?? "src/app");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const apiUrl = new URL(API_TARGET);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      proxyApi(req, res, url);
      return;
    }
    await serveStatic(url, res);
  } catch (error) {
    sendText(res, 500, `Internal server error: ${error.message}`);
  }
});

function proxyApi(req, res, url) {
  const proxied = httpRequest(
    {
      hostname: apiUrl.hostname,
      port: apiUrl.port || 80,
      method: req.method,
      path: `${url.pathname}${url.search}`,
      headers: { ...req.headers, host: apiUrl.host },
    },
    (upstream) => {
      res.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(res);
    },
  );
  proxied.on("error", (error) => {
    sendJson(res, 502, {
      error: {
        message: `API proxy failed: ${error.message}`,
        hint: `Is the API server running at ${API_TARGET}? Start it with npm run dev:api.`,
      },
    });
  });
  req.pipe(proxied);
}

async function serveStatic(url, res) {
  const requested = decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[\\/])+/, "");
  let filePath = resolve(ROOT, "." + (safePath === "/" ? "/index.html" : safePath));
  if (!filePath.startsWith(ROOT + sep) && filePath !== ROOT) {
    sendText(res, 403, "Forbidden");
    return;
  }

  let info;
  try {
    info = await stat(filePath);
  } catch {
    filePath = resolve(ROOT, "index.html");
    try {
      info = await stat(filePath);
    } catch {
      sendText(res, 404, "Not found");
      return;
    }
  }

  if (info.isDirectory()) {
    filePath = resolve(filePath, "index.html");
  }

  try {
    const body = await readFile(filePath);
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-cache",
    });
    res.end(body);
  } catch (error) {
    sendText(res, 500, `Failed to read ${filePath}: ${error.message}`);
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendText(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

server.listen(PORT, HOST, () => {
  console.log(`YC Tracker UI at http://${HOST}:${PORT}`);
  console.log(`Proxying /api/* to ${API_TARGET}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
