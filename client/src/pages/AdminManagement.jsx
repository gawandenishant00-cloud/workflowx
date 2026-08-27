import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function AdminManagement() {
  const { session } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [people, supplierData] = await Promise.all([
        api('/api/hr/employees', session),
        api('/api/procurement/vendors', session),
      ]);
      setEmployees(people);
      setVendors(supplierData);
    } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [session]);

  async function removeEmployee(item) {
    if (!window.confirm(`Delete ${item.full_name}'s account and all related requests?`)) return;
    try { await api(`/api/hr/employees/${item.id}`, session, { method: 'DELETE' }); setMessage(`${item.full_name} was deleted.`); await load(); }
    catch (error) { setMessage(error.message); }
  }

  async function removeVendor(item) {
    if (!window.confirm(`Delete vendor ${item.name}? Existing purchase requests will keep their records without this vendor.`)) return;
    try { await api(`/api/procurement/vendors/${item.id}`, session, { method: 'DELETE' }); setMessage(`${item.name} was deleted.`); await load(); }
    catch (error) { setMessage(error.message); }
  }

  return <div className="page"><div className="page-heading"><div><span className="eyebrow">Admin workspace / Management</span><h1>Manage access</h1><p>Remove team accounts or suppliers when they are no longer active.</p></div></div>{message && <div className="flash">{message}</div>}<div className="content-grid admin-grid"><section className="panel"><div className="section-heading"><div><span className="eyebrow">People</span><h2>Employees & managers</h2></div><span className="count">{employees.length}</span></div>{loading ? <div className="empty"><span className="loader" />Loading people...</div> : <div className="directory-list">{employees.map((item) => <div className="directory-row" key={item.id}><span className="avatar small">{item.full_name?.[0]}</span><div><strong>{item.full_name}</strong><small>{item.role} · {item.department || 'No department'}</small></div><button className="delete-button" title={`Delete ${item.full_name}`} onClick={() => removeEmployee(item)}>Delete</button></div>)}</div>}</section><section className="panel"><div className="section-heading"><div><span className="eyebrow">Suppliers</span><h2>Vendor directory</h2></div><span className="count">{vendors.length}</span></div>{loading ? <div className="empty"><span className="loader" />Loading vendors...</div> : <div className="directory-list">{vendors.map((item) => <div className="directory-row" key={item.id}><div><strong>{item.name}</strong><small>{item.category || 'General supplier'}</small></div><button className="delete-button" title={`Delete ${item.name}`} onClick={() => removeVendor(item)}>Delete</button></div>)}</div>}</section></div></div>;
}
