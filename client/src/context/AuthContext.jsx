import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(nextSession) {
    if (!nextSession) {
      setProfile(null);
      return;
    }
    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${nextSession.access_token}` },
    });
    if (!response.ok) throw new Error('Unable to load your profile');
    const result = await response.json();
    setProfile(result.user);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      try { await loadProfile(data.session); } catch { await supabase.auth.signOut(); }
      if (mounted) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      try { await loadProfile(nextSession); } catch { setProfile(null); }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  return <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile: () => loadProfile(session) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
