import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { backend } from '../../services';
import { DEMO_MODE } from '../../firebase';
import type { UserSummary, Attempt, ActivityLog, ModuleStat } from '../../types';
import { DEFAULT_ASSESSMENT_ID } from '../../types';
import { OverviewTab } from './OverviewTab';
import { LiveMonitorTab } from './LiveMonitorTab';
import { CandidatesTab } from './CandidatesTab';
import { AuditLogTab } from './AuditLogTab';
import { SetupTab } from './SetupTab';
import { ConnectionStatus } from '../shared/ConnectionStatus';

type Tab = 'overview' | 'live' | 'candidates' | 'audit' | 'setup';

export const AdminLayout: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [summaries, setSummaries] = useState<UserSummary[]>([]);
  const [liveAttempts, setLiveAttempts] = useState<Attempt[]>([]);
  const [auditLog, setAuditLog] = useState<ActivityLog[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleStat[]>([]);
  const [showDemo, setShowDemo] = useState(DEMO_MODE);
  const [batchFilter, setBatchFilter] = useState<string>('All');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    const bump = () => setLastSyncAt(Date.now());
    const u1 = backend.subscribeAllSummaries((s) => { setSummaries(s); bump(); });
    const u2 = backend.subscribeLiveAttempts((a) => { setLiveAttempts(a); bump(); });
    const u3 = backend.subscribeAuditLog((l) => { setAuditLog(l); bump(); });
    const u4 = backend.subscribeModuleStats(DEFAULT_ASSESSMENT_ID, (m) => { setModuleStats(m); bump(); });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const visibleSummaries = useMemo(
    () => summaries.filter((s) => (showDemo || !s.isDemo) && (batchFilter === 'All' || s.batch === batchFilter)),
    [summaries, showDemo, batchFilter]
  );
  const visibleAttempts = useMemo(
    () => liveAttempts.filter((a) => (showDemo || !a.isDemo) && (batchFilter === 'All' || a.batch === batchFilter)),
    [liveAttempts, showDemo, batchFilter]
  );
  const visibleAudit = useMemo(
    () => auditLog.filter((l) => batchFilter === 'All' || l.batch === batchFilter),
    [auditLog, batchFilter]
  );

  const batches = useMemo(() => {
    const set = new Set<string>();
    summaries.forEach((s) => s.batch && set.add(s.batch));
    return ['All', ...Array.from(set).sort()];
  }, [summaries]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'live', label: 'Live Monitor' },
    { id: 'candidates', label: 'Candidates' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'setup', label: 'Setup' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Admin Control Centre</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            CAIWP MQA Assessment &middot; Signed in as {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus lastSyncAt={lastSyncAt} />
          <button
            onClick={() => signOutUser()}
            className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-full">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${
                tab === t.id ? 'bg-white dark:bg-slate-700 text-trainito-teal shadow-sm' : 'text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-xs font-bold outline-none"
          >
            {batches.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'All Batches' : b}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} />
            Include Demo Data
          </label>
        </div>
      </div>

      {tab === 'overview' && <OverviewTab summaries={visibleSummaries} moduleStats={moduleStats} />}
      {tab === 'live' && <LiveMonitorTab attempts={visibleAttempts} />}
      {tab === 'candidates' && <CandidatesTab summaries={visibleSummaries} />}
      {tab === 'audit' && <AuditLogTab logs={visibleAudit} />}
      {tab === 'setup' && <SetupTab />}
    </div>
  );
};
