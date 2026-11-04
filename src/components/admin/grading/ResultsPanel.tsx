import React, { useMemo, useState } from 'react';
import type { CapstoneScore } from '../../../types';
import type { ParticipantRow, TeamAggregate } from '../../../utils/grading';
import { fmt2, fmtCombined, buildResultSheetHtml, openPrintable, type ResultSheetData } from '../../../utils/grading';
import { exportFinalResultsCsv } from '../../../utils/gradingExports';
import { COMBINED_PASS_MARK } from '../../../data/capstoneRubric';
import { Card, Kpi, ResultBadge, LinkChips, btnPrimary, btnGhost, inputCls, inputBase } from './ui';

interface Props {
  rows: ParticipantRow[];
  aggregates: TeamAggregate[];
  scores: CapstoneScore[];
  onOpenScoreSheet: (teamId: string) => void;
}

type Filter = 'All' | 'PASS' | 'FAIL' | 'Pending' | 'No team';

export const ResultsPanel: React.FC<Props> = ({ rows, aggregates, onOpenScoreSheet }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [teamFilter, setTeamFilter] = useState('All');

  const stats = useMemo(() => {
    const graded = rows.filter((r) => r.final.combined !== null);
    const passed = graded.filter((r) => r.final.result === 'PASS').length;
    const avg = graded.length ? graded.reduce((s, r) => s + (r.final.combined ?? 0), 0) / graded.length : null;
    const top = graded.length ? Math.max(...graded.map((r) => r.final.combined ?? 0)) : null;
    return { total: rows.length, graded: graded.length, passed, failed: graded.length - passed, avg, top };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.team?.name ?? '').toLowerCase().includes(q))
      .filter((r) => teamFilter === 'All' || r.team?.id === teamFilter)
      .filter((r) => {
        if (filter === 'All') return true;
        if (filter === 'No team') return !r.team;
        if (filter === 'Pending') return r.final.result === null;
        return r.final.result === filter;
      })
      .sort((a, b) => (b.final.combined ?? -1) - (a.final.combined ?? -1) || a.name.localeCompare(b.name));
  }, [rows, search, filter, teamFilter]);

  const sheetData = (r: ParticipantRow): ResultSheetData => {
    const judges = r.teamAgg?.judges ?? [];
    return {
      name: r.name,
      email: r.email,
      team: r.team?.name ?? '',
      project: r.team?.project ?? '',
      final: r.final,
      judges: judges.length,
      strength: judges.map((j) => j.strength).filter(Boolean).join(' / '),
      improvement: judges.map((j) => j.improvement).filter(Boolean).join(' / '),
    };
  };

  const exportCsv = () => exportFinalResultsCsv(filtered);

  const scoredTeams = aggregates.filter((a) => a.avgRaw !== null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Participants" value={stats.total} accent="border-trainito-teal" />
        <Kpi label="Fully Graded" value={stats.graded} accent="border-sky-500" />
        <Kpi label="Passed" value={stats.passed} accent="border-emerald-500" />
        <Kpi label="Failed" value={stats.failed} accent="border-rose-500" />
        <Kpi label="Average Total" value={stats.avg === null ? '--' : fmt2(stats.avg)} accent="border-amber-500" />
        <Kpi label="Top Total" value={stats.top === null ? '--' : fmt2(stats.top)} accent="border-violet-500" />
      </div>

      {/* Team leaderboard */}
      <Card title="Capstone Team Ranking" right={<span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tie-break: C1 → C3 → C8</span>}>
        {aggregates.length === 0 ? (
          <p className="text-xs text-slate-400 font-bold text-center py-6">No teams yet — create them in the Teams panel.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {aggregates.map((a) => (
              <button
                key={a.team.id}
                onClick={() => onOpenScoreSheet(a.team.id)}
                className="text-left p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 hover:ring-2 hover:ring-trainito-teal/40 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {a.rank ? `#${a.rank}` : 'Not scored'} · {a.judges.length} judge{a.judges.length === 1 ? '' : 's'}
                  </span>
                  {a.team.published && <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Published</span>}
                </div>
                <div className="font-black text-slate-900 dark:text-white">{a.team.name}</div>
                <div className="text-[11px] text-slate-500 font-bold truncate">{a.team.project || '—'}</div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-black tabular-nums text-trainito-teal">{a.avgRaw === null ? '--' : fmt2(a.avgRaw)}</span>
                  <span className="text-xs font-bold text-slate-400 mb-1">/ 100 raw</span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 tabular-nums">
                  Contribution: {a.contribution === null ? '--' : fmt2(a.contribution)} / 60 · {a.team.memberUids.length} members
                </div>
              </button>
            ))}
          </div>
        )}
        {scoredTeams.length > 0 && scoredTeams.length < aggregates.length && (
          <p className="text-[10px] text-amber-600 font-bold mt-4">
            {aggregates.length - scoredTeams.length} team(s) still need a score sheet.
          </p>
        )}
      </Card>

      {/* Participant results */}
      <Card
        title="Final Participant Results"
        right={
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => openPrintable(buildResultSheetHtml(filtered.map(sheetData)))} disabled={filtered.length === 0}>
              Print All Result Sheets
            </button>
            <button className={btnPrimary} onClick={exportCsv} disabled={filtered.length === 0}>
              Export CSV
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3 mb-5">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or team…" className={`${inputCls} flex-1 min-w-[200px]`} />
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={`${inputBase} w-auto`}>
            <option value="All">All Teams</option>
            {aggregates.map((a) => (
              <option key={a.team.id} value={a.team.id}>
                {a.team.name}
              </option>
            ))}
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className={`${inputBase} w-auto`}>
            {(['All', 'PASS', 'FAIL', 'Pending', 'No team'] as Filter[]).map((f) => (
              <option key={f} value={f}>
                {f === 'All' ? 'All Results' : f}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto -mx-6 md:-mx-8">
          <table className="w-full text-left min-w-[860px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="px-6 py-3">Student</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-right">Capstone<br />/100 → /60</th>
                <th className="px-4 py-3 text-right">Theory<br />/30 → /40</th>
                <th className="px-4 py-3 text-right text-slate-600 dark:text-slate-200">Total<br />/100</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((r) => (
                <tr key={r.uid} className="text-xs font-bold dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-900 dark:text-white">{r.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{r.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    {r.team ? (
                      <div>
                        <div>{r.team.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">{r.team.project}</div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-500">Not in a team</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    {r.final.capstoneRaw === null ? (
                      <span className="text-slate-400">--</span>
                    ) : (
                      <>
                        <div>{fmt2(r.final.capstoneRaw)}</div>
                        <div className="text-[10px] text-slate-400">{fmt2(r.final.capstoneContribution)}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">
                    {r.final.theoryCorrect === null ? (
                      <span className="text-slate-400">--</span>
                    ) : (
                      <>
                        <div>{r.final.theoryCorrect}</div>
                        <div className="text-[10px] text-slate-400">{fmt2(r.final.theoryContribution)}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span
                      className={`text-xl font-black tabular-nums ${
                        r.final.result === 'PASS' ? 'text-emerald-600' : r.final.result === 'FAIL' ? 'text-rose-600' : 'text-slate-300'
                      }`}
                    >
                      {fmtCombined(r.final.combined)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <ResultBadge
                      result={r.final.result}
                      pendingLabel={!r.team ? 'No team' : r.final.capstoneRaw === null ? 'Await capstone' : 'Await theory'}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className={btnGhost} onClick={() => openPrintable(buildResultSheetHtml([sheetData(r)]))}>
                      Result Sheet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-xs text-slate-400 font-bold text-center py-12">No participants match your filters.</p>}
        </div>
        <p className="text-[10px] text-slate-400 font-bold mt-4">
          Total = capstone raw × 0.60 + theory correct ÷ 30 × 40. Pass at {COMBINED_PASS_MARK}/100 on the unrounded total. Theory uses each
          student's best submitted attempt; capstone uses the average of all judges' raw totals.
        </p>
      </Card>

      {aggregates.some((a) => Object.values(a.team.links ?? {}).some(Boolean)) && (
        <Card title="Team Submissions">
          <div className="space-y-3">
            {aggregates.map((a) => (
              <div key={a.team.id} className="flex flex-wrap items-center gap-3 justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="text-xs font-black dark:text-white min-w-[140px]">{a.team.name}</div>
                <div className="flex-1">
                  <LinkChips links={a.team.links as unknown as Record<string, string>} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
