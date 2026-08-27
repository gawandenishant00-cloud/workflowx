import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const { session } = useAuth();
  if (session) return <Navigate to="/" replace />;

  async function handleSignup(e) {
    e.preventDefault();
    setSaving(true);

    // Step 1: create the auth user in Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setMessage('Error: ' + error.message);
      setSaving(false);
      return;
    }

    setConfirmationRequired(!data.session);
    setMessage(data.session ? 'Signup successful! You can now log in.' : 'Check your email to confirm your account, then log in.');
    setSaving(false);
  }

  async function resendConfirmation() {
    setSaving(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setMessage(error ? 'Unable to resend confirmation: ' + error.message : 'Confirmation email sent again.');
    setSaving(false);
  }

  return <div className="auth-page"><div className="auth-art signup-art"><div className="art-content"><div className="brand large"><span className="brand-mark">W</span><span>WorkFlow<span className="brand-accent">X</span></span></div><p>Turn the daily swirl into a clear, accountable rhythm.</p><div className="art-note"><span>02</span><strong>Built for the whole team.</strong><small>Start as an employee. Your administrator can assign access later.</small></div></div></div><div className="auth-form"><div className="auth-form-inner"><span className="eyebrow">Get started</span><h1>Create your account</h1><p className="form-intro">Join your organization's operations workspace.</p><form onSubmit={handleSignup}><label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" required /></label><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength="6" required /></label><button className="button button-primary" disabled={saving}>{saving ? 'Creating account...' : 'Create account'} <span>↗</span></button></form>{message && <div className="form-message">{message}</div>}{confirmationRequired && <button className="text-button" type="button" onClick={resendConfirmation} disabled={saving}>Resend confirmation email</button>}<p className="switch-auth">Already have an account? <Link to="/login">Sign in</Link></p></div></div></div>;
}

export default Signup;