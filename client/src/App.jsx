import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ApprovalsDashboard from './pages/ApprovalsDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminRequests from './pages/AdminRequests';
import CreateEmployee from './pages/CreateEmployee';
import './App.css';

function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="loading-screen"><span className="loader" />Loading workspace...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <div className="loading-screen">Profile unavailable. Please contact an administrator.</div>;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { profile } = useAuth();
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'manager') return <Navigate to="/approvals" replace />;
  return <EmployeeDashboard />;
}

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/approvals" element={<ProtectedRoute roles={['manager', 'admin']}><ApprovalsDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/employees/new" element={<ProtectedRoute roles={['admin']}><CreateEmployee /></ProtectedRoute>} />
      <Route path="/admin/hr" element={<ProtectedRoute roles={['admin']}><AdminRequests type="leave" /></ProtectedRoute>} />
      <Route path="/admin/procurement" element={<ProtectedRoute roles={['admin']}><AdminRequests type="purchase" /></ProtectedRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() { return <AuthProvider><AppRoutes /></AuthProvider>; }