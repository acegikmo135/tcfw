import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID || "";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "";

async function sendOneSignalNotification(heading: string, content: string, url?: string) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) return;
  try {
    const body: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: heading },
      contents: { en: content },
      priority: 10,
    };
    if (url) body.url = url;
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[OneSignal] Error sending notification:", err);
    } else {
      console.log("[OneSignal] Notification sent:", heading);
    }
  } catch (e) {
    console.error("[OneSignal] Failed to send notification:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  app.use(express.json());
  app.use(cookieParser());

  // Allow cross-origin requests from the Vercel production domain
  app.use((req, res, next) => {
    const allowed = ["https://tcfw.manthank.com", "https://osworker.manthank.com"];
    const origin = req.headers.origin || "";
    if (allowed.includes(origin) || process.env.NODE_ENV !== "production") {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Notification endpoint — called by the client after every Firestore write
  app.post("/api/notify", async (req, res) => {
    const { title, message, url } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ error: "title and message are required" });
    }
    await sendOneSignalNotification(title, message, url || "https://tcfw.manthank.com");
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("[OneSignal] /api/notify endpoint ready.");
  });
}

startServer();
