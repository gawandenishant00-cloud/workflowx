import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function Status({ value }) { return <span className={`status status-${value}`}>{value || 'not_applicable'}</span>; }

export default function AdminAssets() {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  async function load() {
    try { setItems(await api('/api/hr/employee-assets', session)); }
    catch (error) { setMessage(error.message); }
  }

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [session]);

  return <div className="page"><div className="page-heading"><div><span className="eyebrow">Admin workspace</span><h1>Asset register</h1><p>See which item is assigned to each employee and whether it was returned.</p></div><div className="queue-number"><strong>{items.filter((item) => item.asset_status === 'assigned').length}</strong><span>assigned</span></div></div>{message && <div className="flash">{message}</div>}<section className="panel requests-panel">{items.length === 0 ? <div className="empty">No approved employee items yet.</div> : <div className="table"><div className="table-head"><span>Item</span><span>Employee</span><span>Status</span></div>{items.map((item) => <div className="table-row" key={item.id}><div><strong>{item.item_description}</strong><small>Amount: {item.amount}{item.returned_at ? ` · Returned ${new Date(item.returned_at).toLocaleDateString()}` : ''}</small></div><span>{item.profiles?.full_name || 'Employee'}</span><Status value={item.asset_status} /></div>)}</div>}</section></div>;
}
