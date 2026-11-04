// Final-score calculation for the CAIWP Group Capstone + Theory Examination,
// implementing the rules in the "CAIWP Day 5 Marking Scheme":
//
//   Final score = (capstone raw score × 0.60) + (theory correct ÷ 30 × 40)
//
//   • Capstone raw is out of 100; each sub-item 0..max in 0.5 steps.
//   • Multiple judges: average their raw totals BEFORE multiplying by 0.60.
//   • Theory: 1 mark per correct answer (30 max) → contribution out of 40.
//   • Pass = combined ≥ 75, decided on the UNROUNDED total. Display 2 dp;
//     never round a score below 75 up to a pass.
//   • Capstone ranking tie-break: criterion 1, then 3, then 8.
//
// Free-mark sub-items (see FREE_MARK_ITEM_IDS) are always awarded in full.

import {
  CAPSTONE_RUBRIC,
  ALL_RUBRIC_ITEMS,
  CAPSTONE_WEIGHT,
  COMBINED_PASS_MARK,
  THEORY_CONTRIBUTION_MAX,
  TIE_BREAK_CRITERIA,
  isFreeMark,
} from '../data/capstoneRubric';
import type { CapstoneScore, CapstoneTeam, UserSummary } from '../types';
import { TOTAL_QUESTIONS } from '../types';
import { EMBEDDED, showInViewer } from './exportSink';

/** Clamp to 0..max and snap to the nearest 0.5. */
export function normaliseMark(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  const snapped = Math.round(value * 2) / 2;
  return Math.min(max, Math.max(0, snapped));
}

/** Awarded marks for one sub-item, applying free marks. */
export function itemMark(items: Record<string, number>, itemId: string): number {
  const item = ALL_RUBRIC_ITEMS.find((i) => i.id === itemId);
  if (!item) return 0;
  if (isFreeMark(itemId)) return item.max;
  return normaliseMark(items[itemId] ?? 0, item.max);
}

export function criterionTotal(items: Record<string, number>, criterionId: number): number {
  const c = CAPSTONE_RUBRIC.find((x) => x.id === criterionId);
  if (!c) return 0;
  return c.items.reduce((s, i) => s + itemMark(items, i.id), 0);
}

export function rawTotal(items: Record<string, number>): number {
  return CAPSTONE_RUBRIC.reduce((s, c) => s + criterionTotal(items, c.id), 0);
}

/** Items a judge has not touched yet (free marks excluded). */
export function unscoredItems(items: Record<string, number>): string[] {
  return ALL_RUBRIC_ITEMS.filter((i) => !isFreeMark(i.id) && items[i.id] === undefined).map((i) => i.id);
}

