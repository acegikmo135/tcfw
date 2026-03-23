import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as OneSignal from 'onesignal-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const client = new OneSignal.Client(
    process.env.VITE_ONESIGNAL_APP_ID || '',
    process.env.ONESIGNAL_REST_API_KEY || ''
  );

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/notify", async (req, res) => {
    const { title, message, url } = req.body;

    if (!process.env.VITE_ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
      return res.status(500).json({ error: "OneSignal keys not configured" });
    }

    try {
      const notification = {
        contents: {
          en: message,
        },
        headings: {
          en: title,
        },
        included_segments: ['All'],
        url: url,
      };

      const response = await client.createNotification(notification);
      res.json({ success: true, response: response.body });
    } catch (error) {
      console.error("OneSignal Error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
