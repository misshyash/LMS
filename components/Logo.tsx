
import React from 'react';

export const Logo: React.FC<{ variant?: 'full' | 'compact' | 'cert' }> = ({ variant = 'full' }) => {
  // Direct link to the premium asset provided
  const logoUrl = "https://i.postimg.cc/05X5wGHy/trainito-2048x1152-premium.png";

  if (variant === 'cert') {
    return (
      <div className="flex flex-col items-center gap-4">
        <img 
          src={logoUrl} 
          alt="Partnership Excellence" 
          className="h-48 w-auto object-contain mix-blend-multiply dark:mix-blend-normal filter drop-shadow-lg" 
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 no-print group cursor-pointer">
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="h-16 w-auto object-contain transition-transform group-hover:scale-105" 
        />
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
        <span className="text-[11px] font-black tracking-[0.3em] text-slate-500 dark:text-slate-400 uppercase">
          RWG PARTNER
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center no-print select-none group w-full max-w-4xl mx-auto py-4 text-center animate-in fade-in zoom-in-95 duration-1000">
      {/* Premium Excellence Badge */}
      <div className="inline-flex items-center gap-3 mb-6 bg-white/20 dark:bg-slate-800/20 backdrop-blur-2xl px-8 py-3 rounded-full border border-white/40 dark:border-white/10 shadow-lg ring-1 ring-trainito-teal/30 transition-all hover:ring-trainito-teal/50">
        <div className="w-2.5 h-2.5 bg-trainito-teal rounded-full animate-pulse shadow-[0_0_15px_rgba(102,194,189,1)]"></div>
        <span className="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.4em] whitespace-nowrap">
          TRAINITO X RWG
        </span>
      </div>
      
      {/* Optimized Hero Logo */}
      <div className="relative flex flex-col items-center justify-center transition-all duration-1000 group-hover:scale-[1.03]">
        <div className="absolute inset-0 bg-trainito-teal/5 dark:bg-trainito-teal/10 blur-[80px] rounded-full scale-125 -z-10 opacity-50"></div>
        <img 
          src={logoUrl} 
          alt="Trainito RWG Partnership" 
          className="h-40 md:h-[320px] w-auto object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_25px_50px_rgba(102,194,189,0.2)]" 
        />
      </div>
    </div>
  );
};
