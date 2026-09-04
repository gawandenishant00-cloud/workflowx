import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function AdminVendorCatalog() {
  const { session } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ item_name: '', unit_price: '' });
  const [message, setMessage] = useState('');

  async function loadVendors() {
    try { const data = await api('/api/procurement/vendors', session); setVendors(data); if (!selectedVendor && data[0]) setSelectedVendor(data[0].id); }
    catch (error) { setMessage(error.message); }
  }
  async function loadItems() {
    if (!selectedVendor) return setItems([]);
    try { setItems(await api(`/api/procurement/vendors/${selectedVendor}/items`, session)); }
    catch (error) { setMessage(error.message); }
  }
  useEffect(() => { loadVendors(); }, [session]);
  useEffect(() => { loadItems(); }, [selectedVendor, session]);

  async function addItem(event) {
    event.preventDefault();
    try { await api(`/api/procurement/vendors/${selectedVendor}/items`, session, { method: 'POST', body: JSON.stringify(form) }); setForm({ item_name: '', unit_price: '' }); setMessage('Vendor item and price saved.'); await loadItems(); }
    catch (error) { setMessage(error.message); }
  }

  const vendor = vendors.find((item) => item.id === selectedVendor);
  return <div className="page"><div className="page-heading"><div><span className="eyebrow">Admin workspace</span><h1>Vendor catalog</h1><p>Save item types and official prices before employees request them.</p></div></div>{message && <div className="flash">{message}</div>}<div className="content-grid"><section className="panel"><span className="eyebrow">Supplier</span><h2>Choose vendor</h2><select value={selectedVendor} onChange={(event) => setSelectedVendor(event.target.value)}><option value="">Choose vendor</option>{vendors.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><form onSubmit={addItem}><label>Item type<input value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} placeholder="e.g. Ergonomic chair" required /></label><label>Price per item<input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} placeholder="0.00" required /></label><button className="button button-primary" disabled={!selectedVendor}>Add catalog item</button></form></section><section className="panel"><span className="eyebrow">{vendor?.name || 'Selected supplier'}</span><h2>Available items</h2>{items.length === 0 ? <div className="empty">No catalog items saved yet.</div> : <div className="directory-list">{items.map((item) => <div className="directory-row" key={item.id}><div><strong>{item.item_name}</strong><small>Official unit price</small></div><span>{item.unit_price}</span></div>)}</div>}</section></div></div>;
}
