import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getRoleLabel } from '../utils/roleAccess';

const navigation = [
  { to: '/', key: 'dashboard' as const, label: 'Bảng điều khiển' },
  { to: '/projects', key: 'projects' as const, label: 'Dự án' },
  { to: '/sprint', key: 'sprint' as const, label: 'Bảng Sprint' },
  { to: '/stories', key: 'stories' as const, label: 'Yêu cầu' },
  { to: '/tasks', key: 'tasks' as const, label: 'Công việc' },
  { to: '/risks', key: 'risks' as const, label: 'Rủi ro' },
  { to: '/forecast', key: 'forecast' as const, label: 'Dự báo' },
  { to: '/ai', key: 'ai' as const, label: 'Trợ lý AI' },
  { to: '/reports', key: 'reports' as const, label: 'Báo cáo' },
  { to: '/settings', key: 'settings' as const, label: 'Cài đặt' },
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
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
