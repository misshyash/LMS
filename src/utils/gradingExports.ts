// Admin-portal exports for capstone + theory grading:
//   • Results Doc     — printable/PDF-able results report for the whole cohort
//   • Database Sheet  — one wide spreadsheet (CSV) with every mark recorded
//   • Export CSV      — final participant results

import type { CapstoneScore } from '../types';
import { CAPSTONE_RUBRIC, ALL_RUBRIC_ITEMS, COMBINED_PASS_MARK, isFreeMark } from '../data/capstoneRubric';
import { toCsv, downloadCsv } from './csv';
import {
  fmt2,
  fmtCombined,
  itemMark,
  criterionTotal,
  rawTotal,
  type ParticipantRow,
  type TeamAggregate,
} from './grading';

const today = () => new Date().toISOString().slice(0, 10);
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const sortRows = (rows: ParticipantRow[]) =>
  [...rows].sort((a, b) => (b.final.combined ?? -1) - (a.final.combined ?? -1) || a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Export CSV — final results
// ---------------------------------------------------------------------------
export function exportFinalResultsCsv(rows: ParticipantRow[]) {
  const csv = toCsv(
    sortRows(rows).map((r) => ({
      name: r.name,
      email: r.email,
      batch: r.batch ?? '',
      team: r.team?.name ?? '',
      project: r.team?.project ?? '',
      judges: r.teamAgg?.judges.length ?? 0,
      capRaw: fmt2(r.final.capstoneRaw),
      capW: fmt2(r.final.capstoneContribution),
      theory: r.final.theoryCorrect ?? '',
      theoryW: fmt2(r.final.theoryContribution),
      combined: fmtCombined(r.final.combined),
      result: r.final.result ?? 'PENDING',
    })),
    [
      { key: 'name', label: 'Student' },
      { key: 'email', label: 'Email' },
      { key: 'batch', label: 'Batch' },
      { key: 'team', label: 'Team' },
      { key: 'project', label: 'Project' },
      { key: 'judges', label: 'Judges' },
      { key: 'capRaw', label: 'Capstone Raw (/100)' },
      { key: 'capW', label: 'Capstone Contribution (/60)' },
      { key: 'theory', label: 'Theory Correct (/30)' },
      { key: 'theoryW', label: 'Theory Contribution (/40)' },
      { key: 'combined', label: 'Total Score (/100)' },
      { key: 'result', label: 'Final Result' },
    ]
  );
  downloadCsv(`caiwp-final-results-${today()}.csv`, csv);
}

// ---------------------------------------------------------------------------
// Database Sheet — every mark, one row per judge score sheet + student rows
// ---------------------------------------------------------------------------
export function exportDatabaseSheet(rows: ParticipantRow[], aggregates: TeamAggregate[], scores: CapstoneScore[]) {
  const itemCols = ALL_RUBRIC_ITEMS.map((i) => ({
    key: i.id,
    label: `${i.id.split('_')[0].toUpperCase()} ${i.label} (/${i.max})${isFreeMark(i.id) ? ' [free]' : ''}`,
  }));
  const critCols = CAPSTONE_RUBRIC.map((c) => ({ key: `crit${c.id}`, label: `C${c.id} ${c.title} (/${c.max})` }));

  const teamName = (id: string) => aggregates.find((a) => a.team.id === id)?.team;

  const records: Record<string, unknown>[] = [];

  // One row per student (final result + their team's averaged marks).
  sortRows(rows).forEach((r) => {
    const rec: Record<string, unknown> = {
      recordType: 'STUDENT',
      student: r.name,
      email: r.email,
      batch: r.batch ?? '',
      team: r.team?.name ?? '',
      project: r.team?.project ?? '',
      judge: r.teamAgg ? `Average of ${r.teamAgg.judges.length}` : '',
      capRaw: fmt2(r.final.capstoneRaw),
      capW: fmt2(r.final.capstoneContribution),
      theory: r.final.theoryCorrect ?? '',
      theoryW: fmt2(r.final.theoryContribution),
      combined: fmtCombined(r.final.combined),
      result: r.final.result ?? 'PENDING',
      published: r.team?.published ? 'Yes' : 'No',
    };
    CAPSTONE_RUBRIC.forEach((c) => (rec[`crit${c.id}`] = r.teamAgg && r.teamAgg.judges.length ? fmt2(r.teamAgg.criterionAvg[c.id]) : ''));
    records.push(rec);
  });

  // One row per judge score sheet (raw evidence).
  scores.forEach((s) => {
    const t = teamName(s.teamId);
    const raw = rawTotal(s.items);
    const rec: Record<string, unknown> = {
      recordType: 'JUDGE_SHEET',
      student: '',
      email: '',
      batch: t?.batch ?? '',
      team: t?.name ?? s.teamId,
      project: t?.project ?? '',
      judge: s.judgeName,
      capRaw: fmt2(raw),
      capW: fmt2(raw * 0.6),
      challenge: s.challenge,
      teamResponse: s.teamResponse,
      strongest: s.strongestEvidence,
      priority: s.priorityImprovement,
      nextStep: s.nextStep,
      strength: s.strength,
      improvement: s.improvement,
      feedbackResponses: s.feedbackResponses ?? '',
      videoDuration: s.videoDuration,
      updated: s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '',
    };
    ALL_RUBRIC_ITEMS.forEach((i) => (rec[i.id] = itemMark(s.items, i.id)));
    CAPSTONE_RUBRIC.forEach((c) => (rec[`crit${c.id}`] = criterionTotal(s.items, c.id)));
    records.push(rec);
  });

  const csv = toCsv(records, [
    { key: 'recordType', label: 'Record Type' },
    { key: 'student', label: 'Student' },
    { key: 'email', label: 'Email' },
    { key: 'batch', label: 'Batch' },
    { key: 'team', label: 'Team' },
    { key: 'project', label: 'Project' },
    { key: 'judge', label: 'Judge' },
    ...critCols,
    { key: 'capRaw', label: 'Capstone Raw (/100)' },
    { key: 'capW', label: 'Capstone Contribution (/60)' },
    { key: 'theory', label: 'Theory Correct (/30)' },
    { key: 'theoryW', label: 'Theory Contribution (/40)' },
    { key: 'combined', label: 'Total Score (/100)' },
    { key: 'result', label: 'Final Result' },
    { key: 'published', label: 'Published to Student' },
    ...itemCols,
    { key: 'feedbackResponses', label: 'Feedback Responses' },
    { key: 'videoDuration', label: 'Video Duration' },
    { key: 'challenge', label: 'Facilitator Challenge' },
    { key: 'teamResponse', label: 'Team Response / Trade-off' },
    { key: 'strongest', label: 'Strongest Evidence' },
    { key: 'priority', label: 'Priority Improvement' },
    { key: 'nextStep', label: 'Next Step' },
    { key: 'strength', label: 'Assessor Strength' },
    { key: 'improvement', label: 'Assessor Improvement' },
    { key: 'updated', label: 'Last Updated' },
  ]);
  // BOM so Excel opens UTF-8 names (e.g. "–") correctly.
  downloadCsv(`caiwp-grading-database-${today()}.csv`, '﻿' + csv);
}

// ---------------------------------------------------------------------------
// Results Doc — printable cohort report (save as PDF from the print dialog)
// ---------------------------------------------------------------------------
export function buildResultsDocHtml(rows: ParticipantRow[], aggregates: TeamAggregate[]): string {
  const sorted = sortRows(rows);
  const graded = sorted.filter((r) => r.final.combined !== null);
  const passed = graded.filter((r) => r.final.result === 'PASS').length;
  const avg = graded.length ? graded.reduce((s, r) => s + (r.final.combined ?? 0), 0) / graded.length : null;
  const generated = new Date().toLocaleString();

  const teamRows = aggregates
    .map(
      (a) => `<tr><td class="num">${a.rank ?? '–'}</td><td><b>${esc(a.team.name)}</b><div class="sub">${esc(a.team.project)}</div></td>
      <td class="num">${a.team.memberUids.length}</td><td class="num">${a.judges.length}</td>
      ${CAPSTONE_RUBRIC.map((c) => `<td class="num sm">${a.judges.length ? fmt2(a.criterionAvg[c.id]).replace(/\.00$/, '') : '–'}</td>`).join('')}
      <td class="num"><b>${fmt2(a.avgRaw)}</b></td><td class="num">${fmt2(a.contribution)}</td></tr>`
    )
    .join('');

  const studentRows = sorted
    .map(
      (r, i) => `<tr><td class="num">${i + 1}</td><td><b>${esc(r.name)}</b><div class="sub">${esc(r.email)}</div></td>
      <td>${esc(r.team?.name ?? '—')}</td>
      <td class="num">${fmt2(r.final.capstoneContribution)}</td><td class="num">${fmt2(r.final.theoryContribution)}</td>
      <td class="num total">${fmtCombined(r.final.combined)}</td>
      <td><span class="badge ${r.final.result === 'PASS' ? 'pass' : r.final.result === 'FAIL' ? 'fail' : ''}">${r.final.result ?? 'PENDING'}</span></td></tr>`
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>CAIWP Results ${today()}</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  .doc{max-width:1000px;margin:0 auto}
  header{background:#0f172a;color:#fff;padding:22px 28px;border-radius:14px;display:flex;justify-content:space-between;align-items:center}
  header h1{margin:0;font-size:20px;letter-spacing:.06em;text-transform:uppercase} header p{margin:4px 0 0;font-size:11px;color:#94a3b8}
  .brand{color:#d14d76;font-weight:900}
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:18px 0}
  .kpi{border:1px solid #e2e8f0;border-radius:12px;padding:12px} .kpi .l{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em}
  .kpi .v{font-size:22px;font-weight:900;font-variant-numeric:tabular-nums}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#64748b;margin:26px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;padding:6px 6px;border-bottom:1px solid #cbd5e1}
  td{padding:7px 6px;border-bottom:1px solid #f1f5f9;vertical-align:top} .num{text-align:right;font-variant-numeric:tabular-nums} .sm{font-size:11px;color:#475569}
  .sub{font-size:10px;color:#94a3b8} .total{font-weight:900;font-size:14px}
  .badge{font-size:9px;font-weight:900;padding:3px 8px;border-radius:99px;background:#f1f5f9;color:#94a3b8}
  .badge.pass{background:#ecfdf5;color:#059669} .badge.fail{background:#fff1f2;color:#e11d48}
  .note{font-size:10px;color:#64748b;margin-top:14px} tr{page-break-inside:avoid}
  @media print{body{padding:0} header{border-radius:0}}
</style></head><body><div class="doc">
<header><div><h1>CAIWP Final Results</h1><p>Group Capstone (60) + Theory Examination (40) · Generated ${esc(generated)}</p></div><div class="brand">TRAINITO ACADEMY</div></header>
<div class="kpis">
  <div class="kpi"><div class="l">Students</div><div class="v">${rows.length}</div></div>
  <div class="kpi"><div class="l">Fully graded</div><div class="v">${graded.length}</div></div>
  <div class="kpi"><div class="l">Passed</div><div class="v">${passed}</div></div>
  <div class="kpi"><div class="l">Failed</div><div class="v">${graded.length - passed}</div></div>
  <div class="kpi"><div class="l">Average total</div><div class="v">${avg === null ? '–' : fmt2(avg)}</div></div>
</div>
<h2>Capstone team ranking</h2>
<table><thead><tr><th class="num">#</th><th>Team</th><th class="num">Members</th><th class="num">Judges</th>
${CAPSTONE_RUBRIC.map((c) => `<th class="num">C${c.id}<br>/${c.max}</th>`).join('')}<th class="num">Raw<br>/100</th><th class="num">×0.60<br>/60</th></tr></thead>
<tbody>${teamRows || '<tr><td colspan="16">No teams.</td></tr>'}</tbody></table>
<h2>Student results</h2>
<table><thead><tr><th class="num">#</th><th>Student</th><th>Team</th><th class="num">Capstone<br>/60</th><th class="num">Theory<br>/40</th><th class="num">Total<br>/100</th><th>Result</th></tr></thead>
<tbody>${studentRows || '<tr><td colspan="7">No students.</td></tr>'}</tbody></table>
<p class="note">Final score = (capstone raw × 0.60) + (theory correct ÷ 30 × 40). Pass requires ${COMBINED_PASS_MARK}/100 or higher on the unrounded total.
Capstone raw is the average of all judges' raw totals; ranking tie-break is criterion 1, then 3, then 8. Theory uses each student's best submitted attempt.</p>
</div><script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
}
