import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as functionsV1 from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { QUESTION_BANK } from './data/questionBank';

admin.initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

const db = admin.firestore();

const MAX_ATTEMPTS = 3;
const PASSING_PERCENTAGE = 75;
const TOTAL_QUESTIONS = QUESTION_BANK.length;
const DEFAULT_ASSESSMENT_ID = 'caiwp-mqa-v1';

function requireAuth(auth: { uid: string } | undefined): asserts auth is { uid: string } {
  if (!auth) throw new HttpsError('unauthenticated', 'You must be signed in.');
}

async function isCallerAdmin(auth: { uid: string; token?: Record<string, unknown> } | undefined): Promise<boolean> {
  if (!auth) return false;
  if (auth.token && auth.token.admin === true) return true;
  const user = await admin.auth().getUser(auth.uid);
  return user.customClaims?.admin === true;
}

function blankSummary(uid: string, name: string, email: string, photoURL: string | null) {
  const now = admin.firestore.Timestamp.now();
  return {
    uid,
    name,
    email,
    photoURL,
    batch: null,
    attemptsUsed: 0,
    attemptsRemaining: MAX_ATTEMPTS,
    bestScore: null,
    bestPercentage: null,
    latestScore: null,
    latestPercentage: null,
    passed: false,
    completed: false,
    disabled: false,
    isDemo: false,
    firstLoginAt: now,
    lastLoginAt: now,
    assessmentStartedAt: null,
    lastSubmissionAt: null,
  };
}

// ---------------------------------------------------------------------------
// Auth trigger: fires once per new Firebase Auth account (i.e. first Google
// sign-in). Creates the Firestore profile + summary, and grants the `admin`
// custom claim if the email is present in the server-side admin_allowlist.
// ---------------------------------------------------------------------------
export const onAuthUserCreate = functionsV1.auth.user().onCreate(async (user: admin.auth.UserRecord) => {
  const email = (user.email || '').toLowerCase();
  const name = user.displayName || email.split('@')[0] || 'Candidate';
  const photoURL = user.photoURL || null;

  const allowlistDoc = await db.collection('admin_allowlist').doc(email).get();
  if (allowlistDoc.exists) {
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  }

  const now = admin.firestore.Timestamp.now();
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    name,
    email: user.email || '',
    photoURL,
    batch: null,
    programme: null,
    assessmentId: null,
    registeredAt: now,
    createdAt: now,
    lastLoginAt: now,
  });

  if (!allowlistDoc.exists) {
    await db.collection('user_summaries').doc(user.uid).set(blankSummary(user.uid, name, user.email || '', photoURL));
  }
});

// ---------------------------------------------------------------------------
// syncRole: call right after every sign-in. Re-checks the admin_allowlist so
// an admin promoted after their first login is picked up without needing to
// delete/recreate their account.
// ---------------------------------------------------------------------------
export const syncRole = onCall(async (request) => {
  requireAuth(request.auth);
  const uid = request.auth.uid;
  const email = (request.auth.token.email || '').toLowerCase();

  const allowlistDoc = await db.collection('admin_allowlist').doc(email).get();
  const shouldBeAdmin = allowlistDoc.exists;
  const user = await admin.auth().getUser(uid);
  const currentlyAdmin = user.customClaims?.admin === true;

  if (shouldBeAdmin !== currentlyAdmin) {
    await admin.auth().setCustomUserClaims(uid, { admin: shouldBeAdmin });
  }

  await db.collection('users').doc(uid).set({ lastLoginAt: admin.firestore.Timestamp.now() }, { merge: true });
  if (!shouldBeAdmin) {
    await db.collection('user_summaries').doc(uid).set({ lastLoginAt: admin.firestore.Timestamp.now() }, { merge: true });
  }

  if (shouldBeAdmin) {
    await db.collection('activity_logs').add({
      timestamp: admin.firestore.Timestamp.now(),
      userId: uid,
      userEmail: request.auth.token.email || '',
      userName: user.displayName || '',
      batch: null,
      eventType: 'ADMIN_LOGIN',
      details: 'Admin signed in',
    });
  }

  return { isAdmin: shouldBeAdmin };
});

