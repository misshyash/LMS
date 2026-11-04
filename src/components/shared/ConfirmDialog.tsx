import React, { useCallback, useRef, useState } from 'react';

interface Pending {
  message: string;
  confirmLabel: string;
  danger: boolean;
}

/**
 * In-page confirmation dialog (replaces window.confirm, which is unavailable
 * in sandboxed frames and looks out of place elsewhere).
 *
 *   const [confirmEl, ask] = useConfirm();
 *   if (await ask('Delete this team?', { confirmLabel: 'Delete', danger: true })) …
 *   return <>{…}{confirmEl}</>;
 */
export function useConfirm(): [React.ReactNode, (message: string, opts?: { confirmLabel?: string; danger?: boolean }) => Promise<boolean>] {
  const [pending, setPending] = useState<Pending | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ask = useCallback((message: string, opts?: { confirmLabel?: string; danger?: boolean }) => {
    resolver.current?.(false);
    setPending({ message, confirmLabel: opts?.confirmLabel ?? 'Confirm', danger: opts?.danger ?? false });
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);

  const finish = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setPending(null);
  };

  const el = pending ? (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => finish(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && finish(false)}
      >
        <p className="text-sm font-bold text-slate-800 dark:text-white mb-6">{pending.message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => finish(false)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            autoFocus
            onClick={() => finish(true)}
            className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-white ${pending.danger ? 'bg-rose-600' : 'bg-trainito-teal'}`}
          >
            {pending.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [el, ask];
}
