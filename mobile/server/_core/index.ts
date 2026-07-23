import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerUploadRoutes } from "../upload";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function assertSecrets() {
  const missing = ["JWT_SECRET", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"]
    .filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[startup] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET === "change-me-in-production") {
    console.error("[startup] JWT_SECRET is still the insecure default. Set a strong random value in .env.");
    process.exit(1);
  }
}

async function startServer() {
  assertSecrets();
  const app = express();
  const server = createServer(app);

  // Known real callers of this API from a browser context. The session
  // cookie is SameSite=None (see _core/cookies.ts) so it rides along on
  // cross-site requests by design — reflecting ANY origin here (as this
  // used to) combined with Allow-Credentials meant any third-party site
  // could silently make authenticated requests as a logged-in user and read
  // the response. Only echo the origin back (and only then allow
  // credentials) for origins we actually recognize.
  const ALLOWED_ORIGINS = new Set(
    [
      "https://mobile-web-339002663338.australia-southeast1.run.app",
      process.env.ALLOWED_WEB_ORIGIN,
      ...(process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()),
    ].filter(Boolean),
  );

  function isAllowedOrigin(origin: string): boolean {
    if (ALLOWED_ORIGINS.has(origin)) return true;
    // Local Expo web dev server — never matches real production traffic.
    return /^http:\/\/localhost(:\d+)?$/.test(origin);
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-Slug",
    );

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerUploadRoutes(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
