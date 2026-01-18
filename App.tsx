
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Participant, ViewType, Question } from './types';
import { MODULES, PRE_POST_QUESTIONS, COLORS, Module } from './constants';
import { Logo } from './components/Logo';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [lang, setLang] = useState<'en' | 'ms'>(() => (localStorage.getItem('app_lang') as 'en' | 'ms') || 'en');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [user, setUser] = useState<Participant | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [allParticipants, setAllParticipants] = useState<Participant[]>([
    { id: '1', name: 'Ahmad Faiz', dept: 'Front Office', journey: '', preScore: 6, postScore: 9, status: 'Certified' },
    { id: '2', name: 'Siti Nurhaliza', dept: 'Gaming', journey: '', preScore: 4, postScore: null, status: 'In Progress' },
    { id: '3', name: 'John Doe', dept: 'F&B', journey: '', preScore: 7, postScore: 8, status: 'Certified' },
    { id: '4', name: 'Ling Ling', dept: 'Casino', journey: '', preScore: 5, postScore: null, status: 'In Progress' },
  ]);

  const [moduleScores, setModuleScores] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('module_scores');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('module_scores', JSON.stringify(moduleScores));
    localStorage.setItem('app_lang', lang);
  }, [moduleScores, lang]);

  const t = (en: string, ms: string) => lang === 'en' ? en : ms;

  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [quizType, setQuizType] = useState<'pre' | 'post' | 'modular'>('pre');
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [showModuleIntro, setShowModuleIntro] = useState(true);
  const [showSupport, setShowSupport] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>("");

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY || '' }), []);

  const currentQuestionPool = useMemo(() => {
    if (quizType === 'modular' && activeModule) return activeModule.questions;
    return PRE_POST_QUESTIONS;
  }, [quizType, activeModule]);

  const currentQuestion = currentQuestionPool[quizIdx];

  const playSound = useCallback((type: 'correct' | 'incorrect') => {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const now = ctx.currentTime;
    if (type === 'correct') {
      osc.frequency.setValueAtTime(523, now); osc.start(); osc.stop(now + 0.3);
    } else {
      osc.frequency.setValueAtTime(150, now); osc.start(); osc.stop(now + 0.3);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
  }, [theme]);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = fd.get('username') as string;
    const dept = fd.get('department') as string;

    if (adminMode) {
       navigateTo('hr');
       return;
    }

    if (isNewUser && (fd.get('email') !== fd.get('confirmEmail'))) {
      alert(t("Emails do not match!", "E-mel tidak sepadan!"));
      return;
    }
    
    if (u) {
      const newUser: Participant = { 
        id: Date.now().toString(), 
        name: u, 
        dept: dept || 'RWG Ambassador', 
        journey: '', 
        preScore: null, 
        postScore: null, 
        status: 'In Progress' as const 
      };
      setUser(newUser); navigateTo('dashboard');
    }
  };

  const startQuiz = (type: 'pre' | 'post' | 'modular', mod?: Module) => {
    if (type === 'pre' && user?.preScore !== null) return;
    setQuizType(type); setQuizIdx(0); setQuizScore(0);
    setSelectedOpt(null); setIsAnswering(false); setShowModuleIntro(true);
    if (mod) setActiveModule(mod); navigateTo('quiz');
  };

  const handleNext = () => {
    const nextIdx = quizIdx + 1;
    if (nextIdx < currentQuestionPool.length) {
      setQuizIdx(nextIdx); setSelectedOpt(null); setIsAnswering(false);
    } else {
      if (quizType === 'modular' && activeModule) {
        setModuleScores(prev => ({ ...prev, [activeModule.id]: quizScore })); 
        navigateTo('modular-menu');
      } else {
        const isCertified = quizType === 'post' && quizScore >= 8;
        setUser(prev => prev ? ({ 
          ...prev, 
          [quizType === 'pre' ? 'preScore' : 'postScore']: quizScore, 
          status: isCertified ? 'Certified' : prev.status 
        }) : null);
        
        if (quizType === 'pre') navigateTo('dashboard');
        else if (isCertified) navigateTo('certificate');
        else navigateTo('dashboard');
      }
    }
  };

  const glassCard = "glass rounded-[2.5rem] p-8 shadow-xl transition-all duration-500 border border-white/20";

  const LangSwitcher = ({ prominent = false }: { prominent?: boolean }) => (
    <div className={`flex bg-slate-900/5 dark:bg-slate-100/10 p-1 rounded-full border border-white/20 backdrop-blur-xl ${prominent ? 'mb-4' : ''}`}>
      <button onClick={() => setLang('en')} className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'en' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-400'}`}>EN</button>
      <button onClick={() => setLang('ms')} className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'ms' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'text-slate-400'}`}>MS</button>
    </div>
  );

  const digitalSignature = (
    <div className="relative inline-block mt-2">
      <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-80">
        <path d="M10,40 Q30,10 50,35 T90,20 S110,50 100,55" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-900 dark:text-white" />
        <path d="M20,45 Q40,15 60,40 T100,25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-800 dark:text-slate-300" />
      </svg>
    </div>
  );

  const filteredParticipants = allParticipants.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-500 selection:bg-trainito-teal/30">
      <header className="fixed top-0 left-0 right-0 z-[100] no-print px-8 py-3 glass border-b border-white/10 flex items-center justify-between">
        <Logo variant="compact" />
        <div className="flex items-center gap-4">
          {user && currentView !== 'dashboard' && (
             <button 
                onClick={() => navigateTo('dashboard')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-trainito-teal hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"
             >
               🏠 {t("HOME", "UTAMA")}
             </button>
          )}
          {currentView === 'hr' && (
             <button 
                onClick={() => { setAdminMode(false); navigateTo('login'); }}
                className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
             >
               {t("Logout Admin", "Log Keluar Admin")}
             </button>
          )}
          <LangSwitcher />
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-lg shadow-sm">{theme === 'light' ? '☀️' : '🌙'}</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-8 pt-24">
        {currentView === 'login' && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
            <Logo variant="full" />
            <div className="w-full max-w-lg mt-2">
              <div className="flex justify-center mb-4"><LangSwitcher prominent /></div>
              <div className={`${glassCard} border-0 ring-1 ring-white/30 p-8 flex flex-col items-center relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-trainito-teal via-trainito-coral to-trainito-teal"></div>
                <h1 className="text-3xl font-black mb-2 dark:text-white uppercase tracking-tighter leading-none text-center">
                  {t("Warm Hearts,", "Hati Hangat,")} <br/><span className="text-gradient">{t("Happy Guests", "Tetamu Gembira")}</span>
                </h1>
                
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-full mb-6">
                    <button onClick={() => { setIsNewUser(false); setAdminMode(false); }} className={`px-5 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${!isNewUser && !adminMode ? 'bg-white dark:bg-slate-700 text-trainito-teal shadow-sm' : 'text-slate-400'}`}>{t("Login", "Masuk")}</button>
                    <button onClick={() => { setIsNewUser(true); setAdminMode(false); }} className={`px-5 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${isNewUser ? 'bg-white dark:bg-slate-700 text-trainito-teal shadow-sm' : 'text-slate-400'}`}>{t("Register", "Daftar")}</button>
                    <button onClick={() => { setAdminMode(true); setIsNewUser(false); }} className={`px-5 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest transition-all ${adminMode ? 'bg-white dark:bg-slate-700 text-trainito-coral shadow-sm' : 'text-slate-400'}`}>{t("Admin", "Admin")}</button>
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-3">
                  {adminMode ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Admin ID", "ID Admin")}</label>
                        <input name="username" placeholder="HR-ADMIN" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-coral/30 transition-all text-sm outline-none font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Master Key", "Kunci Induk")}</label>
                        <input name="password" type="password" placeholder="••••••••" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-coral/30 transition-all text-sm outline-none font-bold" />
                      </div>
                    </div>
                  ) : isNewUser ? (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Full Name", "Nama Penuh")}</label>
                        <input name="username" placeholder="Ahmad Faiz" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Work Email", "E-mel Kerja")}</label>
                          <input type="email" name="email" placeholder="email@rwgenting.com" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Confirm Email", "Sahkan E-mel")}</label>
                          <input type="email" name="confirmEmail" placeholder="email@rwgenting.com" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Phone No (Optional)", "No Telefon (Pilihan)")}</label>
                          <input name="phone" placeholder="01X-XXXXXXX" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Department", "Jabatan")}</label>
                          <select name="department" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold">
                            <option value="">{t("Select Dept", "Pilih Jabatan")}</option>
                            <option value="Front Office">Front Office</option>
                            <option value="F&B">Food & Beverage</option>
                            <option value="Housekeeping">Housekeeping</option>
                            <option value="Gaming">Gaming</option>
                            <option value="Casino">Casino</option>
                            <option value="Theme Park">Theme Park</option>
                            <option value="Security">Security</option>
                            <option value="Retail/Mall">Retail / Mall</option>
                            <option value="Hotel Operations">Hotel Operations</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Full Name", "Nama Penuh")}</label>
                        <input name="username" placeholder="Ahmad Faiz" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-4">{t("Department", "Jabatan")}</label>
                        <select name="department" required className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-transparent focus:border-trainito-teal/30 transition-all text-sm outline-none font-bold">
                          <option value="">{t("Select Dept", "Pilih Jabatan")}</option>
                          <option value="Front Office">Front Office</option>
                          <option value="F&B">Food & Beverage</option>
                          <option value="Housekeeping">Housekeeping</option>
                          <option value="Gaming">Gaming</option>
                          <option value="Casino">Casino</option>
                          <option value="Theme Park">Theme Park</option>
                          <option value="Security">Security</option>
                          <option value="Retail/Mall">Retail / Mall</option>
                          <option value="Hotel Operations">Hotel Operations</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  <button type="submit" className={`btn-shimmer w-full p-5 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg text-[10px] active:scale-95 transition-all mt-4 ${adminMode ? 'bg-trainito-coral' : 'bg-slate-900 dark:bg-white dark:text-slate-900'}`}>
                    {adminMode ? t("Admin Access", "Akses Admin") : isNewUser ? t("Complete Registration", "Lengkapkan Pendaftaran") : t("Enter Portal", "Masuki Portal")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {currentView === 'hr' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-end">
                 <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter dark:text-white">{t("Manager Dashboard", "Papan Pemuka Pengurus")}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t("Behavioral Analytics & Completion Tracking", "Analitik Tingkah Laku & Jejak Penyiapan")}</p>
                 </div>
                 <div className="w-64">
                    <input 
                      type="text" 
                      placeholder={t("Search by name...", "Cari nama...")} 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border-0 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-trainito-teal/20"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className={`${glassCard} p-6 border-b-4 border-trainito-teal`}>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Enrolled</p>
                    <p className="text-3xl font-black dark:text-white tabular-nums">{allParticipants.length}</p>
                 </div>
                 <div className={`${glassCard} p-6 border-b-4 border-emerald-500`}>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Certified Ambassadors</p>
                    <p className="text-3xl font-black dark:text-white tabular-nums">{allParticipants.filter(p => p.status === 'Certified').length}</p>
                 </div>
                 <div className={`${glassCard} p-6 border-b-4 border-amber-500`}>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Completion</p>
                    <p className="text-3xl font-black dark:text-white tabular-nums">74%</p>
                 </div>
                 <div className={`${glassCard} p-6 border-b-4 border-trainito-coral`}>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Post-Exam Score</p>
                    <p className="text-3xl font-black dark:text-white tabular-nums">8.2</p>
                 </div>
              </div>

              <div className={`${glassCard} p-0 overflow-hidden`}>
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                       <tr className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <th className="px-8 py-4">{t("Employee", "Pekerja")}</th>
                          <th className="px-8 py-4">{t("Department", "Jabatan")}</th>
                          <th className="px-8 py-4">{t("Pre-Score", "Skor Pra")}</th>
                          <th className="px-8 py-4">{t("Module Progress", "Progres Modul")}</th>
                          <th className="px-8 py-4">{t("Post-Score", "Skor Pasca")}</th>
                          <th className="px-8 py-4">{t("Status", "Status")}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {filteredParticipants.map(p => (
                          <tr key={p.id} className="text-xs font-bold dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                             <td className="px-8 py-5">
                                <div>{p.name}</div>
                             </td>
                             <td className="px-8 py-5">{p.dept}</td>
                             <td className="px-8 py-5 tabular-nums text-trainito-teal">{p.preScore}/10</td>
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                   <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                                      <div className="h-full bg-trainito-teal" style={{ width: p.status === 'Certified' ? '100%' : '45%' }}></div>
                                   </div>
                                   <span className="text-[9px]">{p.status === 'Certified' ? '8/8' : '3/8'}</span>
                                </div>
                             </td>
                             <td className="px-8 py-5 tabular-nums text-trainito-coral">{p.postScore ? `${p.postScore}/10` : '--'}</td>
                             <td className="px-8 py-5">
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.status === 'Certified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                   {p.status}
                                </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {currentView === 'dashboard' && user && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className={`${glassCard} flex flex-col md:flex-row justify-between items-center gap-6`}>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-trainito-teal flex items-center justify-center text-white font-black text-2xl shadow-lg ring-4 ring-trainito-teal/10">{user.name.charAt(0)}</div>
                <div className="text-left">
                  <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">{user.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500">{user.dept}</span>
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${user.status === 'Certified' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-trainito-teal/5 text-trainito-teal border-trainito-teal/20'}`}>{user.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setUser(null); navigateTo('login'); }} className="px-6 py-3 bg-white dark:bg-slate-800 rounded-xl font-black text-[9px] uppercase tracking-[0.1em] border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                  {t("Sign Out", "Keluar")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="glass p-8 rounded-[2.5rem] border-l-[8px] border-trainito-teal shadow-lg">
                  <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <span className="text-2xl">🛤️</span> {t("Your Learning Journey", "Laluan Pembelajaran")}
                  </h3>
                  <div className="space-y-3">
                    <button 
                      disabled={user.preScore !== null}
                      onClick={() => startQuiz('pre')} 
                      className={`w-full flex items-center justify-between p-6 rounded-3xl border transition-all ${user.preScore !== null ? 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 opacity-60 grayscale cursor-not-allowed' : 'bg-white/50 dark:bg-slate-900/50 border-white/20 hover:border-trainito-teal group'}`}
                    >
                      <div className="text-left flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${user.preScore !== null ? 'bg-slate-200 text-slate-500' : 'bg-trainito-teal/10 text-trainito-teal'}`}>01</div>
                        <div>
                          <h4 className="font-black text-sm uppercase dark:text-white">{t("Step 1: Pre-Assessment", "Langkah 1: Pra-Penilaian")}</h4>
                          <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">
                            {user.preScore !== null ? t("Attempt Completed", "Percubaan Selesai") : t("1 Attempt Only - Baseline", "1 Percubaan Sahaja - Asas")}
                          </p>
                        </div>
                      </div>
                      <div className="text-xl font-black text-trainito-teal tabular-nums">
                        {user.preScore !== null ? `${user.preScore}/10` : '→'}
                      </div>
                    </button>

                    <button 
                      onClick={() => navigateTo('modular-menu')} 
                      className="w-full flex items-center justify-between p-6 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-white/20 hover:border-trainito-teal transition-all group"
                    >
                      <div className="text-left flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center text-sm font-black">02</div>
                        <div>
                          <h4 className="font-black text-sm uppercase dark:text-white">{t("Step 2: Skill Modules", "Langkah 2: Modul Kemahiran")}</h4>
                          <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">{t("Interactive Training", "Latihan Interaktif")}</p>
                        </div>
                      </div>
                      <span className="text-xl text-trainito-teal group-hover:translate-x-1 transition-transform">→</span>
                    </button>

                    <button 
                      onClick={() => startQuiz('post')} 
                      className={`w-full flex items-center justify-between p-6 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-white/20 hover:border-trainito-coral transition-all group ${Object.keys(moduleScores).length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-left flex items-center gap-4">
                        <div className="w-10 h-10 bg-trainito-coral/10 text-trainito-coral rounded-xl flex items-center justify-center text-sm font-black">03</div>
                        <div>
                          <h4 className="font-black text-sm uppercase dark:text-white">{t("Step 3: Final Exam", "Langkah 3: Peperiksaan Akhir")}</h4>
                          <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">{t("Unlock Certification", "Buka Sijil")}</p>
                        </div>
                      </div>
                      <div className="text-xl font-black text-trainito-coral tabular-nums">
                        {user.postScore !== null ? `${user.postScore}/10` : '→'}
                      </div>
                    </button>

                    <button 
                      onClick={() => navigateTo('certificate')} 
                      className={`w-full flex items-center justify-between p-6 rounded-3xl border transition-all ${user.status === 'Certified' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-500/30' : 'bg-slate-50/30 dark:bg-slate-900/20 border-dashed border-slate-300 dark:border-slate-700'}`}
                    >
                      <div className="text-left flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${user.status === 'Certified' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>04</div>
                        <div>
                          <h4 className="font-black text-sm uppercase dark:text-white">{t("Step 4: Official Certificate", "Langkah 4: Sijil Rasmi")}</h4>
                          <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">
                            {user.status === 'Certified' ? t("Downloadable Document", "Dokumen Boleh Dimuat Turun") : t("View Sample (Locked)", "Lihat Sampel (Dikunci)")}
                          </p>
                        </div>
                      </div>
                      <div className="text-xl">{user.status === 'Certified' ? '📜' : '🔒'}</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className={`${glassCard} border-b-[8px] border-trainito-coral text-center flex flex-col justify-center items-center py-10 rounded-[2.5rem]`}>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t("Overall Progress", "Kemajuan Keseluruhan")}</p>
                <div className="text-7xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter leading-none">
                  {user.postScore ?? user.preScore ?? '--'}
                </div>
                <div className="mt-6 px-4 py-1.5 bg-trainito-coral/5 text-trainito-coral rounded-full text-[8px] font-black uppercase tracking-[0.1em] border border-trainito-coral/10">
                  {user.status === 'Certified' ? t("Gold Mastery", "Masteri Emas") : t("Learning Mode", "Mod Belajar")}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'modular-menu' && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter dark:text-white">{t("Module Library", "Perpustakaan Modul")}</h2>
                <p className="text-slate-400 font-bold uppercase text-[8px] tracking-[0.2em]">{t("Complete modules to unlock final exam", "Selesaikan modul untuk peperiksaan akhir")}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MODULES.map((m) => {
                const score = moduleScores[m.id] || 0;
                const percentage = Math.round((score / m.questions.length) * 100);
                const isMastered = percentage >= 80;
                return (
                  <div 
                    key={m.id} 
                    onClick={() => startQuiz('modular', m)} 
                    className={`${glassCard} group relative flex flex-col p-6 cursor-pointer hover:border-trainito-teal/40 hover:-translate-y-1 transition-all rounded-3xl`}
                  >
                    <div className="invisible group-hover:visible absolute bottom-[105%] left-0 right-0 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl z-50 pointer-events-none text-[10px] border border-white/10 animate-in fade-in zoom-in-95">
                      <p className="font-black text-trainito-teal mb-1 uppercase tracking-tighter">{t("Overview", "Ringkasan")}</p>
                      <p className="font-medium leading-relaxed mb-2 opacity-90">{m.definition}</p>
                      <ul className="space-y-1">
                        {m.points.slice(0, 2).map((p, i) => <li key={i} className="flex gap-1"><span>•</span>{p}</li>)}
                      </ul>
                    </div>

                    <div className="flex justify-between mb-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isMastered ? 'bg-trainito-teal text-white' : 'bg-trainito-teal/10 text-trainito-teal'}`}>0{m.id}</div>
                      {isMastered && <span className="text-lg">✅</span>}
                    </div>
                    <h3 className="text-sm font-black uppercase dark:text-white leading-tight mb-4">{m.title}</h3>
                    <div className="mt-auto pt-2 space-y-2">
                      <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <span>{t("Progress", "Progres")}</span>
                        <span className={isMastered ? 'text-trainito-teal' : ''}>{percentage}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ${isMastered ? 'bg-trainito-teal' : 'bg-slate-300'}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentView === 'quiz' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
            {showModuleIntro ? (
              <div className={`${glassCard} text-center py-16 flex flex-col items-center border-t-4 border-trainito-teal`}>
                <h2 className="text-4xl font-black dark:text-white uppercase mb-4 tracking-tighter">
                  {quizType === 'pre' ? t('Pre-Assessment', 'Pra-Penilaian') : quizType === 'post' ? t('Final Exam', 'Peperiksaan Akhir') : activeModule?.title}
                </h2>
                <p className="text-sm text-slate-500 font-bold mb-10 uppercase tracking-widest max-w-sm">
                  {quizType === 'pre' ? t('Establish your starting baseline. 1 attempt only.', 'Tetapkan asas permulaan anda. 1 percubaan sahaja.') : t('Test your mastery and earn points.', 'Uji kepakaran anda dan kumpul mata.')}
                </p>
                <button onClick={() => setShowModuleIntro(false)} className="px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                  {t('Begin Test', 'Mula Ujian')}
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center px-4">
                  <span className="text-[10px] font-black uppercase text-trainito-teal tracking-widest">{quizType.toUpperCase()} MODE</span>
                  <span className="text-2xl font-black dark:text-white tabular-nums">{quizIdx + 1} <span className="text-slate-300">/</span> {currentQuestionPool.length}</span>
                </div>
                <div className={`${glassCard} p-10 border-0 shadow-2xl bg-white dark:bg-slate-900/80`}>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mb-10 leading-snug">{currentQuestion.q}</p>
                  <div className="space-y-3">
                    {currentQuestion.o.map((opt, i) => {
                      const isSelected = selectedOpt === opt;
                      const isCorrect = opt === currentQuestion.a;
                      let style = "border-slate-100 dark:border-slate-800 hover:border-trainito-teal/30 bg-slate-50/50 dark:bg-slate-800/20";
                      if (isAnswering) {
                        if (isCorrect) style = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600";
                        else if (isSelected) style = "border-trainito-coral bg-rose-50 dark:bg-rose-950/20 text-rose-600";
                        else style = "opacity-20 pointer-events-none";
                      } else if (isSelected) style = "border-trainito-teal ring-4 ring-trainito-teal/10 bg-trainito-teal/5";

                      return (
                        <button key={i} disabled={isAnswering} onClick={() => {
                          setSelectedOpt(opt); setIsAnswering(true);
                          const correct = opt === currentQuestion.a;
                          playSound(correct ? 'correct' : 'incorrect');
                          if (correct) { setQuizScore(s => s + 1); setTimeout(handleNext, 600); }
                          else {
                             setAiResponse(t("Consider how the guest feels in this scenario. Service is about heart!", "Fikirkan perasaan tetamu dalam senario ini. Servis adalah tentang hati!"));
                             setShowSupport(true);
                          }
                        }} className={`w-full p-5 rounded-2xl text-left font-bold text-sm border-2 transition-all flex items-center group ${style}`}>
                          <span className="w-8 h-8 rounded-lg bg-white/50 dark:bg-slate-700 flex items-center justify-center mr-4 text-[10px] font-black uppercase text-slate-400 group-hover:bg-trainito-teal group-hover:text-white transition-all">{String.fromCharCode(65 + i)}</span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'certificate' && user && (
          <div className="animate-in zoom-in duration-700 flex flex-col items-center">
             <div id="certificate-print" className="relative max-w-[900px] w-full aspect-[1.414/1] bg-white p-12 border-[20px] border-slate-50 text-slate-900 certificate-shadow overflow-hidden">
                {user.status !== 'Certified' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none opacity-[0.07] rotate-[-35deg] select-none">
                    <span className="text-[180px] font-black uppercase tracking-widest">{t("SAMPLE", "CONTOH")}</span>
                  </div>
                )}
                <div className="h-full flex flex-col items-center justify-between border-[2px] border-trainito-teal/20 p-10 text-center bg-white/95 relative z-10">
                   <Logo variant="cert" />
                   <div className="space-y-6">
                      <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">{t("Certificate of Excellence", "Sijil Kecemerlangan")}</p>
                      <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase border-b-4 border-trainito-teal/10 pb-4 inline-block">
                        {user.status === 'Certified' ? user.name : "YOUR NAME HERE"}
                      </h3>
                      <p className="text-sm text-slate-600 font-bold uppercase tracking-widest mt-4">
                        {t("Successfully completed the Mastery Program", "Telah berjaya menyempurnakan Program Masteri")} <br/>
                        <span className="text-trainito-teal">"WARM HEARTS, HAPPY GUESTS"</span>
                      </p>
                   </div>
                   <div className="w-full flex justify-between px-10 text-[8px] font-black uppercase text-slate-400">
                      <div className="text-center pt-2 w-32">
                         {user.status === 'Certified' && digitalSignature}
                         <div className="border-t border-slate-900 mt-1">Mimi Natasha<br/>CEO, Trainito</div>
                      </div>
                      <div className="text-center pt-2 w-32 flex flex-col justify-end">
                         <div className="border-t border-slate-900">
                           {user.status === 'Certified' ? new Date().toLocaleDateString('en-GB') : "--/--/----"}<br/>
                           Date of Issue
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             
             {user.status !== 'Certified' ? (
                <div className="mt-10 p-6 bg-amber-50 dark:bg-amber-950/20 rounded-3xl border border-amber-200 dark:border-amber-800/50 text-center max-w-md">
                   <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-4">
                     {t("This is a preview of your certificate. Complete the Final Exam with at least 8/10 to unlock your official downloadable version.", "Ini adalah pratonton sijil anda. Selesaikan Peperiksaan Akhir dengan sekurang-kurangnya 8/10 untuk membuka versi rasmi.")}
                   </p>
                   <button onClick={() => navigateTo('dashboard')} className="px-8 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                      {t("Return to Learning", "Kembali Belajar")}
                   </button>
                </div>
             ) : (
                <div className="flex gap-4 mt-10 no-print">
                   <button onClick={() => window.print()} className="px-8 py-3 bg-trainito-teal text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Print PDF</button>
                </div>
             )}
          </div>
        )}
      </main>

      {showSupport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 px-4">
          <div className={`${glassCard} p-10 max-w-md w-full text-center border-t-8 border-trainito-coral shadow-2xl`}>
            <div className="w-16 h-16 bg-trainito-coral rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black shadow-lg ring-8 ring-trainito-coral/10">A</div>
            <h4 className="text-xl font-black text-slate-800 dark:text-white mb-4 uppercase">{t("Coach Asha's Feedback", "Maklum Balas Coach Asha")}</h4>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 italic mb-10 leading-relaxed font-serif">"{aiResponse}"</p>
            <button onClick={() => { setShowSupport(false); handleNext(); }} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-transform">
              {t("I Understand - Continue", "Faham - Teruskan")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
