# Deployment Checklist for OneSignal Notifications

## What Was Fixed

The OneSignal notification system was not working on Vercel because:

1. Missing CORS headers in the API endpoint
2. No error logging to diagnose issues
3. Environment variables not properly configured in Vercel
4. No centralized notification handling

## Changes Made

### 1. Enhanced API Endpoint (`/api/notify.ts`)
- Added CORS headers for cross-origin requests
- Added comprehensive error logging
- Added OPTIONS request handling for preflight checks
- Improved error messages with detailed information
- Added web_buttons to notifications for better UX

### 2. Created Notification Utility (`src/lib/notifications.ts`)
- Centralized notification sending logic
- Proper error handling
- Console logging for debugging
- Prevents duplicate code across components

### 3. Updated All Components
- `src/App.tsx` - Uses new notification utility for transactions and notices
- `src/components/AdminPanel.tsx` - Uses new notification utility for notices
- `src/components/CommentsModal.tsx` - Uses new notification utility for comments

## Setup Instructions

### Step 1: Configure OneSignal Environment Variables

Go to your Vercel project settings and add these environment variables:

**Production, Preview, and Development:**
```
VITE_ONESIGNAL_APP_ID=9d1c4b2e-71ad-4511-8073-646a535603a3
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

To get your REST API Key:
1. Go to [OneSignal Dashboard](https://app.onesignal.com/)
2. Select your app
3. Go to Settings → Keys & IDs
4. Copy the **REST API Key**

### Step 2: Deploy to Vercel

After adding environment variables:
1. Trigger a new deployment (push to main branch or redeploy in Vercel)
2. Wait for deployment to complete

### Step 3: Test Notifications

1. Open your deployed app
2. Click "Enable Notifications" button
3. Allow notifications when prompted
4. Have an admin:
   - Create a new transaction
   - Post a new notice
   - Add a comment to a transaction

You should receive push notifications for each action, even when the app is closed.

## Debugging

### Check Vercel Function Logs

1. Go to your Vercel deployment
2. Click on **Functions** tab
3. Find the `/api/notify` function
4. Check the logs for:
   - `[Notify API] Environment check` - Shows if credentials are loaded
   - `[Notify API] Sending notification` - Shows when notification is triggered
   - `[Notify API] Success` - Shows OneSignal response

### Common Issues

#### 1. "OneSignal not configured" error
**Solution:** Add `VITE_ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` to Vercel environment variables and redeploy.

#### 2. Notifications not sending
**Check:**
- Vercel function logs for errors
- Browser console for errors
- OneSignal dashboard → Delivery → Messages (to see if notifications are being created)

#### 3. "CORS error" in browser console
**Solution:** The updated API endpoint includes CORS headers. Make sure you've deployed the latest code.

#### 4. Environment variables not found
**Solution:** Environment variables must be set in Vercel dashboard, not in `.env` files (those are for local development only). After adding them, you MUST redeploy.

## Testing Locally

To test notifications locally:

1. Update `.env` file with OneSignal credentials:
```bash
VITE_ONESIGNAL_APP_ID=9d1c4b2e-71ad-4511-8073-646a535603a3
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

2. Run the dev server:
```bash
npm run dev
```

3. Open the app on HTTPS (required for notifications):
   - Use ngrok: `ngrok http 5000`
   - Or deploy to preview branch on Vercel

Note: Notifications require HTTPS, so local testing is limited. Deploy to Vercel preview for full testing.

## How It Works

### Flow

1. **User Action** → Admin creates transaction/notice or user adds comment
2. **Database Update** → Firestore document is created
3. **Notification Call** → `sendPushNotification()` is called
4. **API Request** → POST to `/api/notify` endpoint
5. **OneSignal API** → Edge function calls OneSignal to send notification
6. **Push Delivery** → OneSignal delivers to all subscribed users
7. **User Receives** → Notification appears even if app is closed

### Components Involved

- **Frontend**: `src/lib/notifications.ts` - Handles sending notification requests
- **API**: `api/notify.ts` - Vercel Edge Function that calls OneSignal
- **Service Worker**: `public/OneSignalSDKWorker.js` - Handles background notifications
- **OneSignal SDK**: `src/components/OneSignalNotifications.tsx` - Manages subscriptions

## Verification Steps

After deployment, verify everything works:

1. ✅ Environment variables are set in Vercel
2. ✅ Deployment completed successfully
3. ✅ User can subscribe to notifications
4. ✅ Creating a transaction sends notification
5. ✅ Posting a notice sends notification
6. ✅ Adding a comment sends notification
7. ✅ Notifications appear when app is closed
8. ✅ No errors in Vercel function logs
9. ✅ No errors in browser console

## Support

If issues persist after following this checklist:
- Check Vercel function logs
- Check OneSignal dashboard delivery logs
- Contact dev@manthank.com with logs and error messages
