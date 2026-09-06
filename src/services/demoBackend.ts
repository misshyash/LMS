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
import { TOTAL_QUESTIONS, MAX_ATTEMPTS, PASSING_PERCENTAGE, BATCHES } from '../types';
import { DEMO_QUESTIONS } from '../data/demoQuestionBank';
import { ReactiveStore } from './reactiveStore';
import type {
  Backend,
  AuthUser,
  Unsubscribe,
  StartAttemptInput,
  StartAttemptResult,
  SubmitAttemptResult,
  ProgressPatch,
} from './backend';

// ---------------------------------------------------------------------------
// Demo Mode backend: a fully in-memory simulation of the real Firebase
// backend. It exists so the whole product (candidate journey + live admin
// monitoring) can be clicked through without a configured Firebase project.
// It is CLEARLY LABELLED in the UI as demo data (see DemoModeBanner) and
// never touches localStorage/sessionStorage or persists beyond the tab.
// ---------------------------------------------------------------------------

let uidCounter = 0;
const nextUid = () => `demo-uid-${++uidCounter}`;

const FAKE_NAMES = [
  'Sarah Lim', 'Ahmad Ali', 'Mei Tan', 'John Lee', 'Priya Kumar',
  'Wei Chen', 'Farah Yusof', 'David Ong', 'Nurul Huda', 'Kevin Wong',
  'Aisyah Rahman', 'Marcus Tan', 'Sofia Abdullah', 'Ryan Lim', 'Grace Koh',
];

function moduleTitleFor(mod: number): string {
  return DEMO_QUESTIONS.find((q) => q.module === mod)?.moduleTitle ?? `Module ${mod}`;
}

class DemoBackend implements Backend {
  readonly demoMode = true;

  private currentUser: AuthUser | null = null;
  private authListeners = new Set<(u: AuthUser | null) => void>();

  private profiles = new ReactiveStore<UserProfile>();
  private summaries = new ReactiveStore<UserSummary>();
  private attempts = new ReactiveStore<Attempt>();
  private auditLog: ActivityLog[] = [];
  private auditListeners = new Set<() => void>();
  private moduleStats = new ReactiveStore<ModuleStat>();
  private simTimer: ReturnType<typeof setInterval> | null = null;

  // --- auth -----------------------------------------------------------
  subscribeAuthUser(cb: (user: AuthUser | null) => void): Unsubscribe {
    this.authListeners.add(cb);
    cb(this.currentUser);
    return () => this.authListeners.delete(cb);
  }

  private setUser(u: AuthUser | null) {
    this.currentUser = u;
    this.authListeners.forEach((l) => l(u));
  }

  async signInWithGoogle(): Promise<void> {
    // Demo Mode has no real OAuth; use demoSignIn() from the UI instead.
    await this.demoSignIn('candidate');
  }

  async demoSignIn(role: 'candidate' | 'admin', name?: string): Promise<void> {
    const uid = nextUid();
    const displayName = name || (role === 'admin' ? 'Demo Admin' : FAKE_NAMES[uidCounter % FAKE_NAMES.length]);
    const user: AuthUser = {
      uid,
      name: displayName,
      email: `${displayName.toLowerCase().replace(/\s+/g, '.')}@demo.trainitoacademy.com`,
      photoURL: null,
      isAdmin: role === 'admin',
    };
    this.setUser(user);

    if (role === 'candidate') {
      const now = Date.now();
      this.profiles.set(uid, {
        uid,
        name: user.name,
        email: user.email,
        photoURL: null,
        batch: null,
        programme: null,
        assessmentId: null,
        registeredAt: now,
        createdAt: now,
        lastLoginAt: now,
      });
      this.summaries.set(uid, this.blankSummary(uid, user));
      this.log(user, 'LOGIN', 'Signed in via Demo Mode (Google Sign-In simulated)');
    } else {
      this.log(user, 'ADMIN_LOGIN', 'Admin signed in via Demo Mode');
    }
  }

