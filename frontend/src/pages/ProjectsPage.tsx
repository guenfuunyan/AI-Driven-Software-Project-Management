import { useEffect, useState } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../api/client';
import type { Project } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

export default function ProjectsPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });

  const loadProjects = () => getProjects(token).then(setProjects);

  useEffect(() => {
    loadProjects();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateProject(token, editingId, formData);
    } else {
      await createProject(token, formData);
    }
    setShowModal(false);
    setFormData({ name: '', description: '', status: 'active' });
    setEditingId(null);
    loadProjects();
  };

  const handleEdit = (p: Project) => {
    setFormData({ name: p.name, description: p.description || '', status: p.status });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProject(token, id);
      loadProjects();
    }
  };

  const access = getPageAccess('projects', user?.role);
  const canManageProjects = access.canManage;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Projects</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {canManageProjects ? 'Bạn có quyền quản lý backlog và dự án.' : getReadOnlyNotice('projects', user?.role)}
          </p>
        </div>
        {canManageProjects && (
          <button className="btn primary" onClick={() => { setEditingId(null); setFormData({ name: '', description: '', status: 'active' }); setShowModal(true); }}>
            + New Project
          </button>
        )}
      </div>
      <div className="grid-2">
        {projects.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>{p.name}</h3>
              {canManageProjects && (
                <div>
                  <button className="btn" style={{ marginRight: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleEdit(p)}>Edit</button>
                  <button className="btn" style={{ padding: '0.2rem 0.5rem', background: '#fee', fontSize: '0.8rem' }} onClick={() => handleDelete(p.id)}>Delete</button>
                </div>
              )}
            </div>
            <p style={{ color: 'var(--muted)', margin: '0.5rem 0', flex: 1 }}>{p.description}</p>
            <div>
              <span className={`badge ${p.status === 'active' ? 'progress' : 'todo'}`}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '400px', background: 'white' }}>
            <h3>{editingId ? 'Edit Project' : 'New Project'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input className="input" placeholder="Project Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              <textarea className="input" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
