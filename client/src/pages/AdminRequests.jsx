import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function Status({ value }) { return <span className={`status status-${value}`}>{value}</span>; }

export default function AdminRequests({ type }) {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const isLeave = type === 'leave';

  useEffect(() => {
    api(isLeave ? '/api/hr/leave-requests' : '/api/procurement/purchase-requests', session)
      .then(setItems)
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [isLeave, session]);

  return <div className="page"><div className="page-heading"><div><span className="eyebrow">Admin workspace / {isLeave ? 'HR' : 'Procurement'}</span><h1>{isLeave ? 'Leave requests' : 'Purchase requests'}</h1><p>Organization-wide view of every {isLeave ? 'leave' : 'purchase'} request.</p></div><div className="queue-number"><strong>{items.length}</strong><span>total</span></div></div>{message && <div className="flash">{message}</div>}<section className="panel requests-panel">{loading ? <div className="empty"><span className="loader" />Loading requests...</div> : items.length === 0 ? <div className="empty">No {isLeave ? 'leave' : 'purchase'} requests yet.</div> : <div className="table"><div className="table-head"><span>Request</span><span>Requester</span><span>Status</span></div>{items.map((item) => <div className="table-row" key={item.id}><div><span className="tag">{isLeave ? 'Leave' : 'Purchase'}</span><strong>{isLeave ? `${item.start_date} to ${item.end_date}` : item.item_description}</strong><small>{isLeave ? item.reason || 'No reason provided' : `Amount: ${item.amount}`}</small></div><span>{item.profiles?.full_name || 'Team member'}</span><Status value={item.status} /></div>)}</div>}</section></div>;
}
