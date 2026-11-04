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

// ---------------------------------------------------------------------------
// Group capstone grading (CAIWP Day 5 Marking Scheme)
// ---------------------------------------------------------------------------

export interface CapstoneTeam {
  id: string;
  name: string; // e.g. "Group 1"
  project: string; // project title, e.g. "Langkawi – Luxury + Fun Combo"
  batch: string | null;
  memberUids: string[];
  /** Submission links (deck/PDF, video, prototype, feedback form, other). */
  links: CapstoneLinks;
  /** Original proposed budget (RM) — used for the 20% budget-cut challenge. */
  originalBudget: number | null;
  /** When true, members can see their capstone and combined result. */
  published: boolean;
  /** Averaged raw capstone score captured at publish time (out of 100). */
  publishedRaw: number | null;
  publishedAt: number | null;
  createdAt: number | null;
}

export interface CapstoneLinks {
  deck: string; // slide deck or PDF (Google Drive / OneDrive / Canva share link)
  video: string;
  prototype: string;
  feedback: string;
  other: string;
}

export const EMPTY_LINKS: CapstoneLinks = { deck: '', video: '', prototype: '', feedback: '', other: '' };

/** One judge's score sheet for one team. Doc id = `${teamId}__${judgeUid}`. */
export interface CapstoneScore {
  id: string;
  teamId: string;
  judgeUid: string;
  judgeName: string;
  /** rubric sub-item id -> awarded marks (0..max in 0.5 steps). */
  items: Record<string, number>;
  demoChecks: Record<string, boolean>;
  submissionChecks: Record<string, boolean>;
  pitchElements: Record<string, boolean>;
  videoDuration: string;
  feedbackResponses: number | null;
  presentationTime: string;
  challenge: string;
  teamResponse: string;
  strongestEvidence: string;
  priorityImprovement: string;
  nextStep: string;
  strength: string;
  improvement: string;
  updatedAt: number | null;
}

// ---------------------------------------------------------------------------
// Coach check-in (admin portal)
// ---------------------------------------------------------------------------

export type CoachTask = 'capstone' | 'theory' | 'final';

export const COACH_TASKS: { id: CoachTask; label: string; description: string }[] = [
  {
    id: 'capstone',
    label: 'Group Capstone – Win the Board: Island Takeover Pitch',
    description: 'Score team pitches on the 100-mark rubric',
  },
  {
    id: 'theory',
    label: 'Theory Examination – 30 questions',
    description: 'Monitor the live exam and individual theory results',
  },
  {
    id: 'final',
    label: 'Final Results – Capstone 60 + Theory 40',
    description: 'Review combined totals, publish and export results',
  },
];

export interface CoachSession {
  coachName: string;
  task: CoachTask;
  /** Batch name, or 'All' for every cohort. */
  cohort: string;
  startedAt: number;
}
