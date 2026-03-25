# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up push notifications for **The Courtyard F wing** app.

## Step 1: Enable Firebase Cloud Messaging

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project.
3.  Click on the **Project Settings** (gear icon) in the left sidebar.
4.  Navigate to the **Cloud Messaging** tab.
5.  Under **Firebase Cloud Messaging API (V1)**, ensure it is enabled. If not, follow the link to enable it in the Google Cloud Console.

## Step 2: Generate VAPID Key (Web Push)

1.  In the same **Cloud Messaging** tab, scroll down to the **Web configuration** section.
2.  Under **Web Push certificates**, click **Generate key pair**.
3.  Copy the generated **Key pair** (this is your `VITE_FIREBASE_VAPID_KEY`).

## Step 3: Get Firebase Admin Service Account Key

To send notifications from the server, you need a service account key.

1.  In **Project Settings**, navigate to the **Service accounts** tab.
2.  Click **Generate new private key**.
3.  A JSON file will be downloaded.
4.  Open this JSON file, copy its entire content.
5.  In the AI Studio settings, add a new environment variable named `FIREBASE_SERVICE_ACCOUNT_KEY` and paste the JSON content as the value.

## Step 4: Update Environment Variables

Ensure the following variables are set in your AI Studio project settings:

### Client-side (Vite)
- `VITE_FIREBASE_API_KEY`: Your Firebase API Key.
- `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth Domain.
- `VITE_FIREBASE_PROJECT_ID`: Your Firebase Project ID.
- `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage Bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging Sender ID.
- `VITE_FIREBASE_APP_ID`: Your Firebase App ID.
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`: Your Firestore Database ID (usually `(default)` or a custom ID).
- `VITE_FIREBASE_VAPID_KEY`: The VAPID key generated in Step 2.

### Server-side
- `FIREBASE_SERVICE_ACCOUNT_KEY`: The JSON content from Step 3.

## Step 5: Service Worker (Done)

The file `public/firebase-messaging-sw.js` has been automatically updated with your Firebase configuration. You don't need to edit it manually unless your config changes.

## Step 6: Test Notifications

1.  Open the app in a browser.
2.  The browser will prompt you to "Allow Notifications". Click **Allow**.
3.  Check the browser console (F12) for logs like `FCM Token generated` and `FCM Token saved to Firestore`.
4.  Add a new transaction, notice, or comment.
5.  Other users who have allowed notifications should receive a push notification!
