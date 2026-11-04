import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import type { CapstoneScore } from '../../../types';
import type { ParticipantRow, TeamAggregate } from '../../../utils/grading';
import { fmt2, fmtCombined } from '../../../utils/grading';
import { CAPSTONE_RUBRIC, COMBINED_PASS_MARK } from '../../../data/capstoneRubric';
import { Card, Kpi, ResultBadge, btnGhost } from './ui';

interface Props {
  rows: ParticipantRow[];
  aggregates: TeamAggregate[];
  scores: CapstoneScore[];
  onOpenScoreSheet: (teamId: string) => void;
  onOpenResults: () => void;
}

/** Validated (light/dark) series colours + reserved status colours. */
function useChartTheme() {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);
  return dark
    ? { capstone: '#1fa394', theory: '#5b84e6', pass: '#34d399', fail: '#fb7185', grid: '#1e293b', axis: '#94a3b8', ink: '#e2e8f0', surface: '#0f172a', ref: '#f59e0b' }
    : { capstone: '#2a9d8f', theory: '#3b6fd6', pass: '#059669', fail: '#e11d48', grid: '#eef2f6', axis: '#64748b', ink: '#0f172a', surface: '#ffffff', ref: '#d97706' };
}

const tooltipStyle = (t: ReturnType<typeof useChartTheme>) => ({
  contentStyle: { background: t.surface, border: `1px solid ${t.grid}`, borderRadius: 12, fontSize: 12, fontWeight: 700, color: t.ink },
  labelStyle: { color: t.ink, fontWeight: 900 },
  itemStyle: { color: t.ink },
  cursor: { fill: t.grid, opacity: 0.6 },
});

const BIN = 10;

