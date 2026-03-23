import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import admin from "firebase-admin";
import fs from "fs";
import * as OneSignal from 'onesignal-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));

// Initialize Firebase Admin
// Note: In production, you should provide a service account key via environment variable
// For this environment, we'll try to initialize with the project ID if possible
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
  } else {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
}

const db = admin.firestore();
if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
  // @ts-ignore - databaseId is supported in newer versions of firebase-admin
  db.settings({ databaseId: firebaseConfig.firestoreDatabaseId });
}

// Initialize OneSignal
const oneSignalClient = process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY
  ? new OneSignal.Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_REST_API_KEY)
  : null;

async function sendNotification(title: string, message: string, data?: any) {
  if (!oneSignalClient) return;
  try {
    const notification = {
      contents: { en: message },
      headings: { en: title },
      included_segments: ["All"],
      data: data || {}
    };
    await oneSignalClient.createNotification(notification);
  } catch (e) {
    console.error("Failed to send notification:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // OneSignal Notification Helper
  app.post("/api/notify", async (req, res) => {
    try {
      const { title, message, url, data } = req.body;
      console.log("Incoming notification request:", { title, message, url, data });
      
      if (!oneSignalClient) {
        console.error("OneSignal client not initialized. Check ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY.");
        return res.status(503).json({ error: "OneSignal not configured" });
      }

      const notification = {
        contents: {
          en: message,
        },
        headings: {
          en: title,
        },
        included_segments: ['All'],
        url: url || process.env.APP_URL || "http://localhost:3000",
        data: data || {}
      };

      console.log("Sending notification to OneSignal:", notification);
      const response = await oneSignalClient.createNotification(notification);
      console.log("OneSignal response:", response);
      res.json({ success: true, response });
    } catch (error) {
      console.error("OneSignal error details:", error);
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
