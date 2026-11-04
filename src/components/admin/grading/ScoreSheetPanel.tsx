import React, { useEffect, useMemo, useState } from 'react';
import { backend, capstoneScoreId } from '../../../services';
import type { AuthUser } from '../../../services';
import type { CapstoneScore } from '../../../types';
import type { TeamAggregate } from '../../../utils/grading';
import { criterionTotal, rawTotal, normaliseMark, unscoredItems, fmt2 } from '../../../utils/grading';
import {
  CAPSTONE_RUBRIC,
  CAPSTONE_WEIGHT,
  DEMO_CHECKS,
  MANDATORY_PITCH_ELEMENTS,
  SUBMISSION_CHECKS,
  isFreeMark,
} from '../../../data/capstoneRubric';
import { useConfirm } from '../../shared/ConfirmDialog';
import { Card, LinkChips, btnTeal, btnGhost, inputCls, inputBase, labelCls } from './ui';

type Draft = Omit<CapstoneScore, 'id' | 'updatedAt'>;

const blankDraft = (teamId: string, judge: AuthUser): Draft => ({
  teamId,
  judgeUid: judge.uid,
  judgeName: judge.name,
  items: {},
  demoChecks: {},
  submissionChecks: {},
  pitchElements: {},
  videoDuration: '',
  feedbackResponses: null,
  presentationTime: '',
  challenge: 'Budget cut by 20%. What will you do?',
  teamResponse: '',
  strongestEvidence: '',
  priorityImprovement: '',
  nextStep: '',
  strength: '',
  improvement: '',
});

interface Props {
  judge: AuthUser;
  aggregates: TeamAggregate[];
  scores: CapstoneScore[];
  teamId: string | null;
  onSelectTeam: (teamId: string) => void;
}