export const DashboardPanel: React.FC<Props> = ({ rows, aggregates, scores, onOpenScoreSheet, onOpenResults }) => {
  const t = useChartTheme();

  const graded = rows.filter((r) => r.final.combined !== null);
  const passed = graded.filter((r) => r.final.result === 'PASS');
  const avgTotal = graded.length ? graded.reduce((s, r) => s + (r.final.combined ?? 0), 0) / graded.length : null;
  const passRate = graded.length ? (passed.length / graded.length) * 100 : null;
  const scoredTeams = aggregates.filter((a) => a.avgRaw !== null);
  const awaitingCapstone = rows.filter((r) => r.team && r.final.capstoneRaw === null).length;
  const awaitingTheory = rows.filter((r) => r.final.theoryCorrect === null).length;
  const noTeam = rows.filter((r) => !r.team).length;
  // Borderline: within 5 marks of the pass line, either side.
  const borderline = graded.filter((r) => Math.abs((r.final.combined ?? 0) - COMBINED_PASS_MARK) < 5);

  // 1) Distribution of totals, bins of 10, coloured by pass/fail (bin 70–79 straddles 75 → split).
  const distribution = useMemo(() => {
    const bins = Array.from({ length: 100 / BIN }, (_, i) => ({ label: `${i * BIN}–${i * BIN + BIN - (i === 100 / BIN - 1 ? 0 : 1)}`, pass: 0, fail: 0 }));
    graded.forEach((r) => {
      const v = r.final.combined ?? 0;
      const i = Math.min(bins.length - 1, Math.floor(v / BIN));
      if (r.final.result === 'PASS') bins[i].pass++;
      else bins[i].fail++;
    });
    return bins;
  }, [graded]);

  // 2) Student totals stacked: capstone contribution + theory contribution.
  const studentBars = useMemo(
    () =>
      [...graded]
        .sort((a, b) => (b.final.combined ?? 0) - (a.final.combined ?? 0))
        .map((r) => ({
          name: r.name,
          capstone: Number(fmt2(r.final.capstoneContribution)),
          theory: Number(fmt2(r.final.theoryContribution)),
          total: fmtCombined(r.final.combined),
          result: r.final.result,
        })),
    [graded]
  );

  // 3) Team capstone averages (raw /100).
  const teamBars = scoredTeams.map((a) => ({ name: a.team.name, project: a.team.project, raw: Number(fmt2(a.avgRaw)), rank: a.rank, judges: a.judges.length }));

  // 4) Criterion performance: average % of max across scored teams (find weak areas).
  const criterionBars = useMemo(
    () =>
      CAPSTONE_RUBRIC.map((c) => {
        const vals = scoredTeams.map((a) => a.criterionAvg[c.id] ?? 0);
        const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        return { name: `C${c.id}`, title: c.title, pct: c.max ? Math.round((avg / c.max) * 1000) / 10 : 0, avg: fmt2(avg), max: c.max };
      }),
    [scoredTeams]
  );
  const weakest = scoredTeams.length ? [...criterionBars].sort((a, b) => a.pct - b.pct).slice(0, 3) : [];

  // 5) Judging progress.
  const judges = Array.from(new Set(scores.map((s) => s.judgeName || s.judgeUid)));

  const tt = tooltipStyle(t);

  return (
    <div className="space-y-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Kpi label="Students" value={rows.length} accent="border-trainito-teal" />
        <Kpi label="Fully graded" value={`${graded.length}/${rows.length}`} accent="border-sky-500" />
        <Kpi label="Passed" value={passed.length} accent="border-emerald-500" />
        <Kpi label="Pass rate" value={passRate === null ? '--' : `${passRate.toFixed(0)}%`} accent="border-emerald-500" />
        <Kpi label="Average total" value={avgTotal === null ? '--' : fmt2(avgTotal)} accent="border-amber-500" />
        <Kpi label="Teams scored" value={`${scoredTeams.length}/${aggregates.length}`} accent="border-violet-500" />
      </div>

      {/* Needs attention */}
      {(awaitingCapstone > 0 || awaitingTheory > 0 || noTeam > 0 || borderline.length > 0) && (
        <Card title="Needs attention">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Attention count={aggregates.length - scoredTeams.length} label="teams without a score sheet" tone="amber" />
            <Attention count={awaitingTheory} label="students haven't finished the theory exam" tone="amber" />
            <Attention count={noTeam} label="students not assigned to a team" tone="amber" />
            <Attention count={borderline.length} label={`borderline totals (${COMBINED_PASS_MARK - 5}–${COMBINED_PASS_MARK + 5})`} tone="sky" />
          </div>
          {borderline.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {borderline.map((r) => (
                <span key={r.uid} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {r.name} · <span className="tabular-nums">{fmtCombined(r.final.combined)}</span> · {r.final.result}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Student totals */}
        <Card
          title="Student totals"
          right={
            <button className={btnGhost} onClick={onOpenResults}>
              Full results →
            </button>
          }
          className="xl:col-span-2"
        >
          {studentBars.length === 0 ? (
            <Empty text="No complete results yet. Totals appear once a team is scored and its students have finished the theory exam." />
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(560, studentBars.length * 56), height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studentBars} margin={{ top: 24, right: 12, left: -12, bottom: 48 }} barCategoryGap={8}>
                    <CartesianGrid vertical={false} stroke={t.grid} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: t.axis }} interval={0} angle={-35} textAnchor="end" tickLine={false} axisLine={{ stroke: t.grid }} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} />
                    <Tooltip
                      {...tt}
                      formatter={(v: number, k: string) => [`${fmt2(v)} / ${k === 'capstone' ? 60 : 40}`, k === 'capstone' ? 'Capstone (×0.60)' : 'Theory (÷30×40)']}
                      labelFormatter={(l, p) => `${l} — total ${p?.[0]?.payload?.total} · ${p?.[0]?.payload?.result}`}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={28}
                      iconType="square"
                      formatter={(v) => <span style={{ color: t.axis, fontSize: 11, fontWeight: 700 }}>{v === 'capstone' ? 'Capstone /60' : 'Theory /40'}</span>}
                    />
                    <ReferenceLine y={COMBINED_PASS_MARK} stroke={t.ref} strokeDasharray="4 4" label={{ value: `Pass ${COMBINED_PASS_MARK}`, position: 'insideTopLeft', fill: t.ref, fontSize: 11, fontWeight: 800 }} />
                    <Bar isAnimationActive={false} maxBarSize={56} dataKey="capstone" stackId="t" fill={t.capstone} stroke={t.surface} strokeWidth={2} />
                    <Bar isAnimationActive={false} maxBarSize={56} dataKey="theory" stackId="t" fill={t.theory} stroke={t.surface} strokeWidth={2} radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 800, fill: t.ink }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>

        {/* Distribution */}
        <Card title="Score distribution">
          {graded.length === 0 ? (
            <Empty text="No complete results yet." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={distribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={4}>
                  <CartesianGrid vertical={false} stroke={t.grid} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700, fill: t.axis }} tickLine={false} axisLine={{ stroke: t.grid }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} />
                  <Tooltip {...tt} formatter={(v: number, k: string) => [`${v} student${v === 1 ? '' : 's'}`, k === 'pass' ? '✓ Pass' : '✗ Fail']} labelFormatter={(l) => `Total ${l}`} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={24}
                    iconType="square"
                    formatter={(v) => <span style={{ color: t.axis, fontSize: 11, fontWeight: 700 }}>{v === 'pass' ? '✓ Pass' : '✗ Fail'}</span>}
                  />
                  <Bar isAnimationActive={false} dataKey="fail" stackId="d" fill={t.fail} stroke={t.surface} strokeWidth={2} />
                  <Bar isAnimationActive={false} dataKey="pass" stackId="d" fill={t.pass} stroke={t.surface} strokeWidth={2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] font-bold text-slate-400 mt-2">Number of students per 10-mark band of the combined total. Pass at {COMBINED_PASS_MARK}.</p>
            </>
          )}
        </Card>

        {/* Team ranking */}
        <Card title="Capstone by team" right={<span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Raw /100 · tie-break C1→C3→C8</span>}>
          {teamBars.length === 0 ? (
            <Empty text="No team has been scored yet." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, teamBars.length * 52)}>
              <BarChart data={teamBars} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }} barCategoryGap={10}>
                <CartesianGrid horizontal={false} stroke={t.grid} />
                <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fontWeight: 800, fill: t.ink }} tickLine={false} axisLine={false} />
                <Tooltip {...tt} formatter={(v: number, _k, p: any) => [`${fmt2(v)} / 100 · ${p.payload.judges} judge(s)`, `#${p.payload.rank} ${p.payload.project}`]} />
                <Bar isAnimationActive={false} maxBarSize={32} dataKey="raw" fill={t.capstone} radius={[0, 4, 4, 0]} onClick={(d: any) => {
                  const a = scoredTeams.find((x) => x.team.name === d.name);
                  if (a) onOpenScoreSheet(a.team.id);
                }} style={{ cursor: 'pointer' }}>
                  <LabelList dataKey="raw" position="right" formatter={(v: number) => fmt2(v)} style={{ fontSize: 11, fontWeight: 800, fill: t.ink }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Criterion performance */}
        <Card title="Rubric performance" right={<span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Avg % of max, all scored teams</span>}>
          {scoredTeams.length === 0 ? (
            <Empty text="Appears once a team is scored." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={criterionBars} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barCategoryGap={6}>
                  <CartesianGrid vertical={false} stroke={t.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: t.axis }} tickLine={false} axisLine={{ stroke: t.grid }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: t.axis }} tickLine={false} axisLine={false} />
                  <Tooltip {...tt} formatter={(v: number, _k, p: any) => [`${v}% (avg ${p.payload.avg} / ${p.payload.max})`, p.payload.title]} labelFormatter={() => ''} />
                  <Bar isAnimationActive={false} dataKey="pct" radius={[4, 4, 0, 0]}>
                    {criterionBars.map((c) => (
                      <Cell key={c.name} fill={weakest.some((w) => w.name === c.name) ? t.ref : t.capstone} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] font-bold text-slate-500 mt-2">
                <span style={{ color: t.ref }}>■</span> Weakest areas: {weakest.map((w) => `${w.name} ${w.title} (${w.pct}%)`).join(' · ')}
              </p>
            </>
          )}
        </Card>

        {/* Judging progress */}
        <Card title="Judging progress">
          {aggregates.length === 0 ? (
            <Empty text="No teams yet. Create them under Teams & Submissions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[380px]">
                <thead>
                  <tr className="text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 pr-3">Team</th>
                    {judges.map((j) => (
                      <th key={j} className="py-2 px-2 text-center">{j}</th>
                    ))}
                    <th className="py-2 pl-2 text-right">Avg /100</th>
                    <th className="py-2 pl-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {aggregates.map((a) => (
                    <tr key={a.team.id} className="font-bold dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30" onClick={() => onOpenScoreSheet(a.team.id)}>
                      <td className="py-2.5 pr-3">{a.team.name}</td>
                      {judges.map((j) => {
                        const s = a.judges.find((x) => (x.judgeName || x.judgeUid) === j);
                        return (
                          <td key={j} className="py-2.5 px-2 text-center tabular-nums">
                            {s ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-2 text-right tabular-nums">{a.avgRaw === null ? '--' : fmt2(a.avgRaw)}</td>
                      <td className="py-2.5 pl-2 text-right">
                        {a.team.published ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">✓ Published</span>
                        ) : a.avgRaw !== null ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-sky-600">Scored</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">To score</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {judges.length === 0 && <p className="text-[11px] text-slate-400 font-bold mt-3">No score sheets saved yet.</p>}
            </div>
          )}
        </Card>

        {/* Top & at-risk */}
        <Card title="Top students & at risk">
          {graded.length === 0 ? (
            <Empty text="No complete results yet." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StudentList title="Top 5" list={[...graded].sort((a, b) => (b.final.combined ?? 0) - (a.final.combined ?? 0)).slice(0, 5)} />
              <StudentList title="Lowest 5" list={[...graded].sort((a, b) => (a.final.combined ?? 0) - (b.final.combined ?? 0)).slice(0, 5)} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const Attention: React.FC<{ count: number; label: string; tone: 'amber' | 'sky' }> = ({ count, label, tone }) => (
  <div className={`flex items-center gap-3 p-4 rounded-2xl ${count === 0 ? 'bg-slate-50 dark:bg-slate-800/30' : tone === 'amber' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-sky-50 dark:bg-sky-500/10'}`}>
    <span className={`text-2xl font-black tabular-nums ${count === 0 ? 'text-slate-300' : tone === 'amber' ? 'text-amber-600' : 'text-sky-600'}`}>{count}</span>
    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{count === 0 ? '✓ ' : '⚠ '}{label}</span>
  </div>
);

const StudentList: React.FC<{ title: string; list: ParticipantRow[] }> = ({ title, list }) => (
  <div>
    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</div>
    <ol className="space-y-1.5">
      {list.map((r) => (
        <li key={r.uid} className="flex items-center justify-between gap-2 text-xs font-bold dark:text-slate-200">
          <span className="truncate">
            {r.name} <span className="text-[10px] text-slate-400 font-normal">{r.team?.name}</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="tabular-nums">{fmtCombined(r.final.combined)}</span>
            <ResultBadge result={r.final.result} />
          </span>
        </li>
      ))}
    </ol>
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => <p className="text-xs text-slate-400 font-bold text-center py-12">{text}</p>;
