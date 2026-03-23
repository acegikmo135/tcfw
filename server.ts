import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { Fido2Lib } from "fido2-lib";
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

const getF2L = (hostname: string) => new Fido2Lib({
  timeout: 60000,
  rpId: hostname,
  rpName: "Society Management App",
  challengeSize: 128,
  attestation: "none",
  cryptoParams: [-7, -257],
  authenticatorAttachment: "platform",
  authenticatorRequireResidentKey: false,
  authenticatorUserVerification: "preferred"
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // WebAuthn Registration - Step 1: Get Options
  app.post("/api/auth/register/options", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      const hostname = process.env.APP_URL ? new URL(process.env.APP_URL).hostname : req.get('host') || "localhost";
      const f2l = getF2L(hostname);
      const registrationOptions = await f2l.attestationOptions();
      
      // Store challenge in cookie as base64
      const challengeBase64 = Buffer.from(registrationOptions.challenge).toString("base64");
      res.cookie("registrationChallenge", challengeBase64, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 60000
      });

      // Convert Uint8Array to base64 for JSON
      const options = {
        ...registrationOptions,
        challenge: challengeBase64,
        user: {
          ...registrationOptions.user,
          id: Buffer.from(registrationOptions.user.id).toString("base64")
        }
      };

      res.json(options);
    } catch (error) {
      console.error("Registration options error:", error);
      res.status(500).json({ error: "Failed to get registration options" });
    }
  });

  // WebAuthn Registration - Step 2: Verify
  app.post("/api/auth/register/verify", async (req, res) => {
    try {
      const { email, attestationResponse, flatId } = req.body;
      const challengeBase64 = req.cookies.registrationChallenge;

      if (!challengeBase64) return res.status(400).json({ error: "Challenge expired" });

      const clientAttestationResponse = {
        id: attestationResponse.id,
        rawId: new Uint8Array(Buffer.from(attestationResponse.rawId, "base64")).buffer as ArrayBuffer,
        response: {
          attestationObject: attestationResponse.response.attestationObject,
          clientDataJSON: attestationResponse.response.clientDataJSON
        }
      };

      const hostname = process.env.APP_URL ? new URL(process.env.APP_URL).hostname : req.get('host') || "localhost";
      const origin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : `https://${req.get('host')}`;
      const f2l = getF2L(hostname);
      const regResult = await f2l.attestationResult(clientAttestationResponse, {
        challenge: challengeBase64,
        origin: origin,
        factor: "either"
      });

      const publicKey = regResult.authnrData.get("credentialPublicKey");
      const counter = regResult.authnrData.get("counter");
      const credentialId = Buffer.from(regResult.authnrData.get("credId")).toString("base64");

      // Store in Firestore
      await db.collection("flats").doc(flatId).update({
        passkeyId: credentialId,
        publicKey: Buffer.from(publicKey).toString("base64"),
        counter: counter,
        passkeyEnabled: true
      });

      await sendNotification("Passkey Registered", `Passkey successfully registered for ${email}`);

      res.json({ success: true });
    } catch (error) {
      console.error("Registration verify error:", error);
      res.status(500).json({ error: "Failed to verify registration" });
    }
  });

  // WebAuthn Login - Step 1: Get Options
  app.post("/api/auth/login/options", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      // Find flat by email
      const flatsSnapshot = await db.collection("flats").where("email", "==", email).limit(1).get();
      if (flatsSnapshot.empty) return res.status(404).json({ error: "User not found" });

      const flatData = flatsSnapshot.docs[0].data();
      if (!flatData.passkeyId) return res.status(400).json({ error: "Passkey not registered" });

      const hostname = process.env.APP_URL ? new URL(process.env.APP_URL).hostname : req.get('host') || "localhost";
      const f2l = getF2L(hostname);
      const assertionOptions = await f2l.assertionOptions();
      
      // Store challenge in cookie as base64
      const challengeBase64 = Buffer.from(assertionOptions.challenge).toString("base64");
      res.cookie("loginChallenge", challengeBase64, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 60000
      });

      res.json({
        ...assertionOptions,
        challenge: challengeBase64,
        allowCredentials: [{
          id: flatData.passkeyId,
          type: "public-key",
          transports: ["internal"]
        }]
      });
    } catch (error) {
      console.error("Login options error:", error);
      res.status(500).json({ error: "Failed to get login options" });
    }
  });

  // WebAuthn Login - Step 2: Verify & Issue Token
  app.post("/api/auth/login/verify", async (req, res) => {
    try {
      const { email, assertionResponse } = req.body;
      const challengeBase64 = req.cookies.loginChallenge;

      if (!challengeBase64) return res.status(400).json({ error: "Challenge expired" });

      // Find flat by email
      const flatsSnapshot = await db.collection("flats").where("email", "==", email).limit(1).get();
      if (flatsSnapshot.empty) return res.status(404).json({ error: "User not found" });

      const flatDoc = flatsSnapshot.docs[0];
      const flatData = flatDoc.data();

      const clientAssertionResponse = {
        id: assertionResponse.id,
        rawId: new Uint8Array(Buffer.from(assertionResponse.rawId, "base64")).buffer as ArrayBuffer,
        response: {
          authenticatorData: assertionResponse.response.authenticatorData,
          clientDataJSON: assertionResponse.response.clientDataJSON,
          signature: assertionResponse.response.signature,
          userHandle: assertionResponse.response.userHandle
        }
      };

      const hostname = process.env.APP_URL ? new URL(process.env.APP_URL).hostname : req.get('host') || "localhost";
      const origin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : `https://${req.get('host')}`;
      const f2l = getF2L(hostname);
      const expectAssertionResult = await f2l.assertionResult(clientAssertionResponse, {
        challenge: challengeBase64,
        origin: origin,
        factor: "either",
        publicKey: (new Uint8Array(Buffer.from(flatData.publicKey, "base64")).buffer as any),
        prevCounter: flatData.counter,
        userHandle: null
      });

      // Update counter
      await flatDoc.ref.update({
        counter: expectAssertionResult.authnrData.get("counter")
      });

      // Issue Firebase Custom Token
      // We need the user's UID. We'll assume the email matches a Firebase user.
      const userRecord = await admin.auth().getUserByEmail(email);
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      res.json({ customToken });
    } catch (error) {
      console.error("Login verify error:", error);
      res.status(500).json({ error: "Failed to verify login" });
    }
  });

  // OneSignal Notification Helper
  app.post("/api/notify", async (req, res) => {
    try {
      const { title, message, url, data } = req.body;
      if (!oneSignalClient) return res.status(503).json({ error: "OneSignal not configured" });

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

      const response = await oneSignalClient.createNotification(notification);
      res.json({ success: true, response });
    } catch (error) {
      console.error("OneSignal error:", error);
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
