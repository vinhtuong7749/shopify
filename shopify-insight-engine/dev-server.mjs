import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import insightsHandler from "./api/insights.js";
import authCallbackHandler from "./api/auth/callback.js";
import authExchangeHandler from "./api/auth/exchange.js";
import authStartHandler from "./api/auth/start.js";
import authStatusHandler from "./api/auth/status.js";

const root = dirname(fileURLToPath(import.meta.url));
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT) || 4177;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function createVercelResponse(res) {
  return {
    getHeader(name) {
      return res.getHeader(name);
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      if (!res.hasHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(payload));
    },
    end(payload) {
      res.end(payload);
    },
    get statusCode() {
      return res.statusCode;
    },
    set statusCode(value) {
      res.statusCode = value;
    },
  };
}

function safePath(urlPath) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const clean = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(root, clean);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    const apiRoutes = {
      "/api/insights": insightsHandler,
      "/api/auth/start": authStartHandler,
      "/api/auth/callback": authCallbackHandler,
      "/api/auth/exchange": authExchangeHandler,
      "/api/auth/status": authStatusHandler,
    };

    if (apiRoutes[url.pathname]) {
      if (req.method === "POST") {
        const body = await readBody(req);
        req.body = body ? JSON.parse(body) : {};
      }
      await apiRoutes[url.pathname](req, createVercelResponse(res));
      return;
    }

    const filePath = safePath(url.pathname);
    const buffer = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream");
    res.end(buffer);
  } catch (error) {
    res.statusCode = error?.code === "ENOENT" ? 404 : 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(res.statusCode === 404 ? "Not found" : String(error?.message || error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Shopify Insight Engine running at http://127.0.0.1:${port}`);
});
