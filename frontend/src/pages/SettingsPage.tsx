import { FormEvent, useState } from 'react';
import { updateProfile } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

export default function SettingsPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('settings', user?.role);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateProfile(token, { full_name: fullName, email });
      updateUser(updated);
      setMessage('Đã cập nhật hồ sơ thành công.');
    } catch {
      setError('Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (!access.canView) {
    return (
      <div>
        <h2 className="page-title">Settings</h2>
        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Access restricted</h3>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>{getReadOnlyNotice('settings', user?.role)}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Settings</h2>
      <div className="card" style={{ maxWidth: 480 }}>
        <h3>Profile</h3>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {message && <p style={{ color: 'green', margin: 0 }}>{message}</p>}
          {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          RBAC: admin · pm · developer · viewer. JWT auth với human-in-the-loop AI governance.
        </p>
      </div>
    </div>
  );
}
