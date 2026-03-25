import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${projectId}.firebaseio.com`
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
      admin.initializeApp({ projectId });
    }
  } else {
    admin.initializeApp({ projectId });
  }
}

const db = admin.firestore();
const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
if (databaseId && databaseId !== "(default)") {
  // @ts-ignore
  db.settings({ databaseId });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // FCM Notification Endpoint
  app.post("/api/notify", async (req, res) => {
    const { title, message, url } = req.body;
    
    try {
      // Get all FCM tokens from Firestore
      const tokensSnapshot = await db.collection("fcm_tokens").get();
      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

      if (tokens.length === 0) {
        return res.json({ success: true, message: "No tokens found" });
      }

      const payload = {
        notification: {
          title,
          body: message,
        },
        webpush: {
          fcmOptions: {
            link: url || "/"
          }
        },
        tokens: tokens
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        
        // Delete failed tokens from Firestore
        const deletePromises = failedTokens.map(token => 
          db.collection("fcm_tokens").where("token", "==", token).get()
            .then(snap => snap.forEach(doc => doc.ref.delete()))
        );
        await Promise.all(deletePromises);
      }

      res.json({ success: true, response });
    } catch (error) {
      console.error("FCM Error:", error);
      res.status(500).json({ success: false, error: String(error) });
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
