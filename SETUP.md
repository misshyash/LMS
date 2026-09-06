# CAIWP MQA Assessment Dashboard — Setup Guide

This app ships in two modes:

- **Demo Mode** (default, zero config): runs entirely in the browser with a
  fully in-memory backend. Nothing is persisted, no real accounts, no
  network calls. Good for reviewing the UI/UX before wiring up Firebase.
- **Production Mode**: real Google Sign-In, Firestore, and Cloud Functions.
  This is what makes candidate data, attempts, and scores persist across
  devices/refreshes and lets the admin dashboard update in real time.

Nothing in this repo can create the Firebase project or Google OAuth
credentials for you — that requires your own Google/Firebase account. This
guide is the exact path from a fresh Firebase project to a working
deployment.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project**.
2. Once created, go to **Build → Authentication → Sign-in method** and
   enable **Google** as a sign-in provider.
3. Go to **Build → Firestore Database → Create database** (start in
   production mode — the security rules in this repo lock it down anyway).
4. Go to **Project settings → General → Your apps → Add app → Web app**.
   Copy the `firebaseConfig` values (apiKey, authDomain, projectId,
   storageBucket, messagingSenderId, appId).

## 2. Configure the frontend

Copy `.env.example` to `.env` and fill in the values from step 1:

```
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_DEMO_MODE=false
```

These values are **public** — Firebase web app config is designed to be
embedded in client code. All real authorization happens in
`firestore.rules` and in the Cloud Functions, never in the browser.

## 3. Install the Firebase CLI and log in

```
npm install -g firebase-tools
firebase login
firebase use --add   # pick your project, give it an alias like "default"
```

## 4. Deploy security rules and Cloud Functions

```
npm --prefix functions install
firebase deploy --only firestore:rules,firestore:indexes,functions
```

This deploys:
- `firestore.rules` — locks candidates to their own data, blocks all
  client writes to scores/results/attempt counts, and restricts admin-only
  reads to accounts holding the `admin` custom claim.
- Cloud Functions (`functions/src/index.ts`) — the ONLY place scores are
  computed, attempt limits enforced, and admin actions performed. See the
  comments at the top of that file for the full list.

## 5. Add your first admin

Admin access is never a password in the app. It's controlled by a
server-side allow-list collection.

1. In the Firebase Console, go to **Firestore Database**.
2. Create collection `admin_allowlist`.
3. Add a document whose **ID is the admin's Gmail address in lowercase**
   (e.g. `asha.mohd@trainitoacademy.com`), with any field (e.g.
   `{ addedAt: <timestamp> }` — the content doesn't matter, only the
   document's existence does).
4. Have that person sign in with Google in the app once. The
   `onAuthUserCreate` trigger (first sign-in) or the `syncRole` callable
   (every sign-in) will grant them the `admin` custom claim automatically,
   and they'll land on the Admin Control Centre instead of the candidate
   dashboard.

To add more admins later, just add more documents to `admin_allowlist` —
existing users are picked up the next time they sign in (`syncRole` runs on
every login).

## 6. Seed the real assessment content

The 30-question CAIWP MQA bank (with the answer key) lives only in
`functions/src/data/questionBank.ts` — it is never bundled into client
JavaScript. To populate Firestore with it:

1. Sign in to the app as an admin.
2. Go to **Setup → Initialize Assessment Bank** and click the button.

This is idempotent — safe to click again after editing the question bank
and redeploying functions.

## 7. Run it

```
npm install
npm run dev
```

Or build and deploy to Firebase Hosting:

```
npm run build
firebase deploy --only hosting
```

## 8. (Optional) Local emulators

For development without touching production data:

```
firebase emulators:start
```

Set `VITE_USE_EMULATORS=true` in `.env` to point the web app at the local
Auth/Firestore/Functions emulators instead of production.

## How security is enforced (read this before going live)

- **Candidates never receive the answer key.** The public `questions`
  collection has no `correct` field. The `answer_keys` collection has
  `allow read, write: if false` in `firestore.rules` — it is reachable only
  by Cloud Functions using the Admin SDK.
- **Grading is server-side only.** `submitAttempt()` in
  `functions/src/index.ts` is the single place a score is ever computed.
  The client cannot set `score`, `percentage`, `result`, or flip
  `status` to `submitted` directly — `firestore.rules` rejects any client
  write that touches those fields or changes status away from
  `in_progress`.
- **The 3-attempt limit and "already passed" lock are enforced in a
  Firestore transaction** inside `startAttempt()`, not in the UI. A
  candidate cannot bypass it by editing browser JavaScript.
- **Admin access is a custom claim**, set only by Cloud Functions after
  checking the server-side `admin_allowlist` collection, which clients can
  never read or write. There is no admin password anywhere in this repo.

## Demo Mode vs. Demo Traffic — don't confuse the two

- **Demo Mode** (`VITE_DEMO_MODE=true`, or simply no `.env` configured) —
  the entire app runs on an in-memory fake backend with placeholder
  questions. No Firebase project needed at all.
- **Demo Traffic** (Admin → Setup → Seed Demo Traffic, available once you
  ARE connected to a real Firebase project) — creates a handful of
  clearly-flagged (`isDemo: true`) fake candidates in your real database so
  you can rehearse the live monitor and analytics with your team before
  real participants log in. Toggle "Include Demo Data" in the admin
  dashboard to show/hide them; it defaults to OFF so demo data never
  silently inflates your real KPIs.
