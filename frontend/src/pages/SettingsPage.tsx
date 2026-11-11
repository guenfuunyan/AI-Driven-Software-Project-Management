import { FormEvent, useState } from 'react';
import { updateProfile } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice, getRoleLabel } from '../utils/roleAccess';

interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export default function SettingsPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('settings', user?.role);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile(token, { full_name: fullName, email });
      updateUser(updated);
      setNotification({
        type: 'success',
        title: 'Thành công',
        message: 'Đã cập nhật thông tin cá nhân thành công.',
      });
    } catch {
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!access.canView) {
    return (
      <div>
        <h2 className="page-title">Cài đặt Tài khoản</h2>
        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Truy cập bị hạn chế</h3>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>{getReadOnlyNotice('settings', user?.role)}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Cài đặt & Hồ sơ Tài khoản</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
          Quản lý thông tin cá nhân, vai trò người dùng (RBAC) và thông tin cấu hình hệ thống.
        </p>
      </div>

      {/* Notification Toast Banner */}
      {notification && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.25rem',
            borderLeft: `4px solid ${
              notification.type === 'success' ? '#22c55e' : notification.type === 'error' ? '#ef4444' : notification.type === 'warning' ? '#eab308' : '#3b82f6'
            }`,
            background: 'var(--surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '650px',
          }}
        >
          <div>
            <strong style={{ fontSize: '0.95rem' }}>{notification.title}</strong>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{notification.message}</p>
          </div>
          <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => setNotification(null)}>
            ✕
          </button>
        </div>
      )}

      <div className="grid-2">
        {/* Profile Card */}
        <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem' }}>👤 Thông tin Cá nhân</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Tên đăng nhập:</span>
              <strong style={{ fontSize: '0.875rem' }}>{user?.username}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Vai trò hệ thống:</span>
              <span className="badge ai" style={{ fontSize: '0.75rem' }}>
                {getRoleLabel(user?.role)} ({user?.role})
              </span>
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Họ và tên</label>
              <input className="input" placeholder="Nhập họ và tên..." value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Địa chỉ Email</label>
              <input className="input" type="email" placeholder="example@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <button className="btn primary" type="submit" disabled={saving} style={{ marginTop: '0.5rem' }}>
              {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </form>
        </div>

        {/* Demo Accounts & System Info Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>🔑 Danh sách Tài khoản Demo</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 0.75rem' }}>
              Sử dụng các tài khoản bên dưới để trải nghiệm phân quyền (RBAC):
            </p>

            <table style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Vai trò</th>
                  <th>Username</th>
                  <th>Password</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge" style={{ background: '#a855f7', color: 'white', fontSize: '0.65rem' }}>Admin</span></td>
                  <td><code>admin</code></td>
                  <td><code>admin123</code></td>
                </tr>
                <tr>
                  <td><span className="badge" style={{ background: '#3b82f6', color: 'white', fontSize: '0.65rem' }}>Project Manager</span></td>
                  <td><code>pm</code></td>
                  <td><code>pm123456</code></td>
                </tr>
                <tr>
                  <td><span className="badge" style={{ background: '#22c55e', color: 'white', fontSize: '0.65rem' }}>Developer</span></td>
                  <td><code>dev</code></td>
                  <td><code>dev123456</code></td>
                </tr>
                <tr>
                  <td><span className="badge" style={{ background: '#9ca3af', color: 'white', fontSize: '0.65rem' }}>Viewer</span></td>
                  <td><code>viewer</code></td>
                  <td><code>viewer123456</code></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card" style={{ margin: 0, padding: '1.25rem', borderLeft: '4px solid var(--ai)' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: 'var(--ai)' }}>⚙️ Thông tin Kiến trúc Hệ thống</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              <li><strong>Frontend:</strong> React 18 + TypeScript + Vite (Port 5173)</li>
              <li><strong>AI Microservice:</strong> Python FastAPI + SQLModel + SQLite (Port 8000)</li>
              <li><strong>API Gateway:</strong> Java 17 + Spring Boot 3 (Port 8080)</li>
              <li><strong>Cơ chế Bảo mật:</strong> OAuth2 JWT Authentication with Human-in-the-Loop DevOps Governance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
