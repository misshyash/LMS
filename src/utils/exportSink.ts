// Routes exports (CSV, printable documents, videos) either to the browser
// (download / print window) or to the in-app Export Viewer.
//
// The in-app viewer is used when the app runs inside a sandboxed frame that
// blocks downloads, pop-ups and printing (build flag VITE_EMBEDDED=true), and
// as a fallback whenever a pop-up is blocked.

export type ExportItem =
  | { kind: 'csv'; filename: string; text: string }
  | { kind: 'html'; title: string; html: string }
  | { kind: 'video'; filename: string; blob: Blob };

export const EMBEDDED = import.meta.env.VITE_EMBEDDED === 'true';

type Listener = (item: ExportItem) => void;
const listeners = new Set<Listener>();

export function onExport(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function showInViewer(item: ExportItem) {
  listeners.forEach((l) => l(item));
}

export function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