// ---------------------------------------------------------------------------
// updateProfile: candidate selects batch / programme / assessment.
// ---------------------------------------------------------------------------
export const updateProfile = onCall(async (request) => {
  requireAuth(request.auth);
  const uid = request.auth.uid;
  const { batch, programme, assessmentId } = request.data as { batch: string; programme: string; assessmentId: string };
  if (!batch || !programme || !assessmentId) {
    throw new HttpsError('invalid-argument', 'batch, programme and assessmentId are required.');
  }

  const now = admin.firestore.Timestamp.now();
  await db.collection('users').doc(uid).set({ batch, programme, assessmentId, registeredAt: now }, { merge: true });
  await db.collection('user_summaries').doc(uid).set({ batch }, { merge: true });
  await db.collection('activity_logs').add({
    timestamp: now,
    userId: uid,
    userEmail: request.auth.token.email || '',
    userName: request.auth.token.name || '',
    batch,
    eventType: 'PROFILE_SETUP',
    details: `Batch: ${batch}, Programme: ${programme}`,
  });

  return { ok: true };
});

// ---------------------------------------------------------------------------
// startAttempt: server-enforced 3-attempt limit + "already passed" lock.
// ---------------------------------------------------------------------------
export const startAttempt = onCall(async (request) => {
  requireAuth(request.auth);
  const uid = request.auth.uid;
  const { assessmentId, batch, programme } = request.data as { assessmentId: string; batch: string; programme: string };
  if (!assessmentId || !batch) throw new HttpsError('invalid-argument', 'assessmentId and batch are required.');

  const summaryRef = db.collection('user_summaries').doc(uid);
  const attemptRef = db.collection('attempts').doc();

  await db.runTransaction(async (tx) => {
    const summarySnap = await tx.get(summaryRef);
    const summary = summarySnap.exists
      ? summarySnap.data()!
      : blankSummary(uid, request.auth!.token.name || '', request.auth!.token.email || '', request.auth!.token.picture || null);

    if (summary.disabled) throw new HttpsError('permission-denied', 'Your account has been disabled by an administrator.');
    if (summary.passed) throw new HttpsError('failed-precondition', 'Assessment Completed');
    if ((summary.attemptsUsed || 0) >= MAX_ATTEMPTS) throw new HttpsError('failed-precondition', 'Maximum Attempts Reached');

    const now = admin.firestore.Timestamp.now();
    const attemptNumber = (summary.attemptsUsed || 0) + 1;

    tx.set(attemptRef, {
      id: attemptRef.id,
      userId: uid,
      userEmail: request.auth!.token.email || '',
      userName: request.auth!.token.name || '',
      batch,
      programme: programme || '',
      assessmentId,
      attemptNumber,
      status: 'in_progress',
      totalQuestions: TOTAL_QUESTIONS,
      currentQuestionIndex: 0,
      answeredCount: 0,
      flaggedQuestions: [],
      answers: {},
      startedAt: now,
      submittedAt: null,
      lastActivityAt: now,
      score: null,
      percentage: null,
      result: null,
      isDemo: false,
    });

    tx.set(
      summaryRef,
      {
        ...summary,
        attemptsUsed: attemptNumber,
        attemptsRemaining: MAX_ATTEMPTS - attemptNumber,
        batch,
        assessmentStartedAt: summary.assessmentStartedAt || now,
      },
      { merge: true }
    );

    tx.set(db.collection('activity_logs').doc(), {
      timestamp: now,
      userId: uid,
      userEmail: request.auth!.token.email || '',
      userName: request.auth!.token.name || '',
      batch,
      eventType: 'QUIZ_START',
      details: `Attempt ${attemptNumber}`,
      attemptId: attemptRef.id,
    });
  });

  return { attemptId: attemptRef.id };
});

