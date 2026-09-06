// Shared client-side type definitions for the CAIWP MQA Assessment Dashboard.
// NOTE: correct answers / rationale are never part of these client types —
// they live only in the server-side (Cloud Functions) answer key.

export type Role = 'candidate' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  batch: string | null;
  programme: string | null;
  assessmentId: string | null;
  registeredAt: number | null;
  createdAt: number | null;
  lastLoginAt: number | null;
}

export interface UserSummary {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  batch: string | null;
  attemptsUsed: number;
  attemptsRemaining: number;
  bestScore: number | null;
  bestPercentage: number | null;
  latestScore: number | null;
  latestPercentage: number | null;
  passed: boolean;
  completed: boolean;
  disabled: boolean;
  isDemo?: boolean;
  firstLoginAt: number | null;
  lastLoginAt: number | null;
  assessmentStartedAt: number | null;
  lastSubmissionAt: number | null;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'abandoned';

export interface Attempt {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  batch: string;
  programme: string;
  assessmentId: string;
  attemptNumber: number;
  status: AttemptStatus;
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredCount: number;
  flaggedQuestions: number[];
  answers: Record<string, number>; // questionId -> selected option index
  startedAt: number;
  submittedAt: number | null;
  lastActivityAt: number;
  score: number | null;
  percentage: number | null;
  result: 'PASS' | 'FAIL' | null;
  isDemo?: boolean;
}

export interface QuestionPublic {
  id: string;
  order: number;
  module: number;
  moduleTitle: string;
  text: string;
  options: string[];
}

export interface QuestionReview {
  qid: string;
  order: number;
  module: number;
  moduleTitle: string;
  text: string;
  options: string[];
  selected: number | null;
  correct: number;
  isCorrect: boolean;
  rationale: string;
}

export type EventType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'PROFILE_SETUP'
  | 'QUIZ_START'
  | 'ANSWER'
  | 'QUESTION_CHANGED'
  | 'QUESTION_FLAGGED'
  | 'QUIZ_SUBMIT'
  | 'ATTEMPT_CREATED'
  | 'ADMIN_LOGIN'
  | 'ADMIN_RESET_ATTEMPTS'
  | 'ADMIN_DISABLE_CANDIDATE'
  | 'ADMIN_ENABLE_CANDIDATE'
  | 'ADMIN_SEED';

export interface ActivityLog {
  id: string;
  timestamp: number;
  userId: string;
  userEmail: string;
  userName: string;
  batch: string | null;
  eventType: EventType;
  details: string;
  device?: string;
  attemptId?: string;
}

export interface ModuleStat {
  module: number;
  moduleTitle: string;
  correct: number;
  total: number;
}

export const BATCHES = ['Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'] as const;
export const PROGRAMMES = ['CAIWP - Certified AI Workplace Practitioner'] as const;
export const DEFAULT_ASSESSMENT_ID = 'caiwp-mqa-v1';
export const TOTAL_QUESTIONS = 30;
export const PASSING_PERCENTAGE = 75;
export const MAX_ATTEMPTS = 3;