export const ScoreSheetPanel: React.FC<Props> = ({ judge, aggregates, scores, teamId, onSelectTeam }) => {
  const agg = aggregates.find((a) => a.team.id === teamId) ?? null;
  const existing = useMemo(
    () => scores.find((s) => s.id === (teamId ? capstoneScoreId(teamId, judge.uid) : '')) ?? null,
    [scores, teamId, judge.uid]
  );

  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmEl, ask] = useConfirm();

  // Load the judge's sheet when switching team (or when it first arrives).
  useEffect(() => {
    if (!teamId) return setDraft(null);
    if (dirty && draft?.teamId === teamId) return;
    if (existing) {
      const { id: _id, updatedAt: _u, ...rest } = existing;
      setDraft({ ...blankDraft(teamId, judge), ...rest, judgeName: judge.name });
    } else {
      setDraft(blankDraft(teamId, judge));
    }
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, existing]);

  if (aggregates.length === 0) {
    return (
      <Card>
        <p className="text-xs text-slate-400 font-bold text-center py-10">Create teams first (Teams panel), then score them here.</p>
      </Card>
    );
  }

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  };
  const setItem = (id: string, value: number | undefined) => {
    if (!draft) return;
    const items = { ...draft.items };
    if (value === undefined) delete items[id];
    else items[id] = value;
    patch({ items });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await backend.saveCapstoneScore(draft);
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message ?? 'Could not save the score sheet.');
    } finally {
      setSaving(false);
    }
  };

  const raw = draft ? rawTotal(draft.items) : 0;
  const missing = draft ? unscoredItems(draft.items) : [];
  const otherJudges = agg?.judges.filter((j) => j.judgeUid !== judge.uid) ?? [];
  const budget = agg?.team.originalBudget ?? null;

  return (
    <div className="space-y-6">
      {confirmEl}
      {/* Team picker */}
      <div className="flex flex-wrap gap-2">
        {aggregates.map((a) => {
          const mine = scores.some((s) => s.id === capstoneScoreId(a.team.id, judge.uid));
          return (
            <button
              key={a.team.id}
              onClick={async () => {
                if (a.team.id === teamId) return;
                if (dirty && !(await ask('You have unsaved marks on this sheet. Discard them?', { confirmLabel: 'Discard', danger: true }))) return;
                setDirty(false);
                onSelectTeam(a.team.id);
              }}
              className={`px-4 py-2.5 rounded-2xl text-left transition-all ${
                a.team.id === teamId ? 'bg-trainito-teal text-white shadow' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="text-[11px] font-black">{a.team.name} {mine && '✓'}</div>
              <div className={`text-[9px] font-bold truncate max-w-[180px] ${a.team.id === teamId ? 'text-white/80' : 'text-slate-400'}`}>
                {a.team.project || '—'}
              </div>
            </button>
          );
        })}
      </div>

      {!agg || !draft ? (
        <Card>
          <p className="text-xs text-slate-400 font-bold text-center py-10">Select a team to open your score sheet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-6">
            <Card
              title={
                <span>
                  Score Sheet · {agg.team.name}
                  <span className="block normal-case tracking-normal text-xs text-slate-400 mt-1">
                    {agg.team.project} · Assessor: {judge.name}
                  </span>
                </span>
              }
            >
              <div className="mb-2">
                <div className={labelCls}>Submissions</div>
                <LinkChips links={agg.team.links as unknown as Record<string, string>} />
              </div>
            </Card>

            {CAPSTONE_RUBRIC.map((c) => {
              const subtotal = criterionTotal(draft.items, c.id);
              return (
                <Card
                  key={c.id}
                  title={`${c.id}. ${c.title}`}
                  right={
                    <span className="text-sm font-black tabular-nums text-trainito-teal">
                      {fmt2(subtotal).replace(/\.00$/, '')} / {c.max}
                    </span>
                  }
                >
                  <div className="space-y-4">
                    {c.items.map((item) => {
                      const free = isFreeMark(item.id);
                      const value = draft.items[item.id];
                      return (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                          <div>
                            <div className="text-xs font-black text-slate-800 dark:text-white">
                              {item.label} <span className="text-slate-400 font-bold">(max {item.max})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.evidence}</div>
                          </div>
                          {free ? (
                            <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest text-center">
                              Free mark · {item.max}/{item.max}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button className={btnGhost} onClick={() => setItem(item.id, 0)} title="Absent / incorrect evidence">
                                0
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={item.max}
                                step={0.5}
                                value={value ?? ''}
                                placeholder="–"
                                onChange={(e) => setItem(item.id, e.target.value === '' ? undefined : Number(e.target.value))}
                                onBlur={(e) => e.target.value !== '' && setItem(item.id, normaliseMark(Number(e.target.value), item.max))}
                                className={`${inputBase} w-20 text-center tabular-nums ${value === undefined ? 'ring-1 ring-amber-300' : ''}`}
                              />
                              <button className={btnGhost} onClick={() => setItem(item.id, item.max)} title="Complete and credible evidence">
                                Full
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {c.id === 5 && budget !== null && (
                    <p className="mt-4 text-[11px] font-bold text-amber-600">
                      Facilitator challenge: original budget RM {budget.toLocaleString()} → new cap (×0.80) RM{' '}
                      {(budget * 0.8).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  )}
                </Card>
              );
            })}

            <Card title="Demonstration & Challenge Record">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className={labelCls}>Demonstration checks</div>
                  {DEMO_CHECKS.map((c) => (
                    <Check key={c.id} label={c.label} checked={!!draft.demoChecks[c.id]} onChange={(v) => patch({ demoChecks: { ...draft.demoChecks, [c.id]: v } })} />
                  ))}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <Field label="Video duration" value={draft.videoDuration} onChange={(v) => patch({ videoDuration: v })} placeholder="e.g. 0:75" />
                    <Field
                      label="Feedback responses"
                      value={draft.feedbackResponses === null ? '' : String(draft.feedbackResponses)}
                      onChange={(v) => patch({ feedbackResponses: v === '' ? null : Math.max(0, Math.floor(Number(v) || 0)) })}
                      placeholder="≥ 5"
                      type="number"
                    />
                    <Field label="Pitch time" value={draft.presentationTime} onChange={(v) => patch({ presentationTime: v })} placeholder="e.g. 9:40" />
                  </div>
                  {draft.feedbackResponses !== null && draft.feedbackResponses < 5 && (
                    <p className="text-[10px] font-bold text-amber-600 mt-2">Fewer than 5 feedback responses — criterion 10 expects at least 5.</p>
                  )}
                </div>
                <div>
                  <div className={labelCls}>Island pitch — 7 mandatory elements (evidence only)</div>
                  {MANDATORY_PITCH_ELEMENTS.map((c) => (
                    <Check key={c.id} label={c.label} checked={!!draft.pitchElements[c.id]} onChange={(v) => patch({ pitchElements: { ...draft.pitchElements, [c.id]: v } })} />
                  ))}
                  <p className="text-[10px] text-slate-400 font-bold mt-2">
                    Missing outputs score 0 only in the affected sub-items — no second blanket penalty (marking rule 3).
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <div className={labelCls}>Submission check</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {SUBMISSION_CHECKS.map((c) => (
                    <Check
                      key={c.id}
                      label={c.label}
                      checked={!!draft.submissionChecks[c.id]}
                      onChange={(v) => patch({ submissionChecks: { ...draft.submissionChecks, [c.id]: v } })}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                <Field label="Facilitator challenge" value={draft.challenge} onChange={(v) => patch({ challenge: v })} />
                <Field label="Team response / trade-off" value={draft.teamResponse} onChange={(v) => patch({ teamResponse: v })} />
                <Field label="Strongest evidence" value={draft.strongestEvidence} onChange={(v) => patch({ strongestEvidence: v })} />
                <Field label="Priority improvement" value={draft.priorityImprovement} onChange={(v) => patch({ priorityImprovement: v })} />
                <Field label="Next step" value={draft.nextStep} onChange={(v) => patch({ nextStep: v })} />
              </div>
            </Card>

            <Card title="Assessor Comments (printed on result sheets)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Strength" value={draft.strength} onChange={(v) => patch({ strength: v })} textarea />
                <Field label="Improvement" value={draft.improvement} onChange={(v) => patch({ improvement: v })} textarea />
              </div>
            </Card>
          </div>

          {/* Sticky summary */}
          <div className="xl:sticky xl:top-6 space-y-4">
            <Card title="Your Total">
              <div className="text-5xl font-black tabular-nums text-slate-900 dark:text-white">
                {fmt2(raw)} <span className="text-lg text-slate-400">/ 100</span>
              </div>
              <div className="text-xs font-bold text-slate-500 mt-1 tabular-nums">Weighted: {fmt2(raw * CAPSTONE_WEIGHT)} / 60</div>
              <div className="mt-4 space-y-1">
                {CAPSTONE_RUBRIC.map((c) => (
                  <div key={c.id} className="flex justify-between text-[11px] font-bold text-slate-500 tabular-nums">
                    <span className="truncate pr-2">
                      {c.id}. {c.title}
                    </span>
                    <span>
                      {criterionTotal(draft.items, c.id)}/{c.max}
                    </span>
                  </div>
                ))}
              </div>
              {missing.length > 0 && (
                <p className="text-[10px] font-bold text-amber-600 mt-4">{missing.length} sub-item(s) not scored yet (counted as 0).</p>
              )}
              {error && <p className="text-[10px] font-bold text-rose-600 mt-3">{error}</p>}
              <button className={`${btnTeal} w-full mt-5 py-3.5`} onClick={save} disabled={saving || !dirty}>
                {saving ? 'Saving…' : dirty ? 'Save Score Sheet' : existing ? 'Saved ✓' : 'Save Score Sheet'}
              </button>
              {savedAt && !dirty && <p className="text-[10px] text-slate-400 font-bold mt-2 text-center">Saved {new Date(savedAt).toLocaleTimeString()}</p>}
            </Card>

            <Card title="Team Average">
              <div className="text-3xl font-black tabular-nums text-trainito-teal">
                {agg.avgRaw === null ? '--' : fmt2(agg.avgRaw)} <span className="text-sm text-slate-400">/ 100</span>
              </div>
              <div className="text-xs font-bold text-slate-500 tabular-nums">
                → {agg.contribution === null ? '--' : fmt2(agg.contribution)} / 60 · {agg.judges.length} judge(s)
              </div>
              {otherJudges.length > 0 && (
                <div className="mt-3 space-y-1">
                  {otherJudges.map((j) => (
                    <div key={j.id} className="flex justify-between text-[11px] font-bold text-slate-500">
                      <span>{j.judgeName}</span>
                      <span className="tabular-nums">{fmt2(rawTotal(j.items))}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 font-bold mt-3">Judges score independently; raw totals are averaged before × 0.60.</p>
              {existing && (
                <button
                  className={`${btnGhost} w-full mt-4`}
                  onClick={async () => {
                    if (!(await ask('Delete your score sheet for this team?', { confirmLabel: 'Delete', danger: true }))) return;
                    await backend.deleteCapstoneScore(existing.id);
                    setDirty(false);
                  }}
                >
                  Delete my sheet
                </button>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

const Check: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-teal-500" />
    {label}
  </label>
);

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}> = ({ label, value, onChange, placeholder, type = 'text', textarea }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {textarea ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={inputCls} />
    ) : (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    )}
  </div>
);
