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
  App.tsx                    - Root app, Dashboard component, dynamic categories
  main.tsx                   - Entry point, PWA service worker registration
  firebase.ts                - Firebase SDK initialization
  index.css                  - Global styles
  components/
    AdminPanel.tsx           - Admin panel with 3 tabs: Residents, Notices, Categories
    NoticeBoard.tsx          - Notice board shown on Dashboard (read-only for residents)
    InstallPWA.tsx           - PWA install prompt
  contexts/
    LanguageContext.tsx      - English/Gujarati translations
public/
  pwa-icon.svg               - PWA icon
firebase-applet-config.json  - Firebase project config (non-secret)
firestore.rules              - Firestore security rules
```

## Firestore Collections
- `flats/{flatId}` — user flat data: `{ flatNo, role }`
- `transactions/{id}` — fund transactions: `{ type, amount, category, description, date, createdBy }`
- `notices/{id}` — building notices: `{ title, content, createdBy, createdAt, isPinned }` — admin write, all read
- `categories/{id}` — expense categories: `{ name, iconName, order }` — admin write, all read (auto-seeded with defaults on first admin panel visit)

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
