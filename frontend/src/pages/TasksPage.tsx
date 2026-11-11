import { useEffect, useState, useRef } from 'react';
import {
  getProjects,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  aiAssign,
  getSprints,
  getUsers,
} from '../api/client';
import type { Project, Task, Sprint, User } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice, getRoleLabel } from '../utils/roleAccess';

const COLS = ['todo', 'in_progress', 'review', 'done'] as const;
const LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Đánh giá',
  done: 'Hoàn thành',
};

interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export default function TasksPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('tasks', user?.role);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Filters & Search
  const [sprintFilter, setSprintFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    automation_level: 0.5,
    risk_level: 0.3,
    ai_cost_estimate: 0.1,
    collaboration_mode: 'HOTL',
    sprint_id: null as number | null,
    assignee_id: null as number | null,
    story_points: 1,
  });

  // Rollback registry for HOOL tasks
  const [hoolRollbacks, setHoolRollbacks] = useState<Record<number, { prevStatus: string }>>({});

  // Simulator States
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorStatus, setSimulatorStatus] = useState<'idle' | 'running' | 'waiting_approval' | 'paused' | 'completed'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [interventionInput, setInterventionInput] = useState('');

  const timerRef = useRef<number | null>(null);

  const PIPELINE_STEPS = [
    { name: '1. Khởi tạo Môi trường Sandbox', desc: 'Khởi tạo sandbox DevOps và nạp mã nguồn dự án.' },
    { name: '2. Phân tích tĩnh (Static Analysis)', desc: 'Đọc mã nguồn, phân tích cú pháp và quy tắc bảo mật.' },
    { name: '3. Sinh mã & Kiểm thử tự động', desc: 'Chạy LLM Code Agent để tạo commit và unit test.' },
    { name: '4. Kiểm thử Tích hợp DevOps', desc: 'Chạy bộ kiểm thử tích hợp trong container cô lập.' },
    { name: '5. Pipeline Phát hành', desc: 'Kích hoạt kịch bản CD, tự động cập nhật tài liệu.' },
  ];

  useEffect(() => {
    getProjects(token).then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    });
    getUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  const loadTasks = () => {
    if (!projectId) return;
    getTasks(token, projectId).then((ts) => {
      const mapped = ts.map((t) => ({
        ...t,
        automation_level: t.automation_level !== undefined ? t.automation_level : 0.0,
        risk_level: t.risk_level !== undefined ? t.risk_level : 0.0,
        ai_cost_estimate: t.ai_cost_estimate !== undefined ? t.ai_cost_estimate : 0.0,
        collaboration_mode: t.collaboration_mode || 'HITL',
      }));
      setTasks(mapped);
    });
  };

  useEffect(() => {
    loadTasks();
    if (projectId) {
      getSprints(token, projectId).then(setSprints);
    }
  }, [token, projectId]);

  const determineCollaborationMode = (automation: number, risk: number, cost: number): string => {
    if (risk >= 0.6 || automation < 0.4 || cost >= 1.0) {
      return 'HITL';
    } else if (risk < 0.3 && automation >= 0.7 && cost < 0.5) {
      return 'HOOL';
    }
    return 'HOTL';
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'automation_level' || field === 'risk_level' || field === 'ai_cost_estimate') {
        const aut = field === 'automation_level' ? parseFloat(value) : prev.automation_level;
        const rsk = field === 'risk_level' ? parseFloat(value) : prev.risk_level;
        const cst = field === 'ai_cost_estimate' ? parseFloat(value) : prev.ai_cost_estimate;
        updated.collaboration_mode = determineCollaborationMode(aut, rsk, cst);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    const payload = {
      ...formData,
      automation_level: Number(formData.automation_level),
      risk_level: Number(formData.risk_level),
      ai_cost_estimate: Number(formData.ai_cost_estimate),
      sprint_id: formData.sprint_id ? Number(formData.sprint_id) : undefined,
      assignee_id: formData.assignee_id ? Number(formData.assignee_id) : undefined,
      story_points: Number(formData.story_points || 1),
    };
    try {
      if (editingId) {
        await updateTask(token, editingId, payload);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã cập nhật công việc "${formData.title}"`,
        });
      } else {
        await createTask(token, projectId, payload);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã tạo công việc mới "${formData.title}"`,
        });
      }
      setShowModal(false);
      loadTasks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Lỗi khi lưu công việc.',
      });
    }
  };

  const handleEdit = (t: Task) => {
    setEditingId(t.id);
    setFormData({
      title: t.title,
      description: t.description || '',
      status: t.status,
      automation_level: t.automation_level !== undefined ? t.automation_level : 0.5,
      risk_level: t.risk_level !== undefined ? t.risk_level : 0.3,
      ai_cost_estimate: t.ai_cost_estimate !== undefined ? t.ai_cost_estimate : 0.1,
      collaboration_mode: t.collaboration_mode || 'HITL',
      sprint_id: t.sprint_id || null,
      assignee_id: t.assignee_id || null,
      story_points: t.story_points || 1,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    try {
      await deleteTask(token, id);
      setNotification({
        type: 'success',
        title: 'Đã xóa',
        message: 'Công việc đã được xóa khỏi hệ thống.',
      });
      loadTasks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể xóa công việc.',
      });
    }
  };

  const moveTask = async (task: Task, status: string) => {
    try {
      await updateTask(token, task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể chuyển trạng thái công việc.',
      });
    }
  };

  const handleAIAssign = async () => {
    if (!projectId) return;
    const taskIds = tasks.filter((t) => t.status === 'todo' && !t.assignee_id).map((t) => t.id);
    if (taskIds.length === 0) {
      setNotification({
        type: 'info',
        title: 'Thông báo',
        message: "Tất cả công việc trong cột 'Cần làm' đều đã được phân công.",
      });
      return;
    }
    try {
      const result = await aiAssign(token, projectId, taskIds);
      const applied = (result.applied as { task_id: number; assignee_id: number }[] | undefined)?.length ?? taskIds.length;
      setNotification({
        type: 'success',
        title: '✨ AI Phân công Thành công',
        message: `AI đã phân công ${applied} công việc cho các thành viên dựa trên khối lượng công việc!`,
      });
      loadTasks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể phân công tự động bằng AI.',
      });
    }
  };

  // Simulator Execution
  const startAIExecution = (task: Task) => {
    setActiveTask(task);
    setLogs([`[HỆ THỐNG] Khởi tạo luồng thực thi tự động cho: "${task.title}" theo giao thức ${task.collaboration_mode}.`]);
    setCurrentStep(0);
    setInterventionInput('');

    if (task.collaboration_mode === 'HOOL') {
      const batchLogs = [
        `[HỆ THỐNG] Đang chạy cơ chế tự động hoàn toàn HOOL. Chi phí: $${task.ai_cost_estimate || 0.05}`,
        `[INFO] Khởi tạo container workspace docker...`,
        `[INFO] Đã hoàn thành sinh mã nguồn. Commit được đẩy tự động lên repository.`,
        `[INFO] Tất cả các kịch bản kiểm thử tự động đã vượt qua.`,
        `[HỆ THỐNG] Chuyển công việc sang Hoàn thành. Đã ghi nhận lịch sử để hoàn tác nếu cần.`,
      ];
      setLogs(batchLogs);
      setSimulatorStatus('completed');
      setShowSimulator(true);

      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'done' } : t)));
      updateTask(token, task.id, { status: 'done' }).then(() => {
        setHoolRollbacks((prev) => ({
          ...prev,
          [task.id]: { prevStatus: task.status },
        }));
        loadTasks();
      });
    } else {
      setSimulatorStatus('running');
      setShowSimulator(true);
      runNextStep(0, task);
    }
  };

  const runNextStep = (stepIdx: number, task: Task) => {
    if (stepIdx >= PIPELINE_STEPS.length) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'review' } : t)));
      setLogs((prev) => [...prev, `[HỆ THỐNG] Tiến trình DevOps hoàn tất! Chuyển công việc sang Đánh giá.`]);
      setSimulatorStatus('completed');
      updateTask(token, task.id, { status: 'review' }).then(() => loadTasks());
      return;
    }

    setCurrentStep(stepIdx);
    const step = PIPELINE_STEPS[stepIdx];
    setLogs((prev) => [...prev, `[ĐANG CHẠY] ${step.name}: ${step.desc}`]);

    if (task.collaboration_mode === 'HITL') {
      setSimulatorStatus('waiting_approval');
    } else {
      setSimulatorStatus('running');
      timerRef.current = window.setTimeout(() => {
        setLogs((prev) => [...prev, `[THÀNH CÔNG] Đã hoàn thành ${step.name}.`]);
        runNextStep(stepIdx + 1, task);
      }, 1500);
    }
  };

  const approveCurrentStep = () => {
    if (!activeTask) return;
    const step = PIPELINE_STEPS[currentStep];
    setLogs((prev) => [
      ...prev,
      `[NGƯỜI DUYỆT] Bước "${step.name}" đã được phê duyệt thủ công.`,
      `[THÀNH CÔNG] Đã hoàn thành ${step.name}.`,
    ]);
    runNextStep(currentStep + 1, activeTask);
  };

  const handleIntervene = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSimulatorStatus('paused');
    setLogs((prev) => [...prev, `[CẢNH BÁO] Tiến trình tạm dừng bởi Người điều hành.`]);
  };

  const submitIntervention = () => {
    if (!activeTask || !interventionInput.trim()) return;

    setLogs((prev) => [
      ...prev,
      `[GHI ĐÈ] Người điều hành gửi lệnh: "${interventionInput}"`,
      `[INFO] Áp dụng tham số ghi đè vào môi trường chạy...`,
      `[HỆ THỐNG] Đang tiếp tục chạy với cấu hình mới.`,
    ]);
    setInterventionInput('');
    setSimulatorStatus('running');

    timerRef.current = window.setTimeout(() => {
      const step = PIPELINE_STEPS[currentStep];
      setLogs((prev) => [...prev, `[THÀNH CÔNG] Đã hoàn thành ${step.name}.`]);
      runNextStep(currentStep + 1, activeTask);
    }, 1500);
  };

  const abortExecution = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLogs((prev) => [...prev, `[LỖI] Tiến trình bị hủy bỏ.`]);
    setSimulatorStatus('idle');
    setShowSimulator(false);
  };

  const handleUndoHOOL = async (taskId: number) => {
    const rollbackRecord = hoolRollbacks[taskId];
    if (!rollbackRecord) return;

    try {
      const prevStatus = rollbackRecord.prevStatus;
      await updateTask(token, taskId, { status: prevStatus });
      setNotification({
        type: 'success',
        title: 'Hoàn tác HOOL Thành công',
        message: 'Đã hoàn tác trạng thái công việc về trước khi AI tự động chạy.',
      });
      setHoolRollbacks((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
      loadTasks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể hoàn tác.',
      });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Filter tasks logic
  const filteredTasks = tasks.filter((t) => {
    if (sprintFilter !== 'all') {
      if (sprintFilter === 'none' && t.sprint_id) return false;
      if (sprintFilter !== 'none' && t.sprint_id !== Number(sprintFilter)) return false;
    }
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned' && t.assignee_id) return false;
      if (assigneeFilter !== 'unassigned' && t.assignee_id !== Number(assigneeFilter)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const totalCost = filteredTasks.reduce((sum, t) => sum + (t.ai_cost_estimate || 0), 0);
  const countHITL = filteredTasks.filter((t) => t.collaboration_mode === 'HITL').length;
  const countHOTL = filteredTasks.filter((t) => t.collaboration_mode === 'HOTL').length;
  const countHOOL = filteredTasks.filter((t) => t.collaboration_mode === 'HOOL').length;

  const getUserName = (id?: number | null) => {
    if (!id) return null;
    const u = users.find((usr) => usr.id === id);
    return u ? u.full_name || u.username : `User #${id}`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Bảng công việc (Tasks)</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            {access.canEdit ? `Bạn đang quản lý công việc với vai trò ${getRoleLabel(user?.role)}.` : getReadOnlyNotice('tasks', user?.role)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {access.canEdit && (
            <button className="btn ai" onClick={handleAIAssign}>
              ✨ AI Tự động Phân công
            </button>
          )}
          {access.canEdit && (
            <button
              className="btn primary"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  title: '',
                  description: '',
                  status: 'todo',
                  automation_level: 0.5,
                  risk_level: 0.3,
                  ai_cost_estimate: 0.1,
                  collaboration_mode: 'HOTL',
                  sprint_id: null,
                  assignee_id: null,
                  story_points: 1,
                });
                setShowModal(true);
              }}
            >
              + Công việc mới
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification Banner */}
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

      {/* Selectors & Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ maxWidth: 220 }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 180 }} value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)}>
          <option value="all">Tất cả Sprint</option>
          <option value="none">Chưa gắn Sprint</option>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 180 }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="all">Tất cả thành viên</option>
          <option value="unassigned">Chưa phân công</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
        </select>
        <input
          className="input"
          style={{ maxWidth: 220 }}
          placeholder="🔍 Tìm kiếm công việc..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem bảng công việc ở chế độ chỉ xem.</div>
        </div>
      )}

      {/* DevOps AI Summary Widget */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--ai)', background: 'var(--surface)' }}>
          <h3>Tổng ngân sách Token</h3>
          <p style={{ color: 'var(--ai)' }}>${totalCost.toFixed(2)}</p>
          <small style={{ color: 'var(--muted)' }}>Xấp xỉ {(totalCost * 500000).toLocaleString()} tokens</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <h3>HITL (Người duyệt)</h3>
          <p style={{ color: '#a855f7' }}>{countHITL}</p>
          <small style={{ color: 'var(--muted)' }}>Duyệt thủ công từng bước</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h3>HOTL (Người giám sát)</h3>
          <p style={{ color: '#3b82f6' }}>{countHOTL}</p>
          <small style={{ color: 'var(--muted)' }}>AI tự chạy, Người theo dõi</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <h3>HOOL (AI tự động)</h3>
          <p style={{ color: '#22c55e' }}>{countHOOL}</p>
          <small style={{ color: 'var(--muted)' }}>Tự động hoàn toàn (Có hoàn tác)</small>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban">
        {COLS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col || (col === 'todo' && !COLS.includes(t.status as any)));
          return (
            <div key={col} className="kanban-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0 }}>{LABELS[col]}</h4>
                <span className="badge progress" style={{ fontSize: '0.75rem' }}>{colTasks.length}</span>
              </div>
              
              {colTasks.map((t) => {
                const sprint = sprints.find((s) => s.id === t.sprint_id);
                const assigneeName = getUserName(t.assignee_id);

                return (
                  <div key={t.id} className="task-card" style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* Visual Collaboration Bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: t.collaboration_mode === 'HOOL' ? '#22c55e' : t.collaboration_mode === 'HOTL' ? '#3b82f6' : '#a855f7',
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem', marginTop: '0.25rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{t.title}</strong>
                      {access.canEdit && (
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button className="btn secondary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }} onClick={() => handleEdit(t)}>✏️</button>
                          <button className="btn danger" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }} onClick={() => handleDelete(t.id)}>🗑️</button>
                        </div>
                      )}
                    </div>

                    {t.description && <div style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '0.4rem 0' }}>{t.description}</div>}

                    {/* Sprint & Assignee Info */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.4rem 0' }}>
                      {sprint && <span className="badge secondary" style={{ fontSize: '0.65rem' }}>🏃 {sprint.name}</span>}
                      {assigneeName ? (
                        <span className="badge progress" style={{ fontSize: '0.65rem' }}>👤 {assigneeName}</span>
                      ) : (
                        <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>👤 Chưa phân công</span>
                      )}
                      {t.story_points && <span className="badge ai" style={{ fontSize: '0.65rem' }}>{t.story_points} SP</span>}
                    </div>

                    {/* Metadata details */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '0.35rem', borderRadius: '4px', marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      <span>Rủi ro: <strong style={{ color: (t.risk_level || 0) >= 0.6 ? 'var(--danger)' : (t.risk_level || 0) < 0.3 ? 'var(--success)' : 'var(--warning)' }}>{t.risk_level}</strong></span>
                      <span>Tự động: <strong style={{ color: (t.automation_level || 0) >= 0.7 ? 'var(--success)' : (t.automation_level || 0) < 0.4 ? 'var(--danger)' : 'var(--warning)' }}>{t.automation_level}</strong></span>
                      <span>Chi phí: <strong style={{ color: 'var(--text-primary)' }}>${t.ai_cost_estimate}</strong></span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div>
                        {t.collaboration_mode === 'HITL' && <span className="badge" style={{ background: '#a855f7', color: 'white' }}>HITL</span>}
                        {t.collaboration_mode === 'HOTL' && <span className="badge" style={{ background: '#3b82f6', color: 'white' }}>HOTL</span>}
                        {t.collaboration_mode === 'HOOL' && <span className="badge" style={{ background: '#22c55e', color: 'white' }}>HOOL</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {access.canEdit && hoolRollbacks[t.id] && (
                          <button className="btn danger" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }} onClick={() => handleUndoHOOL(t.id)}>
                            ↩️ Hoàn tác
                          </button>
                        )}
                        {access.canEdit && t.status !== 'done' && (
                          <button className="btn ai" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }} onClick={() => startAIExecution(t)}>
                            🤖 Chạy AI
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Move status buttons */}
                    {access.canEdit && (
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.6rem', borderTop: '1px solid var(--border)', paddingTop: '0.4rem', flexWrap: 'wrap' }}>
                        {COLS.filter((c) => c !== t.status).map((c) => (
                          <button key={c} className="btn secondary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.3rem' }} onClick={() => moveTask(t, c)}>
                            &rarr; {LABELS[c]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Task Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '480px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3>{editingId ? '✏️ Chỉnh sửa công việc' : '➕ Công việc mới'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tiêu đề công việc</label>
                <input className="input" placeholder="Tiêu đề..." value={formData.title} onChange={(e) => handleFieldChange('title', e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả công việc</label>
                <textarea className="input" placeholder="Mô tả chi tiết..." value={formData.description} onChange={(e) => handleFieldChange('description', e.target.value)} rows={3} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Trạng thái</label>
                  <select className="input" value={formData.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
                    <option value="todo">Cần làm</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="review">Đánh giá</option>
                    <option value="done">Hoàn thành</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Sprint</label>
                  <select className="input" value={formData.sprint_id ?? ''} onChange={(e) => handleFieldChange('sprint_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">-- Không chọn --</option>
                    {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Người thực hiện</label>
                  <select className="input" value={formData.assignee_id ?? ''} onChange={(e) => handleFieldChange('assignee_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">-- Chưa phân công --</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Story Points</label>
                  <input type="number" min="1" max="21" className="input" value={formData.story_points} onChange={(e) => handleFieldChange('story_points', e.target.value)} />
                </div>
              </div>

              {/* Sliders for automation and risk */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--ai)' }}>Tham số hợp tác DevOps AI</h4>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Khả năng tự động hóa</span>
                    <span>{formData.automation_level}</span>
                  </label>
                  <input type="range" min="0.0" max="1.0" step="0.05" value={formData.automation_level} onChange={(e) => handleFieldChange('automation_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mức độ rủi ro công việc</span>
                    <span>{formData.risk_level}</span>
                  </label>
                  <input type="range" min="0.0" max="1.0" step="0.05" value={formData.risk_level} onChange={(e) => handleFieldChange('risk_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--danger)' }} />
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Chi phí Token ước lượng ($)</span>
                    <span>${formData.ai_cost_estimate}</span>
                  </label>
                  <input type="number" min="0.0" max="5.0" step="0.05" className="input" value={formData.ai_cost_estimate} onChange={(e) => handleFieldChange('ai_cost_estimate', parseFloat(e.target.value) || 0.0)} style={{ padding: '0.4rem', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} />
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cơ chế đề xuất:</span>
                  {formData.collaboration_mode === 'HITL' && <span className="badge" style={{ background: '#a855f7', color: 'white', padding: '0.25rem 0.5rem' }}>HITL (Phê duyệt bước thủ công)</span>}
                  {formData.collaboration_mode === 'HOTL' && <span className="badge" style={{ background: '#3b82f6', color: 'white', padding: '0.25rem 0.5rem' }}>HOTL (AI chạy, Con người giám sát)</span>}
                  {formData.collaboration_mode === 'HOOL' && <span className="badge" style={{ background: '#22c55e', color: 'white', padding: '0.25rem 0.5rem' }}>HOOL (Tự động hoàn toàn có hoàn tác)</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn primary">Lưu công việc</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI DevOps Execution Simulator Modal */}
      {showSimulator && activeTask && (
        <div style={{ position: 'fixed', zIndex: 200, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge ai" style={{ marginBottom: '0.25rem' }}>DevOps Agent Terminal</span>
                <h3>Công cụ mô phỏng AI Sandbox</h3>
              </div>
              <span
                className="badge"
                style={{
                  background: activeTask.collaboration_mode === 'HOOL' ? '#22c55e' : activeTask.collaboration_mode === 'HOTL' ? '#3b82f6' : '#a855f7',
                  color: 'white',
                  padding: '0.35rem 0.6rem',
                }}
              >
                Giao thức {activeTask.collaboration_mode}
              </span>
            </div>

            <div>
              <p style={{ fontSize: '0.9rem' }}>Đang thực thi công việc: <strong>{activeTask.title}</strong></p>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{activeTask.description}</p>
            </div>

            {/* Pipeline Progress */}
            {activeTask.collaboration_mode !== 'HOOL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                {PIPELINE_STEPS.map((s, idx) => {
                  let statusColor = 'var(--muted)';
                  let stepStatusText = 'Đang chờ';
                  if (simulatorStatus === 'completed' || idx < currentStep) {
                    statusColor = 'var(--success)';
                    stepStatusText = '✓ Thành công';
                  } else if (idx === currentStep) {
                    if (simulatorStatus === 'waiting_approval') {
                      statusColor = 'var(--danger)';
                      stepStatusText = '✖ Bị chặn (Cần duyệt)';
                    } else if (simulatorStatus === 'paused') {
                      statusColor = 'var(--warning)';
                      stepStatusText = '⏸ Tạm dừng';
                    } else {
                      statusColor = 'var(--ai)';
                      stepStatusText = '⚡ Đang chạy...';
                    }
                  }
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderLeft: `3px solid ${statusColor}`, background: idx === currentStep ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <span style={{ fontWeight: idx === currentStep ? '600' : '400', color: idx === currentStep ? 'var(--text-primary)' : 'var(--muted)' }}>{s.name}</span>
                      <span style={{ color: statusColor, fontSize: '0.75rem', fontWeight: 'bold' }}>{stepStatusText}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Terminal logs container */}
            <div
              style={{
                background: '#090d16',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                height: '180px',
                overflowY: 'auto',
                fontFamily: 'Courier, monospace',
                fontSize: '0.75rem',
                color: '#39ff14',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              {logs.map((log, i) => {
                let color = '#39ff14';
                if (log.startsWith('[HỆ THỐNG]')) color = 'var(--ai)';
                else if (log.startsWith('[CẢNH BÁO]')) color = 'var(--warning)';
                else if (log.startsWith('[LỖI]')) color = 'var(--danger)';
                else if (log.startsWith('[NGƯỜI')) color = '#00ffff';
                else if (log.startsWith('[THÀNH CÔNG]')) color = 'var(--success)';
                return (
                  <div key={i} style={{ color }}>
                    {log}
                  </div>
                );
              })}
            </div>

            {/* Simulation Status Alerts & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {simulatorStatus === 'waiting_approval' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚠️ <strong>Công việc bị chặn:</strong> Cần phê duyệt thủ công. Hệ số rủi ro cao ({activeTask.risk_level}).</span>
                  <button className="btn primary" onClick={approveCurrentStep}>Phê duyệt bước</button>
                </div>
              )}

              {simulatorStatus === 'running' && activeTask.collaboration_mode === 'HOTL' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>⚡ AI đang chạy tự động. Theo dõi chỉ số hoặc nhấn Can thiệp.</span>
                  <button className="btn danger" style={{ padding: '0.35rem 0.75rem' }} onClick={handleIntervene}>⏸ Can thiệp</button>
                </div>
              )}

              {simulatorStatus === 'paused' && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>⏸ <strong>Bảng can thiệp điều hành:</strong> Bơm cấu hình động, prompt tùy chỉnh hoặc ghi đè mã nguồn.</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" placeholder="Ví dụ: ghi đè chuỗi kết nối DB..." value={interventionInput} onChange={(e) => setInterventionInput(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.4rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} />
                    <button className="btn" style={{ background: 'var(--warning)', color: '#111', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={submitIntervention}>Gửi</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                {simulatorStatus !== 'completed' && (
                  <button className="btn secondary" onClick={abortExecution}>Hủy / Đóng</button>
                )}
                {simulatorStatus === 'completed' && (
                  <button
                    className="btn primary"
                    onClick={() => {
                      if (activeTask) {
                        const targetStatus = activeTask.collaboration_mode === 'HOOL' ? 'done' : 'review';
                        moveTask(activeTask, targetStatus);
                      }
                      setShowSimulator(false);
                      setActiveTask(null);
                    }}
                  >
                    ✓ Hoàn thành & Lưu kết quả
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
