import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function Status({ value }) { return <span className={`status status-${value}`}>{value}</span>; }

export default function EmployeeDashboard() {
  const { session, profile } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [leave, setLeave] = useState({ start_date: '', end_date: '', reason: '' });
  const [purchase, setPurchase] = useState({ vendor_id: '', vendor_item_id: '', quantity: '1', unit_price: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const total = Number(purchase.quantity || 0) * Number(purchase.unit_price || 0);
  const requests = [...leaves.map((item) => ({ ...item, kind: 'Leave', summary: `${item.start_date} to ${item.end_date}` })), ...purchases.map((item) => ({ ...item, kind: 'Purchase', summary: `${item.item_description} | ${item.quantity || 1} item(s) | ${item.amount ? `Total ${item.amount}` : 'Price pending'}` }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  async function load() {
    try {
      const [leaveData, purchaseData, vendorData] = await Promise.all([api('/api/hr/leave-requests/mine', session), api('/api/procurement/purchase-requests/mine', session), api('/api/procurement/vendors', session)]);
      setLeaves(leaveData); setPurchases(purchaseData); setVendors(vendorData);
    } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  }

  async function loadCatalog(vendorId) {
    if (!vendorId) return setCatalogItems([]);
    try { setCatalogItems(await api(`/api/procurement/vendors/${vendorId}/items`, session)); } catch (error) { setMessage(error.message); }
  }

  useEffect(() => { load(); }, [session]);
  useEffect(() => { loadCatalog(purchase.vendor_id); }, [purchase.vendor_id, session]);

  async function submit(path, data, reset) {
    setSaving(true); setMessage('');
    try { await api(path, session, { method: 'POST', body: JSON.stringify(data) }); reset(); setMessage('Request submitted for approval.'); await load(); }
    catch (error) { setMessage(error.message); } finally { setSaving(false); }
  }

  function submitLeave(event) {
    event.preventDefault();
    if (leave.end_date < leave.start_date) return setMessage('End date must be on or after the start date.');
    submit('/api/hr/leave-requests', leave, () => setLeave({ start_date: '', end_date: '', reason: '' }));
  }

  function submitPurchase(event) {
    event.preventDefault();
    if (!purchase.vendor_id || !purchase.vendor_item_id || !Number.isInteger(Number(purchase.quantity)) || Number(purchase.quantity) < 1) return setMessage('Choose a vendor, catalog item, and quantity of at least 1.');
    const item = catalogItems.find((entry) => entry.id === purchase.vendor_item_id);
    submit('/api/procurement/purchase-requests', { ...purchase, item_description: item.item_name, quantity: Number(purchase.quantity), unit_price: Number(purchase.unit_price), amount: total }, () => setPurchase({ vendor_id: '', vendor_item_id: '', quantity: '1', unit_price: '' }));
  }

  return <div className="page">
    <div className="page-heading"><div><span className="eyebrow">Employee workspace</span><h1>{greeting}, {profile.full_name.split(' ')[0]}.</h1><p>Submit requests and keep an eye on their progress.</p></div><div className="date-card"><span>Today</span><strong>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong></div></div>
    {message && <div className="flash">{message}</div>}
    <div className="metric-row"><div className="metric"><span>All requests</span><strong>{requests.length}</strong><small>Your activity</small></div><div className="metric"><span>Awaiting review</span><strong>{requests.filter((item) => item.status === 'pending').length}</strong><small>In the approval queue</small></div><div className="metric"><span>Approved</span><strong>{requests.filter((item) => item.status === 'approved').length}</strong><small>Ready to go</small></div></div>
    <div className="content-grid">
      <section className="panel form-panel"><div className="section-heading"><div><span className="eyebrow">Time away</span><h2>Request leave</h2></div></div><form onSubmit={submitLeave}><div className="form-grid"><label>Start date<input type="date" value={leave.start_date} onChange={(event) => setLeave({ ...leave, start_date: event.target.value })} required /></label><label>End date<input type="date" value={leave.end_date} onChange={(event) => setLeave({ ...leave, end_date: event.target.value })} required /></label></div><label>Reason<textarea value={leave.reason} onChange={(event) => setLeave({ ...leave, reason: event.target.value })} placeholder="Add a note for your approver" /></label><button className="button button-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit leave request'}</button></form></section>
      <section className="panel form-panel"><div className="section-heading"><div><span className="eyebrow">Procurement</span><h2>Request catalog item</h2></div></div><p className="subtle">Choose a vendor and catalog item. The saved price fills automatically.</p><form onSubmit={submitPurchase}><label>Vendor<select value={purchase.vendor_id} onChange={(event) => setPurchase({ ...purchase, vendor_id: event.target.value, vendor_item_id: '', unit_price: '' })} required><option value="">Choose vendor</option>{vendors.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Catalog item<select value={purchase.vendor_item_id} onChange={(event) => { const item = catalogItems.find((entry) => entry.id === event.target.value); setPurchase({ ...purchase, vendor_item_id: item?.id || '', unit_price: item ? String(item.unit_price) : '' }); }} disabled={!purchase.vendor_id} required><option value="">Choose item</option>{catalogItems.map((item) => <option value={item.id} key={item.id}>{item.item_name} · Price {item.unit_price}</option>)}</select></label><label>Quantity<input type="number" min="1" step="1" value={purchase.quantity} onChange={(event) => setPurchase({ ...purchase, quantity: event.target.value })} required /></label><p className="subtle">Official price: {purchase.unit_price || 'Choose an item'} · Total: {purchase.unit_price ? total.toFixed(2) : 'Not available'}</p><button className="button button-primary" disabled={saving || !catalogItems.length}>{saving ? 'Submitting...' : 'Submit purchase request'}</button></form></section>
    </div>
    <section className="panel requests-panel"><div className="section-heading"><div><span className="eyebrow">Your activity</span><h2>My requests</h2></div><span className="subtle">{requests.length} total</span></div>{loading ? <div className="empty"><span className="loader" />Loading requests...</div> : requests.length === 0 ? <div className="empty">No requests yet. Your submitted work will appear here.</div> : <div className="table"><div className="table-head"><span>Request</span><span>Submitted</span><span>Status</span></div>{requests.map((item) => <div className="table-row" key={`${item.kind}-${item.id}`}><div><span className="tag">{item.kind}</span><strong>{item.summary}</strong></div><span>{new Date(item.created_at).toLocaleDateString()}</span><Status value={item.status} /></div>)}</div>}</section>
  </div>;
}
