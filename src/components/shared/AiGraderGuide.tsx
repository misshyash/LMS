import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CAPSTONE_RUBRIC, ALL_RUBRIC_ITEMS, FREE_MARK_ITEM_IDS } from '../../data/capstoneRubric';
import { EMBEDDED, showInViewer, saveBlob } from '../../utils/exportSink';

/**
 * "Meet your AI Grader" — a short, personalised, narrated video-style
 * walkthrough: intro → what the questions are → how we mark → pass rule →
 * what happens next. Every slide carries the participant's name, team,
 * project and batch.
 *
 *  • Voice uses the browser's built-in Web Speech API (no API key / cost).
 *  • "Download video" renders the same slides to a <canvas> and records them
 *    with MediaRecorder (WebM/MP4, captions burned in). Browsers do not allow
 *    a page to capture its own speech-synthesis audio, so the downloaded
 *    file is captioned and silent; in-app playback is voiced.
 *
 * The narration explains the grading; marks themselves are entered by the
 * coach/judges and combined automatically by the system.
 */

export interface GuideParticipant {
  name: string;
  team?: string | null;
  project?: string | null;
  batch?: string | null;
}

type Tone = 'teal' | 'sky' | 'dark' | 'green' | 'red';
interface DBox {
  title: string;
  value: string;
  tone?: Tone;
}
type DRow = { boxes: DBox[]; join?: '→' | '+' | '=' | ' ' };

interface Step {
  title: string;
  speech: string;
  emoji?: string;
  /** Flow diagram: rows of boxes, rows are joined by a down arrow. */
  rows?: DRow[];
  /** Two-column list (label, value). */
  list?: [string, string][];
}

const freeItems = ALL_RUBRIC_ITEMS.filter((i) => FREE_MARK_ITEM_IDS.includes(i.id));
const freeTotal = freeItems.reduce((s, i) => s + i.max, 0);

