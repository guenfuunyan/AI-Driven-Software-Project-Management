import { useEffect, useState } from 'react';
import {
  aiStoryPoint,
  aiAnalyze,
  aiBreakdown,
  getProjects,
  getStories,
  createStory,
  updateStory,
  deleteStory,
  createTask,
  createRisk,
  getSprints,
} from '../api/client';
import type { Project, UserStory, Sprint } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  ready: 'Sẵn sàng',
  in_progress: 'Đang làm',
  done: 'Hoàn thành',
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Rất cao (P1)', color: '#ef4444' },
  2: { label: 'Cao (P2)', color: '#f97316' },
  3: { label: 'Trung bình (P3)', color: '#3b82f6' },
  4: { label: 'Thấp (P4)', color: '#9ca3af' },
};

interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function StoriesPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('stories', user?.role);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notification, setNotification] = useState<Notification | null>(null);

  // AI states per story
  const [estimate, setEstimate] = useState<Record<number, any>>({});
  const [analysis, setAnalysis] = useState<Record<number, any>>({});
  const [breakdown, setBreakdown] = useState<Record<number, any>>({});
  const [aiLoadingStoryId, setAiLoadingStoryId] = useState<number | null>(null);
  const [aiActionType, setAiActionType] = useState<string | null>(null);

  // Form modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    acceptance_criteria: '',
    status: 'backlog',
    story_points: '',
    sprint_id: '' as string | number,
    priority: 2,
  });

  // Detailed Analysis Modal States
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [activeAnalysisStory, setActiveAnalysisStory] = useState<UserStory | null>(null);
  const [activeAnalysisData, setActiveAnalysisData] = useState<any>(null);

  // Detailed Estimate Modal States
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [activeEstimateStory, setActiveEstimateStory] = useState<UserStory | null>(null);
  const [activeEstimateData, setActiveEstimateData] = useState<any>(null);
  const [selectedSP, setSelectedSP] = useState<number>(3);

  // Human-AI Task Breakdown Modal
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [activeBreakdownStory, setActiveBreakdownStory] = useState<UserStory | null>(null);
  const [breakdownTasks, setBreakdownTasks] = useState<any[]>([]);
  const [breakdownSprintId, setBreakdownSprintId] = useState<number | null>(null);
  const [importingTasks, setImportingTasks] = useState(false);

  useEffect(() => {
    getProjects(token).then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    });
  }, [token]);

  const loadSprints = () => {
    if (!projectId) return;
    getSprints(token, projectId).then(setSprints);
  };

  const loadStories = () => {
    if (!projectId) return;
    getStories(token, projectId).then(setStories);
  };

  useEffect(() => {
    loadSprints();
    loadStories();
  }, [token, projectId]);

  const determineCollaborationMode = (automation: number, risk: number, cost: number): string => {
    if (risk >= 0.6 || automation < 0.4 || cost >= 1.0) {
      return 'HITL';
    } else if (risk < 0.3 && automation >= 0.7 && cost < 0.5) {
      return 'HOOL';
    }
    return 'HOTL';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      acceptance_criteria: formData.acceptance_criteria || undefined,
      status: formData.status,
      story_points: formData.story_points ? Number(formData.story_points) : undefined,
      sprint_id: formData.sprint_id ? Number(formData.sprint_id) : undefined,
      priority: Number(formData.priority),
    };
    try {
      if (editingId) {
        await updateStory(token, editingId, payload);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã cập nhật Yêu cầu "${formData.title}"`,
        });
      } else {
        await createStory(token, projectId, payload);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã tạo Yêu cầu mới "${formData.title}"`,
        });
      }
      setShowModal(false);
      loadStories();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể lưu Yêu cầu. Vui lòng thử lại.',
      });
    }
  };

  const handleEdit = (s: UserStory) => {
    setEditingId(s.id);
    setFormData({
      title: s.title,
      description: s.description || '',
      acceptance_criteria: s.acceptance_criteria || '',
      status: s.status,
      story_points: s.story_points?.toString() || '',
      sprint_id: s.sprint_id || '',
      priority: s.priority || 2,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa Yêu cầu này?')) return;
    try {
      await deleteStory(token, id);
      setNotification({
        type: 'success',
        title: 'Đã xóa',
        message: 'Yêu cầu đã được xóa khỏi hệ thống.',
      });
      loadStories();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể xóa Yêu cầu.',
      });
    }
  };

  const handleApplySP = async (story: UserStory, sp: number) => {
    try {
      await updateStory(token, story.id, { story_points: sp });
      setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, story_points: sp } : s)));
      setShowEstimateModal(false);
      setNotification({
        type: 'success',
        title: 'Đã cập nhật Story Points',
        message: `Đã gán ${sp} SP cho "${story.title}"`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Lỗi khi cập nhật Story Points.',
      });
    }
  };

  const handleRegisterRiskFromAI = async (title: string, description?: string) => {
    if (!projectId) return;
    try {
      await createRisk(token, projectId, {
        title: `Rủi ro từ Yêu cầu: ${title}`,
        description: description || 'Rủi ro được phát hiện trong quá trình phân tích AI.',
        category: 'technical',
        probability: 0.6,
        impact: 0.6,
        score: 0.36,
        mitigation: 'Cần review phạm vi kỹ thuật trước khi đưa vào sprint',
      });
      setNotification({
        type: 'success',
        title: 'Đã ghi nhận Rủi ro',
        message: `Đã lưu rủi ro mới vào Bảng Rủi ro của dự án.`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể ghi nhận Rủi ro.',
      });
    }
  };

  // 1. AI ANALYZE -> OPENS DETAILED ANALYSIS MODAL
  const handleAnalyze = async (story: UserStory) => {
    setAiLoadingStoryId(story.id);
    setAiActionType('analyze');
    try {
      const text = `${story.title}. ${story.description || ''}. Tiêu chí: ${story.acceptance_criteria || ''}`;
      const result = await aiAnalyze(token, text, projectId ?? undefined);
      setAnalysis((prev) => ({ ...prev, [story.id]: result }));
      setActiveAnalysisStory(story);
      setActiveAnalysisData(result);
      setShowAnalysisModal(true);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Phân tích AI',
        message: err?.response?.data?.detail || 'Không thể thực hiện phân tích bằng AI.',
      });
    } finally {
      setAiLoadingStoryId(null);
      setAiActionType(null);
    }
  };

  // 2. AI ESTIMATE STORY POINTS -> OPENS DETAILED ESTIMATE MODAL
  const handleEstimate = async (story: UserStory) => {
    setAiLoadingStoryId(story.id);
    setAiActionType('estimate');
    try {
      const text = `${story.title}. ${story.description || ''}. Tiêu chí: ${story.acceptance_criteria || ''}`;
      const result = await aiStoryPoint(token, text, projectId ?? undefined);
      setEstimate((prev) => ({ ...prev, [story.id]: result }));
      
      const sp = result.story_points || 3;
      setSelectedSP(sp);
      setActiveEstimateStory(story);
      setActiveEstimateData(result);
      setShowEstimateModal(true);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Ước lượng AI',
        message: err?.response?.data?.detail || 'Không thể ước lượng Story Points bằng AI.',
      });
    } finally {
      setAiLoadingStoryId(null);
      setAiActionType(null);
    }
  };

  // 3. AI TASK BREAKDOWN
  const handleBreakdown = async (story: UserStory) => {
    setAiLoadingStoryId(story.id);
    setAiActionType('breakdown');
    setActiveBreakdownStory(story);
    setBreakdownSprintId(story.sprint_id || null);
    const text = `${story.title}. ${story.description || ''}`;
    try {
      const result = await aiBreakdown(token, text, projectId ?? undefined);
      setBreakdown((prev) => ({ ...prev, [story.id]: result }));

      const rawTasks = result.tasks || result.breakdown?.tasks || [];
      const tasks = rawTasks.map((t: any, idx: number) => {
        const aut = t.automation_level !== undefined ? t.automation_level : 0.5;
        const rsk = t.risk_level !== undefined ? t.risk_level : 0.3;
        const cst = t.ai_cost_estimate !== undefined ? t.ai_cost_estimate : parseFloat(((t.estimated_hours || 4) * 0.05).toFixed(2));
        return {
          id: idx,
          title: t.title || `Công việc ${idx + 1}`,
          description: t.description || '',
          estimated_hours: t.estimated_hours || 4,
          automation_level: aut,
          risk_level: rsk,
          ai_cost_estimate: cst,
          collaboration_mode: t.collaboration_mode || determineCollaborationMode(aut, rsk, cst),
          selected: true,
        };
      });
      setBreakdownTasks(tasks);
      setShowBreakdownModal(true);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Phân rã Task',
        message: err?.response?.data?.detail || 'Không thể phân rã công việc bằng AI.',
      });
    } finally {
      setAiLoadingStoryId(null);
      setAiActionType(null);
    }
  };

  const handleTaskFieldChange = (idx: number, field: string, value: any) => {
    setBreakdownTasks((prev) =>
      prev.map((t) => {
        if (t.id === idx) {
          const updated = { ...t, [field]: value };
          if (field === 'automation_level' || field === 'risk_level' || field === 'ai_cost_estimate') {
            const aut = field === 'automation_level' ? parseFloat(value) : t.automation_level;
            const rsk = field === 'risk_level' ? parseFloat(value) : t.risk_level;
            const cst = field === 'ai_cost_estimate' ? parseFloat(value) : t.ai_cost_estimate;
            updated.collaboration_mode = determineCollaborationMode(aut, rsk, cst);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleImportTasks = async () => {
    if (!projectId || !activeBreakdownStory) return;
    const selected = breakdownTasks.filter((t) => t.selected);
    if (selected.length === 0) {
      setNotification({
        type: 'warning',
        title: 'Cảnh báo',
        message: 'Vui lòng chọn ít nhất một công việc để nhập.',
      });
      return;
    }

    setImportingTasks(true);
    try {
      for (const t of selected) {
        await createTask(token, projectId, {
          title: t.title,
          description: t.description,
          story_id: activeBreakdownStory.id,
          sprint_id: breakdownSprintId || undefined,
          story_points: Math.max(1, Math.round(t.estimated_hours / 2)),
          automation_level: t.automation_level,
          risk_level: t.risk_level,
          ai_cost_estimate: t.ai_cost_estimate,
          collaboration_mode: t.collaboration_mode,
          status: 'todo',
        });
      }
      setShowBreakdownModal(false);
      setNotification({
        type: 'success',
        title: 'Thành công!',
        message: `✅ Đã tạo thành công ${selected.length} công việc mới vào Bảng công việc!`,
      });
      loadStories();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể nhập công việc vào hệ thống.',
      });
    } finally {
      setImportingTasks(false);
    }
  };

  const filteredStories = stories.filter((s) => statusFilter === 'all' || s.status === statusFilter);

  const stats = {
    total: stories.length,
    totalPoints: stories.reduce((sum, s) => sum + (s.story_points || 0), 0),
    done: stories.filter((s) => s.status === 'done').length,
    backlog: stories.filter((s) => s.status === 'backlog').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Yêu cầu người dùng (User Stories)</h2>
          {!access.canEdit && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{getReadOnlyNotice('stories', user?.role)}</p>
          )}
        </div>
        {access.canEdit && (
          <button
            className="btn primary"
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', description: '', acceptance_criteria: '', status: 'backlog', story_points: '', sprint_id: '', priority: 2 });
              setShowModal(true);
            }}
          >
            + Yêu cầu mới
          </button>
        )}
      </div>

      {/* Floating Notification Toast Banner */}
      {notification && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            padding: '1rem 1.25rem',
            borderLeft: `4px solid ${
              notification.type === 'success' ? '#22c55e' : notification.type === 'error' ? '#ef4444' : notification.type === 'warning' ? '#eab308' : '#3b82f6'
            }`,
            background: 'var(--surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{notification.title}</strong>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{notification.message}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {notification.actionLabel && notification.onAction && (
              <button className="btn primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={notification.onAction}>
                {notification.actionLabel}
              </button>
            )}
            <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => setNotification(null)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Selectors & Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ maxWidth: 240 }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái ({stories.length})</option>
          <option value="backlog">Backlog</option>
          <option value="ready">Sẵn sàng</option>
          <option value="in_progress">Đang làm</option>
          <option value="done">Hoàn thành</option>
        </select>
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem danh sách User Stories ở chế độ chỉ xem.</div>
        </div>
      )}

      {/* Statistics Summary Cards */}
      {stories.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Tổng User Story</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>{stats.totalPoints} SP</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Tổng Story Points</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e' }}>{stats.done}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Đã hoàn thành</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>{stats.backlog}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Trong Backlog</div>
          </div>
        </div>
      )}

      {/* User Story Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredStories.map((s) => {
          const isAiLoading = aiLoadingStoryId === s.id;
          const sprint = sprints.find((sp) => sp.id === s.sprint_id);
          const priorityInfo = PRIORITY_LABELS[s.priority || 2];
          const est = estimate[s.id];
          const ana = analysis[s.id];
          const brk = breakdown[s.id];

          return (
            <div key={s.id} className="card" style={{ padding: '1.25rem', margin: 0, borderLeft: `4px solid ${priorityInfo.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{s.title}</h3>
                    <span className="badge progress" style={{ fontSize: '0.7rem' }}>{STATUS_LABELS[s.status] || s.status}</span>
                    <span style={{ fontSize: '0.7rem', color: priorityInfo.color, fontWeight: 700 }}>{priorityInfo.label}</span>
                    {sprint && <span className="badge secondary" style={{ fontSize: '0.7rem' }}>🏃 {sprint.name}</span>}
                    {s.story_points != null && <span className="badge ai" style={{ fontSize: '0.7rem' }}>{s.story_points} SP</span>}
                  </div>
                  {s.description && <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', margin: '0.35rem 0 0.5rem' }}>{s.description}</p>}
                  {s.acceptance_criteria && (
                    <div style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                      <strong style={{ color: 'var(--muted)' }}>📋 Tiêu chí chấp nhận (Acceptance Criteria):</strong>
                      <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem' }}>{s.acceptance_criteria}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {access.canEdit && (
                    <>
                      <button className="btn secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => handleEdit(s)}>✏️ Sửa</button>
                      <button className="btn danger" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => handleDelete(s.id)}>🗑️ Xóa</button>
                    </>
                  )}
                </div>
              </div>

              {/* AI Action Toolbar */}
              {access.canEdit && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Công cụ Trợ lý AI:</span>
                  <button className="btn ai" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }} disabled={isAiLoading} onClick={() => handleAnalyze(s)}>
                    {isAiLoading && aiActionType === 'analyze' ? '⏳ Đang phân tích...' : '🔍 Phân tích AI'}
                  </button>
                  <button className="btn ai" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }} disabled={isAiLoading} onClick={() => handleEstimate(s)}>
                    {isAiLoading && aiActionType === 'estimate' ? '⏳ Đang tính toán...' : '🎯 Ước lượng SP'}
                  </button>
                  <button className="btn ai" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }} disabled={isAiLoading} onClick={() => handleBreakdown(s)}>
                    {isAiLoading && aiActionType === 'breakdown' ? '⏳ Đang phân rã...' : '⚡ Phân rã Task'}
                  </button>
                </div>
              )}

              {/* AI Result Cards Display */}
              {(ana || est || brk) && (
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {ana && (
                    <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.825rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong style={{ color: '#c084fc' }}>🔍 AI Phân tích Yêu cầu:</strong>
                        <button className="btn secondary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }} onClick={() => { setActiveAnalysisStory(s); setActiveAnalysisData(ana); setShowAnalysisModal(true); }}>
                          Xem phân tích
                        </button>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {(ana.analysis?.summary || ana.summary || '').slice(0, 100)}...
                      </p>
                    </div>
                  )}

                  {est && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.825rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#22c55e' }}>🎯 Gợi ý SP: {est.story_points} SP</strong>
                        <button className="btn primary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }} onClick={() => { setActiveEstimateStory(s); setActiveEstimateData(est); setSelectedSP(est.story_points || 3); setShowEstimateModal(true); }}>
                          Xem chi tiết SP
                        </button>
                      </div>
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--text-primary)' }}>
                        {est.rationale || 'Dựa trên độ phức tạp và phạm vi kỹ thuật.'}
                      </p>
                    </div>
                  )}

                  {brk && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.825rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#60a5fa' }}>⚡ Task gợi ý: {brk.tasks?.length || 0} tasks</strong>
                        {access.canEdit && (
                          <button className="btn ai" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }} onClick={() => { setActiveBreakdownStory(s); setShowBreakdownModal(true); }}>
                            Xem chi tiết
                          </button>
                        )}
                      </div>
                      <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)' }}>
                        Nhấn để xem bảng phân rã và phê duyệt nhập task.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredStories.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem 1rem' }}>
            Chưa có Yêu cầu người dùng (User Story) nào. Nhấn <strong>"+ Yêu cầu mới"</strong> để bắt đầu.
          </div>
        )}
      </div>

      {/* Main story create/edit modal */}
      {showModal && access.canEdit && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '480px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3>{editingId ? '✏️ Chỉnh sửa Yêu cầu' : '➕ Yêu cầu mới'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tiêu đề (User Story Title)</label>
                <input className="input" placeholder="Ví dụ: Là người dùng, tôi muốn đăng nhập bằng Google" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả chi tiết</label>
                <textarea className="input" placeholder="Mô tả bối cảnh và mục đích..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tiêu chí chấp nhận (Acceptance Criteria)</label>
                <textarea className="input" placeholder="Given... When... Then..." value={formData.acceptance_criteria} onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })} rows={2} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Trạng thái</label>
                  <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="backlog">Backlog</option>
                    <option value="ready">Sẵn sàng (Ready)</option>
                    <option value="in_progress">Đang thực hiện (In Progress)</option>
                    <option value="done">Hoàn thành (Done)</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Gắn vào Sprint</label>
                  <select className="input" value={formData.sprint_id} onChange={(e) => setFormData({ ...formData, sprint_id: e.target.value })}>
                    <option value="">-- Không chọn --</option>
                    {sprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Độ ưu tiên</label>
                  <select className="input" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}>
                    <option value={1}>Rất cao (P1)</option>
                    <option value={2}>Cao (P2)</option>
                    <option value={3}>Trung bình (P3)</option>
                    <option value={4}>Thấp (P4)</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Story Points</label>
                  <input type="number" min="0" max="21" className="input" placeholder="Điểm SP" value={formData.story_points} onChange={(e) => setFormData({ ...formData, story_points: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn primary">Lưu Yêu cầu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED REQUIREMENT ANALYSIS MODAL */}
      {showAnalysisModal && activeAnalysisStory && activeAnalysisData && (
        <div style={{ position: 'fixed', zIndex: 200, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '750px', background: 'var(--surface)', border: '1px solid var(--ai)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge ai" style={{ marginBottom: '0.25rem' }}>AI Requirement Agent</span>
                <h2>🔍 Phân tích Chi tiết Yêu cầu (AI Analysis)</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Yêu cầu: <strong>{activeAnalysisStory.title}</strong>
                </p>
              </div>
              <button className="btn secondary" onClick={() => setShowAnalysisModal(false)}>✕</button>
            </div>

            {/* Analysis Summary */}
            <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#c084fc' }}>📌 Tóm tắt Khả thi & Phạm vi (Executive Summary)</h4>
              <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {activeAnalysisData?.analysis?.summary || activeAnalysisData?.summary || JSON.stringify(activeAnalysisData)}
              </p>
            </div>

            {/* Technical Scope & Considerations */}
            {activeAnalysisData?.analysis?.technical_notes && (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#60a5fa' }}>⚙️ Yếu tố Kỹ thuật & Dependencies</h4>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {activeAnalysisData.analysis.technical_notes}
                </p>
              </div>
            )}

            {/* Direct Actions from Analysis Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn secondary"
                  onClick={() => {
                    handleRegisterRiskFromAI(
                      activeAnalysisStory.title,
                      activeAnalysisData?.analysis?.summary || activeAnalysisData?.summary
                    );
                  }}
                >
                  ⚠️ Ghi nhận Rủi ro
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn ai"
                  onClick={() => {
                    setShowAnalysisModal(false);
                    handleEstimate(activeAnalysisStory);
                  }}
                >
                  🎯 Ước lượng SP
                </button>
                <button
                  className="btn primary ai"
                  onClick={() => {
                    setShowAnalysisModal(false);
                    handleBreakdown(activeAnalysisStory);
                  }}
                >
                  ⚡ Phân rã Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED STORY POINT ESTIMATION MODAL */}
      {showEstimateModal && activeEstimateStory && activeEstimateData && (
        <div style={{ position: 'fixed', zIndex: 200, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: 'var(--surface)', border: '1px solid #22c55e', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge" style={{ background: '#22c55e', color: 'white', marginBottom: '0.25rem' }}>AI Planning Agent</span>
                <h2>🎯 Ước lượng Story Points bằng AI</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Yêu cầu: <strong>{activeEstimateStory.title}</strong>
                </p>
              </div>
              <button className="btn secondary" onClick={() => setShowEstimateModal(false)}>✕</button>
            </div>

            {/* SP Recommendation Card */}
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Đề xuất Story Points từ AI
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#22c55e', margin: '0.25rem 0' }}>
                {activeEstimateData.story_points || 3} SP
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {activeEstimateData.rationale || 'Ước lượng dựa trên phạm vi mô tả, độ phức tạp kỹ thuật và tích hợp hệ thống.'}
              </p>
            </div>

            {/* Interactive Fibonacci Selection */}
            <div>
              <label className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                Chọn điểm Story Points (Thang Fibonacci):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 5, 8, 13, 21].map((point) => (
                  <button
                    key={point}
                    type="button"
                    className="btn"
                    style={{
                      flex: 1,
                      minWidth: '50px',
                      padding: '0.6rem 0',
                      fontSize: '1rem',
                      fontWeight: 700,
                      background: selectedSP === point ? '#22c55e' : 'var(--bg-secondary)',
                      color: selectedSP === point ? 'white' : 'var(--text-primary)',
                      border: selectedSP === point ? '1px solid #22c55e' : '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setSelectedSP(point)}
                  >
                    {point} SP
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', gap: '0.5rem' }}>
              <button
                className="btn secondary"
                onClick={() => {
                  setShowEstimateModal(false);
                  handleBreakdown(activeEstimateStory);
                }}
              >
                ⚡ Tiếp tục Phân rã Task
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn secondary" onClick={() => setShowEstimateModal(false)}>Hủy</button>
                <button
                  className="btn primary"
                  style={{ background: '#22c55e', borderColor: '#22c55e' }}
                  onClick={() => handleApplySP(activeEstimateStory, selectedSP)}
                >
                  ✅ Áp dụng {selectedSP} SP vào Yêu cầu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task breakdown interactive modal */}
      {showBreakdownModal && activeBreakdownStory && (
        <div style={{ position: 'fixed', zIndex: 200, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '960px', background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge ai" style={{ marginBottom: '0.25rem' }}>AI Task Breakdown Agent</span>
                <h2>Kế hoạch Phân rã Công việc (Human-AI Task Planner)</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Yêu cầu: <strong>{activeBreakdownStory.title}</strong>
                </p>
              </div>
              <button className="btn secondary" onClick={() => setShowBreakdownModal(false)}>✕</button>
            </div>

            <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
              <strong>Tiêu chí lựa chọn cơ chế hợp tác DevOps:</strong>
              <ul style={{ marginLeft: '1.25rem', marginTop: '0.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <li>🟣 <strong>HITL (Human-in-the-Loop):</strong> Rủi ro &ge; 0.60 HOẶC Tự động &lt; 0.40 HOẶC Chi phí &ge; $1.00</li>
                <li>🔵 <strong>HOTL (Human-on-the-Loop):</strong> Mặc định (Con người giám sát)</li>
                <li>🟢 <strong>HOOL (Human-out-of-Loop):</strong> Rủi ro &lt; 0.30 VÀ Tự động &ge; 0.70 VÀ Chi phí &lt; $0.50</li>
              </ul>
            </div>

            {/* Sprint destination selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <strong style={{ fontSize: '0.85rem' }}>🎯 Nhập các task này vào Sprint nào?</strong>
              <select className="input" style={{ maxWidth: 220 }} value={breakdownSprintId ?? ''} onChange={(e) => setBreakdownSprintId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- Không phân Sprint (Backlog) --</option>
                {sprints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              </select>
            </div>

            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ minWidth: '850px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', color: 'var(--text-primary)' }}>Chọn</th>
                    <th style={{ width: '220px', color: 'var(--text-primary)' }}>Chi tiết công việc</th>
                    <th style={{ width: '160px', color: 'var(--text-primary)' }}>Mức độ tự động</th>
                    <th style={{ width: '160px', color: 'var(--text-primary)' }}>Mức độ rủi ro</th>
                    <th style={{ width: '130px', color: 'var(--text-primary)' }}>Chi phí ước lượng ($)</th>
                    <th style={{ width: '120px', color: 'var(--text-primary)' }}>Cơ chế đề xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownTasks.map((t) => (
                    <tr key={t.id} style={{ opacity: t.selected ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <input type="checkbox" checked={t.selected} onChange={(e) => handleTaskFieldChange(t.id, 'selected', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      </td>
                      <td>
                        <input className="input" value={t.title} onChange={(e) => handleTaskFieldChange(t.id, 'title', e.target.value)} style={{ fontSize: '0.85rem', padding: '0.4rem', marginBottom: '0.25rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} placeholder="Tiêu đề công việc" />
                        <textarea className="input" value={t.description} onChange={(e) => handleTaskFieldChange(t.id, 'description', e.target.value)} style={{ fontSize: '0.75rem', padding: '0.4rem', height: '45px', resize: 'none', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} placeholder="Mô tả công việc" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input type="range" min="0.0" max="1.0" step="0.05" value={t.automation_level} onChange={(e) => handleTaskFieldChange(t.id, 'automation_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                          <span style={{ fontSize: '0.75rem', textAlign: 'center', color: t.automation_level >= 0.7 ? 'var(--success)' : t.automation_level < 0.4 ? 'var(--danger)' : 'var(--warning)' }}>
                            {t.automation_level >= 0.7 ? 'Cao (High)' : t.automation_level < 0.4 ? 'Thấp (Low)' : 'Trung bình'} ({t.automation_level})
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input type="range" min="0.0" max="1.0" step="0.05" value={t.risk_level} onChange={(e) => handleTaskFieldChange(t.id, 'risk_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--danger)' }} />
                          <span style={{ fontSize: '0.75rem', textAlign: 'center', color: t.risk_level >= 0.6 ? 'var(--danger)' : t.risk_level < 0.3 ? 'var(--success)' : 'var(--warning)' }}>
                            {t.risk_level >= 0.6 ? 'Cao (High)' : t.risk_level < 0.3 ? 'Thấp (Low)' : 'Trung bình'} ({t.risk_level})
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input type="number" min="0.0" max="5.0" step="0.05" className="input" value={t.ai_cost_estimate} onChange={(e) => handleTaskFieldChange(t.id, 'ai_cost_estimate', parseFloat(e.target.value) || 0.0)} style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', textAlign: 'center', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} />
                          <span style={{ fontSize: '0.75rem', textAlign: 'center', color: t.ai_cost_estimate >= 1.0 ? 'var(--danger)' : 'var(--muted)' }}>
                            ~{Math.round(t.ai_cost_estimate * 500000).toLocaleString()} tokens
                          </span>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        {t.collaboration_mode === 'HITL' && (
                          <span className="badge" style={{ background: '#a855f7', color: 'white', padding: '0.4rem 0.6rem', width: '70px', display: 'inline-block', textAlign: 'center' }}>HITL</span>
                        )}
                        {t.collaboration_mode === 'HOTL' && (
                          <span className="badge" style={{ background: '#3b82f6', color: 'white', padding: '0.4rem 0.6rem', width: '70px', display: 'inline-block', textAlign: 'center' }}>HOTL</span>
                        )}
                        {t.collaboration_mode === 'HOOL' && (
                          <span className="badge" style={{ background: '#22c55e', color: 'white', padding: '0.4rem 0.6rem', width: '70px', display: 'inline-block', textAlign: 'center' }}>HOOL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                Đã chọn: <strong>{breakdownTasks.filter((t) => t.selected).length} công việc</strong> | Tổng chi phí AI:{' '}
                <strong style={{ color: 'var(--ai)' }}>
                  ${breakdownTasks.filter((t) => t.selected).reduce((acc, curr) => acc + curr.ai_cost_estimate, 0).toFixed(2)}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn secondary" onClick={() => setShowBreakdownModal(false)} disabled={importingTasks}>Hủy</button>
                <button className="btn primary ai" onClick={handleImportTasks} disabled={importingTasks}>
                  {importingTasks ? '⏳ Đang tạo công việc...' : '✨ Phê duyệt và Nhập công việc'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
