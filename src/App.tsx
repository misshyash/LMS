import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { DEMO_MODE } from './firebase';
import { DemoModeBanner } from './components/shared/DemoModeBanner';
import { Logo } from './components/shared/Logo';
import { LoginScreen } from './components/auth/LoginScreen';
import { ProfileSetup } from './components/candidate/ProfileSetup';
import { CandidateDashboard } from './components/candidate/CandidateDashboard';
import { AssessmentRunner } from './components/candidate/AssessmentRunner';
import { ResultsScreen } from './components/candidate/ResultsScreen';
import { AdminLayout } from './components/admin/AdminLayout';

type CandidateView = { name: 'dashboard' } | { name: 'assessment'; attemptId: string } | { name: 'results'; attemptId: string };

const CandidateApp: React.FC = () => {
  const { profile } = useAuth();
  const [view, setView] = useState<CandidateView>({ name: 'dashboard' });

  if (!profile || !profile.batch) return <ProfileSetup />;

  if (view.name === 'assessment') {
    return (
      <AssessmentRunner
        attemptId={view.attemptId}
        assessmentId={profile.assessmentId!}
        onSubmitted={(attemptId) => setView({ name: 'results', attemptId })}
      />
    );
  }

  if (view.name === 'results') {
    return <ResultsScreen attemptId={view.attemptId} onBackToDashboard={() => setView({ name: 'dashboard' })} />;
  }

  return <CandidateDashboard onStarted={(attemptId) => setView({ name: 'assessment', attemptId })} />;
};

const Shell: React.FC = () => {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Logo variant="compact" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  if (user.isAdmin) return <AdminLayout />;
  return <CandidateApp />;
};

const App: React.FC = () => (
  <AuthProvider>
    {DEMO_MODE && <DemoModeBanner />}
    <div className={DEMO_MODE ? 'pt-7' : ''}>
      <Shell />
    </div>
  </AuthProvider>
);

export default App;
