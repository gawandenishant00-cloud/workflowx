import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function ItemCard({ item, selected, onSelect, onReturn, saving }) {
  return <article className={`exit-item ${selected ? 'is-selected' : ''}`}>
    <button className="exit-item-select" onClick={() => onSelect(item.id)} aria-pressed={selected}>
      <span className="exit-item-check">{selected ? '✓' : ''}</span>
      <span className="exit-item-copy"><strong>{item.item_description}</strong><small>{item.quantity || 1} item(s) · Total {item.amount || 'Price pending'}</small></span>
      <span className="status status-assigned">Assigned</span>
    </button>
    {selected && <button className="button button-secondary exit-return-button" disabled={saving} onClick={() => onReturn(item.id)}>{saving ? 'Updating...' : 'Confirm item returned'}</button>}
  </article>;
}

export default function EmployeeExit() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadItems() {
    try {
      const requests = await api('/api/procurement/purchase-requests/mine', session);
      const assigned = requests.filter((item) => item.status === 'approved' && item.asset_status === 'assigned');
      setItems(assigned);
      setSelectedItem((current) => assigned.some((item) => item.id === current) ? current : assigned[0]?.id || '');
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => { loadItems(); }, [session]);

  async function returnItem(id) {
    if (!window.confirm('Confirm that this item has been returned to the company?')) return;
    setSaving(true);
    try {
      const result = await api('/api/hr/employees/me/return-asset', session, { method: 'PATCH', body: JSON.stringify({ purchase_request_id: id }) });
      setMessage(`${result.item.item_description} is marked returned.`);
      await loadItems();
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  async function leaveCompany() {
    if (items.length) return setMessage('Return every assigned item before completing your exit.');
    if (!window.confirm('Confirm your company exit? Your account access will close.')) return;
    setSaving(true);
    try { await api('/api/hr/employees/me/leave-company', session, { method: 'PATCH' }); await signOut(); navigate('/login', { replace: true }); }
    catch (error) { setMessage(error.message); setSaving(false); }
  }

  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  return <div className="page exit-page">
    <div className="page-heading"><div><span className="eyebrow">Employee workspace / Exit checklist</span><h1>Leave company</h1><p>Return company property and complete your departure securely.</p></div><div className="queue-number"><strong>{totalItems}</strong><span>items remaining</span></div></div>
    {message && <div className="flash">{message}</div>}
    <section className="panel exit-intro"><div><span className="eyebrow">Step 1 of 2</span><h2>Review assigned property</h2><p>Choose each item you have handed back to the company. Admin will see the status update immediately.</p></div><div className="exit-progress"><span className={items.length ? '' : 'complete'}>1</span><i /><span className={items.length ? '' : 'complete'}>2</span></div></section>
    <section className="panel exit-items-panel"><div className="section-heading"><div><span className="eyebrow">Company property</span><h2>Assigned items</h2></div><span className="subtle">{items.length} request(s)</span></div>{items.length ? <div className="exit-item-list">{items.map((item) => <ItemCard key={item.id} item={item} selected={selectedItem === item.id} onSelect={setSelectedItem} onReturn={returnItem} saving={saving} />)}</div> : <div className="exit-complete"><span className="exit-complete-mark">✓</span><div><strong>All assigned items are returned</strong><p>Your property checklist is complete. You can now finish your company exit.</p></div></div>}</section>
    <section className="panel exit-final"><div><span className="eyebrow">Step 2 of 2</span><h2>Complete company exit</h2><p>Your account will be signed out and marked as offboarded. This action cannot be undone from the employee portal.</p></div><button className="button button-primary exit-final-button" disabled={saving || items.length > 0} onClick={leaveCompany}>{saving ? 'Completing...' : 'Confirm and leave company'}</button></section>
  </div>;
}