// ---------------------------------------------------------------------------
// submitAttempt: the ONLY place scores are computed. Reads the candidate's
// submitted answers, grades them against the server-only answer key, and
// writes the authoritative result. The client never sees the answer key.
// ---------------------------------------------------------------------------
export const submitAttempt = onCall(async (request) => {
  requireAuth(request.auth);
  const uid = request.auth.uid;
  const { attemptId } = request.data as { attemptId: string };
  if (!attemptId) throw new HttpsError('invalid-argument', 'attemptId is required.');

  const attemptRef = db.collection('attempts').doc(attemptId);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) throw new HttpsError('not-found', 'Attempt not found.');
  const attempt = attemptSnap.data()!;
  if (attempt.userId !== uid) throw new HttpsError('permission-denied', 'This is not your attempt.');
  if (attempt.status !== 'in_progress') throw new HttpsError('failed-precondition', 'Attempt already submitted.');

  const answers: Record<string, number> = attempt.answers || {};
  let score = 0;
  const moduleTally = new Map<number, { correct: number; total: number }>();
  const now = admin.firestore.Timestamp.now();

  const batch = db.batch();
  for (const q of QUESTION_BANK) {
    const selected = answers[q.id] ?? null;
    const isCorrect = selected === q.correct;
    if (isCorrect) score += 1;
    const tally = moduleTally.get(q.module) ?? { correct: 0, total: 0 };
    tally.total += 1;
    if (isCorrect) tally.correct += 1;
    moduleTally.set(q.module, tally);

    batch.set(attemptRef.collection('review').doc(q.id), {
      qid: q.id,
      order: q.order,
      module: q.module,
      moduleTitle: q.moduleTitle,
      text: q.text,
      options: q.options,
      selected,
      correct: q.correct,
      isCorrect,
      rationale: q.rationale,
    });
  }

  const percentage = Math.round((score / TOTAL_QUESTIONS) * 1000) / 10;
  const result: 'PASS' | 'FAIL' = percentage >= PASSING_PERCENTAGE ? 'PASS' : 'FAIL';

  batch.update(attemptRef, {
    status: 'submitted',
    submittedAt: now,
    lastActivityAt: now,
    score,
    percentage,
    result,
  });

  const summaryRef = db.collection('user_summaries').doc(uid);
  const summarySnap = await summaryRef.get();
  const summary = summarySnap.data() || {};
  const isBest = summary.bestPercentage == null || percentage > summary.bestPercentage;
  batch.set(
    summaryRef,
    {
      latestScore: score,
      latestPercentage: percentage,
      bestScore: isBest ? score : summary.bestScore ?? score,
      bestPercentage: isBest ? percentage : summary.bestPercentage ?? percentage,
      passed: Boolean(summary.passed) || result === 'PASS',
      completed: Boolean(summary.passed) || result === 'PASS' || (summary.attemptsUsed || 0) >= MAX_ATTEMPTS,
      lastSubmissionAt: now,
    },
    { merge: true }
  );

  const assessmentRef = db.collection('assessments').doc(attempt.assessmentId);
  const moduleUpdate: Record<string, admin.firestore.FieldValue> = {};
  for (const [mod, tally] of moduleTally.entries()) {
    moduleUpdate[`moduleStats.${mod}.correct`] = admin.firestore.FieldValue.increment(tally.correct);
    moduleUpdate[`moduleStats.${mod}.total`] = admin.firestore.FieldValue.increment(tally.total);
  }
  batch.set(assessmentRef, { moduleStats: {} }, { merge: true });

  batch.set(db.collection('activity_logs').doc(), {
    timestamp: now,
    userId: uid,
    userEmail: attempt.userEmail,
    userName: attempt.userName,
    batch: attempt.batch,
    eventType: 'QUIZ_SUBMIT',
    details: `${score}/${TOTAL_QUESTIONS} - ${result}`,
    attemptId,
  });

  await batch.commit();
  if (Object.keys(moduleUpdate).length) {
    await assessmentRef.update(moduleUpdate);
  }

  return { score, percentage, result };
});

// ---------------------------------------------------------------------------
// Admin-only functions
// ---------------------------------------------------------------------------
async function requireAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  requireAuth(request.auth);
  const ok = await isCallerAdmin(request.auth as { uid: string; token?: Record<string, unknown> });
  if (!ok) throw new HttpsError('permission-denied', 'Admin access required.');
  return request.auth;
}

