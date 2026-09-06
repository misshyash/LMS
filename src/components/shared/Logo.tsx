import React from 'react';

export const Logo: React.FC<{ variant?: 'full' | 'compact' }> = ({ variant = 'full' }) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-trainito-teal to-slate-800 flex items-center justify-center text-white font-black text-sm shadow-md">
          AI
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
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-trainito-teal to-slate-800 flex items-center justify-center text-white font-black text-3xl shadow-xl mb-4">
        AI
      </div>
      <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
        CAIWP <span className="text-gradient">MQA Assessment</span>
      </h1>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">
        Certified AI Workplace Practitioner &middot; Trainito Academy
      </p>
    </div>
  );
};
