import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { runSafeMigrations } from "./bootstrap";
import { env } from "./env";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const allowAllOrigins = env.corsAllowedOrigins.length === 0;
  const originAllowed =
    !requestOrigin || allowAllOrigins || env.corsAllowedOrigins.includes(requestOrigin);

  if (!originAllowed) {
    return res.status(403).json({ message: `CORS origin denied: ${requestOrigin}` });
  }

  if (requestOrigin) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  "/uploads",
  express.static(path.resolve(import.meta.dirname, "..", "client", "public", "uploads")),
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson as Record<string, unknown>;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (!reqPath.startsWith("/api")) return;

    let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 120) {
      logLine = `${logLine.slice(0, 119)}…`;
    }

    log(logLine);
  });

  next();
});

(async () => {
  await runSafeMigrations();

  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: number }).status) || 500
        : 500;

    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: string }).message)
        : "Internal Server Error";

    res.status(status).json({ message });
  });

  if (env.nodeEnv === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(env.port, "0.0.0.0", () => {
    log(`serving on port ${env.port}`);
  });
})().catch((error) => {
  console.error("Failed to bootstrap server", error);
  process.exit(1);
});