export const resetAttempts = onCall(async (request) => {
  const auth = await requireAdmin(request);
  const { targetUid } = request.data as { targetUid: string };
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required.');

  const attemptsSnap = await db.collection('attempts').where('userId', '==', targetUid).get();
  const batch = db.batch();
  attemptsSnap.forEach((doc) => batch.delete(doc.ref));

  const summaryRef = db.collection('user_summaries').doc(targetUid);
  batch.set(
    summaryRef,
    {
      attemptsUsed: 0,
      attemptsRemaining: MAX_ATTEMPTS,
      bestScore: null,
      bestPercentage: null,
      latestScore: null,
      latestPercentage: null,
      passed: false,
      completed: false,
    },
    { merge: true }
  );

  const targetSnap = await summaryRef.get();
  batch.set(db.collection('activity_logs').doc(), {
    timestamp: admin.firestore.Timestamp.now(),
    userId: auth.uid,
    userEmail: auth.token.email || '',
    userName: auth.token.name || '',
    batch: null,
    eventType: 'ADMIN_RESET_ATTEMPTS',
    details: `Reset attempts for ${targetSnap.data()?.email || targetUid}`,
  });

  await batch.commit();
  return { ok: true };
});

export const setCandidateDisabled = onCall(async (request) => {
  const auth = await requireAdmin(request);
  const { targetUid, disabled } = request.data as { targetUid: string; disabled: boolean };
  if (!targetUid) throw new HttpsError('invalid-argument', 'targetUid is required.');

  await db.collection('user_summaries').doc(targetUid).set({ disabled: Boolean(disabled) }, { merge: true });
  const targetSnap = await db.collection('user_summaries').doc(targetUid).get();
  await db.collection('activity_logs').add({
    timestamp: admin.firestore.Timestamp.now(),
    userId: auth.uid,
    userEmail: auth.token.email || '',
    userName: auth.token.name || '',
    batch: null,
    eventType: disabled ? 'ADMIN_DISABLE_CANDIDATE' : 'ADMIN_ENABLE_CANDIDATE',
    details: `${targetSnap.data()?.email || targetUid}`,
  });

  return { ok: true };
});

