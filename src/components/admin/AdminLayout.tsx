import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { backend } from '../../services';
import { DEMO_MODE } from '../../firebase';
import type { UserSummary, Attempt, ActivityLog, ModuleStat, CapstoneTeam, CapstoneScore, CoachSession } from '../../types';
import { COACH_TASKS } from '../../types';
import { CoachCheckIn } from './CoachCheckIn';
import { DEFAULT_ASSESSMENT_ID } from '../../types';
import { OverviewTab } from './OverviewTab';
import { LiveMonitorTab } from './LiveMonitorTab';
import { CandidatesTab } from './CandidatesTab';
import { AuditLogTab } from './AuditLogTab';
import { SetupTab } from './SetupTab';
import { GradingTab } from './GradingTab';
import { aggregateTeams, buildParticipantRows, openPrintable } from '../../utils/grading';
import { exportFinalResultsCsv, exportDatabaseSheet, buildResultsDocHtml } from '../../utils/gradingExports';
import { ConnectionStatus } from '../shared/ConnectionStatus';

type Tab = 'overview' | 'grading' | 'live' | 'candidates' | 'audit' | 'setup';

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
  const [teams, setTeams] = useState<CapstoneTeam[]>([]);
  const [capstoneScores, setCapstoneScores] = useState<CapstoneScore[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Coach check-in (name, task, cohort) — remembered for this browser tab only.
  const sessionKey = `caiwp.coachSession.${user?.uid ?? 'anon'}`;
  const [coach, setCoach] = useState<CoachSession | null>(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      return raw ? (JSON.parse(raw) as CoachSession) : null;
    } catch {
      return null;
    }
  });
  const [checkingIn, setCheckingIn] = useState(false);
  const [gradingView, setGradingView] = useState<'dashboard' | 'results' | 'score' | 'teams'>('dashboard');

  const applyCoach = (s: CoachSession) => {
    setCoach(s);
    setCheckingIn(false);
    setBatchFilter(s.cohort);
    if (s.task === 'theory') setTab('live');
    else {
      setTab('grading');
      setGradingView(s.task === 'capstone' ? 'score' : 'dashboard');
    }
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(s));
    } catch {
      /* storage unavailable: keep in memory only */
    }
  };

  // Restore the cohort filter from a remembered check-in.
  useEffect(() => {
    if (coach) {
      setBatchFilter(coach.cohort);
      if (coach.task !== 'theory') setTab('grading');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const bump = () => setLastSyncAt(Date.now());
    const u1 = backend.subscribeAllSummaries((s) => { setSummaries(s); bump(); });
    const u2 = backend.subscribeLiveAttempts((a) => { setLiveAttempts(a); bump(); });
    const u3 = backend.subscribeAuditLog((l) => { setAuditLog(l); bump(); });
    const u4 = backend.subscribeModuleStats(DEFAULT_ASSESSMENT_ID, (m) => { setModuleStats(m); bump(); });
    const u5 = backend.subscribeTeams((t) => { setTeams(t); bump(); });
    const u6 = backend.subscribeCapstoneScores((c) => { setCapstoneScores(c); bump(); });
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, [refreshKey]);

  // Refresh: tear down and re-open every real-time listener.
  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  };

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

  // Teams in the selected cohort: tagged with that batch, or untagged with a member in it (or no members yet).
  const visibleTeams = useMemo(() => {
    if (batchFilter === 'All') return teams;
    const inCohort = new Set(visibleSummaries.map((s) => s.uid));
    return teams.filter(
      (t) => t.batch === batchFilter || (!t.batch && (t.memberUids.length === 0 || t.memberUids.some((u) => inCohort.has(u))))
    );
  }, [teams, batchFilter, visibleSummaries]);
  const gradingAggregates = useMemo(() => aggregateTeams(visibleTeams, capstoneScores), [visibleTeams, capstoneScores]);
  const gradingRows = useMemo(() => buildParticipantRows(visibleSummaries, gradingAggregates), [visibleSummaries, gradingAggregates]);

  const batches = useMemo(() => {
    const set = new Set<string>();
    summaries.forEach((s) => s.batch && set.add(s.batch));
    if (batchFilter !== 'All') set.add(batchFilter);
    return ['All', ...Array.from(set).sort()];
  }, [summaries, batchFilter]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'grading', label: 'Grading' },
    { id: 'live', label: 'Live Monitor' },
    { id: 'candidates', label: 'Candidates' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'setup', label: 'Setup' },
  ];

  if (!coach || checkingIn) {
    return (
      <CoachCheckIn
        defaultName={user?.name ?? ''}
        email={user?.email ?? ''}
        knownCohorts={batches.filter((b) => b !== 'All')}
        initial={coach}
        onStart={applyCoach}
        onSignOut={() => signOutUser()}
        onCancel={coach ? () => setCheckingIn(false) : undefined}
      />
    );
  }

  const taskLabel = COACH_TASKS.find((t) => t.id === coach.task)?.label ?? coach.task;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Admin Portal <span className="text-2xl align-middle">🍓🍵</span></h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            CAIWP MQA Assessment &middot; Signed in as {user?.email}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="px-3 py-1.5 rounded-lg bg-trainito-teal/10 text-[11px] font-black text-slate-700 dark:text-slate-200">👤 {coach.coachName}</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">📋 {taskLabel}</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              🎓 {batchFilter === 'All' ? 'All cohorts' : batchFilter}
            </span>
            <button onClick={() => setCheckingIn(true)} className="text-[10px] font-black uppercase tracking-widest text-trainito-teal hover:underline">
              Change
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectionStatus lastSyncAt={lastSyncAt} />
          <button
            onClick={() => openPrintable(buildResultsDocHtml(gradingRows, gradingAggregates), 'Results Doc')}
            title="Printable results report — save as PDF from the print dialog"
            className="px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30"
          >
            📄 Results Doc
          </button>
          <button
            onClick={() => exportDatabaseSheet(gradingRows, gradingAggregates, capstoneScores)}
            title="Every mark from every judge, as a spreadsheet (opens in Excel / Google Sheets)"
            className="px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
          >
            📊 Database Sheet
          </button>
          <button
            onClick={() => exportFinalResultsCsv(gradingRows)}
            title="Student name, team, capstone, theory, total and result"
            className="px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-trainito-teal text-white"
          >
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <span className={refreshing ? 'inline-block animate-spin' : 'inline-block'}>↻</span> Refresh
          </button>
          <button
            onClick={() => signOutUser()}
            className="px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          >
            Exit Admin
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
      {tab === 'grading' && (
        <GradingTab
          summaries={visibleSummaries}
          teams={visibleTeams}
          scores={capstoneScores}
          aggregates={gradingAggregates}
          rows={gradingRows}
          coachName={coach.coachName}
          cohort={batchFilter}
          view={gradingView}
          onViewChange={setGradingView}
        />
      )}
      {tab === 'live' && <LiveMonitorTab attempts={visibleAttempts} />}
      {tab === 'candidates' && <CandidatesTab summaries={visibleSummaries} />}
      {tab === 'audit' && <AuditLogTab logs={visibleAudit} />}
      {tab === 'setup' && <SetupTab />}
    </div>
  );
};
