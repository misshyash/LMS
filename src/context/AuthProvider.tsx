import React, { createContext, useContext, useEffect, useState } from 'react';
import { backend, type AuthUser } from '../services';
import type { UserProfile, UserSummary } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  summary: UserSummary | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  demoSignIn: (role: 'candidate' | 'admin', name?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = backend.subscribeAuthUser((u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setProfile(null);
        setSummary(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || user.isAdmin) {
      setProfile(null);
      setSummary(null);
      return;
    }
    const unsubProfile = backend.subscribeProfile(user.uid, setProfile);
    const unsubSummary = backend.subscribeSummary(user.uid, setSummary);
    return () => {
      unsubProfile();
      unsubSummary();
    };
  }, [user]);

  const value: AuthContextValue = {
    user,
    profile,
    summary,
    authLoading,
    signInWithGoogle: () => backend.signInWithGoogle(),
    demoSignIn: (role, name) => backend.demoSignIn(role, name),
    signOutUser: () => backend.signOutUser(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
