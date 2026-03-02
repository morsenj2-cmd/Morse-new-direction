import "dotenv/config";
console.log("CLERK_SECRET_KEY exists:", Boolean(process.env.CLERK_SECRET_KEY));
console.log("CLERK_PUBLISHABLE_KEY exists:", Boolean(process.env.CLERK_PUBLISHABLE_KEY));
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { Resend } from "resend";
import { setupVite, serveStatic, log } from "./vite";
import { seedTagsIfEmpty } from "./storage";
import { pool } from "./db";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();

// Serve uploaded files from client/public/uploads directory
app.use("/uploads", express.static(path.resolve(import.meta.dirname, "..", "client", "public", "uploads")));

// Health check endpoint for quick deployment verification
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'communities_name_unique'
        ) THEN
          ALTER TABLE communities ADD CONSTRAINT communities_name_unique UNIQUE (name);
        END IF;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add communities_name_unique: %', SQLERRM;
      END $$;
    `);
    console.log("communities constraints ensured");
  } catch (err) {
    console.error("Could not ensure communities constraints:", err);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image_url TEXT,
        published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("blog_posts table ensured");
  } catch (err) {
    console.error("Could not ensure blog_posts table:", err);
  }

  // Seed default tags if database is empty
  await seedTagsIfEmpty();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.

app.post("/internal/weekly-engagement-email", async (req, res) => {
  try {
    const users = await db.user.findMany({
      where: { email: { not: null } }
    });

    for (const user of users) {
      await resend.emails.send({
  from: "Morse <noreply@morse.co.in>",
  to: user.email,
  subject: "Weekly check-in — Morse",
  html: `
    <h2>See what's new on Morse</h2>
    <p>New discussions and opportunities are waiting.</p>
    <a href="https://morse.co.in">Open Morse</a>
  `,
});

    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed weekly email job" });
  }
});


  const port = parseInt(process.env.PORT || "5000", 10);

  server.listen(port, () => {
   log(`serving on port ${port}`);
 });
})();
