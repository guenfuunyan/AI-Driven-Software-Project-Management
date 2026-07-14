import { useEffect, useState } from 'react';
import { getProjects, getSprints, getTasks, updateTask, createSprint, updateSprint } from '../api/client';
import type { Project, Sprint, Task } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

const COLS = ['todo', 'in_progress', 'review', 'done'] as const;
const LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function SprintPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('sprint', user?.role);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<number | null>(null);
  const [sprintData, setSprintData] = useState({ name: '', goal: '', status: 'planned' });

  useEffect(() => {
    getProjects(token).then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    });
  }, [token]);

  const loadSprints = () => {
    if (!projectId) return;
    getSprints(token, projectId).then((ss) => {
      setSprints(ss);
      if (!sprintId) {
        const active = ss.find((s) => s.status === 'active') || ss[0];
        if (active) setSprintId(active.id);
      }
    });
  };

  useEffect(() => {
    loadSprints();
  }, [token, projectId]);

  useEffect(() => {
    if (!projectId) return;
    getTasks(token, projectId).then(setTasks);
  }, [token, projectId]);

  const sprintTasks = tasks.filter((t) => !sprintId || t.sprint_id === sprintId);

  const moveTask = async (task: Task, status: string) => {
    await updateTask(token, task.id, { status });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
  };

  const handleSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    if (editingSprintId) {
      await updateSprint(token, editingSprintId, sprintData);
    } else {
      await createSprint(token, projectId, sprintData);
    }
    setShowSprintModal(false);
    loadSprints();
  };

  const editSprint = (s: Sprint) => {
    setEditingSprintId(s.id);
    setSprintData({ name: s.name, goal: s.goal || '', status: s.status });
    setShowSprintModal(true);
  };

  const selectedSprint = sprints.find(s => s.id === sprintId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Sprint Board</h2>
          {!access.canEdit && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{getReadOnlyNotice('sprint', user?.role)}</p>
          )}
        </div>
        {access.canManage && (
          <button className="btn primary" onClick={() => { setEditingSprintId(null); setSprintData({ name: '', goal: '', status: 'planned' }); setShowSprintModal(true); }}>
            + New Sprint
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select className="input" style={{ maxWidth: 220 }} value={projectId ?? ''} onChange={(e) => { setProjectId(Number(e.target.value)); setSprintId(null); }}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 220 }} value={sprintId ?? ''} onChange={(e) => setSprintId(Number(e.target.value))}>
          <option value="">-- All Tasks --</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
        </select>
        {selectedSprint && access.canManage && (
          <button className="btn" onClick={() => editSprint(selectedSprint)}>Edit Current Sprint</button>
        )}
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem sprint board ở chế độ chỉ xem. Các thao tác di chuyển trạng thái task và chỉnh sprint sẽ bị ẩn.</div>
        </div>
      )}

      {selectedSprint?.goal && (
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--card-bg)' }}>
          <strong>Sprint Goal:</strong> {selectedSprint.goal}
        </div>
      )}

      <div className="kanban">
        {COLS.map((col) => (
          <div key={col} className="kanban-col">
            <h4>{LABELS[col]}</h4>
            {sprintTasks.filter((t) => t.status === col || (col === 'todo' && !COLS.includes(t.status as typeof COLS[number]))).map((t) => (
              <div key={t.id} className="task-card">
                <div>{t.title}</div>
                {t.story_points && <small style={{ color: 'var(--muted)' }}>{t.story_points} SP</small>}
                {access.canEdit && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {COLS.filter((c) => c !== t.status).slice(0, 2).map((c) => (
                      <button key={c} className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} onClick={() => moveTask(t, c)}>
                        → {LABELS[c]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {showSprintModal && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '400px', background: 'white' }}>
            <h3>{editingSprintId ? 'Edit Sprint' : 'New Sprint'}</h3>
            <form onSubmit={handleSprintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input className="input" placeholder="Sprint Name" value={sprintData.name} onChange={(e) => setSprintData({ ...sprintData, name: e.target.value })} required />
              <textarea className="input" placeholder="Sprint Goal" value={sprintData.goal} onChange={(e) => setSprintData({ ...sprintData, goal: e.target.value })} rows={3} />
              <select className="input" value={sprintData.status} onChange={(e) => setSprintData({ ...sprintData, status: e.target.value })}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowSprintModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
