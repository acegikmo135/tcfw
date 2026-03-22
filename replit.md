# The Courtyard F Wing — Transparent Fund Management

## Project Overview
A React + Vite PWA for transparent fund management. Uses Firebase (Firestore + Auth) as the backend and Google Gemini AI for intelligent features.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite 6
- **Backend/DB**: Firebase (Firestore, Auth) — configured in `firebase-applet-config.json`
- **AI**: Google Gemini via `@google/genai`
- **Charts**: Recharts
- **PDF Export**: jsPDF + jspdf-autotable
- **Animations**: Motion (Framer)
- **PWA**: vite-plugin-pwa

## Project Structure
```
src/
  App.tsx          - Root app component
  main.tsx         - Entry point, PWA service worker registration
  firebase.ts      - Firebase SDK initialization
  index.css        - Global styles
  components/      - UI components
  contexts/        - React context providers
public/
  pwa-icon.svg     - PWA icon
firebase-applet-config.json  - Firebase project config (non-secret)
firestore.rules              - Firestore security rules
```

## Running the App
```bash
npm install
npm run dev      # starts on port 5000
```

## Environment Variables / Secrets
- `GEMINI_API_KEY` — Required for Gemini AI features. Add via Replit Secrets panel.

## Replit Configuration
- Dev server runs on **port 5000** with `host: 0.0.0.0` and `allowedHosts: true`
- Workflow: `Start application` → `npm run dev`
- Package manager: npm
