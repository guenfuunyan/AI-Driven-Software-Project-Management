import { useEffect, useState } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../api/client';
import type { Project } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export default function ProjectsPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });
  const [notification, setNotification] = useState<Notification | null>(null);

  const loadProjects = () => getProjects(token).then(setProjects).catch(() => {});

  useEffect(() => {
    loadProjects();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProject(token, editingId, formData);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã cập nhật dự án "${formData.name}"`,
        });
      } else {
        await createProject(token, formData);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã khởi tạo dự án mới "${formData.name}"`,
        });
      }
      setShowModal(false);
      setFormData({ name: '', description: '', status: 'active' });
      setEditingId(null);
      loadProjects();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Lỗi khi lưu dự án. Vui lòng thử lại.',
      });
    }
  };

  const handleEdit = (p: Project) => {
    setFormData({ name: p.name, description: p.description || '', status: p.status });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Tất cả các sprint, công việc và rủi ro liên quan sẽ bị xóa.')) return;
    try {
      await deleteProject(token, id);
      setNotification({
        type: 'success',
        title: 'Đã xóa',
        message: 'Dự án đã được xóa khỏi hệ thống.',
      });
      loadProjects();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể xóa dự án.',
      });
    }
  };

  const access = getPageAccess('projects', user?.role);
  const canManageProjects = access.canManage;

  const filteredProjects = projects.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Quản lý Dự án (Projects)</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            {canManageProjects ? 'Bạn có quyền quản lý cấu trúc dự án và danh mục backlog.' : getReadOnlyNotice('projects', user?.role)}
          </p>
        </div>
        {canManageProjects && (
          <button
            className="btn primary"
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', description: '', status: 'active' });
              setShowModal(true);
            }}
          >
            + Dự án mới
          </button>
        )}
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

      {/* Search Input */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="🔍 Tìm kiếm tên hoặc mô tả dự án..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Projects Grid */}
      <div className="grid-2">
        {filteredProjects.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem', margin: 0 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📂 {p.name}</h3>
                {canManageProjects && (
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} onClick={() => handleEdit(p)}>
                      ✏️ Sửa
                    </button>
                    <button className="btn danger" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} onClick={() => handleDelete(p.id)}>
                      🗑️ Xóa
                    </button>
                  </div>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.5rem 0 1rem', lineHeight: 1.5 }}>
                {p.description || 'Chưa có mô tả dự án.'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${p.status === 'active' ? 'progress' : 'secondary'}`} style={{ fontSize: '0.75rem' }}>
                {p.status === 'active' ? '🟢 Đang hoạt động' : p.status === 'completed' ? '🔵 Đã hoàn thành' : '🟡 Tạm dừng'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Mã dự án #{p.id}</span>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem 1rem', gridColumn: 'span 2' }}>
            Không tìm thấy dự án nào. Nhấn <strong>"+ Dự án mới"</strong> để bắt đầu.
          </div>
        )}
      </div>

      {/* Modal Create / Edit */}
      {showModal && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '420px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3>{editingId ? '✏️ Chỉnh sửa dự án' : '➕ Dự án mới'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tên dự án</label>
                <input className="input" placeholder="Ví dụ: AI Project Manager Mobile App" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả dự án</label>
                <textarea className="input" placeholder="Mô tả mục tiêu và phạm vi..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Trạng thái</label>
                <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="active">Đang hoạt động (Active)</option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                  <option value="on_hold">Tạm dừng (On Hold)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn primary">Lưu dự án</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
