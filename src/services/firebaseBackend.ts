import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  getIdTokenResult,
  type User,
} from 'firebase/auth';
import {
  doc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  addDoc,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions, googleProvider } from '../firebase';
import type {
  Attempt,
  UserProfile,
  UserSummary,
  QuestionPublic,
  QuestionReview,
  ActivityLog,
  ModuleStat,
  EventType,
} from '../types';
import type {
  Backend,
  AuthUser,
  Unsubscribe,
  StartAttemptInput,
  StartAttemptResult,
  SubmitAttemptResult,
  ProgressPatch,
} from './backend';

function toMillis(v: unknown): number | null {
  if (v == null) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return null;
}

function must<T>(v: T | null | undefined, fallback: T): T {
  return v === null || v === undefined ? fallback : v;
}

function toUserProfile(snap: QueryDocumentSnapshot<DocumentData>): UserProfile {
  const d = snap.data();
  return {
    uid: snap.id,
    name: d.name ?? '',
    email: d.email ?? '',
    photoURL: d.photoURL ?? null,
    batch: d.batch ?? null,
    programme: d.programme ?? null,
    assessmentId: d.assessmentId ?? null,
    registeredAt: toMillis(d.registeredAt),
    createdAt: toMillis(d.createdAt),
    lastLoginAt: toMillis(d.lastLoginAt),
  };
}

function toUserSummary(snap: QueryDocumentSnapshot<DocumentData>): UserSummary {
  const d = snap.data();
  return {
    uid: snap.id,
    name: d.name ?? '',
    email: d.email ?? '',
    photoURL: d.photoURL ?? null,
    batch: d.batch ?? null,
    attemptsUsed: must(d.attemptsUsed, 0),
    attemptsRemaining: must(d.attemptsRemaining, 3),
    bestScore: must(d.bestScore, null),
    bestPercentage: must(d.bestPercentage, null),
    latestScore: must(d.latestScore, null),
    latestPercentage: must(d.latestPercentage, null),
    passed: Boolean(d.passed),
    completed: Boolean(d.completed),
    disabled: Boolean(d.disabled),
    isDemo: Boolean(d.isDemo),
    firstLoginAt: toMillis(d.firstLoginAt),
    lastLoginAt: toMillis(d.lastLoginAt),
    assessmentStartedAt: toMillis(d.assessmentStartedAt),
    lastSubmissionAt: toMillis(d.lastSubmissionAt),
  };
}

function toAttempt(snap: QueryDocumentSnapshot<DocumentData>): Attempt {
  const d = snap.data();
  return {
    id: snap.id,
    userId: d.userId,
    userEmail: d.userEmail,
    userName: d.userName,
    batch: d.batch,
    programme: d.programme,
    assessmentId: d.assessmentId,
    attemptNumber: d.attemptNumber,
    status: d.status,
    totalQuestions: d.totalQuestions,
    currentQuestionIndex: d.currentQuestionIndex ?? 0,
    answeredCount: d.answeredCount ?? 0,
    flaggedQuestions: d.flaggedQuestions ?? [],
    answers: d.answers ?? {},
    startedAt: toMillis(d.startedAt) ?? 0,
    submittedAt: toMillis(d.submittedAt),
    lastActivityAt: toMillis(d.lastActivityAt) ?? 0,
    score: must(d.score, null),
    percentage: must(d.percentage, null),
    result: must(d.result, null),
    isDemo: Boolean(d.isDemo),
  };
}

function toActivityLog(snap: QueryDocumentSnapshot<DocumentData>): ActivityLog {
  const d = snap.data();
  return {
    id: snap.id,
    timestamp: toMillis(d.timestamp) ?? 0,
    userId: d.userId,
    userEmail: d.userEmail,
    userName: d.userName,
    batch: d.batch ?? null,
    eventType: d.eventType,
    details: d.details,
    device: d.device,
    attemptId: d.attemptId,
  };
}

class FirebaseBackend implements Backend {
  readonly demoMode = false;

  private call = functions;

