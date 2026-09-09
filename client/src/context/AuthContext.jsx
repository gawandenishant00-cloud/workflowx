import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { API_BASE } from '../lib/apiBase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadProfile(nextSession) {
    if (!nextSession) {
      setProfile(null);
      setProfileError('');
      return;
    }
    const response = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${nextSession.access_token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Profile request failed (${response.status})`);
    setProfile(result.user);
    setProfileError('');
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      try {
        await loadProfile(data.session);
      } catch (error) {
        setProfile(null);
        setProfileError(error.message);
      }
      if (mounted) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      try {
        await loadProfile(nextSession);
      } catch (error) {
        setProfile(null);
        setProfileError(error.message);
      }
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  return <AuthContext.Provider value={{ session, profile, profileError, loading, signOut, refreshProfile: () => loadProfile(session) }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
