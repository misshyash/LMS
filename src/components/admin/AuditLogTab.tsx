import React, { useMemo, useState } from 'react';
import type { ActivityLog, EventType } from '../../types';
import { formatDate } from '../../utils/time';
import { toCsv, downloadCsv } from '../../utils/csv';

interface Props {
  logs: ActivityLog[];
}

const EVENT_TYPES: (EventType | 'All')[] = [
  'All', 'LOGIN', 'LOGOUT', 'PROFILE_SETUP', 'QUIZ_START', 'ANSWER', 'QUESTION_CHANGED',
  'QUESTION_FLAGGED', 'QUIZ_SUBMIT', 'ADMIN_LOGIN', 'ADMIN_RESET_ATTEMPTS',
  'ADMIN_DISABLE_CANDIDATE', 'ADMIN_ENABLE_CANDIDATE', 'ADMIN_SEED',
];

export const AuditLogTab: React.FC<Props> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<EventType | 'All'>('All');

  const filtered = useMemo(
    () =>
      logs.filter(
        (l) =>
          (eventFilter === 'All' || l.eventType === eventFilter) &&
          (l.userName.toLowerCase().includes(search.toLowerCase()) || l.userEmail.toLowerCase().includes(search.toLowerCase()))
      ),
    [logs, search, eventFilter]
  );

  const handleExport = () => {
    const csv = toCsv(
      filtered.map((l) => ({
        timestamp: formatDate(l.timestamp),
        user: l.userName,
        email: l.userEmail,
        batch: l.batch ?? '',
        event: l.eventType,
        details: l.details,
      })),
      [
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'user', label: 'User' },
        { key: 'email', label: 'Email' },
        { key: 'batch', label: 'Batch' },
        { key: 'event', label: 'Event' },
        { key: 'details', label: 'Details' },
      ]
    );
    downloadCsv(`caiwp-audit-log-${Date.now()}.csv`, csv);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-[220px] px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-xs font-bold outline-none"
          />
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as EventType | 'All')}
            className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-xs font-bold outline-none"
          >
            {EVENT_TYPES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExport}
          className="px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest"
        >
          Export CSV
        </button>
      </div>

      <div className="glass rounded-[2.5rem] p-6 shadow-lg max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 font-bold text-center py-16">No activity recorded yet.</p>
        ) : (
          <div className="space-y-1 font-mono text-[11px]">
            {filtered.map((l) => (
              <div key={l.id} className="flex flex-wrap gap-2 py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400">{formatDate(l.timestamp)}</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{l.userName}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400">{l.batch ?? '-'}</span>
                <span className="text-slate-300">|</span>
                <span className="font-black text-trainito-teal">{l.eventType}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{l.details}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
