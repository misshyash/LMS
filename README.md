# CAIWP MQA Assessment Dashboard

A real-time, cloud-backed assessment platform for the CAIWP (Certified AI
Workplace Practitioner) MQA Assessment — 30 questions across 4 modules,
75% passing mark, 3-attempt limit — built for Trainito Academy.

- **Candidates** sign in with Google, pick their batch/cohort, and take the
  assessment with question navigation, flagging, and resumable progress.
- **Admins** get a live-updating control centre: KPI cards, a live
  assessment monitor (who's taking the test right now, question-by-
  question), a searchable/filterable candidate registry, module-performance
  analytics, a live audit log, and CSV export — all updating without a page
  refresh via Firestore real-time listeners.
- **Grading and attempt limits are enforced server-side** (Cloud
  Functions) — the answer key never reaches the browser, and a candidate
  cannot manipulate their score by editing client-side JavaScript.

## Capstone + theory grading (Admin Portal → Grading)

Implements the **CAIWP Day 5 Marking Scheme**:

    Final score = (capstone raw × 0.60) + (theory correct ÷ 30 × 40)   — pass at 75/100

- **Teams & Submissions** – create teams (or load the *Island Takeover* preset:
  Langkawi, Redang, Tioman, Perhentian), assign students, and paste
  submission links (slide deck/PDF, video, chatbot, feedback form).
- **Score Sheet** – the 10-criterion / 100-mark rubric, scored in 0.5 steps,
  plus the demonstration & challenge record, the 7 mandatory pitch elements
  and the submission check. Each judge scores independently; raw totals are
  averaged before × 0.60. *AI workflow evidence* is a free mark (edit
  `FREE_MARK_ITEM_IDS` in `src/data/capstoneRubric.ts` to change).
- **Final Results** – every student's name and total /100 with PASS/FAIL
  (decided on the unrounded total), team ranking with the C1 → C3 → C8
  tie-break, printable result sheets.
- **Header toolbar** – Results Doc (print/PDF), Database Sheet (every mark,
  CSV), Export CSV, Refresh, Exit Admin.
- **Publish to Students** – released results appear on each student's dashboard.
- **🤖 Meet your AI Grader** – a short, voiced walkthrough (intro → questions →
  how we mark → pass rule) personalised with the participant's name/team;
  can be downloaded as a captioned video.

The theory score is the student's best auto-marked attempt. After pulling
this change, redeploy security rules: `firebase deploy --only firestore:rules`.

## Run it

```
npm install
npm run dev
```

With no `.env` file, the app runs in **Demo Mode** — a fully in-browser
simulation (fake questions, fake candidates) so you can click through the
whole product with zero setup. To connect a real Firebase project (real
Google accounts, persistent data, real-time admin monitoring across
devices), see **[SETUP.md](./SETUP.md)**.

## Project layout

```
src/                      Frontend (React + Vite + Tailwind)
  services/backend.ts       The Backend interface every UI component talks to
  services/demoBackend.ts   In-memory implementation used in Demo Mode
  services/firebaseBackend.ts  Real Firestore/Auth/Functions implementation
  components/candidate/     Login → profile setup → dashboard → assessment → results
  components/admin/         Admin Control Centre (KPIs, live monitor, candidates, audit log)
functions/                 Cloud Functions — grading, attempt limits, admin actions
  src/data/questionBank.ts   The real 30-question bank + answer key (server-only)
firestore.rules            Security rules (role-based access, candidate isolation)
SETUP.md                   Step-by-step guide to connect your own Firebase project
```
