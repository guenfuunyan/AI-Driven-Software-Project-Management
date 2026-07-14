import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, login } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const tokens = await login(username, password);
      const user = await getMe(tokens.access_token);
      setAuth(tokens.access_token, tokens.refresh_token, user);
      navigate('/');
    } catch {
      setError('Sai tên đăng nhập hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-box">
        <h1>AI-Driven PM</h1>
        <p>Hệ thống quản lý dự án phần mềm Agile với AI (Human-in-the-loop)</p>
        <div className="card" style={{ marginBottom: '1rem', padding: '0.85rem' }}>
          <strong>Vai trò demo</strong>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            Admin/PM có thể quản lý dự án, Developer xem và cập nhật task, Viewer chỉ xem.
          </p>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="username">Username</label>
            <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
          Demo: admin/admin123 · pm/pm123456 · dev/dev123456 · viewer/viewer123456
        </p>
      </div>
    </div>
  );
}
