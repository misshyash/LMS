import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { UserSummary, ModuleStat } from '../../types';

interface Props {
  summaries: UserSummary[];
  moduleStats: ModuleStat[];
}

const KPI: React.FC<{ label: string; value: React.ReactNode; accent: string }> = ({ label, value, accent }) => (
  <div className={`glass rounded-3xl p-6 border-b-4 ${accent} shadow-sm`}>
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
  </div>
);

const PIE_COLORS = ['#10b981', '#f04434'];

export const OverviewTab: React.FC<Props> = ({ summaries, moduleStats }) => {
  const stats = useMemo(() => {
    const total = summaries.length;
    const active = summaries.filter((s) => s.assessmentStartedAt && !s.completed).length;
    const completed = summaries.filter((s) => s.latestScore !== null).length;
    const passed = summaries.filter((s) => s.passed).length;
    const failed = completed - passed;
    const totalAttempts = summaries.reduce((sum, s) => sum + s.attemptsUsed, 0);
    const avgScore =
      completed > 0
        ? Math.round((summaries.filter((s) => s.latestPercentage !== null).reduce((sum, s) => sum + (s.latestPercentage || 0), 0) / completed) * 10) / 10
        : 0;
    const passRate = completed > 0 ? Math.round((passed / completed) * 1000) / 10 : 0;
    return { total, active, completed, passed, failed, totalAttempts, avgScore, passRate };
  }, [summaries]);

  const pieData = [
    { name: 'Passed', value: stats.passed },
    { name: 'Failed', value: stats.failed },
  ];

  const moduleChartData = moduleStats.map((m) => ({
    name: `M${m.module}`,
    fullName: m.moduleTitle,
    percentage: m.total > 0 ? Math.round((m.correct / m.total) * 1000) / 10 : 0,
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <KPI label="Total Candidates" value={stats.total} accent="border-trainito-teal" />
        <KPI label="Taking Assessment Now" value={stats.active} accent="border-emerald-500" />
        <KPI label="Total Attempts" value={stats.totalAttempts} accent="border-amber-500" />
        <KPI label="Completed" value={stats.completed} accent="border-sky-500" />
        <KPI label="Passed" value={stats.passed} accent="border-emerald-500" />
        <KPI label="Failed" value={stats.failed} accent="border-rose-500" />
        <KPI label="Average Score" value={`${stats.avgScore}%`} accent="border-trainito-coral" />
        <KPI label="Pass Rate" value={`${stats.passRate}%`} accent="border-slate-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-[2.5rem] p-8 shadow-lg">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Pass / Fail Distribution</h3>
          {stats.completed === 0 ? (
            <p className="text-xs text-slate-400 font-bold text-center py-10">No submissions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-[2.5rem] p-8 shadow-lg">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Module Performance</h3>
          {moduleChartData.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold text-center py-10">No graded attempts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={moduleChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={(l, p) => p?.[0]?.payload?.fullName ?? l} />
                <Bar dataKey="percentage" fill="#66c2bd" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