function buildSteps(p: GuideParticipant | null): Step[] {
  const first = p?.name?.trim().split(/\s+/)[0];
  const hi = first ? `Hi ${first}!` : 'Hi participant!';
  const teamLine = p?.team ? ` You are in ${p.team}${p.project ? `, pitching ${p.project}` : ''}.` : '';
  return [
    {
      title: `${hi} 👋`,
      emoji: '🤖',
      speech: `${hi} I'm your AI grading assistant for the CAIWP capstone project.${teamLine} In about one minute I'll explain what you are assessed on, how the marking works, and how your final score is calculated. Let's go!`,
    },
    {
      title: 'Why two assessments?',
      speech:
        'You are assessed in two ways. Your group capstone project, worth 60 marks, shows you can apply AI to a real problem as a team. The individual theory examination, worth 40 marks, checks you understand AI concepts, limitations and responsible use. Together they make 100 marks.',
      rows: [
        {
          join: ' ',
          boxes: [
            { title: 'Group capstone', value: '60 marks' },
            { title: '+', value: '', tone: 'dark' },
            { title: 'Theory exam', value: '40 marks', tone: 'sky' },
            { title: '=', value: '', tone: 'dark' },
            { title: 'Combined', value: '100 marks', tone: 'dark' },
          ],
        },
      ],
    },
    {
      title: 'The theory questions',
      speech:
        'The theory exam has 30 multiple-choice questions. Each correct answer earns one mark. Wrong or blank answers earn zero. The system marks it automatically the moment you submit, then converts your result to a score out of 40.',
      rows: [
        {
          join: '→',
          boxes: [
            { title: 'Correct answers', value: '__ / 30', tone: 'sky' },
            { title: '÷ 30 × 40', value: 'auto-marked', tone: 'sky' },
            { title: 'Theory score', value: '__ / 40', tone: 'sky' },
          ],
        },
      ],
    },
    {
      title: 'How the capstone is marked',
      speech:
        'Your capstone is marked out of 100 using ten criteria: problem and solution, research and responsible AI, implementation and budget, user experience, risk and the challenge response, slides, video, your AI chatbot, presentation, and feedback. Each item is scored in half-mark steps. Complete, credible evidence earns full marks.',
      list: CAPSTONE_RUBRIC.map((c) => [`${c.id}. ${c.title}`, String(c.max)]),
    },
    ...(freeItems.length
      ? [
          {
            title: 'Your free mark 🎁',
            speech: `Good news! ${freeItems.map((i) => i.label).join(' and ')} is a free mark. Every team automatically receives the full ${freeTotal} marks for it, so you can focus your energy on the other criteria.`,
            rows: [{ join: ' ' as const, boxes: freeItems.map((i) => ({ title: i.label, value: `${i.max} / ${i.max} free`, tone: 'green' as Tone })) }],
          },
        ]
      : []),
    {
      title: 'How the scores combine',
      speech:
        "Here's the formula. If more than one judge scores your team, their totals are averaged first. Your capstone score out of 100 is multiplied by 0.6, giving a score out of 60. Your theory score out of 40 is added on. For example: a capstone of 80 gives 48, and 21 correct answers gives 28. 48 plus 28 equals 76, which is a pass.",
      rows: [
        { join: '→', boxes: [{ title: 'Capstone raw', value: '80 / 100' }, { title: '× 0.60', value: '48 / 60' }] },
        { join: '→', boxes: [{ title: 'Theory', value: '21 / 30', tone: 'sky' }, { title: '÷ 30 × 40', value: '28 / 40', tone: 'sky' }] },
        { join: '→', boxes: [{ title: '48 + 28', value: '76 / 100', tone: 'dark' }, { title: 'Result', value: 'PASS ✓', tone: 'green' }] },
      ],
    },
    {
      title: 'The pass rule',
      speech:
        'To pass, you need a combined score of 75 or higher. The decision uses the exact, unrounded total, so 74.99 is not rounded up to a pass. The capstone score is shared by everyone in your team, while your theory score is your own.',
      rows: [
        {
          join: ' ',
          boxes: [
            { title: '75.00 or above', value: 'PASS', tone: 'green' },
            { title: 'Below 75 (e.g. 74.99)', value: 'FAIL', tone: 'red' },
          ],
        },
      ],
    },
    {
      title: 'What happens next',
      speech: `Here is what happens next. Your coach and judges review your pitch, slides, video and chatbot, and enter their marks on the score sheet. I combine everything automatically. When your coach releases the results, your final score appears on your dashboard. Good luck${first ? `, ${first}` : ''}, and make the Board say yes!`,
      rows: [
        {
          join: '→',
          boxes: [
            { title: '1 · You pitch', value: '🎤' },
            { title: '2 · Coach scores', value: '📝' },
            { title: '3 · Auto-calculated', value: '🤖' },
            { title: '4 · Results released', value: '📊', tone: 'green' },
          ],
        },
      ],
    },
  ];
}

/** Silent/video pacing: ~22 characters per second, min 4.5s per slide (~75s total). */
const stepDurationMs = (s: Step) => Math.max(4500, s.speech.length * 45);

// ---------------------------------------------------------------------------
// React rendering of a slide
// ---------------------------------------------------------------------------

const TONE_CLS: Record<Tone, string> = {
  teal: 'bg-trainito-teal/10 text-trainito-teal border-trainito-teal/30',
  sky: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
  dark: 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  red: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
};

