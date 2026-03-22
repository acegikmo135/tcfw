import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { Fido2Lib } from "fido2-lib";
import admin from "firebase-admin";
import fs from "fs";

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

const db = admin.firestore(admin.app());
if (firebaseConfig.firestoreDatabaseId) {
  // If using a named database
  // admin.firestore().databaseId = firebaseConfig.firestoreDatabaseId;
  // Actually, in admin sdk, you specify the databaseId in the firestore() call or settings
  // But for simplicity, we'll assume the default or handle it if needed
}

const f2l = new Fido2Lib({
  timeout: 60000,
  rpId: process.env.APP_URL ? new URL(process.env.APP_URL).hostname : "localhost",
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

      const registrationOptions = await f2l.attestationOptions();
      
      // Store challenge in cookie
      res.cookie("registrationChallenge", registrationOptions.challenge, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 60000
      });

      res.json(registrationOptions);
    } catch (error) {
      console.error("Registration options error:", error);
      res.status(500).json({ error: "Failed to get registration options" });
    }
  });

  // WebAuthn Registration - Step 2: Verify
  app.post("/api/auth/register/verify", async (req, res) => {
    try {
      const { email, attestationResponse, flatId } = req.body;
      const challenge = req.cookies.registrationChallenge;

      if (!challenge) return res.status(400).json({ error: "Challenge expired" });

      const clientAttestationResponse = {
        id: attestationResponse.id,
        rawId: Buffer.from(attestationResponse.rawId, "base64"),
        response: {
          attestationObject: attestationResponse.response.attestationObject,
          clientDataJSON: attestationResponse.response.clientDataJSON
        }
      };

      const regResult = await f2l.attestationResult(clientAttestationResponse, {
        challenge: challenge,
        origin: process.env.APP_URL || "http://localhost:3000",
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

      const assertionOptions = await f2l.assertionOptions();
      
      // Store challenge in cookie
      res.cookie("loginChallenge", assertionOptions.challenge, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 60000
      });

      res.json({
        ...assertionOptions,
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
      const challenge = req.cookies.loginChallenge;

      if (!challenge) return res.status(400).json({ error: "Challenge expired" });

      // Find flat by email
      const flatsSnapshot = await db.collection("flats").where("email", "==", email).limit(1).get();
      if (flatsSnapshot.empty) return res.status(404).json({ error: "User not found" });

      const flatDoc = flatsSnapshot.docs[0];
      const flatData = flatDoc.data();

      const clientAssertionResponse = {
        id: assertionResponse.id,
        rawId: Buffer.from(assertionResponse.rawId, "base64"),
        response: {
          authenticatorData: assertionResponse.response.authenticatorData,
          clientDataJSON: assertionResponse.response.clientDataJSON,
          signature: assertionResponse.response.signature,
          userHandle: assertionResponse.response.userHandle
        }
      };

      const expectAssertionResult = await f2l.assertionResult(clientAssertionResponse, {
        challenge: challenge,
        origin: process.env.APP_URL || "http://localhost:3000",
        factor: "either",
        publicKey: Buffer.from(flatData.publicKey, "base64"),
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