// ---------------------------------------------------------------------------
// seedAssessment: one-time (idempotent) setup — run once from the Admin
// dashboard's Setup tab, or via `firebase functions:shell`. Populates the
// public `questions` collection and the server-only `answer_keys` collection
// from functions/src/data/questionBank.ts.
// ---------------------------------------------------------------------------
export const seedAssessment = onCall(async (request) => {
  await requireAdmin(request);
  const assessmentId = (request.data?.assessmentId as string) || DEFAULT_ASSESSMENT_ID;

  await db.collection('assessments').doc(assessmentId).set(
    {
      id: assessmentId,
      title: 'CAIWP MQA Assessment',
      status: 'active',
      totalQuestions: TOTAL_QUESTIONS,
      passingPercentage: PASSING_PERCENTAGE,
      createdAt: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  );

  const batch = db.batch();
  for (const q of QUESTION_BANK) {
    batch.set(db.collection('assessments').doc(assessmentId).collection('questions').doc(q.id), {
      id: q.id,
      order: q.order,
      module: q.module,
      moduleTitle: q.moduleTitle,
      text: q.text,
      options: q.options,
    });
    batch.set(db.collection('answer_keys').doc(assessmentId).collection('keys').doc(q.id), {
      correct: q.correct,
      rationale: q.rationale,
    });
  }
  await batch.commit();

  return { ok: true, assessmentId, totalQuestions: TOTAL_QUESTIONS };
});

// ---------------------------------------------------------------------------
// seedDemoTraffic: admin-only. Populates clearly-flagged (isDemo: true) fake
// candidates/attempts so the live monitor & analytics can be demonstrated
// against the REAL backend before go-live. Never mixed into KPI totals
// unless the admin explicitly toggles "include demo data" in the dashboard.
// ---------------------------------------------------------------------------
const FAKE_NAMES = ['Sarah Lim', 'Ahmad Ali', 'Mei Tan', 'John Lee', 'Priya Kumar', 'Wei Chen', 'Farah Yusof', 'David Ong'];
const BATCHES = ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'];

export const seedDemoTraffic = onCall(async (request) => {
  const auth = await requireAdmin(request);
  const count = Math.min(Math.max(Number(request.data?.count) || 10, 1), 50);
  const assessmentId = (request.data?.assessmentId as string) || DEFAULT_ASSESSMENT_ID;

  for (let i = 0; i < count; i++) {
    const uid = `demo-${Date.now()}-${i}`;
    const name = `${FAKE_NAMES[i % FAKE_NAMES.length]} (Demo)`;
    const email = `demo.candidate${i}@example-demo.com`;
    const batchName = BATCHES[i % BATCHES.length];
    const now = admin.firestore.Timestamp.now();

    await db.collection('users').doc(uid).set({
      uid, name, email, photoURL: null, batch: batchName, programme: 'CAIWP - Certified AI Workplace Practitioner',
      assessmentId, registeredAt: now, createdAt: now, lastLoginAt: now,
    });

    const outcome = i % 3;
    if (outcome === 0) {
      await db.collection('user_summaries').doc(uid).set({ ...blankSummary(uid, name, email, null), isDemo: true });
      continue;
    }

    const answered = outcome === 1 ? Math.floor(Math.random() * TOTAL_QUESTIONS) : TOTAL_QUESTIONS;
    const answers: Record<string, number> = {};
    for (let q = 0; q < answered; q++) answers[QUESTION_BANK[q].id] = Math.floor(Math.random() * 4);

    const attemptRef = db.collection('attempts').doc();
    if (outcome === 1) {
      await attemptRef.set({
        id: attemptRef.id, userId: uid, userEmail: email, userName: name, batch: batchName,
        programme: 'CAIWP - Certified AI Workplace Practitioner', assessmentId,
        attemptNumber: 1, status: 'in_progress', totalQuestions: TOTAL_QUESTIONS,
        currentQuestionIndex: answered, answeredCount: answered, flaggedQuestions: [],
        answers, startedAt: now, submittedAt: null, lastActivityAt: now,
        score: null, percentage: null, result: null, isDemo: true,
      });
      await db.collection('user_summaries').doc(uid).set({
        ...blankSummary(uid, name, email, null), isDemo: true, attemptsUsed: 1, attemptsRemaining: MAX_ATTEMPTS - 1, assessmentStartedAt: now,
      });
    } else {
      let score = 0;
      const moduleTally = new Map<number, { correct: number; total: number }>();
      for (const q of QUESTION_BANK) {
        const isCorrect = answers[q.id] === q.correct;
        if (isCorrect) score += 1;
        const tally = moduleTally.get(q.module) ?? { correct: 0, total: 0 };
        tally.total += 1;
        if (isCorrect) tally.correct += 1;
        moduleTally.set(q.module, tally);
      }
      const percentage = Math.round((score / TOTAL_QUESTIONS) * 1000) / 10;
      const result = percentage >= PASSING_PERCENTAGE ? 'PASS' : 'FAIL';
      const moduleUpdate: Record<string, admin.firestore.FieldValue> = {};
      for (const [mod, tally] of moduleTally.entries()) {
        moduleUpdate[`moduleStats.${mod}.correct`] = admin.firestore.FieldValue.increment(tally.correct);
        moduleUpdate[`moduleStats.${mod}.total`] = admin.firestore.FieldValue.increment(tally.total);
      }
      await db.collection('assessments').doc(assessmentId).set({ moduleStats: {} }, { merge: true });
      await db.collection('assessments').doc(assessmentId).update(moduleUpdate);
      await attemptRef.set({
        id: attemptRef.id, userId: uid, userEmail: email, userName: name, batch: batchName,
        programme: 'CAIWP - Certified AI Workplace Practitioner', assessmentId,
        attemptNumber: 1, status: 'submitted', totalQuestions: TOTAL_QUESTIONS,
        currentQuestionIndex: TOTAL_QUESTIONS - 1, answeredCount: TOTAL_QUESTIONS, flaggedQuestions: [],
        answers, startedAt: now, submittedAt: now, lastActivityAt: now,
        score, percentage, result, isDemo: true,
      });
      await db.collection('user_summaries').doc(uid).set({
        ...blankSummary(uid, name, email, null), isDemo: true, attemptsUsed: 1, attemptsRemaining: MAX_ATTEMPTS - 1,
        bestScore: score, bestPercentage: percentage, latestScore: score, latestPercentage: percentage,
        passed: result === 'PASS', completed: true, assessmentStartedAt: now, lastSubmissionAt: now,
      });
    }
  }

  await db.collection('activity_logs').add({
    timestamp: admin.firestore.Timestamp.now(),
    userId: auth.uid,
    userEmail: auth.token.email || '',
    userName: auth.token.name || '',
    batch: null,
    eventType: 'ADMIN_SEED',
    details: `Seeded ${count} simulated (isDemo) candidates`,
  });

  return { ok: true, count };
});
