import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import admin, { adminDb as db } from "./src/lib/admin-db.js";

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
    }
  } catch (e) {
    console.error("[OneSignal] Failed to send notification:", e);
  }
}

function startFirestoreListeners() {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log("[OneSignal] Skipping Firestore listeners — ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set.");
    return;
  }

  let noticesReady = false;
  db.collection("notices")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      if (!noticesReady) { noticesReady = true; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          sendOneSignalNotification(
            `📢 New Notice: ${data.title || "Untitled"}`,
            data.content?.substring(0, 120) || "",
            "/"
          );
        }
      });
    });

  let txReady = false;
  db.collection("transactions")
    .orderBy("date", "desc")
    .onSnapshot((snapshot) => {
      if (!txReady) { txReady = true; return; }
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const sign = data.type === "income" ? "+" : "-";
          const emoji = data.type === "income" ? "💰" : "💸";
          sendOneSignalNotification(
            `${emoji} New ${data.type === "income" ? "Income" : "Expense"}: ${data.category}`,
            `${sign}₹${Number(data.amount).toLocaleString()} — ${data.description || "No description"} (by ${data.createdBy || "Unknown"})`,
            "/"
          );
        }
      });
    });

  db.collection("transactions").onSnapshot((txSnapshot) => {
    txSnapshot.docChanges().forEach((txChange) => {
      if (txChange.type !== "added" && txChange.type !== "modified") return;
      const txId = txChange.doc.id;
      let commentsReady = false;
      db.collection("transactions")
        .doc(txId)
        .collection("comments")
        .orderBy("createdAt", "desc")
        .onSnapshot((snap) => {
          if (!commentsReady) { commentsReady = true; return; }
          snap.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              const txData = txChange.doc.data();
              sendOneSignalNotification(
                `💬 New Comment on ${txData.category || "Transaction"}`,
                `${data.text?.substring(0, 100) || ""} — by ${data.createdBy || "Someone"}`,
                "/"
              );
            }
          });
        });
    });
  });

  console.log("[OneSignal] Firestore listeners active — push notifications enabled.");
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  app.use(express.json());
  app.use(cookieParser());

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
    startFirestoreListeners();
  });
}

startServer();