export interface TeamAggregate {
  team: CapstoneTeam;
  judges: CapstoneScore[];
  /** Average of the judges' raw totals (out of 100), or null if no judge has scored. */
  avgRaw: number | null;
  /** avgRaw × 0.60 (out of 60). */
  contribution: number | null;
  /** Average per-criterion totals across judges (for tie-breaks / reports). */
  criterionAvg: Record<number, number>;
  rank: number | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function aggregateTeams(teams: CapstoneTeam[], scores: CapstoneScore[]): TeamAggregate[] {
  const list: TeamAggregate[] = teams.map((team) => {
    const judges = scores.filter((s) => s.teamId === team.id);
    const criterionAvg: Record<number, number> = {};
    CAPSTONE_RUBRIC.forEach((c) => {
      criterionAvg[c.id] = avg(judges.map((j) => criterionTotal(j.items, c.id)));
    });
    const avgRaw = judges.length ? avg(judges.map((j) => rawTotal(j.items))) : null;
    return {
      team,
      judges,
      avgRaw,
      contribution: avgRaw === null ? null : avgRaw * CAPSTONE_WEIGHT,
      criterionAvg,
      rank: null,
    };
  });

  // Rank by raw desc, tie-break on criterion 1, then 3, then 8.
  const cmp = (a: TeamAggregate, b: TeamAggregate) => {
    if ((b.avgRaw ?? -1) !== (a.avgRaw ?? -1)) return (b.avgRaw ?? -1) - (a.avgRaw ?? -1);
    for (const c of TIE_BREAK_CRITERIA) {
      const d = (b.criterionAvg[c] ?? 0) - (a.criterionAvg[c] ?? 0);
      if (Math.abs(d) > 1e-9) return d;
    }
    return 0;
  };
  const ranked = list.filter((t) => t.avgRaw !== null).sort(cmp);
  ranked.forEach((t, i) => {
    t.rank = i > 0 && cmp(ranked[i - 1], t) === 0 ? ranked[i - 1].rank : i + 1;
  });
  return [...list].sort((a, b) => {
    if (a.rank === null && b.rank === null) return a.team.name.localeCompare(b.team.name);
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  });
}

export function theoryContribution(correct: number | null | undefined): number | null {
  if (correct === null || correct === undefined) return null;
  return (correct / TOTAL_QUESTIONS) * THEORY_CONTRIBUTION_MAX;
}

export interface FinalResult {
  capstoneRaw: number | null;
  capstoneContribution: number | null;
  theoryCorrect: number | null;
  theoryContribution: number | null;
  combined: number | null;
  /** null until both components are available. */
  result: 'PASS' | 'FAIL' | null;
}

export function computeFinal(capstoneRaw: number | null, theoryCorrect: number | null): FinalResult {
  const capstoneContribution = capstoneRaw === null ? null : capstoneRaw * CAPSTONE_WEIGHT;
  const theory = theoryContribution(theoryCorrect);
  const combined = capstoneContribution === null || theory === null ? null : capstoneContribution + theory;
  // Compare the unrounded total; a tiny epsilon only absorbs floating-point
  // noise (e.g. 74.99999999999999 for an exact 75) — it never rounds a real
  // sub-75 score such as 74.99 up to a pass.
  const result = combined === null ? null : combined + 1e-9 >= COMBINED_PASS_MARK ? 'PASS' : 'FAIL';
  return { capstoneRaw, capstoneContribution, theoryCorrect, theoryContribution: theory, combined, result };
}

/** Display with two decimal places (marking rule 5). */
export function fmt2(n: number | null | undefined): string {
  if (n === null || n === undefined) return '--';
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * Display a combined score with two decimals without ever showing a failing
 * score as a pass: anything below 75 is truncated (74.996 → "74.99", never
 * "75.00"); scores at or above 75 are rounded normally.
 */
export function fmtCombined(n: number | null | undefined): string {
  if (n === null || n === undefined) return '--';
  if (n + 1e-9 < COMBINED_PASS_MARK) return (Math.floor(n * 100 + 1e-7) / 100).toFixed(2);
  return fmt2(n);
}

/** The theory score used in the final result: the candidate's best submitted attempt. */
export function theoryCorrectFor(s: UserSummary | undefined | null): number | null {
  return s?.bestScore ?? null;
}

export interface ParticipantRow {
  uid: string;
  name: string;
  email: string;
  batch: string | null;
  team: CapstoneTeam | null;
  teamAgg: TeamAggregate | null;
  final: FinalResult;
}

export function buildParticipantRows(summaries: UserSummary[], aggregates: TeamAggregate[]): ParticipantRow[] {
  const teamOf = new Map<string, TeamAggregate>();
  aggregates.forEach((a) => a.team.memberUids.forEach((uid) => teamOf.set(uid, a)));
  return summaries.map((s) => {
    const agg = teamOf.get(s.uid) ?? null;
    return {
      uid: s.uid,
      name: s.name,
      email: s.email,
      batch: s.batch,
      team: agg?.team ?? null,
      teamAgg: agg,
      final: computeFinal(agg?.avgRaw ?? null, theoryCorrectFor(s)),
    };
  });
}

// ---------------------------------------------------------------------------
// Printable "Final participant result" sheet (section 6 of the scheme)
// ---------------------------------------------------------------------------

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export interface ResultSheetData {
  name: string;
  email: string;
  team: string;
  project: string;
  final: FinalResult;
  strength?: string;
  improvement?: string;
  judges?: number;
}

export function buildResultSheetHtml(rows: ResultSheetData[]): string {
  const pages = rows
    .map((d) => {
      const f = d.final;
      const pass = f.result === 'PASS';
      return `<div class="sheet">
  <header><div><h1>Final Participant Result</h1><p>CAIWP | Group Capstone &amp; Theory Examination</p></div><div class="brand">TRAINITO ACADEMY</div></header>
  <section class="grid">
    <div><div class="lbl">Participant</div><div class="val">${esc(d.name)}</div></div>
    <div><div class="lbl">Email</div><div class="val">${esc(d.email)}</div></div>
    <div><div class="lbl">Team</div><div class="val">${esc(d.team || '—')}</div></div>
    <div><div class="lbl">Project</div><div class="val">${esc(d.project || '—')}</div></div>
  </section>
  <section>
    <table>
      <thead><tr><th>Component</th><th class="num">Score</th></tr></thead>
      <tbody>
        <tr><td>Group capstone raw score${d.judges && d.judges > 1 ? ` (average of ${d.judges} judges)` : ''}</td><td class="num">${fmt2(f.capstoneRaw)} / 100</td></tr>
        <tr><td>Group capstone contribution (raw × 0.60)</td><td class="num">${fmt2(f.capstoneContribution)} / 60</td></tr>
        <tr><td>Individual theory correct answers</td><td class="num">${f.theoryCorrect ?? '--'} / 30</td></tr>
        <tr><td>Theory contribution (correct ÷ 30 × 40)</td><td class="num">${fmt2(f.theoryContribution)} / 40</td></tr>
        <tr class="total"><td>COMBINED SCORE</td><td class="num">${fmtCombined(f.combined)} / 100</td></tr>
      </tbody>
    </table>
  </section>
  <section class="result">
    <div class="lbl">Final result</div>
    <div class="boxes">
      <span class="box ${pass ? 'on pass' : ''}">${pass ? '■' : '□'} PASS (75 or above)</span>
      <span class="box ${f.result === 'FAIL' ? 'on fail' : ''}">${f.result === 'FAIL' ? '■' : '□'} FAIL (below 75)</span>
    </div>
    ${f.result === null ? '<p class="pending">Pending — both the capstone and the theory exam must be completed.</p>' : ''}
  </section>
  <section>
    <div class="lbl">Assessor comments</div>
    <p><b>Strength:</b> ${esc(d.strength || '')}</p>
    <p><b>Improvement:</b> ${esc(d.improvement || '')}</p>
    <div class="sign"><span>Assessor signature: ____________________</span><span>Date: ____________</span></div>
  </section>
</div>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>CAIWP Final Results</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  .sheet{max-width:720px;margin:0 auto 32px;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;page-break-after:always}
  .sheet:last-child{page-break-after:auto}
  header{background:#0f172a;color:#fff;padding:20px 28px;display:flex;justify-content:space-between;align-items:center}
  header h1{margin:0;font-size:17px;letter-spacing:.08em;text-transform:uppercase}
  header p{margin:4px 0 0;font-size:10px;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase}
  .brand{color:#d14d76;font-weight:900;font-size:12px}
  section{padding:18px 28px;border-bottom:1px solid #f1f5f9;font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}
  .lbl{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px}
  .val{font-weight:700}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em;padding:6px 0;border-bottom:1px solid #e2e8f0}
  td{padding:8px 0;border-bottom:1px solid #f1f5f9} .num{text-align:right;font-variant-numeric:tabular-nums}
  tr.total td{font-weight:900;font-size:15px;border-top:2px solid #0f172a}
  .boxes{display:flex;gap:16px} .box{padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;font-weight:800;color:#94a3b8}
  .box.on.pass{border-color:#10b981;color:#059669;background:#ecfdf5} .box.on.fail{border-color:#f43f5e;color:#e11d48;background:#fff1f2}
  .pending{color:#d97706;font-weight:700;font-size:12px}
  .sign{display:flex;justify-content:space-between;margin-top:24px;color:#64748b;font-size:12px}
  @media print{body{padding:0}.sheet{border:none;margin:0 auto}}
</style></head><body>${pages}
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`;
}

export function openPrintable(html: string, title = 'CAIWP Results') {
  if (EMBEDDED) {
    showInViewer({ kind: 'html', title, html });
    return;
  }
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  // Pop-up blocked: show it in the in-app viewer instead.
  if (!w) showInViewer({ kind: 'html', title, html });
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
