import type {
  Attempt,
  UserProfile,
  UserSummary,
  QuestionPublic,
  QuestionReview,
  ActivityLog,
  ModuleStat,
} from '../types';

export type Unsubscribe = () => void;

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  isAdmin: boolean;
}

export interface StartAttemptInput {
  assessmentId: string;
  batch: string;
  programme: string;
}

export interface StartAttemptResult {
  attemptId: string;
}

export interface SubmitAttemptResult {
  score: number;
  percentage: number;
  result: 'PASS' | 'FAIL';
}

export interface ProgressPatch {
  currentQuestionIndex?: number;
  answeredCount?: number;
  flaggedQuestions?: number[];
  answers?: Record<string, number>;
}

/**
 * Backend abstraction implemented by both the real Firebase-backed service
 * and the in-memory Demo Mode service, so every UI component is written
 * once against a single contract.
 */
export interface Backend {
  readonly demoMode: boolean;

  subscribeAuthUser(cb: (user: AuthUser | null) => void): Unsubscribe;
  signInWithGoogle(): Promise<void>;
  signOutUser(): Promise<void>;
  demoSignIn(role: 'candidate' | 'admin', name?: string): Promise<void>;

  subscribeProfile(uid: string, cb: (p: UserProfile | null) => void): Unsubscribe;
  saveProfile(uid: string, data: Partial<UserProfile>): Promise<void>;

  subscribeSummary(uid: string, cb: (s: UserSummary | null) => void): Unsubscribe;
  subscribeAllSummaries(cb: (list: UserSummary[]) => void): Unsubscribe;

  fetchQuestions(assessmentId: string): Promise<QuestionPublic[]>;

  subscribeAttempt(attemptId: string, cb: (a: Attempt | null) => void): Unsubscribe;
  subscribeLiveAttempts(cb: (list: Attempt[]) => void): Unsubscribe;
  subscribeUserAttempts(uid: string, cb: (list: Attempt[]) => void): Unsubscribe;

  startAttempt(input: StartAttemptInput): Promise<StartAttemptResult>;
  saveProgress(attemptId: string, patch: ProgressPatch): Promise<void>;
  submitAttempt(attemptId: string): Promise<SubmitAttemptResult>;
  fetchReview(attemptId: string): Promise<QuestionReview[]>;

  subscribeAuditLog(cb: (list: ActivityLog[]) => void): Unsubscribe;
  logClientEvent(evt: {
    eventType: ActivityLog['eventType'];
    details: string;
    attemptId?: string;
  }): Promise<void>;

  subscribeModuleStats(assessmentId: string, cb: (list: ModuleStat[]) => void): Unsubscribe;

  resetAttempts(targetUid: string): Promise<void>;
  setCandidateDisabled(targetUid: string, disabled: boolean): Promise<void>;
  seedDemoTraffic(count: number): Promise<void>;
}
