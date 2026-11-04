import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import type { CapstoneScore, CapstoneTeam, UserSummary } from '../../types';
import type { ParticipantRow, TeamAggregate } from '../../utils/grading';
import { ResultsPanel } from './grading/ResultsPanel';
import { ScoreSheetPanel } from './grading/ScoreSheetPanel';
import { TeamsPanel } from './grading/TeamsPanel';
import { DashboardPanel } from './grading/DashboardPanel';
import { AiGraderLauncher } from '../shared/AiGraderGuide';

export type GradingView = 'dashboard' | 'results' | 'score' | 'teams';

interface Props {
  summaries: UserSummary[];
  teams: CapstoneTeam[];
  scores: CapstoneScore[];
  aggregates: TeamAggregate[];
  rows: ParticipantRow[];
  /** Name entered at coach check-in; used as the assessor on score sheets. */
  coachName: string;
  cohort: string;
  view: GradingView;
  onViewChange: (v: GradingView) => void;
}

/**
 * Group Capstone + Theory Examination grading, implementing the
 * CAIWP Day 5 Marking Scheme:
 *   Final = capstone raw × 0.60 + theory correct ÷ 30 × 40, pass at 75.
 */
export const GradingTab: React.FC<Props> = ({ summaries, teams, scores, aggregates, rows, coachName, cohort, view, onViewChange: setView }) => {
  const { user } = useAuth();
  const judge = user ? { ...user, name: coachName || user.name } : null;
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId && teams.length) setTeamId(teams[0].id);
    if (teamId && !teams.some((t) => t.id === teamId)) setTeamId(teams[0]?.id ?? null);
  }, [teams, teamId]);

  const openScoreSheet = (id: string) => {
    setTeamId(id);
    setView('score');
  };

  const views: { id: GradingView; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'results', label: 'Final Results' },
    { id: 'score', label: 'Score Sheet' },
    { id: 'teams', label: 'Teams & Submissions' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                view === v.id ? 'bg-white dark:bg-slate-700 text-trainito-teal shadow-sm' : 'text-slate-400'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capstone 60 + Theory 40 = 100 · Pass ≥ 75</p>
          <AiGraderLauncher
            label="🤖 AI Grader Briefing / Video"
            participants={rows.map((r) => ({ name: r.name, team: r.team?.name, project: r.team?.project, batch: r.batch }))}
            className="px-4 py-2 rounded-xl bg-trainito-teal text-white font-black text-[9px] uppercase tracking-widest" />
        </div>
      </div>

      {view === 'dashboard' && (
        <DashboardPanel rows={rows} aggregates={aggregates} scores={scores} onOpenScoreSheet={openScoreSheet} onOpenResults={() => setView('results')} />
      )}
      {view === 'results' && <ResultsPanel rows={rows} aggregates={aggregates} scores={scores} onOpenScoreSheet={openScoreSheet} />}
      {view === 'score' && judge && (
        <ScoreSheetPanel judge={judge} aggregates={aggregates} scores={scores} teamId={teamId} onSelectTeam={setTeamId} />
      )}
      {view === 'teams' && <TeamsPanel summaries={summaries} aggregates={aggregates} onOpenScoreSheet={openScoreSheet} defaultBatch={cohort === 'All' ? null : cohort} />}
    </div>
  );
};
