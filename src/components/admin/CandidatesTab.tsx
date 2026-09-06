import React, { useMemo, useState } from 'react';
import type { UserSummary } from '../../types';
import { TOTAL_QUESTIONS } from '../../types';
import { formatDate } from '../../utils/time';
import { toCsv, downloadCsv } from '../../utils/csv';
import { CandidateDetailModal } from './CandidateDetailModal';

interface Props {
  summaries: UserSummary[];
}

type SortKey = 'name' | 'bestPercentage' | 'lastLoginAt' | 'lastSubmissionAt';

export const CandidatesTab: React.FC<Props> = ({ summaries }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Passed' | 'Failed' | 'In Progress' | 'Not Started'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('lastLoginAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const statusOf = (s: UserSummary) => {
    if (s.passed) return 'Passed';
    if (s.latestScore !== null) return 'Failed';
    if (s.assessmentStartedAt) return 'In Progress';
    return 'Not Started';
  };

  const filtered = useMemo(() => {
    let list = summaries.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== 'All') list = list.filter((s) => statusOf(s) === statusFilter);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'bestPercentage') cmp = (a.bestPercentage ?? -1) - (b.bestPercentage ?? -1);
      else if (sortKey === 'lastLoginAt') cmp = (a.lastLoginAt ?? 0) - (b.lastLoginAt ?? 0);
      else if (sortKey === 'lastSubmissionAt') cmp = (a.lastSubmissionAt ?? 0) - (b.lastSubmissionAt ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [summaries, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleExport = () => {
    const csv = toCsv(
      filtered.map((s) => ({
        name: s.name,
        email: s.email,
        batch: s.batch ?? '',
        attemptsUsed: s.attemptsUsed,
        bestScore: s.bestScore ?? '',
        latestScore: s.latestScore ?? '',
        bestPercentage: s.bestPercentage ?? '',
        status: statusOf(s),
        firstLogin: formatDate(s.firstLoginAt),
        lastLogin: formatDate(s.lastLoginAt),
        assessmentStarted: formatDate(s.assessmentStartedAt),
        lastSubmission: formatDate(s.lastSubmissionAt),
      })),
      [
        { key: 'name', label: 'Candidate' },
        { key: 'email', label: 'Email' },
        { key: 'batch', label: 'Batch' },
        { key: 'attemptsUsed', label: 'Attempts' },
        { key: 'bestScore', label: 'Best Score' },
        { key: 'latestScore', label: 'Latest Score' },
        { key: 'bestPercentage', label: 'Best Percentage' },
        { key: 'status', label: 'Status' },
        { key: 'firstLogin', label: 'First Login' },
        { key: 'lastLogin', label: 'Last Login' },
        { key: 'assessmentStarted', label: 'Assessment Started' },
        { key: 'lastSubmission', label: 'Last Submission' },
      ]
    );
    downloadCsv(`caiwp-candidates-${Date.now()}.csv`, csv);
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-xs font-bold outline-none"
          >
            {['All', 'Passed', 'Failed', 'In Progress', 'Not Started'].map((s) => (
              <option key={s} value={s}>
                {s}
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

      <div className="glass rounded-[2.5rem] p-0 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="px-6 py-3 cursor-pointer" onClick={() => toggleSort('name')}>Candidate</th>
                <th className="px-6 py-3">Batch</th>
                <th className="px-6 py-3">Attempts</th>
                <th className="px-6 py-3 cursor-pointer" onClick={() => toggleSort('bestPercentage')}>Best Score</th>
                <th className="px-6 py-3">Latest Score</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 cursor-pointer" onClick={() => toggleSort('lastLoginAt')}>Last Login</th>
                <th className="px-6 py-3 cursor-pointer" onClick={() => toggleSort('lastSubmissionAt')}>Last Submission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((s) => (
                <tr
                  key={s.uid}
                  onClick={() => setSelectedUid(s.uid)}
                  className="text-xs font-bold dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-all"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {s.photoURL ? (
                        <img src={s.photoURL} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-trainito-teal text-white flex items-center justify-center text-[10px] font-black">
                          {s.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div>{s.name} {s.isDemo && <span className="text-amber-500 text-[9px]">(Demo)</span>}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{s.batch ?? '--'}</td>
                  <td className="px-6 py-4 tabular-nums">{s.attemptsUsed}/3</td>
                  <td className="px-6 py-4 tabular-nums text-trainito-teal">
                    {s.bestScore !== null ? `${s.bestScore}/${TOTAL_QUESTIONS} (${s.bestPercentage}%)` : '--'}
                  </td>
                  <td className="px-6 py-4 tabular-nums">{s.latestScore !== null ? `${s.latestScore}/${TOTAL_QUESTIONS}` : '--'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        statusOf(s) === 'Passed'
                          ? 'bg-emerald-50 text-emerald-600'
                          : statusOf(s) === 'Failed'
                          ? 'bg-rose-50 text-rose-600'
                          : statusOf(s) === 'In Progress'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {s.disabled ? 'Disabled' : statusOf(s)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] text-slate-400">{formatDate(s.lastLoginAt)}</td>
                  <td className="px-6 py-4 text-[10px] text-slate-400">{formatDate(s.lastSubmissionAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-xs text-slate-400 font-bold text-center py-16">No candidates match your filters.</p>}
        </div>
      </div>

      {selectedUid && <CandidateDetailModal uid={selectedUid} onClose={() => setSelectedUid(null)} />}
    </div>
  );
};