  subscribeAuthUser(cb: (user: AuthUser | null) => void): Unsubscribe {
    return onAuthStateChanged(auth!, async (user: User | null) => {
      if (!user) {
        cb(null);
        return;
      }
      try {
        const tokenResult = await getIdTokenResult(user, true);
        cb({
          uid: user.uid,
          name: user.displayName || user.email || 'User',
          email: user.email || '',
          photoURL: user.photoURL,
          isAdmin: tokenResult.claims.admin === true,
        });
      } catch {
        cb({
          uid: user.uid,
          name: user.displayName || user.email || 'User',
          email: user.email || '',
          photoURL: user.photoURL,
          isAdmin: false,
        });
      }
    });
  }

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(auth!, googleProvider);
    await httpsCallable(this.call!, 'syncRole')();
    await auth!.currentUser?.getIdToken(true);
  }

  async signOutUser(): Promise<void> {
    await signOut(auth!);
  }

  async demoSignIn(): Promise<void> {
    throw new Error('demoSignIn is only available in Demo Mode.');
  }

  subscribeProfile(uid: string, cb: (p: UserProfile | null) => void): Unsubscribe {
    return onSnapshot(doc(db!, 'users', uid), (snap) => {
      cb(snap.exists() ? toUserProfile(snap as QueryDocumentSnapshot<DocumentData>) : null);
    });
  }

  async saveProfile(_uid: string, data: Partial<UserProfile>): Promise<void> {
    await httpsCallable(this.call!, 'updateProfile')({
      batch: data.batch,
      programme: data.programme,
      assessmentId: data.assessmentId,
    });
  }

  subscribeSummary(uid: string, cb: (s: UserSummary | null) => void): Unsubscribe {
    return onSnapshot(doc(db!, 'user_summaries', uid), (snap) => {
      cb(snap.exists() ? toUserSummary(snap as QueryDocumentSnapshot<DocumentData>) : null);
    });
  }

  subscribeAllSummaries(cb: (list: UserSummary[]) => void): Unsubscribe {
    return onSnapshot(collection(db!, 'user_summaries'), (snap) => {
      cb(snap.docs.map(toUserSummary));
    });
  }

  async fetchQuestions(assessmentId: string): Promise<QuestionPublic[]> {
    const q = query(collection(db!, 'assessments', assessmentId, 'questions'), orderBy('order'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        order: data.order,
        module: data.module,
        moduleTitle: data.moduleTitle,
        text: data.text,
        options: data.options,
      };
    });
  }

  subscribeAttempt(attemptId: string, cb: (a: Attempt | null) => void): Unsubscribe {
    return onSnapshot(doc(db!, 'attempts', attemptId), (snap) => {
      cb(snap.exists() ? toAttempt(snap as QueryDocumentSnapshot<DocumentData>) : null);
    });
  }

  subscribeLiveAttempts(cb: (list: Attempt[]) => void): Unsubscribe {
    const q = query(
      collection(db!, 'attempts'),
      where('status', 'in', ['in_progress', 'submitted']),
      orderBy('lastActivityAt', 'desc'),
      limit(200)
    );
    return onSnapshot(q, (snap) => {
      const cutoff = Date.now() - 5 * 60_000;
      cb(
        snap.docs
          .map(toAttempt)
          .filter((a) => a.status === 'in_progress' || (a.status === 'submitted' && (a.submittedAt ?? 0) > cutoff))
      );
    });
  }

  subscribeUserAttempts(uid: string, cb: (list: Attempt[]) => void): Unsubscribe {
    const q = query(collection(db!, 'attempts'), where('userId', '==', uid), orderBy('attemptNumber'));
    return onSnapshot(q, (snap) => cb(snap.docs.map(toAttempt)));
  }

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult> {
    const res = await httpsCallable(this.call!, 'startAttempt')(input);
    return res.data as StartAttemptResult;
  }

  async saveProgress(attemptId: string, patch: ProgressPatch): Promise<void> {
    await updateDoc(doc(db!, 'attempts', attemptId), { ...patch, lastActivityAt: Timestamp.now() });
  }

  async submitAttempt(attemptId: string): Promise<SubmitAttemptResult> {
    const res = await httpsCallable(this.call!, 'submitAttempt')({ attemptId });
    return res.data as SubmitAttemptResult;
  }

  async fetchReview(attemptId: string): Promise<QuestionReview[]> {
    const snap = await getDocs(query(collection(db!, 'attempts', attemptId, 'review'), orderBy('order')));
    return snap.docs.map((d) => d.data() as QuestionReview);
  }

  subscribeAuditLog(cb: (list: ActivityLog[]) => void): Unsubscribe {
    const q = query(collection(db!, 'activity_logs'), orderBy('timestamp', 'desc'), limit(300));
    return onSnapshot(q, (snap) => cb(snap.docs.map(toActivityLog)));
  }

  async logClientEvent(evt: { eventType: EventType; details: string; attemptId?: string }): Promise<void> {
    const user = auth!.currentUser;
    if (!user) return;
    await addDoc(collection(db!, 'activity_logs'), {
      timestamp: Timestamp.now(),
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      batch: null,
      eventType: evt.eventType,
      details: evt.details,
      device: navigator.userAgent,
      attemptId: evt.attemptId ?? null,
    });
  }

  subscribeModuleStats(assessmentId: string, cb: (list: ModuleStat[]) => void): Unsubscribe {
    return onSnapshot(doc(db!, 'assessments', assessmentId), (snap) => {
      const data = snap.data();
      const stats = (data?.moduleStats ?? {}) as Record<string, { correct: number; total: number }>;
      const titles: Record<string, string> = {
        '1': 'AI Foundations, Ethics & Responsible Use',
        '2': 'Prompt Engineering & Advanced Techniques',
        '3': 'AI for Communication, Research & Knowledge',
        '4': 'Data, Visuals & Workflow Automation',
      };
      cb(
        Object.entries(stats)
          .map(([mod, v]) => ({ module: Number(mod), moduleTitle: titles[mod] ?? `Module ${mod}`, correct: v.correct ?? 0, total: v.total ?? 0 }))
          .sort((a, b) => a.module - b.module)
      );
    });
  }

  async resetAttempts(targetUid: string): Promise<void> {
    await httpsCallable(this.call!, 'resetAttempts')({ targetUid });
  }

  async setCandidateDisabled(targetUid: string, disabled: boolean): Promise<void> {
    await httpsCallable(this.call!, 'setCandidateDisabled')({ targetUid, disabled });
  }

  async seedDemoTraffic(count: number): Promise<void> {
    await httpsCallable(this.call!, 'seedDemoTraffic')({ count });
  }
}

export const firebaseBackend = new FirebaseBackend();
