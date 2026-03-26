# OneSignal Push Notifications Setup Guide

This guide will help you configure push notifications for The Courtyard F Wing app on Vercel.

## Prerequisites

1. A OneSignal account (free tier available)
2. Your project deployed on Vercel

## Step 1: Get OneSignal Credentials

1. Go to [OneSignal Dashboard](https://app.onesignal.com/)
2. Create a new app or select your existing app
3. Navigate to **Settings** → **Keys & IDs**
4. Copy the following:
   - **App ID** (e.g., `9d1c4b2e-71ad-4511-8073-646a535603a3`)
   - **REST API Key** (found in the same page)

## Step 2: Configure Environment Variables in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

   | Name | Value |
   |------|-------|
   | `VITE_ONESIGNAL_APP_ID` | Your OneSignal App ID |
   | `ONESIGNAL_REST_API_KEY` | Your OneSignal REST API Key |

5. Make sure to add them for **Production**, **Preview**, and **Development** environments
6. Click **Save**

## Step 3: Redeploy Your Application

After adding the environment variables, you need to redeploy:

1. Go to **Deployments** in your Vercel dashboard
2. Click on the **...** menu next to your latest deployment
3. Select **Redeploy**
4. Wait for the deployment to complete

## Step 4: Configure OneSignal Web Push

1. In OneSignal Dashboard, go to **Settings** → **Platforms**
2. Click on **Web Push** → **Configuration**
3. Add your site URL (e.g., `https://your-app.vercel.app`)
4. Under **Auto Resubscribe**, enable it
5. Under **Notification Persistence**, set to **Always Show**
6. Save changes

## Step 5: Test Notifications

1. Open your deployed app
2. Click on **Enable Notifications** button in the dashboard
3. Allow notifications when prompted by the browser
4. Have an admin create a new:
   - Transaction
   - Notice
   - Comment

You should receive a push notification even if the app is closed.

## Troubleshooting

### No notifications are being sent

1. Check Vercel logs:
   - Go to your deployment
   - Click on **Functions**
   - Check the logs for `/api/notify`
   - Look for errors

2. Verify environment variables:
   - Ensure `VITE_ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are set
   - Check that they have the correct values

3. Check OneSignal Dashboard:
   - Go to **Delivery** → **Messages**
   - See if notifications are being created but not delivered

### Notifications only work when app is open

This is expected browser behavior. To receive notifications when the app is closed:
- User must have granted notification permission
- The service worker must be registered (automatic in this app)
- The browser must support background notifications (most modern browsers do)

### Browser not asking for notification permission

1. Check if the site is running on HTTPS (required for notifications)
2. Clear browser cache and cookies
3. Reset site permissions in browser settings
4. Try a different browser

## Environment Variables Reference

```bash
# Client-side (visible in browser)
VITE_ONESIGNAL_APP_ID=9d1c4b2e-71ad-4511-8073-646a535603a3

# Server-side (secure, not exposed to browser)
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

## How It Works

1. **User subscribes**: When user clicks "Enable Notifications", OneSignal SDK registers them
2. **Event occurs**: Admin creates transaction/notice/comment
3. **API call**: App calls `/api/notify` endpoint with notification details
4. **OneSignal sends**: Edge function calls OneSignal API to send push notification
5. **User receives**: Notification appears on all subscribed devices, even if app is closed

## Support

If you continue to have issues:
- Check the browser console for errors
- Review Vercel function logs
- Contact dev@manthank.com with:
  - Browser type and version
  - Screenshot of any error messages
  - Vercel function logs (if accessible)