  async signOutUser(): Promise<void> {
    if (this.currentUser) this.log(this.currentUser, 'LOGOUT', 'Signed out');
    this.setUser(null);
  }

  private blankSummary(uid: string, user: AuthUser): UserSummary {
    const now = Date.now();
    return {
      uid,
      name: user.name,
      email: user.email,
      photoURL: user.photoURL,
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
      firstLoginAt: now,
      lastLoginAt: now,
      assessmentStartedAt: null,
      lastSubmissionAt: null,
    };
  }

  // --- profile ----------------------------------------------------------
  subscribeProfile(uid: string, cb: (p: UserProfile | null) => void): Unsubscribe {
    const push = () => cb(this.profiles.get(uid) ?? null);
    push();
    return this.profiles.subscribe(push);
  }

  async saveProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const existing = this.profiles.get(uid);
    if (existing) {
      this.profiles.update(uid, data);
    }
    const summary = this.summaries.get(uid);
    if (summary && data.batch) {
      this.summaries.update(uid, { batch: data.batch });
    }
    if (this.currentUser) {
      this.log(this.currentUser, 'PROFILE_SETUP', `Batch: ${data.batch ?? '-'}, Programme: ${data.programme ?? '-'}`);
    }
  }

  // --- summaries ----------------------------------------------------------
  subscribeSummary(uid: string, cb: (s: UserSummary | null) => void): Unsubscribe {
    const push = () => cb(this.summaries.get(uid) ?? null);
    push();
    return this.summaries.subscribe(push);
  }

  subscribeAllSummaries(cb: (list: UserSummary[]) => void): Unsubscribe {
    const push = () => cb(this.summaries.all());
    push();
    return this.summaries.subscribe(push);
  }

  // --- questions ----------------------------------------------------------
  async fetchQuestions(_assessmentId: string): Promise<QuestionPublic[]> {
    return DEMO_QUESTIONS.map((q) => ({
      id: q.id,
      order: q.order,
      module: q.module,
      moduleTitle: q.moduleTitle,
      text: q.text,
      options: q.options,
    }));
  }

  // --- attempts ----------------------------------------------------------
  subscribeAttempt(attemptId: string, cb: (a: Attempt | null) => void): Unsubscribe {
    const push = () => cb(this.attempts.get(attemptId) ?? null);
    push();
    return this.attempts.subscribe(push);
  }

  subscribeLiveAttempts(cb: (list: Attempt[]) => void): Unsubscribe {
    const push = () => {
      const cutoff = Date.now() - 5 * 60_000;
      cb(
        this.attempts
          .all()
          .filter((a) => a.status === 'in_progress' || (a.status === 'submitted' && (a.submittedAt ?? 0) > cutoff))
          .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      );
    };
    push();
    return this.attempts.subscribe(push);
  }

  subscribeUserAttempts(uid: string, cb: (list: Attempt[]) => void): Unsubscribe {
    const push = () => cb(this.attempts.all().filter((a) => a.userId === uid).sort((a, b) => a.attemptNumber - b.attemptNumber));
    push();
    return this.attempts.subscribe(push);
  }

  async startAttempt(input: StartAttemptInput): Promise<StartAttemptResult> {
    const user = this.currentUser;
    if (!user) throw new Error('Not signed in');
    const summary = this.summaries.get(user.uid);
    if (!summary) throw new Error('Profile not found');
    if (summary.disabled) throw new Error('Your account has been disabled by an administrator.');
    if (summary.passed) throw new Error('Assessment Completed');
    if (summary.attemptsUsed >= MAX_ATTEMPTS) throw new Error('Maximum Attempts Reached');

    const attemptId = `demo-attempt-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const now = Date.now();
    const attempt: Attempt = {
      id: attemptId,
      userId: user.uid,
      userEmail: user.email,
      userName: user.name,
      batch: input.batch,
      programme: input.programme,
      assessmentId: input.assessmentId,
      attemptNumber: summary.attemptsUsed + 1,
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
      isDemo: true,
    };
    this.attempts.set(attemptId, attempt);
    this.summaries.update(user.uid, {
      attemptsUsed: summary.attemptsUsed + 1,
      attemptsRemaining: MAX_ATTEMPTS - (summary.attemptsUsed + 1),
      assessmentStartedAt: summary.assessmentStartedAt ?? now,
    });
    this.log(user, 'QUIZ_START', `Attempt ${attempt.attemptNumber}`, attemptId);
    return { attemptId };
  }

  async saveProgress(attemptId: string, patch: ProgressPatch): Promise<void> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt || attempt.status !== 'in_progress') return;
    this.attempts.update(attemptId, { ...patch, lastActivityAt: Date.now() });
  }

  async submitAttempt(attemptId: string): Promise<SubmitAttemptResult> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) throw new Error('Attempt not found');
    let score = 0;
    const moduleTally = new Map<number, { correct: number; total: number }>();
    for (const q of DEMO_QUESTIONS) {
      const selected = attempt.answers[q.id];
      const isCorrect = selected === q.correct;
      if (isCorrect) score += 1;
      const tally = moduleTally.get(q.module) ?? { correct: 0, total: 0 };
      tally.total += 1;
      if (isCorrect) tally.correct += 1;
      moduleTally.set(q.module, tally);
    }
    const percentage = Math.round((score / TOTAL_QUESTIONS) * 1000) / 10;
    const result: 'PASS' | 'FAIL' = percentage >= PASSING_PERCENTAGE ? 'PASS' : 'FAIL';
    const now = Date.now();
    this.attempts.update(attemptId, {
      status: 'submitted',
      submittedAt: now,
      lastActivityAt: now,
      score,
      percentage,
      result,
    });

    this.recordModuleStats(moduleTally);

    const summary = this.summaries.get(attempt.userId);
    if (summary) {
      const isBest = summary.bestPercentage === null || percentage > summary.bestPercentage;
      this.summaries.update(attempt.userId, {
        latestScore: score,
        latestPercentage: percentage,
        bestScore: isBest ? score : summary.bestScore,
        bestPercentage: isBest ? percentage : summary.bestPercentage,
        passed: summary.passed || result === 'PASS',
        completed: summary.passed || result === 'PASS' || summary.attemptsUsed >= MAX_ATTEMPTS,
        lastSubmissionAt: now,
      });
    }

    const user = this.currentUser;
    if (user) this.log(user, 'QUIZ_SUBMIT', `${score}/${TOTAL_QUESTIONS} - ${result}`, attemptId);
    return { score, percentage, result };
  }

  private recordModuleStats(moduleTally: Map<number, { correct: number; total: number }>) {
    for (const [mod, tally] of moduleTally.entries()) {
      const key = `demo|${mod}`;
      const existing = this.moduleStats.get(key);
      if (existing) {
        this.moduleStats.update(key, { correct: existing.correct + tally.correct, total: existing.total + tally.total });
      } else {
        this.moduleStats.set(key, { module: mod, moduleTitle: moduleTitleFor(mod), correct: tally.correct, total: tally.total });
      }
    }
  }

  async fetchReview(attemptId: string): Promise<QuestionReview[]> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) return [];
    return DEMO_QUESTIONS.map((q) => {
      const selected = attempt.answers[q.id] ?? null;
      return {
        qid: q.id,
        order: q.order,
        module: q.module,
        moduleTitle: q.moduleTitle,
        text: q.text,
        options: q.options,
        selected,
        correct: q.correct,
        isCorrect: selected === q.correct,
        rationale: q.rationale,
      };
    });
  }

  // --- audit log ----------------------------------------------------------
  private log(user: AuthUser, eventType: EventType, details: string, attemptId?: string) {
    const entry: ActivityLog = {
      id: `log-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      timestamp: Date.now(),
      userId: user.uid,
      userEmail: user.email,
      userName: user.name,
      batch: this.profiles.get(user.uid)?.batch ?? this.summaries.get(user.uid)?.batch ?? null,
      eventType,
      details,
      device: navigator.userAgent,
      attemptId,
    };
    this.auditLog = [entry, ...this.auditLog].slice(0, 300);
    this.auditListeners.forEach((l) => l());
  }

  subscribeAuditLog(cb: (list: ActivityLog[]) => void): Unsubscribe {
    const push = () => cb(this.auditLog);
    push();
    this.auditListeners.add(push);
    return () => this.auditListeners.delete(push);
  }

  async logClientEvent(evt: { eventType: EventType; details: string; attemptId?: string }): Promise<void> {
    if (!this.currentUser) return;
    this.log(this.currentUser, evt.eventType, evt.details, evt.attemptId);
  }

  // --- module stats ----------------------------------------------------------
  subscribeModuleStats(_assessmentId: string, cb: (list: ModuleStat[]) => void): Unsubscribe {
    const push = () => cb(this.moduleStats.all().sort((a, b) => a.module - b.module));
    push();
    return this.moduleStats.subscribe(push);
  }

  // --- admin actions ----------------------------------------------------------
  async resetAttempts(targetUid: string): Promise<void> {
    this.attempts.all().filter((a) => a.userId === targetUid).forEach((a) => this.attempts.delete(a.id));
    const summary = this.summaries.get(targetUid);
    if (summary) {
      this.summaries.update(targetUid, {
        attemptsUsed: 0,
        attemptsRemaining: MAX_ATTEMPTS,
        bestScore: null,
        bestPercentage: null,
        latestScore: null,
        latestPercentage: null,
        passed: false,
        completed: false,
      });
    }
    if (this.currentUser) {
      this.log(this.currentUser, 'ADMIN_RESET_ATTEMPTS', `Reset attempts for ${summary?.email ?? targetUid}`);
    }
  }

  async setCandidateDisabled(targetUid: string, disabled: boolean): Promise<void> {
    this.summaries.update(targetUid, { disabled });
    if (this.currentUser) {
      const summary = this.summaries.get(targetUid);
      this.log(
        this.currentUser,
        disabled ? 'ADMIN_DISABLE_CANDIDATE' : 'ADMIN_ENABLE_CANDIDATE',
        `${summary?.email ?? targetUid}`
      );
    }
  }

  async seedDemoTraffic(count: number): Promise<void> {
    if (this.currentUser) this.log(this.currentUser, 'ADMIN_SEED', `Seeded ${count} simulated candidates`);

    for (let i = 0; i < count; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const uid = nextUid();
      const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)] + ` ${uidCounter}`;
      const email = `${name.toLowerCase().replace(/\s+/g, '.')}@demo.trainitoacademy.com`;
      const batch = BATCHES[Math.floor(Math.random() * BATCHES.length)];
      const now = Date.now();
      const user: AuthUser = { uid, name, email, photoURL: null, isAdmin: false };

      this.profiles.set(uid, {
        uid, name, email, photoURL: null, batch, programme: 'CAIWP - Certified AI Workplace Practitioner',
        assessmentId: 'caiwp-mqa-v1', registeredAt: now, createdAt: now, lastLoginAt: now,
      });
      this.summaries.set(uid, { ...this.blankSummary(uid, user), batch });

      const outcome = Math.random();
      if (outcome < 0.3) {
        // not started yet
        continue;
      } else if (outcome < 0.6) {
        // currently taking the assessment
        const answered = Math.floor(Math.random() * TOTAL_QUESTIONS);
        const answers: Record<string, number> = {};
        for (let q = 0; q < answered; q++) answers[DEMO_QUESTIONS[q].id] = Math.floor(Math.random() * 4);
        const attemptId = `demo-attempt-seed-${uid}`;
        this.attempts.set(attemptId, {
          id: attemptId, userId: uid, userEmail: email, userName: name, batch,
          programme: 'CAIWP - Certified AI Workplace Practitioner', assessmentId: 'caiwp-mqa-v1',
          attemptNumber: 1, status: 'in_progress', totalQuestions: TOTAL_QUESTIONS,
          currentQuestionIndex: answered, answeredCount: answered, flaggedQuestions: [],
          answers, startedAt: now - 1000 * 60 * Math.random() * 20, submittedAt: null,
          lastActivityAt: now - Math.random() * 20_000, score: null, percentage: null, result: null, isDemo: true,
        });
        this.summaries.update(uid, { attemptsUsed: 1, attemptsRemaining: MAX_ATTEMPTS - 1, assessmentStartedAt: now });
      } else {
        // already submitted
        const attemptId = `demo-attempt-seed-${uid}`;
        const targetAccuracy = 0.4 + Math.random() * 0.55; // spread outcomes across pass/fail
        const answers: Record<string, number> = {};
        const moduleTally = new Map<number, { correct: number; total: number }>();
        let score = 0;
        DEMO_QUESTIONS.forEach((q) => {
          const isCorrect = Math.random() < targetAccuracy;
          answers[q.id] = isCorrect ? q.correct : (q.correct + 1) % 4;
          if (isCorrect) score += 1;
          const tally = moduleTally.get(q.module) ?? { correct: 0, total: 0 };
          tally.total += 1;
          if (isCorrect) tally.correct += 1;
          moduleTally.set(q.module, tally);
        });
        const percentage = Math.round((score / TOTAL_QUESTIONS) * 1000) / 10;
        const result: 'PASS' | 'FAIL' = percentage >= PASSING_PERCENTAGE ? 'PASS' : 'FAIL';
        this.recordModuleStats(moduleTally);
        this.attempts.set(attemptId, {
          id: attemptId, userId: uid, userEmail: email, userName: name, batch,
          programme: 'CAIWP - Certified AI Workplace Practitioner', assessmentId: 'caiwp-mqa-v1',
          attemptNumber: 1, status: 'submitted', totalQuestions: TOTAL_QUESTIONS,
          currentQuestionIndex: TOTAL_QUESTIONS - 1, answeredCount: TOTAL_QUESTIONS, flaggedQuestions: [],
          answers, startedAt: now - 1000 * 60 * 30, submittedAt: now - Math.random() * 60_000,
          lastActivityAt: now - Math.random() * 60_000, score, percentage, result, isDemo: true,
        });
        this.summaries.update(uid, {
          attemptsUsed: 1, attemptsRemaining: MAX_ATTEMPTS - 1, bestScore: score, bestPercentage: percentage,
          latestScore: score, latestPercentage: percentage, passed: result === 'PASS', completed: true,
          assessmentStartedAt: now, lastSubmissionAt: now,
        });
      }
    }

    this.startLiveSimulation();
  }

  private startLiveSimulation() {
    if (this.simTimer) return;
    this.simTimer = setInterval(() => {
      const inProgress = this.attempts.all().filter((a) => a.status === 'in_progress');
      if (inProgress.length === 0) return;
      const pick = inProgress[Math.floor(Math.random() * inProgress.length)];
      if (pick.answeredCount < pick.totalQuestions) {
        const nextIdx = pick.answeredCount;
        const qid = DEMO_QUESTIONS[nextIdx]?.id;
        const answers = { ...pick.answers };
        if (qid) answers[qid] = Math.floor(Math.random() * 4);
        this.attempts.update(pick.id, {
          answers,
          answeredCount: pick.answeredCount + 1,
          currentQuestionIndex: Math.min(pick.currentQuestionIndex + 1, TOTAL_QUESTIONS - 1),
          lastActivityAt: Date.now(),
        });
      }
    }, 3500);
  }
}

export const demoBackend = new DemoBackend();
