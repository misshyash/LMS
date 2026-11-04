import React, { useState } from 'react';

/**
 * Kawaii flying butterflies 🦋 — a decorative, click-through layer.
 * Hidden automatically for viewers who prefer reduced motion (see index.css),
 * and can be switched off with the toggle (remembered in this browser).
 */

const STORAGE_KEY = 'caiwp.butterflies';

const PALETTES = [
  { top: '#f57a9b', bottom: '#ffc6d6', spot: '#ffffff' }, // strawberry
  { top: '#86b35f', bottom: '#c9e1b4', spot: '#fff6f8' }, // matcha
  { top: '#fca0b9', bottom: '#e4f0d9', spot: '#ffffff' }, // strawberry matcha swirl
];

// Each butterfly: flight path, duration (s), start offset (s), size (px), palette.
const FLOCK = [
  { path: 'a', dur: 26, delay: 0, size: 46, pal: 0 },
  { path: 'b', dur: 31, delay: -9, size: 38, pal: 1 },
  { path: 'c', dur: 22, delay: -4, size: 34, pal: 2 },
  { path: 'a', dur: 35, delay: -18, size: 42, pal: 1 },
  { path: 'b', dur: 28, delay: -21, size: 30, pal: 0 },
  { path: 'c', dur: 33, delay: -15, size: 36, pal: 0 },
];

const Butterfly: React.FC<{ size: number; pal: number; id: string; flap: number }> = ({ size, pal, id, flap }) => {
  const c = PALETTES[pal];
  const wingStyle = { animationDuration: `${flap}s` };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.top} />
          <stop offset="1" stopColor={c.bottom} />
        </linearGradient>
      </defs>
      <g className="bf-wing-l" style={wingStyle}>
        <path d="M31 30 C 20 8, 2 8, 5 24 C 7 33, 20 34, 31 31 Z" fill={`url(#${id}-t)`} />
        <path d="M31 33 C 18 36, 8 46, 15 53 C 21 58, 29 46, 31 35 Z" fill={c.bottom} />
        <circle cx="14" cy="20" r="3" fill={c.spot} opacity="0.85" />
        <circle cx="19" cy="46" r="2" fill={c.spot} opacity="0.85" />
      </g>
      <g className="bf-wing-r" style={wingStyle}>
        <path d="M33 30 C 44 8, 62 8, 59 24 C 57 33, 44 34, 33 31 Z" fill={`url(#${id}-t)`} />
        <path d="M33 33 C 46 36, 56 46, 49 53 C 43 58, 35 46, 33 35 Z" fill={c.bottom} />
        <circle cx="50" cy="20" r="3" fill={c.spot} opacity="0.85" />
        <circle cx="45" cy="46" r="2" fill={c.spot} opacity="0.85" />
      </g>
      <ellipse cx="32" cy="34" rx="2.6" ry="12" fill="#553f49" />
      <circle cx="32" cy="21" r="3.2" fill="#553f49" />
      <path d="M31 19 C 28 12, 25 10, 23 10 M33 19 C 36 12, 39 10, 41 10" stroke="#553f49" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="23" cy="10" r="1.6" fill={c.top} />
      <circle cx="41" cy="10" r="1.6" fill={c.top} />
    </svg>
  );
};

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export const Butterflies: React.FC = () => {
  const [on, setOn] = useState(readPref);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
    } catch {
      /* storage unavailable: keep for this visit only */
    }
  };

  return (
    <>
      {on && (
        <div className="bf-layer" aria-hidden="true">
          {FLOCK.map((b, i) => (
            <div
              key={i}
              className="bf"
              style={{ animation: `bf-fly-${b.path} ${b.dur}s linear ${b.delay}s infinite` }}
            >
              <Butterfly size={b.size} pal={b.pal} id={`bf${i}`} flap={0.34 + (i % 3) * 0.06} />
            </div>
          ))}
        </div>
      )}
      <button
        onClick={toggle}
        title={on ? 'Hide butterflies' : 'Show butterflies'}
        aria-pressed={on}
        className="fixed z-40 px-3 py-2 rounded-full bg-white/90 dark:bg-slate-900/90 border-2 border-strawberry-200 dark:border-strawberry-900 text-[10px] font-black uppercase tracking-widest text-strawberry-600 dark:text-strawberry-300 shadow-lg hover:scale-105 transition-transform"
        style={{
          right: 'max(16px, env(safe-area-inset-right, 0px))',
          bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        🦋 {on ? 'On' : 'Off'}
      </button>
    </>
  );
};
