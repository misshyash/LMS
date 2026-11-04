import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onExport, type ExportItem } from '../../utils/exportSink';

/** Minimal CSV parser for the preview table (handles quotes and escaped quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Renders a standalone HTML document (styles + body, scripts removed) inside a shadow root. */
const HtmlDoc: React.FC<{ html: string }> = ({ html }) => {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const root = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script').forEach((s) => s.remove());
    const styles = Array.from(doc.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n')
      .replace(/\bbody\b/g, ':host > .doc-root');
    root.innerHTML = `<style>:host{all:initial;display:block} .doc-root{background:#fff;color:#0f172a;padding:24px;font-family:system-ui,sans-serif}${styles}</style><div class="doc-root">${doc.body.innerHTML}</div>`;
  }, [html]);
  return <div ref={host} />;
};

export const ExportViewer: React.FC = () => {
  const [item, setItem] = useState<ExportItem | null>(null);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'select'>('idle');
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => onExport((i) => {
    setCopied('idle');
    setItem(i);
  }), []);

  const videoUrl = useMemo(() => (item?.kind === 'video' ? URL.createObjectURL(item.blob) : null), [item]);
  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const rows = useMemo(() => (item?.kind === 'csv' ? parseCsv(item.text) : []), [item]);

  if (!item) return null;

  const copy = async () => {
    if (item.kind !== 'csv') return;
    try {
      await navigator.clipboard.writeText(item.text.replace(/^﻿/, ''));
      setCopied('ok');
    } catch {
      setCopied('select');
      textRef.current?.select();
    }
  };

  const title = item.kind === 'html' ? item.title : item.filename;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setItem(null)}>
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 text-white">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-widest truncate">{title}</div>
            <div className="text-[10px] text-slate-400 font-bold">
              {item.kind === 'csv' && `${Math.max(0, rows.length - 1)} rows · copy and paste into Google Sheets or Excel`}
              {item.kind === 'html' && 'Preview · in the hosted app this opens the print / Save-as-PDF dialog'}
              {item.kind === 'video' && 'Preview · in the hosted app this downloads as a video file'}
            </div>
          </div>
          <div className="flex gap-2">
            {item.kind === 'csv' && (
              <button onClick={copy} className="px-4 py-2 rounded-xl bg-trainito-teal text-white text-[10px] font-black uppercase tracking-widest">
                {copied === 'ok' ? 'Copied ✓' : 'Copy CSV'}
              </button>
            )}
            <button onClick={() => setItem(null)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest">
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {item.kind === 'csv' && (
            <>
              {copied === 'select' && (
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-amber-600 mb-2">Copy isn't allowed here. The text below is selected: press Ctrl+C (⌘C on Mac).</p>
                  <textarea ref={textRef} readOnly value={item.text.replace(/^﻿/, '')} className="w-full h-24 text-[10px] font-mono p-2 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-slate-200" />
                </div>
              )}
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {rows[0]?.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-black text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.slice(1).map((r, ri) => (
                    <tr key={ri} className="dark:text-slate-200">
                      {r.map((c, ci) => (
                        <td key={ci} className="px-3 py-1.5 whitespace-nowrap tabular-nums">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {item.kind === 'html' && <HtmlDoc html={item.html} />}
          {item.kind === 'video' && videoUrl && (
            <div className="p-6 bg-black flex justify-center">
              <video src={videoUrl} controls autoPlay className="max-w-full max-h-[70vh] rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
