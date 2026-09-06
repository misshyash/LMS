import React from 'react';

export const DemoModeBanner: React.FC = () => (
  <div className="fixed top-0 left-0 right-0 z-[300] bg-amber-400 text-slate-900 text-center py-1.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-md">
    ⚠ Demo Mode — Sample data only, not a real participant or production database
  </div>
);
