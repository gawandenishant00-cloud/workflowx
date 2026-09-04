import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Notifications from './Notifications';

export default function Layout() {
  const { profile, signOut } = useAuth();
  const links = profile?.role === 'employee'
    ? [['/', 'Overview'], ['/leave-company', 'Leave company']]
    : profile?.role === 'manager'
      ? [['/approvals', 'Approvals']]
      : [['/admin', 'Overview'], ['/admin/employees/new', 'Add employee'], ['/admin/manage', 'Manage access'], ['/admin/assets', 'Asset register'], ['/admin/vendors', 'Vendor catalog'], ['/admin/hr', 'HR requests'], ['/admin/procurement', 'Procurement'], ['/approvals', 'Approvals']];
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">W</span><span>WorkFlow<span className="brand-accent">X</span></span></div><nav>{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav><div className="sidebar-foot"><span className="avatar">{profile?.full_name?.[0] || 'U'}</span><div><strong>{profile?.full_name}</strong><small>{profile?.role}</small></div><button title="Sign out" onClick={signOut}>↗</button></div></aside><main className="main-area"><header className="mobile-header"><div className="brand"><span className="brand-mark">W</span><span>WorkFlow<span className="brand-accent">X</span></span></div><Notifications /><button className="mobile-signout" title="Sign out" onClick={signOut}>↗</button></header><nav className="mobile-nav">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav><Outlet /></main></div>;
}
