import React from 'react';

export const Logo: React.FC<{ variant?: 'full' | 'compact' }> = ({ variant = 'full' }) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-strawberry-400 to-matcha-500 flex items-center justify-center text-white font-black text-lg shadow-md">
          🍓
        </div>
        <div className="leading-tight">
          <div className="font-black text-sm tracking-tight text-slate-900 dark:text-white">CAIWP</div>
          <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">MQA Assessment</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center select-none text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-strawberry-300 via-strawberry-200 to-matcha-300 flex items-center justify-center text-4xl shadow-xl mb-4 relative">
        🍓
        <span className="absolute -bottom-2 -right-2 text-2xl">🍵</span>
        <span className="absolute -top-3 -left-3 text-xl">🦋</span>
      </div>
      <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
        CAIWP <span className="text-gradient">MQA Assessment</span>
      </h1>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">
        Certified AI Workplace Practitioner &middot; Trainito Academy ♡
      </p>
    </div>
  );
};
