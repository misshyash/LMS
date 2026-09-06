import React, { useEffect, useState } from 'react';
import { timeAgo } from '../../utils/time';
import { DEMO_MODE } from '../../firebase';

export const ConnectionStatus: React.FC<{ lastSyncAt: number | null }> = ({ lastSyncAt }) => {
  const [online, setOnline] = useState(navigator.onLine);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!online) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 text-[10px] font-black uppercase tracking-widest">
        ⚠ Connection interrupted. Reconnecting…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      ● LIVE{DEMO_MODE ? ' (Demo)' : ''} &middot; Last synchronized: {timeAgo(lastSyncAt)}
    </div>
  );
};
