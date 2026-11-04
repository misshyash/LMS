import React, { useMemo, useState } from 'react';
import { backend } from '../../../services';
import type { CapstoneTeam, UserSummary, CapstoneLinks } from '../../../types';
import { EMPTY_LINKS } from '../../../types';
import type { TeamAggregate } from '../../../utils/grading';
import { fmt2 } from '../../../utils/grading';
import { ISLAND_TAKEOVER_TEAMS } from '../../../data/capstoneRubric';
import { useConfirm } from '../../shared/ConfirmDialog';
import { Card, LinkChips, LINK_FIELDS, btnPrimary, btnTeal, btnGhost, inputCls, inputBase, labelCls, safeUrl } from './ui';

interface Props {
  summaries: UserSummary[];
  aggregates: TeamAggregate[];
  onOpenScoreSheet: (teamId: string) => void;
  /** Cohort from the coach check-in; new teams are tagged with it. */
  defaultBatch?: string | null;
}

interface Form {
  id?: string;
  name: string;
  project: string;
  batch: string;
  originalBudget: string;
  memberUids: string[];
  links: CapstoneLinks;
}

const emptyForm = (): Form => ({ name: '', project: '', batch: '', originalBudget: '', memberUids: [], links: { ...EMPTY_LINKS } });

export const TeamsPanel: React.FC<Props> = ({ summaries, aggregates, onOpenScoreSheet, defaultBatch = null }) => {
  const [form, setForm] = useState<Form | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEl, ask] = useConfirm();

  const teamOfUid = useMemo(() => {
    const m = new Map<string, CapstoneTeam>();
    aggregates.forEach((a) => a.team.memberUids.forEach((u) => m.set(u, a.team)));
    return m;
  }, [aggregates]);

  const unassigned = summaries.filter((s) => !teamOfUid.has(s.uid));

  const edit = (t: CapstoneTeam) =>
    setForm({
      id: t.id,
      name: t.name,
      project: t.project,
      batch: t.batch ?? '',
      originalBudget: t.originalBudget === null ? '' : String(t.originalBudget),
      memberUids: [...t.memberUids],
      links: { ...EMPTY_LINKS, ...t.links },
    });

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const saveForm = () =>
    run(async () => {
      if (!form) return;
      if (!form.name.trim()) throw new Error('Team name is required.');
      const badLink = LINK_FIELDS.find((f) => form.links[f.key].trim() && !safeUrl(form.links[f.key]));
      if (badLink) throw new Error(`"${badLink.label}" must be a full http(s) link.`);
      const budget = form.originalBudget.trim() === '' ? null : Number(form.originalBudget);
      if (budget !== null && (!Number.isFinite(budget) || budget < 0)) throw new Error('Budget must be a positive number.');
      // A student belongs to one team only: remove them from any other team.
      const moves = aggregates.filter(
        (a) => a.team.id !== form.id && a.team.memberUids.some((u) => form.memberUids.includes(u))
      );
      for (const a of moves) {
        await backend.saveTeam({ id: a.team.id, memberUids: a.team.memberUids.filter((u) => !form.memberUids.includes(u)) });
      }
      await backend.saveTeam({
        id: form.id,
        name: form.name.trim(),
        project: form.project.trim(),
        batch: form.batch.trim() || null,
        originalBudget: budget,
        memberUids: form.memberUids,
        links: Object.fromEntries(Object.entries(form.links).map(([k, v]) => [k, v.trim()])) as unknown as CapstoneLinks,
      });
      setForm(null);
    });

  const loadPreset = () =>
    run(async () => {
      const existing = new Set(aggregates.map((a) => a.team.name));
      const toCreate = ISLAND_TAKEOVER_TEAMS.filter((t) => !existing.has(t.name));
      // Spread currently-unassigned students across the new teams (round-robin) as a starting point.
      const pool = [...unassigned];
      const buckets: string[][] = toCreate.map(() => []);
      pool.forEach((s, i) => buckets[i % Math.max(1, toCreate.length)]?.push(s.uid));
      for (let i = 0; i < toCreate.length; i++) {
        await backend.saveTeam({ name: toCreate[i].name, project: toCreate[i].project, batch: defaultBatch, memberUids: buckets[i] ?? [] });
      }
    });

  const togglePublish = (a: TeamAggregate) =>
    run(() =>
      a.team.published
        ? backend.saveTeam({ id: a.team.id, published: false, publishedRaw: null, publishedAt: null })
        : backend.saveTeam({ id: a.team.id, published: true, publishedRaw: a.avgRaw, publishedAt: Date.now() })
    );

  const filteredStudents = summaries.filter(
    (s) => s.name.toLowerCase().includes(memberSearch.toLowerCase()) || s.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {confirmEl}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <p className="text-xs font-bold text-slate-500">
          {aggregates.length} team(s) · {summaries.length - unassigned.length}/{summaries.length} students assigned
        </p>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={loadPreset} disabled={busy}>
            + Island Takeover Preset (4 teams)
          </button>
          <button className={btnPrimary} onClick={() => setForm({ ...emptyForm(), batch: defaultBatch ?? '' })} disabled={busy}>
            + New Team
          </button>
        </div>
      </div>
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

      {form && (
        <Card title={form.id ? 'Edit Team' : 'New Team'}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Team name</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Group 1" />
            </div>
            <div className="lg:col-span-2">
              <label className={labelCls}>Project title</label>
              <input className={inputCls} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Langkawi – Luxury + Fun Combo" />
            </div>
            <div>
              <label className={labelCls}>Original budget (RM)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={form.originalBudget}
                onChange={(e) => setForm({ ...form, originalBudget: e.target.value })}
                placeholder="for the 20% cut challenge"
              />
            </div>
            <div>
              <label className={labelCls}>Batch (optional)</label>
              <input className={inputCls} value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="Batch 1" />
            </div>
          </div>

          <div className="mt-6">
            <div className={labelCls}>Submission links — paste a share link for the deck/PDF, video, chatbot, etc.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LINK_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    {f.icon} {f.label}
                  </label>
                  <input
                    className={`${inputCls} ${form.links[f.key] && !safeUrl(form.links[f.key]) ? 'ring-2 ring-rose-300' : ''}`}
                    value={form.links[f.key]}
                    onChange={(e) => setForm({ ...form, links: { ...form.links, [f.key]: e.target.value } })}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className={labelCls}>Members ({form.memberUids.length} selected)</div>
              <input className={`${inputBase} w-full max-w-xs`} value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search students…" />
            </div>
            <div className="max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/30">
              {filteredStudents.length === 0 && <p className="text-[11px] text-slate-400 font-bold p-3">No students yet.</p>}
              {filteredStudents.map((s) => {
                const other = teamOfUid.get(s.uid);
                const checked = form.memberUids.includes(s.uid);
                return (
                  <label key={s.uid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer text-xs font-bold dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          memberUids: e.target.checked ? [...form.memberUids, s.uid] : form.memberUids.filter((u) => u !== s.uid),
                        })
                      }
                    />
                    <span className="truncate">{s.name}</span>
                    {other && other.id !== form.id && <span className="text-[9px] text-amber-500 whitespace-nowrap">({other.name})</span>}
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-2">Selecting a student who is already in another team moves them to this one.</p>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
            <button className={btnGhost} onClick={() => setForm(null)} disabled={busy}>
              Cancel
            </button>
            <button className={btnTeal} onClick={saveForm} disabled={busy}>
              {busy ? 'Saving…' : 'Save Team'}
            </button>
          </div>
        </Card>
      )}

      {aggregates.length === 0 && !form && (
        <Card>
          <p className="text-xs text-slate-400 font-bold text-center py-10">
            No teams yet. Use the Island Takeover preset (Langkawi, Redang, Tioman, Perhentian) or create your own.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {aggregates.map((a) => {
          const stale = a.team.published && a.avgRaw !== null && Math.abs((a.team.publishedRaw ?? -1) - a.avgRaw) > 1e-9;
          return (
            <Card
              key={a.team.id}
              title={
                <span>
                  {a.team.name}
                  <span className="block normal-case tracking-normal text-xs text-slate-400 mt-1">{a.team.project || '—'}</span>
                </span>
              }
              right={
                <div className="text-right">
                  <div className="text-2xl font-black tabular-nums text-trainito-teal">{a.avgRaw === null ? '--' : fmt2(a.avgRaw)}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">raw / 100 · {a.judges.length} judge(s)</div>
                </div>
              }
            >
              <div className="flex flex-wrap gap-1.5 mb-4">
                {a.team.memberUids.length === 0 && <span className="text-[10px] font-bold text-amber-500">No members assigned</span>}
                {a.team.memberUids.map((u) => (
                  <span key={u} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold dark:text-slate-300">
                    {summaries.find((s) => s.uid === u)?.name ?? 'Unknown'}
                  </span>
                ))}
              </div>
              <LinkChips links={a.team.links as unknown as Record<string, string>} />
              {a.team.originalBudget !== null && (
                <p className="text-[11px] font-bold text-slate-500 mt-3">
                  Budget RM {a.team.originalBudget.toLocaleString()} → 20% cut cap RM{' '}
                  {(a.team.originalBudget * 0.8).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              )}
              {stale && <p className="text-[10px] font-bold text-amber-600 mt-3">Scores changed since publishing — republish to update students.</p>}
              <div className="flex flex-wrap gap-2 mt-5">
                <button className={btnTeal} onClick={() => onOpenScoreSheet(a.team.id)}>
                  Score
                </button>
                <button className={btnGhost} onClick={() => edit(a.team)} disabled={busy}>
                  Edit
                </button>
                <button className={btnGhost} onClick={() => togglePublish(a)} disabled={busy || (!a.team.published && a.avgRaw === null)}>
                  {a.team.published ? 'Unpublish' : 'Publish to Students'}
                </button>
                {stale && (
                  <button className={btnGhost} onClick={() => run(() => backend.saveTeam({ id: a.team.id, publishedRaw: a.avgRaw, publishedAt: Date.now() }))}>
                    Republish
                  </button>
                )}
                <button
                  className={`${btnGhost} text-rose-500`}
                  disabled={busy}
                  onClick={async () =>
                    (await ask(`Delete ${a.team.name} and all its score sheets?`, { confirmLabel: 'Delete team', danger: true })) &&
                    run(() => backend.deleteTeam(a.team.id))
                  }
                >
                  Delete
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
