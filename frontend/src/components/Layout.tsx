import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getRoleLabel } from '../utils/roleAccess';

const navigation = [
  { to: '/', key: 'dashboard' as const, label: 'Dashboard' },
  { to: '/projects', key: 'projects' as const, label: 'Projects' },
  { to: '/sprint', key: 'sprint' as const, label: 'Sprint Board' },
  { to: '/stories', key: 'stories' as const, label: 'User Stories' },
  { to: '/tasks', key: 'tasks' as const, label: 'Tasks' },
  { to: '/risks', key: 'risks' as const, label: 'Risks' },
  { to: '/forecast', key: 'forecast' as const, label: 'Forecast' },
  { to: '/ai', key: 'ai' as const, label: 'AI Agents' },
  { to: '/reports', key: 'reports' as const, label: 'Reports' },
  { to: '/settings', key: 'settings' as const, label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>AI-Driven PM</h1>
        {navigation.map((item) => {
          const access = getPageAccess(item.key, role);
          if (!access.canView) return null;
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {item.label}
            </NavLink>
          );
        })}
        <div style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          <div style={{ marginBottom: '0.4rem' }}>
            {user?.full_name || user?.username}
          </div>
          <div style={{ marginBottom: '0.6rem', color: 'var(--primary)' }}>
            {getRoleLabel(role)}
          </div>
          <button className="btn secondary" style={{ marginTop: '0.5rem', width: '100%' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
