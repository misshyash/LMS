import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { backend } from '../../services';
import { DEMO_MODE, functions } from '../../firebase';
import { DEFAULT_ASSESSMENT_ID } from '../../types';

export const SetupTab: React.FC = () => {
  const [seedingAssessment, setSeedingAssessment] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSeedAssessment = async () => {
    setSeedingAssessment(true);
    setMessage(null);
    try {
      await httpsCallable(functions!, 'seedAssessment')({ assessmentId: DEFAULT_ASSESSMENT_ID });
      setMessage('Assessment questions & answer key seeded successfully.');
    } catch (e) {
      setMessage(e instanceof Error ? `Error: ${e.message}` : 'Failed to seed assessment.');
    } finally {
      setSeedingAssessment(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    setMessage(null);
    try {
      await backend.seedDemoTraffic(12);
      setMessage('Seeded 12 simulated candidates (clearly flagged as demo data).');
    } catch (e) {
      setMessage(e instanceof Error ? `Error: ${e.message}` : 'Failed to seed demo traffic.');
    } finally {
      setSeedingDemo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="glass rounded-[2.5rem] p-8 shadow-lg">
        <h3 className="text-lg font-black uppercase tracking-tight mb-2">1. Initialize Assessment Bank</h3>
        <p className="text-xs text-slate-400 font-bold mb-6">
          Run once per environment. Populates the public <code>questions</code> collection and the
          server-only <code>answer_keys</code> collection from the real 30-question CAIWP MQA bank.
          Safe to re-run — it overwrites with the same content (idempotent).
        </p>
        <button
          onClick={handleSeedAssessment}
          disabled={seedingAssessment || DEMO_MODE}
          className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40"
        >
          {seedingAssessment ? 'Seeding…' : 'Initialize Assessment Bank'}
        </button>
        {DEMO_MODE && <p className="text-[10px] text-amber-600 font-bold mt-3">Not available in Demo Mode — connect a real Firebase project first.</p>}
      </div>

      <div className="glass rounded-[2.5rem] p-8 shadow-lg">
        <h3 className="text-lg font-black uppercase tracking-tight mb-2">2. Seed Demo Traffic</h3>
        <p className="text-xs text-slate-400 font-bold mb-6">
          Adds a handful of clearly-flagged (<code>isDemo: true</code>) simulated candidates in various
          states — not started, mid-assessment, submitted — so you can demonstrate the live monitor and
          analytics before real participants log in. Toggle "Include Demo Data" above to show/hide them.
        </p>
        <button
          onClick={handleSeedDemo}
          disabled={seedingDemo}
          className="px-6 py-3 bg-trainito-coral text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40"
        >
          {seedingDemo ? 'Seeding…' : 'Seed Demo Traffic'}
        </button>
      </div>

      <div className="glass rounded-[2.5rem] p-8 shadow-lg">
        <h3 className="text-lg font-black uppercase tracking-tight mb-2">3. Add More Admins</h3>
        <p className="text-xs text-slate-400 font-bold">
          Admin access is granted via the server-side <code>admin_allowlist</code> collection (one document
          per email), never via a password in this app. Add or remove admins from the Firebase Console →
          Firestore → <code>admin_allowlist</code>. See <code>SETUP.md</code> for exact steps.
        </p>
      </div>

      {message && (
        <p className="text-xs font-bold px-5 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
};
