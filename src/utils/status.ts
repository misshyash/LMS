import type { Attempt } from '../types';

export type LiveStatus = 'active' | 'idle' | 'ready_to_submit' | 'submitted' | 'disconnected' | 'not_started';

export const LIVE_STATUS_META: Record<LiveStatus, { label: string; icon: string; color: string }> = {
  active: { label: 'Taking Assessment', icon: '🟢', color: 'text-emerald-500' },
  ready_to_submit: { label: 'Ready to Submit', icon: '🟡', color: 'text-amber-500' },
  idle: { label: 'Idle', icon: '🟡', color: 'text-amber-500' },
  submitted: { label: 'Submitted', icon: '🔵', color: 'text-sky-500' },
  disconnected: { label: 'Disconnected', icon: '🔴', color: 'text-rose-500' },
  not_started: { label: 'Not Started', icon: '⚪', color: 'text-slate-400' },
};

const IDLE_AFTER_MS = 60_000; // no activity for 60s -> idle
const DISCONNECTED_AFTER_MS = 5 * 60_000; // no activity for 5min -> disconnected

export function computeLiveStatus(attempt: Attempt | null | undefined, now: number = Date.now()): LiveStatus {
  if (!attempt) return 'not_started';
  if (attempt.status === 'submitted') return 'submitted';
  if (attempt.status === 'abandoned') return 'disconnected';

  const sinceActivity = now - attempt.lastActivityAt;
  if (attempt.answeredCount >= attempt.totalQuestions) return 'ready_to_submit';
  if (sinceActivity > DISCONNECTED_AFTER_MS) return 'disconnected';
  if (sinceActivity > IDLE_AFTER_MS) return 'idle';
  return 'active';
}