const SlideVisual: React.FC<{ step: Step }> = ({ step }) => {
  if (step.emoji && !step.rows && !step.list) {
    return <div className="text-8xl text-center py-6">{step.emoji}</div>;
  }
  if (step.list) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 py-2">
        {step.list.map(([l, v]) => (
          <div key={l} className="flex justify-between gap-3 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="truncate">{l}</span>
            <span className="tabular-nums text-trainito-teal">{v}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center py-2">
      {step.rows?.map((row, ri) => (
        <React.Fragment key={ri}>
          {ri > 0 && <div className="text-trainito-teal font-black text-2xl py-1">↓</div>}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {row.boxes.map((b, bi) => (
              <React.Fragment key={bi}>
                {bi > 0 && row.join === '→' && <div className="text-trainito-teal font-black text-2xl px-1">→</div>}
                {b.value === '' ? (
                  <div className="text-2xl font-black text-slate-400 px-1">{b.title}</div>
                ) : (
                  <div className={`rounded-2xl border px-4 py-3 text-center min-w-[120px] ${TONE_CLS[b.tone ?? 'teal']}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest opacity-80">{b.title}</div>
                    <div className="text-lg font-black tabular-nums">{b.value}</div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

const NameBar: React.FC<{ p: GuideParticipant | null }> = ({ p }) => (
  <div className="flex flex-wrap gap-x-5 gap-y-1 px-6 py-2.5 bg-trainito-teal/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
    <span>👤 {p?.name || 'Participant'}</span>
    {p?.team && <span>👥 {p.team}</span>}
    {p?.project && <span className="normal-case tracking-normal">🏝️ {p.project}</span>}
    {p?.batch && <span>🎓 {p.batch}</span>}
    <span className="ml-auto">{new Date().toLocaleDateString()}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Canvas rendering (for the downloadable video)
// ---------------------------------------------------------------------------

const W = 1280;
const H = 720;
const CANVAS_TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  teal: { bg: '#e8f6f5', fg: '#2f8f89', border: '#9fd9d5' },
  sky: { bg: '#f0f9ff', fg: '#0369a1', border: '#bae6fd' },
  dark: { bg: '#0f172a', fg: '#ffffff', border: '#0f172a' },
  green: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
  red: { bg: '#fff1f2', fg: '#e11d48', border: '#fecdd3' },
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

function drawSlide(ctx: CanvasRenderingContext2D, step: Step, index: number, total: number, p: GuideParticipant | null, progress: number) {
  // Background + header
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, 76);
  ctx.fillStyle = '#66c2bd';
  ctx.beginPath();
  ctx.arc(52, 38, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `28px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🤖', 52, 40);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 20px ${FONT}`;
  ctx.fillText('CAIWP AI GRADER', 88, 30);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText(`Group Capstone + Theory Examination · Step ${index + 1} of ${total}`, 88, 54);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#66c2bd';
  ctx.font = `900 16px ${FONT}`;
  ctx.fillText('TRAINITO ACADEMY', W - 36, 40);

  // Participant bar
  ctx.fillStyle = '#e8f6f5';
  ctx.fillRect(0, 76, W, 44);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = `800 16px ${FONT}`;
  const bits = [`👤 ${p?.name || 'Participant'}`, p?.team && `👥 ${p.team}`, p?.project && `🏝️ ${p.project}`, p?.batch && `🎓 ${p.batch}`].filter(Boolean) as string[];
  ctx.fillText(bits.join('     '), 36, 99);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString(), W - 36, 99);

  // Progress bar
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 120, W, 6);
  ctx.fillStyle = '#66c2bd';
  ctx.fillRect(0, 120, W * ((index + progress) / total), 6);

  // Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 44px ${FONT}`;
  ctx.fillText(step.title, 56, 180);

  // Visual area: 220..520
  const top = 230;
  if (step.emoji && !step.rows && !step.list) {
    ctx.font = `150px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(step.emoji, W / 2, 380);
  } else if (step.list) {
    const colW = (W - 56 * 2 - 24) / 2;
    step.list.forEach(([l, v], i) => {
      const col = i < Math.ceil(step.list!.length / 2) ? 0 : 1;
      const row = col === 0 ? i : i - Math.ceil(step.list!.length / 2);
      const x = 56 + col * (colW + 24);
      const y = top + row * 52;
      ctx.fillStyle = '#f8fafc';
      roundRect(ctx, x, y, colW, 42, 10);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.font = `800 18px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(l, x + 16, y + 22);
      ctx.fillStyle = '#2f8f89';
      ctx.textAlign = 'right';
      ctx.fillText(`${v} marks`, x + colW - 16, y + 22);
    });
  } else if (step.rows) {
    const rowH = 84;
    const gapY = 34;
    const totalH = step.rows.length * rowH + (step.rows.length - 1) * gapY;
    let y = top + Math.max(0, (290 - totalH) / 2);
    step.rows.forEach((row, ri) => {
      if (ri > 0) {
        ctx.fillStyle = '#66c2bd';
        ctx.font = `900 28px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('↓', W / 2, y - gapY / 2);
      }
      const boxW = 220;
      const joinW = 56;
      const widths = row.boxes.map((b) => (b.value === '' ? 40 : boxW));
      const rowW = widths.reduce((s, w) => s + w, 0) + (row.boxes.length - 1) * (row.join === '→' ? joinW : 16);
      let x = (W - rowW) / 2;
      row.boxes.forEach((b, bi) => {
        if (bi > 0) {
          if (row.join === '→') {
            ctx.fillStyle = '#66c2bd';
            ctx.font = `900 34px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.fillText('→', x + joinW / 2, y + rowH / 2);
            x += joinW;
          } else x += 16;
        }
        if (b.value === '') {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `900 38px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText(b.title, x + 20, y + rowH / 2);
          x += 40;
          return;
        }
        const t = CANVAS_TONES[b.tone ?? 'teal'];
        ctx.fillStyle = t.bg;
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 2;
        roundRect(ctx, x, y, boxW, rowH, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = t.fg;
        ctx.textAlign = 'center';
        ctx.font = `900 13px ${FONT}`;
        ctx.fillText(b.title.toUpperCase(), x + boxW / 2, y + 28);
        ctx.font = `900 26px ${FONT}`;
        ctx.fillText(b.value, x + boxW / 2, y + 58);
        x += boxW;
      });
      y += rowH + gapY;
    });
  }

  // Caption
  ctx.font = `600 20px ${FONT}`;
  const lines = wrap(ctx, step.speech, W - 56 * 2 - 40);
  const capH = lines.length * 28 + 32;
  const capY = H - capH - 24;
  ctx.fillStyle = '#f1f5f9';
  roundRect(ctx, 56, capY, W - 112, capH, 16);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, 76, capY + 16 + i * 28));
  ctx.textBaseline = 'middle';
}

async function recordVideo(steps: Step[], p: GuideParticipant | null, onProgress: (pct: number) => void): Promise<{ blob: Blob; ext: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = types.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t));
  if (!mimeType) throw new Error('This browser cannot record video. Try Chrome or Edge.');
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));

  const durations = steps.map(stepDurationMs);
  const total = durations.reduce((s, d) => s + d, 0);
  drawSlide(ctx, steps[0], 0, steps.length, p, 0);
  rec.start(250);
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = performance.now() - start;
      if (t >= total) return resolve();
      let acc = 0;
      let i = 0;
      while (i < durations.length - 1 && t > acc + durations[i]) acc += durations[i++];
      drawSlide(ctx, steps[i], i, steps.length, p, Math.min(1, (t - acc) / durations[i]));
      onProgress(Math.round((t / total) * 100));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  return { blob: new Blob(chunks, { type: mimeType.split(';')[0] }), ext: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' };
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported) return null;
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  return english.find((v) => /natural|neural|google|samantha|aria|jenny/i.test(v.name)) ?? english[0] ?? voices[0] ?? null;
}

interface GuideProps {
  onClose: () => void;
  participant?: GuideParticipant | null;
  /** Admin/coach mode: pick which participant the slides are personalised for. */
  participants?: GuideParticipant[];
}

export const AiGraderGuide: React.FC<GuideProps> = ({ onClose, participant = null, participants }) => {
  const [selectedIdx, setSelectedIdx] = useState(-1); // -1 = generic / provided participant
  const current = participants && selectedIdx >= 0 ? participants[selectedIdx] : participant;
  const steps = useMemo(() => buildSteps(current), [current]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(!speechSupported);
  const [recording, setRecording] = useState<number | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const playingRef = useRef(false);
  playingRef.current = playing;

  const stopSpeech = () => {
    if (speechSupported) window.speechSynthesis.cancel();
  };

  const speak = useCallback(
    (index: number) => {
      if (!speechSupported || muted) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(steps[index].speech);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.rate = 1;
      u.pitch = 1.05;
      u.onend = () => {
        if (playingRef.current && index < steps.length - 1) setStep(index + 1);
        else if (index >= steps.length - 1) setPlaying(false);
      };
      window.speechSynthesis.speak(u);
    },
    [muted, steps]
  );

  useEffect(() => {
    if (playing) speak(step);
  }, [step, playing, speak]);

  // Captions-only mode: advance on a timer.
  useEffect(() => {
    if (!playing || !muted) return;
    const t = setTimeout(() => (step < steps.length - 1 ? setStep(step + 1) : setPlaying(false)), stepDurationMs(steps[step]));
    return () => clearTimeout(t);
  }, [playing, muted, step, steps]);

  useEffect(
    () => () => {
      stopSpeech();
    },
    []
  );

  const go = (i: number) => {
    stopSpeech();
    setStep(Math.min(steps.length - 1, Math.max(0, i)));
  };

  const togglePlay = () => {
    if (playing) {
      stopSpeech();
      setPlaying(false);
    } else {
      if (step === steps.length - 1) setStep(0);
      setPlaying(true);
    }
  };

  const close = () => {
    stopSpeech();
    onClose();
  };

  const download = async () => {
    stopSpeech();
    setPlaying(false);
    setRecError(null);
    setRecording(0);
    try {
      const { blob, ext } = await recordVideo(steps, current, setRecording);
      const slug = (current?.name || 'participants').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `caiwp-ai-grader-${slug}.${ext}`;
      if (EMBEDDED) showInViewer({ kind: 'video', filename, blob });
      else saveBlob(filename, blob);
    } catch (e: any) {
      setRecError(e?.message ?? 'Could not record the video.');
    } finally {
      setRecording(null);
    }
  };

  const s = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Meet your AI Grader"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-trainito-teal flex items-center justify-center text-xl ${playing && !muted ? 'animate-pulse' : ''}`}>🤖</div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest">CAIWP AI Grader</div>
              <div className="text-[10px] text-slate-400 font-bold">
                {recording !== null ? `Recording video… ${recording}%` : playing ? (muted ? 'Playing (captions only)…' : 'Speaking…') : 'Paused'} · Step {step + 1} of {steps.length}
              </div>
            </div>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-white text-xl font-black px-2" aria-label="Close">
            ✕
          </button>
        </div>

        {participants && participants.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Personalise for</span>
            <select
              value={selectedIdx}
              onChange={(e) => {
                stopSpeech();
                setPlaying(false);
                setStep(0);
                setSelectedIdx(Number(e.target.value));
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold outline-none dark:text-white"
            >
              <option value={-1}>All participants (generic)</option>
              {participants.map((p, i) => (
                <option key={i} value={i}>
                  {p.name}
                  {p.team ? ` — ${p.team}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <NameBar p={current} />
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <div className="h-1 bg-trainito-teal transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="p-6 md:p-8 min-h-[340px] flex flex-col">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{s.title}</h2>
          <div className="flex-1">
            <SlideVisual step={s} />
          </div>
          <p className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">💬 {s.speech}</p>
          {recError && <p className="mt-2 text-xs font-bold text-rose-600">{recError}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full ${i === step ? 'bg-trainito-teal' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {speechSupported && (
              <button
                onClick={() => {
                  stopSpeech();
                  setMuted((m) => !m);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300"
              >
                {muted ? '🔇 Voice off' : '🔊 Voice on'}
              </button>
            )}
            <button
              onClick={download}
              disabled={recording !== null}
              title="Saves a captioned video of these slides (silent — browsers cannot record their own voice)"
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              {recording !== null ? `⏺ ${recording}%` : '⬇ Download video'}
            </button>
            <button onClick={() => go(step - 1)} disabled={step === 0} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 disabled:opacity-40">
              ← Back
            </button>
            <button onClick={togglePlay} disabled={recording !== null} className="px-5 py-2 rounded-xl bg-trainito-teal text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
              {playing ? '❚❚ Pause' : step === 0 ? '▶ Play' : step === steps.length - 1 ? '↺ Replay' : '▶ Resume'}
            </button>
            <button
              onClick={() => go(step + 1)}
              disabled={step === steps.length - 1}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Launcher button + modal. */
export const AiGraderLauncher: React.FC<{
  label?: string;
  className?: string;
  participant?: GuideParticipant | null;
  participants?: GuideParticipant[];
}> = ({ label = '🤖 Meet your AI Grader', className, participant, participants }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? 'px-5 py-3 rounded-xl bg-trainito-teal text-white font-black text-[10px] uppercase tracking-widest shadow'}>
        {label}
      </button>
      {open && <AiGraderGuide onClose={() => setOpen(false)} participant={participant} participants={participants} />}
    </>
  );
};
