import { useEffect, useState } from 'react';
import { getProjects, getSprints, getTasks, updateTask, createTask, createSprint, updateSprint, aiAssign } from '../api/client';
import type { Project, Sprint, Task } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

const COLS = ['todo', 'in_progress', 'review', 'done'] as const;
const LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Đánh giá',
  done: 'Hoàn thành',
};

const COL_COLORS: Record<string, string> = {
  todo: 'var(--text-secondary)',
  in_progress: '#60a5fa',
  review: '#fbbf24',
  done: '#22c55e',
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
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskData, setTaskData] = useState({ title: '', description: '', status: 'todo', story_points: 0 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);

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

  const loadTasks = () => {
    if (!projectId) return;
    getTasks(token, projectId).then(setTasks);
  };

  useEffect(() => {
    loadSprints();
  }, [token, projectId]);

  useEffect(() => {
    loadTasks();
  }, [token, projectId]);

  const sprintTasks = tasks.filter((t) => !sprintId || t.sprint_id === sprintId);

  const moveTask = async (task: Task, status: string) => {
    setMovingTaskId(task.id);
    try {
      await updateTask(token, task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    } catch (err) {
      console.error('Lỗi khi di chuyển task:', err);
      alert('Không thể di chuyển task. Vui lòng thử lại.');
    } finally {
      setMovingTaskId(null);
    }
  };

  const handleSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      if (editingSprintId) {
        await updateSprint(token, editingSprintId, sprintData);
      } else {
        await createSprint(token, projectId, sprintData);
      }
      setShowSprintModal(false);
      loadSprints();
    } catch (err) {
      console.error('Lỗi khi lưu sprint:', err);
      alert('Không thể lưu sprint. Vui lòng thử lại.');
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      await createTask(token, projectId, {
        ...taskData,
        sprint_id: sprintId || undefined,
        story_points: Number(taskData.story_points) || undefined,
      } as any);
      setShowTaskModal(false);
      setTaskData({ title: '', description: '', status: 'todo', story_points: 0 });
      loadTasks();
    } catch (err) {
      console.error('Lỗi khi tạo task:', err);
      alert('Không thể tạo task. Vui lòng thử lại.');
    }
  };

  const handleAiAssign = async () => {
    if (!projectId) return;
    const taskIds = sprintTasks.filter(t => t.status !== 'done' && !t.assignee_id).map(t => t.id);
    if (taskIds.length === 0) {
      setAiResult('Không có task nào cần phân công. Tất cả đã được gán hoặc hoàn thành.');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await aiAssign(token, projectId, taskIds);
      const applied = result.applied || [];
      if (applied.length > 0) {
        setAiResult(`✅ AI đã phân công ${applied.length} task thành công.`);
        loadTasks();
      } else {
        setAiResult(result.reasoning || result.summary || 'AI đã phân tích nhưng không có thay đổi nào.');
      }
    } catch (err: any) {
      console.error('Lỗi AI phân công:', err);
      setAiResult(`❌ Lỗi: ${err?.response?.data?.detail || 'Không thể kết nối đến AI service.'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const editSprint = (s: Sprint) => {
    setEditingSprintId(s.id);
    setSprintData({ name: s.name, goal: s.goal || '', status: s.status });
    setShowSprintModal(true);
  };

  const selectedSprint = sprints.find(s => s.id === sprintId);

  // Sprint statistics
  const stats = {
    todo: sprintTasks.filter(t => t.status === 'todo' || !COLS.includes(t.status as any)).length,
    in_progress: sprintTasks.filter(t => t.status === 'in_progress').length,
    review: sprintTasks.filter(t => t.status === 'review').length,
    done: sprintTasks.filter(t => t.status === 'done').length,
    total: sprintTasks.length,
    totalPoints: sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
    donePoints: sprintTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.story_points || 0), 0),
  };
  const completionPercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Bảng Sprint</h2>
          {!access.canEdit && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{getReadOnlyNotice('sprint', user?.role)}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {access.canEdit && (
            <button className="btn primary" onClick={() => { setShowTaskModal(true); setTaskData({ title: '', description: '', status: 'todo', story_points: 0 }); }}>
              + Thêm công việc
            </button>
          )}
          {access.canManage && (
            <button className="btn ai" onClick={handleAiAssign} disabled={aiLoading}>
              {aiLoading ? '⏳ Đang phân tích...' : '🤖 AI Phân công'}
            </button>
          )}
          {access.canManage && (
            <button className="btn primary" onClick={() => { setEditingSprintId(null); setSprintData({ name: '', goal: '', status: 'planned' }); setShowSprintModal(true); }}>
              + Sprint mới
            </button>
          )}
        </div>
      </div>

      {/* AI Result notification */}
      {aiResult && (
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-primary)' }}>{aiResult}</span>
            <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => setAiResult(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Project & Sprint selectors */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" style={{ maxWidth: 220 }} value={projectId ?? ''} onChange={(e) => { setProjectId(Number(e.target.value)); setSprintId(null); }}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 220 }} value={sprintId ?? ''} onChange={(e) => setSprintId(Number(e.target.value))}>
          <option value="">-- Tất cả công việc --</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status === 'active' ? 'Đang chạy' : s.status === 'closed' ? 'Đã đóng' : 'Kế hoạch'})</option>)}
        </select>
        {selectedSprint && access.canManage && (
          <button className="btn" onClick={() => editSprint(selectedSprint)}>✏️ Chỉnh sửa Sprint</button>
        )}
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem sprint board ở chế độ chỉ xem. Các thao tác di chuyển trạng thái task và chỉnh sprint sẽ bị ẩn.</div>
        </div>
      )}

      {/* Sprint Goal */}
      {selectedSprint?.goal && (
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--card-bg)' }}>
          <strong>🎯 Mục tiêu Sprint:</strong> {selectedSprint.goal}
        </div>
      )}

      {/* Sprint Statistics */}
      {sprintTasks.length > 0 && (
        <>
          <div className="sprint-stats">
            <div className="sprint-stat-item todo">
              <div className="stat-value">{stats.todo}</div>
              <div className="stat-label">Cần làm</div>
            </div>
            <div className="sprint-stat-item progress">
              <div className="stat-value">{stats.in_progress}</div>
              <div className="stat-label">Đang làm</div>
            </div>
            <div className="sprint-stat-item review">
              <div className="stat-value">{stats.review}</div>
              <div className="stat-label">Đánh giá</div>
            </div>
            <div className="sprint-stat-item done">
              <div className="stat-value">{stats.done}</div>
              <div className="stat-label">Hoàn thành</div>
            </div>
            <div className="sprint-stat-item">
              <div className="stat-value">{stats.donePoints}/{stats.totalPoints}</div>
              <div className="stat-label">Story Points</div>
            </div>
          </div>
          <div className="sprint-progress" style={{ marginBottom: '1rem' }}>
            <div className="progress-fill" style={{ width: `${completionPercent}%` }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem', marginTop: '-0.5rem' }}>
            Tiến độ: {completionPercent}%
          </div>
        </>
      )}

      {/* Kanban Board */}
      <div className="kanban">
        {COLS.map((col) => {
          const colTasks = sprintTasks.filter((t) => t.status === col || (col === 'todo' && !COLS.includes(t.status as typeof COLS[number])));
          return (
            <div key={col} className="kanban-col">
              <h4>
                <span style={{ color: COL_COLORS[col] }}>{LABELS[col]}</span>
                <span className="col-count">{colTasks.length}</span>
              </h4>
              {colTasks.map((t) => (
                <div key={t.id} className="task-card" style={movingTaskId === t.id ? { opacity: 0.5 } : {}}>
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    {t.story_points != null && t.story_points > 0 && <span className="task-sp">{t.story_points} SP</span>}
                    {t.assignee_id && <span className="task-assignee">👤 #{t.assignee_id}</span>}
                  </div>
                  {access.canEdit && (
                    <div className="task-actions">
                      {COLS.filter((c) => c !== t.status).map((c) => (
                        <button
                          key={c}
                          className="btn secondary"
                          disabled={movingTaskId === t.id}
                          onClick={() => moveTask(t, c)}
                          style={{ borderLeft: `2px solid ${COL_COLORS[c]}` }}
                        >
                          → {LABELS[c]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {colTasks.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', padding: '2rem 0', opacity: 0.6 }}>
                  Không có công việc
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sprint Modal */}
      {showSprintModal && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '440px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3>{editingSprintId ? '✏️ Chỉnh sửa Sprint' : '🆕 Sprint mới'}</h3>
            <form onSubmit={handleSprintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tên Sprint</label>
                <input className="input" placeholder="Ví dụ: Sprint 3" value={sprintData.name} onChange={(e) => setSprintData({ ...sprintData, name: e.target.value })} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mục tiêu Sprint</label>
                <textarea className="input" placeholder="Mục tiêu cần đạt trong sprint này..." value={sprintData.goal} onChange={(e) => setSprintData({ ...sprintData, goal: e.target.value })} rows={3} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Trạng thái</label>
                <select className="input" value={sprintData.status} onChange={(e) => setSprintData({ ...sprintData, status: e.target.value })}>
                  <option value="planned">Lập kế hoạch</option>
                  <option value="active">Đang chạy</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={() => setShowSprintModal(false)}>Hủy</button>
                <button type="submit" className="btn primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '440px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3>➕ Thêm công việc vào Sprint</h3>
            <form onSubmit={handleTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tiêu đề</label>
                <input className="input" placeholder="Tên công việc" value={taskData.title} onChange={(e) => setTaskData({ ...taskData, title: e.target.value })} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả</label>
                <textarea className="input" placeholder="Mô tả chi tiết..." value={taskData.description} onChange={(e) => setTaskData({ ...taskData, description: e.target.value })} rows={3} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Trạng thái</label>
                  <select className="input" value={taskData.status} onChange={(e) => setTaskData({ ...taskData, status: e.target.value })}>
                    <option value="todo">Cần làm</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="review">Đánh giá</option>
                    <option value="done">Hoàn thành</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Story Points</label>
                  <input className="input" type="number" min="0" max="21" value={taskData.story_points} onChange={(e) => setTaskData({ ...taskData, story_points: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={() => setShowTaskModal(false)}>Hủy</button>
                <button type="submit" className="btn primary">Tạo công việc</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
