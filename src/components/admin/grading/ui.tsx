import React from 'react';

export const Card: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  right,
  children,
  className = '',
}) => (
  <div className={`glass rounded-[2rem] p-6 md:p-8 shadow-lg ${className}`}>
    {(title || right) && (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {title && <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</h3>}
        {right}
      </div>
    )}
    {children}
  </div>
);

export const Kpi: React.FC<{ label: string; value: React.ReactNode; accent: string }> = ({ label, value, accent }) => (
  <div className={`glass rounded-3xl p-5 border-b-4 ${accent} shadow-sm`}>
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
  </div>
);

export const ResultBadge: React.FC<{ result: 'PASS' | 'FAIL' | null; pendingLabel?: string }> = ({ result, pendingLabel = 'Pending' }) => (
  <span
    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${
      result === 'PASS'
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
        : result === 'FAIL'
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
    }`}
  >
    {result ?? pendingLabel}
  </span>
);

export const btnPrimary =
  'px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest disabled:opacity-40';
export const btnTeal =
  'px-5 py-2.5 bg-trainito-teal text-white rounded-xl font-black text-[9px] uppercase tracking-widest disabled:opacity-40';
export const btnGhost =
  'px-4 py-2 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[9px] uppercase tracking-widest disabled:opacity-40';
export const inputBase =
  'px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-xs font-bold outline-none focus:ring-2 focus:ring-trainito-teal/50 dark:text-white';
export const inputCls = `w-full ${inputBase}`;
export const labelCls = 'block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5';

/** Only allow http(s) links to be rendered as clickable anchors. */
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export const LINK_FIELDS: { key: 'deck' | 'video' | 'prototype' | 'feedback' | 'other'; label: string; icon: string; placeholder: string }[] = [
  { key: 'deck', label: 'Slide deck / PDF', icon: '📑', placeholder: 'Google Drive / OneDrive / Canva link to the deck or PDF' },
  { key: 'video', label: 'Video (30–90s)', icon: '🎬', placeholder: 'YouTube / Drive / Canva video link' },
  { key: 'prototype', label: 'AI agent / chatbot', icon: '🤖', placeholder: 'Custom GPT / Gem / Copilot agent link' },
  { key: 'feedback', label: 'Feedback form / summary', icon: '📋', placeholder: 'Google Form / responses sheet link' },
  { key: 'other', label: 'Other evidence', icon: '🔗', placeholder: 'Appendix, AI-use evidence, sources…' },
];

export const LinkChips: React.FC<{ links: Record<string, string> }> = ({ links }) => {
  const present = LINK_FIELDS.filter((f) => safeUrl(links[f.key] ?? ''));
  if (present.length === 0) return <span className="text-[10px] text-slate-400 font-bold">No submission links yet</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {present.map((f) => (
        <a
          key={f.key}
          href={safeUrl(links[f.key])!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-1.5 rounded-lg bg-trainito-teal/10 text-trainito-teal text-[10px] font-black hover:bg-trainito-teal/20"
        >
          {f.icon} {f.label} ↗
        </a>
      ))}
    </div>
  );
};
