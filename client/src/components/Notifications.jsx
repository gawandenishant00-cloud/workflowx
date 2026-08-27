import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((item) => !item.is_read).length;
  async function load() { try { setItems(await api('/api/notifications', session)); } catch {} }
  useEffect(() => { if (session) load(); }, [session]);
  async function markRead(item) { if (item.is_read) return; await api(`/api/notifications/${item.id}/read`, session, { method: 'PATCH' }); setItems(items.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry)); }
  return <div className="notification-wrap"><button className="icon-button" title="Notifications" onClick={() => setOpen(!open)}>♢{unread > 0 && <b>{unread}</b>}</button>{open && <div className="notification-menu"><div className="menu-title">Notifications <span>{unread} unread</span></div>{items.length === 0 ? <p className="muted">No notifications yet.</p> : items.slice(0, 8).map((item) => <button className={`notification-item ${item.is_read ? 'is-read' : ''}`} key={item.id} onClick={() => markRead(item)}><i /> <span><strong>{item.title}</strong><small>{item.message}</small></span></button>)}</div>}</div>;
}
