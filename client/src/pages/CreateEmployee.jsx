import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function CreateEmployee() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', department: '', role: 'employee' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  function update(field, value) { setForm({ ...form, [field]: value }); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setMessage('');
    try { await api('/api/hr/employees', session, { method: 'POST', body: JSON.stringify(form) }); navigate('/admin', { state: { message: `${form.role} account created successfully.` } }); }
    catch (error) { setMessage(error.message); setSaving(false); }
  }
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">Admin workspace / Directory</span><h1>Add team member</h1><p>Create a confirmed employee or manager account.</p></div></div>{message && <div className="flash">{message}</div>}<section className="panel employee-form-panel"><div className="section-heading"><div><span className="eyebrow">New team member</span><h2>Account details</h2></div><span className="panel-icon">✦</span></div><form onSubmit={submit}><label>Full name<input value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="e.g. Priya Sharma" required /></label><label>Work email<input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="priya@company.com" required /></label><label>Temporary password<input type="password" minLength="6" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 6 characters" required /></label><div className="form-grid"><label>Department<input value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="e.g. Operations" /></label><label>Role<select value={form.role} onChange={(event) => update('role', event.target.value)}><option value="employee">Employee</option><option value="manager">Manager</option></select></label></div><div className="form-actions"><button className="button button-secondary" type="button" onClick={() => navigate('/admin')}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Creating account...' : 'Create account'} <span>↗</span></button></div></form><p className="form-hint">The account is marked as confirmed. Share the temporary password securely.</p></section></div>;
}
