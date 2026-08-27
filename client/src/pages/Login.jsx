import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  if (session) return <Navigate to="/" replace />;

  async function handleLogin(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message.toLowerCase().includes('email not confirmed')
        ? 'Please confirm your email before signing in.'
        : 'Error: ' + error.message);
      setSaving(false);
      return;
    }
    setMessage('Login successful. Loading your workspace...');
    setSaving(false);
    navigate('/');
  }

  return <div className="auth-page"><div className="auth-art"><div className="art-content"><div className="brand large"><span className="brand-mark">W</span><span>WorkFlow<span className="brand-accent">X</span></span></div><p>One calm place for the work that keeps your organization moving.</p><div className="art-note"><span>01</span><strong>Requests in. Decisions out.</strong><small>A shared workflow for people, time, and spend.</small></div></div></div><div className="auth-form"><div className="auth-form-inner"><span className="eyebrow">Welcome back</span><h1>Sign in to WorkFlowX</h1><p className="form-intro">Your operations workspace is ready.</p><form onSubmit={handleLogin}><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /></label><button className="button button-primary" disabled={saving}>{saving ? 'Signing in...' : 'Sign in'} <span>↗</span></button></form>{message && <div className="form-message">{message}</div>}<p className="switch-auth">New to WorkFlowX? <Link to="/signup">Create an account</Link></p></div></div></div>;
}
