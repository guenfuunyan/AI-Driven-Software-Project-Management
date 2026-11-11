import { useEffect, useState } from 'react';
import {
  aiAnalyze,
  aiBreakdown,
  aiStoryPoint,
  aiRisk,
  aiForecast,
  aiDeliberate,
  aiResolveHitl,
  executeAgentAction,
  rollbackAgentAction,
  getAIAgents,
  getAIDeliberations,
  getAIJobs,
  getProjects,
  DeliberationResponse,
  DeliberationRead,
  Project,
  AgentEnvelope,
} from '../api/client';
import { useAuthStore } from '../store/auth';
import {
  Brain,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock,
  UserCheck,
  Zap,
  Check,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  ListTree,
  RotateCcw,
  Layers,
  Activity,
  Terminal,
  Code,
  CheckSquare,
} from 'lucide-react';

interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export default function AIPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);

  // Active Tab: 'deliberation' | 'history' | 'legacy'
  const [activeTab, setActiveTab] = useState<'deliberation' | 'history' | 'legacy'>('deliberation');

  // Multi-Agent Deliberation Form State
  const [userStory, setUserStory] = useState(
    'Là người dùng, tôi muốn tích hợp cổng thanh toán trực tuyến đa kênh và ví điện tử, xử lý realtime với mã hóa sinh trắc học và hoàn tất trong 3 ngày tới!'
  );
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(
    'Given thông tin thẻ/ví điện tử, When xác thực sinh trắc học thành công, Then giao dịch hoàn tất trong dưới 2 giây và ghi log bảo mật.'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);

  // Deliberation Execution & Results
  const [deliberating, setDeliberating] = useState(false);
  const [deliberationResult, setDeliberationResult] = useState<DeliberationResponse | null>(null);
  const [resolvingHitl, setResolvingHitl] = useState(false);
  const [selectedHitlOption, setSelectedHitlOption] = useState<string>('opt_balanced_phased');

  // History State
  const [deliberationHistory, setDeliberationHistory] = useState<DeliberationRead[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Autonomous Agent Single Tools State
  const [legacyText, setLegacyText] = useState('Là PM, tôi muốn có dashboard KPI AI để theo dõi các chỉ số quan trọng của dự án.');
  const [legacyStory, setLegacyStory] = useState('');
  const [agentResult, setAgentResult] = useState<AgentEnvelope | null>(null);
  const [agents, setAgents] = useState<{ name: string; agent_type: string; description?: string }[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);



  // Notification Toast
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    getAIAgents(token).then(setAgents).catch(() => {});
    getAIJobs(token).then(setJobs).catch(() => {});
    getProjects(token).then((data) => {
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    }).catch(() => {});
    loadHistory();
  }, [token]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await getAIDeliberations(token);
      setDeliberationHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRunDeliberation = async () => {
    if (!userStory.trim()) {
      setNotification({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập mô tả User Story hoặc yêu cầu cần thảo luận.',
      });
      return;
    }

    setDeliberating(true);
    try {
      const res = await aiDeliberate(token, {
        user_story: userStory,
        acceptance_criteria: acceptanceCriteria,
        project_id: selectedProjectId,
      });
      setDeliberationResult(res);
      if (res.hitl_options.length > 0) {
        setSelectedHitlOption(res.hitl_options[0].option_id);
      }
      setNotification({
        type: 'success',
        title: 'Phiên Thảo luận Đa Agent Hoàn tất',
        message: `3 Agent đã hoàn thành tư duy độc lập. Phát hiện mức độ mâu thuẫn: ${res.conflict_level} (${Math.round(res.conflict_severity * 100)}%).`,
      });
      loadHistory();
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Điều Phối',
        message: 'Không thể kích hoạt phiên thảo luận đa Agent.',
      });
    } finally {
      setDeliberating(false);
    }
  };

  const handleResolveHitl = async (optionId: string) => {
    if (!deliberationResult) return;
    setResolvingHitl(true);
    try {
      const res = await aiResolveHitl(token, deliberationResult.deliberation_id, optionId, `Phê duyệt bởi PM: ${user?.full_name || 'Project Manager'}`);
      setDeliberationResult((prev) => prev ? { ...prev, status: 'completed' } : null);
      setNotification({
        type: 'success',
        title: 'Phê duyệt HITL Thành công',
        message: res.message || `Đã giải quyết mâu thuẫn theo phương án '${optionId}'.`,
      });
      loadHistory();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Phê duyệt',
        message: 'Không thể phê duyệt phương án HITL.',
      });
    } finally {
      setResolvingHitl(false);
    }
  };

  const runLegacyAnalyze = async () => {
    setLegacyLoading(true);
    try {
      const res = await aiAnalyze(token, legacyText, selectedProjectId);
      setAgentResult(res);
      setNotification({
        type: 'success',
        title: 'Requirement Agent Hoàn tất',
        message: 'Agent đã khảo sát ngữ cảnh dự án và hoàn thành chuỗi phân tích ReAct.',
      });
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Phân tích',
        message: 'Không thể thực thi AI Agent.',
      });
    } finally {
      setLegacyLoading(false);
    }
  };

  const runLegacyBreakdown = async () => {
    setLegacyLoading(true);
    try {
      const res = await aiBreakdown(token, legacyStory || legacyText, selectedProjectId);
      setAgentResult(res);
      setNotification({
        type: 'success',
        title: 'Task Breakdown Agent Hoàn tất',
        message: `Agent đã bẻ nhỏ User Story thành ${res.tasks?.length || 0} subtasks và lập kế hoạch tự chủ.`,
      });
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Phân rã',
        message: 'Không thể phân rã công việc bằng AI.',
      });
    } finally {
      setLegacyLoading(false);
    }
  };

  const runLegacyStoryPoint = async () => {
    setLegacyLoading(true);
    try {
      const res = await aiStoryPoint(token, legacyStory || legacyText, selectedProjectId);
      setAgentResult(res);
      setNotification({
        type: 'success',
        title: 'Planning Agent Hoàn tất',
        message: `Agent đã ước lượng ${res.story_points || '-'} Story Points dựa trên vận tốc lịch sử.`,
      });
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Ước lượng',
        message: 'Không thể ước lượng điểm bằng Planning Agent.',
      });
    } finally {
      setLegacyLoading(false);
    }
  };

  const runLegacyRisk = async () => {
    setLegacyLoading(true);
    try {
      const res = await aiRisk(token, selectedProjectId || 1, legacyText);
      setAgentResult(res);
      setNotification({
        type: 'success',
        title: 'Risk Sentinel Agent Hoàn tất',
        message: `Agent đã quét hệ thống và nhận diện ${res.risks?.length || 0} rủi ro tiềm ẩn.`,
      });
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Quét Rủi ro',
        message: 'Không thể rà soát rủi ro bằng Risk Agent.',
      });
    } finally {
      setLegacyLoading(false);
    }
  };

  const runLegacyForecast = async () => {
    setLegacyLoading(true);
    try {
      const res = await aiForecast(token, selectedProjectId || 1);
      setAgentResult(res);
      setNotification({
        type: 'success',
        title: 'Forecast Agent Hoàn tất',
        message: `Dự báo vận tốc ${res.predicted_velocity || '-'} SP/ngày, xác suất về đích: ${Math.round((res.completion_probability || 0) * 100)}%.`,
      });
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Dự báo',
        message: 'Không thể lập dự báo bằng Forecast Agent.',
      });
    } finally {
      setLegacyLoading(false);
    }
  };

  const handleExecuteAutonomousAction = async (actionId: number) => {
    setActionLoading(true);
    try {
      const res = await executeAgentAction(token, actionId, `Phê duyệt bởi: ${user?.full_name || 'PM'}`);
      if (agentResult) {
        setAgentResult({ ...agentResult, action_status: 'executed' });
      }
      setNotification({
        type: 'success',
        title: 'Thực thi Hành động Tự chủ Thành công',
        message: res.message || 'Các thay đổi đề xuất bởi Agent đã được commit vào CSDL.',
      });
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Thực thi',
        message: 'Không thể commit hành động của Agent vào CSDL.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollbackAutonomousAction = async (actionId: number) => {
    setActionLoading(true);
    try {
      const res = await rollbackAgentAction(token, actionId);
      if (agentResult) {
        setAgentResult({ ...agentResult, action_status: 'rolled_back' });
      }
      setNotification({
        type: 'info',
        title: 'Hoàn tác Thành công (Rollback Snapshot)',
        message: res.message || 'Đã khôi phục trạng thái ban đầu của hệ thống.',
      });
      getAIJobs(token).then(setJobs).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Hoàn tác',
        message: 'Không thể rollback hành động của Agent.',
      });
    } finally {
      setActionLoading(false);
    }
  };


  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', padding: '0.45rem', borderRadius: '10px' }}>
              <Brain size={24} color="#fff" />
            </div>
            <h2 className="page-title" style={{ margin: 0 }}>Trung tâm Điều phối Đa AI Agent (Multi-Agent Deliberation Suite)</h2>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
            Hệ sinh thái Agent độc lập suy nghĩ: <strong>Product Owner</strong> (Giá trị kinh doanh) ⚔️ <strong>Tech Lead</strong> (Kiến trúc & Rủi ro) ⚔️ <strong>Scrum Master</strong> (Tiến độ & Năng lực) $\rightarrow$ <strong>AI Chief Arbiter</strong> (Hòa giải mâu thuẫn)
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', background: 'var(--surface)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            className={`btn ${activeTab === 'deliberation' ? 'primary' : 'secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem', border: 'none' }}
            onClick={() => setActiveTab('deliberation')}
          >
            <Scale size={15} style={{ marginRight: '0.35rem' }} />
            Đa Agent & Hòa giải Mâu thuẫn
          </button>
          <button
            className={`btn ${activeTab === 'history' ? 'primary' : 'secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem', border: 'none' }}
            onClick={() => { setActiveTab('history'); loadHistory(); }}
          >
            <Clock size={15} style={{ marginRight: '0.35rem' }} />
            Lịch sử Phiên ({deliberationHistory.length})
          </button>
          <button
            className={`btn ${activeTab === 'legacy' ? 'primary' : 'secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem', border: 'none' }}
            onClick={() => setActiveTab('legacy')}
          >
            <Activity size={15} style={{ marginRight: '0.35rem' }} />
            Bảng Điều khiển Agent Tự chủ
          </button>
        </div>
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

      {/* ========================================================================= */}
      {/* TAB 1: AUTONOMOUS MULTI-AGENT DELIBERATION & CONFLICT RESOLUTION */}
      {/* ========================================================================= */}
      {activeTab === 'deliberation' && (
        <div>
          {/* Input Configuration Card */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color="#c084fc" />
                  Khởi động Phiên Thảo luận & Phản biện Đa Agent
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Ba Agent đại diện cho 3 góc nhìn cốt lõi trong Agile sẽ độc lập phân tích, đưa ra luận điểm riêng và tự động kích hoạt bộ hòa giải mâu thuẫn.
                </p>
              </div>

              {/* Sample Presets */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => {
                    setUserStory('Là người dùng, tôi muốn tích hợp cổng thanh toán trực tuyến đa kênh và ví điện tử, xử lý realtime với mã hóa sinh trắc học và hoàn tất trong 3 ngày tới!');
                    setAcceptanceCriteria('Given thẻ/ví điện tử, When xác thực sinh trắc học, Then trừ tiền dưới 2s và ghi nhận hoá đơn.');
                  }}
                >
                  ⚡ Mẫu: Mâu thuẫn Nghiêm trọng (Thanh toán Gấp)
                </button>
                <button
                  className="btn secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => {
                    setUserStory('Là PM, tôi muốn xuất báo cáo hiệu suất Sprint dạng file PDF và Excel với bộ lọc ngày tùy chỉnh.');
                    setAcceptanceCriteria('Given trang báo cáo, When nhấn xuất file, Then tải xuống tệp PDF/Excel đầy đủ biểu đồ.');
                  }}
                >
                  🟢 Mẫu: Đồng thuận Cao (Xuất Báo Cáo)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả User Story / Tính năng cần tranh luận</label>
                <textarea
                  className="input"
                  rows={3}
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  placeholder="Nhập User Story (vd: Là người dùng, tôi muốn...)"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tiêu chí Chấp nhận (Acceptance Criteria)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  placeholder="Kịch bản Given... When... Then..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="label" style={{ margin: 0 }}>Dự án mục tiêu:</label>
                <select
                  className="input"
                  style={{ width: 'auto', minWidth: 200, padding: '0.35rem 0.6rem' }}
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn primary"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  padding: '0.6rem 1.4rem',
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                }}
                onClick={handleRunDeliberation}
                disabled={deliberating}
              >
                {deliberating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                    Đang kích hoạt 3 Agent Độc Lập Suy Luận...
                  </>
                ) : (
                  <>
                    <Zap size={16} style={{ marginRight: '0.5rem' }} />
                    🚀 Kích hoạt 3 Agent Độc Lập Suy Luận & Hòa Giải Mâu Thuẫn
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Deliberation Execution Visual Results */}
          {deliberationResult && (
            <div>
              {/* Conflict Severity & Governance Protocol Banner */}
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  background: 'linear-gradient(180deg, #131b2e 0%, var(--surface) 100%)',
                  border: `1px solid ${
                    deliberationResult.conflict_level === 'CRITICAL'
                      ? '#ef4444'
                      : deliberationResult.conflict_level === 'MODERATE'
                      ? '#eab308'
                      : '#22c55e'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background:
                          deliberationResult.conflict_level === 'CRITICAL'
                            ? '#ef444422'
                            : deliberationResult.conflict_level === 'MODERATE'
                            ? '#eab30822'
                            : '#22c55e22',
                        color:
                          deliberationResult.conflict_level === 'CRITICAL'
                            ? '#f87171'
                            : deliberationResult.conflict_level === 'MODERATE'
                            ? '#facc15'
                            : '#4ade80',
                        border: `1px solid ${
                          deliberationResult.conflict_level === 'CRITICAL'
                            ? '#ef4444'
                            : deliberationResult.conflict_level === 'MODERATE'
                            ? '#eab308'
                            : '#22c55e'
                        }`,
                      }}
                    >
                      Mức độ Mâu thuẫn: {deliberationResult.conflict_level} ({Math.round(deliberationResult.conflict_severity * 100)}%)
                    </span>
                    <h3 style={{ margin: '0.5rem 0 0.2rem', fontSize: '1.15rem' }}>
                      Phán quyết Điều phối: <strong>{deliberationResult.final_verdict}</strong> ({deliberationResult.reconciled_points} Story Points)
                    </h3>
                  </div>

                  {/* Governance Protocol Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#090d16', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Giao thức Điều phối:</span>
                      <strong
                        style={{
                          fontSize: '0.9rem',
                          color:
                            deliberationResult.governance_mode === 'HITL'
                              ? '#c084fc'
                              : deliberationResult.governance_mode === 'HOTL'
                              ? '#60a5fa'
                              : '#34d399',
                        }}
                      >
                        {deliberationResult.governance_mode === 'HITL' && '🟣 HITL (Duyệt Thủ Công Bắt Buộc)'}
                        {deliberationResult.governance_mode === 'HOTL' && '🔵 HOTL (Giám Sát Động)'}
                        {deliberationResult.governance_mode === 'HOOL' && '🟢 HOOL (Tự Động Hoàn Toàn)'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Conflict Severity Progress Bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                    <span>Đồng thuận hoàn toàn (0%)</span>
                    <span>Độ lệch vừa phải (50%)</span>
                    <span>Bất đồng gay gắt (100%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(5, deliberationResult.conflict_severity * 100)}%`,
                        background:
                          deliberationResult.conflict_level === 'CRITICAL'
                            ? 'linear-gradient(90deg, #eab308, #ef4444)'
                            : deliberationResult.conflict_level === 'MODERATE'
                            ? 'linear-gradient(90deg, #22c55e, #eab308)'
                            : '#22c55e',
                        transition: 'width 0.8s ease-in-out',
                      }}
                    />
                  </div>
                </div>

                {/* Consensus Summary Text */}
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5, background: '#090d1688', padding: '0.75rem 1rem', borderRadius: '6px' }}>
                  {deliberationResult.consensus_summary}
                </p>
              </div>

              {/* 3 Autonomous Agent Pods Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {deliberationResult.agents_thoughts.map((thought) => {
                  const isPO = thought.agent_role === 'po_agent';
                  const isTech = thought.agent_role === 'tech_lead_agent';
                  const borderColor = isPO ? '#3b82f6' : isTech ? '#ef4444' : '#10b981';

                  return (
                    <div
                      key={thought.agent_role}
                      className="card"
                      style={{
                        padding: '1.25rem',
                        margin: 0,
                        borderTop: `4px solid ${borderColor}`,
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        {/* Agent Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>{isPO ? '👔' : isTech ? '🛠️' : '⏱️'}</span>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{thought.role_title}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{thought.agent_name}</span>
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: '#090d16',
                              color: borderColor,
                              border: `1px solid ${borderColor}`,
                            }}
                          >
                            {thought.verdict}
                          </span>
                        </div>

                        {/* Metric Cards Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                          <div style={{ background: '#090d16', padding: '0.5rem', borderRadius: '6px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>{thought.score_label}</span>
                            <strong style={{ fontSize: '1.1rem', color: borderColor }}>{thought.score} / 10</strong>
                          </div>
                          <div style={{ background: '#090d16', padding: '0.5rem', borderRadius: '6px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>Ước lượng Điểm</span>
                            <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>{thought.estimated_points} Story Points</strong>
                          </div>
                        </div>

                        {/* Independent Chain of Thought */}
                        <div style={{ marginBottom: '0.85rem' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            🧠 Chuỗi Tư duy Độc lập (Chain-of-Thought):
                          </strong>
                          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45, fontStyle: 'italic', background: '#090d16', padding: '0.6rem', borderRadius: '6px' }}>
                            "{thought.thinking_process}"
                          </p>
                        </div>

                        {/* Key Arguments */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            📌 Luận điểm Cốt lõi:
                          </strong>
                          <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                            {thought.key_arguments?.map((arg, aIdx) => (
                              <li key={aIdx} style={{ marginBottom: '0.2rem' }}>{arg}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Trade-off Stance */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Ranh giới nhượng bộ:</span>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                          {thought.concerns_and_tradeoffs}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detected Conflicts Breakdown Card */}
              {deliberationResult.conflicts_detected.length > 0 && (
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid #ef4444' }}>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} />
                    Chi tiết Các Điểm Mâu thuẫn Phát hiện giữa các Agent ({deliberationResult.conflicts_detected.length})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {deliberationResult.conflicts_detected.map((conf) => (
                      <div
                        key={conf.id}
                        style={{
                          background: '#090d16',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.85rem 1rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>{conf.category}</strong>
                          <span
                            style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: conf.severity === 'HIGH' ? '#ef444433' : '#eab30833',
                              color: conf.severity === 'HIGH' ? '#f87171' : '#facc15',
                            }}
                          >
                            Cấp độ: {conf.severity}
                          </span>
                        </div>
                        <p style={{ margin: '0.2rem 0', fontSize: '0.82rem', color: '#cbd5e1' }}>{conf.description}</p>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          ⚠️ Hệ quả: {conf.impact_analysis}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Consensus & Implementation Plan Card */}
              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1.25rem', margin: 0 }}>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} />
                    Kế hoạch Triển khai Sau Hòa giải (Actionable Plan)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {deliberationResult.actionable_plan.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          background: '#090d16',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          color: '#e2e8f0',
                          borderLeft: '3px solid #38bdf8',
                        }}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', margin: 0 }}>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Scale size={18} />
                    Phân tích Đánh đổi giữa các Bên (Trade-offs Made)
                  </h3>
                  <pre
                    style={{
                      background: '#090d16',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.82rem',
                      color: '#cbd5e1',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {deliberationResult.tradeoff_analysis}
                  </pre>
                </div>
              </div>

              {/* HITL HUMAN-IN-THE-LOOP APPROVAL PANEL (If Governance is HITL) */}
              {deliberationResult.governance_mode === 'HITL' && (
                <div
                  className="card"
                  style={{
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    border: '2px solid #8b5cf6',
                    background: 'linear-gradient(180deg, #18112e 0%, var(--surface) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <UserCheck size={22} color="#c084fc" />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#c084fc' }}>
                      Khu vực Phê duyệt Thủ công của Project Manager (HITL Governance Protocol)
                    </h3>
                  </div>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Do mức độ mâu thuẫn vượt ngưỡng an toàn ($\ge 65\%$), hệ thống AI không tự ý commit mà bàn giao quyền quyết định cho con người. Vui lòng chọn 1 trong 3 phương án đánh đổi:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    {deliberationResult.hitl_options.map((opt) => {
                      const isSelected = selectedHitlOption === opt.option_id;
                      return (
                        <div
                          key={opt.option_id}
                          onClick={() => setSelectedHitlOption(opt.option_id)}
                          style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: isSelected ? '#1e1b4b' : '#090d16',
                            border: `2px solid ${isSelected ? '#8b5cf6' : 'var(--border)'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                              <strong style={{ fontSize: '0.9rem', color: isSelected ? '#c084fc' : '#f8fafc' }}>
                                {opt.title}
                              </strong>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
                                {opt.points} SP
                              </span>
                            </div>

                            <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                              {opt.description}
                            </p>

                            <div style={{ fontSize: '0.75rem', color: '#4ade80', marginBottom: '0.25rem' }}>
                              <strong>Ưu điểm:</strong> {opt.pros.join(', ')}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#f87171' }}>
                              <strong>Đánh đổi:</strong> {opt.cons.join(', ')}
                            </div>
                          </div>

                          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Ưu tiên: {opt.favored_agent}</span>
                            <span style={{ fontSize: '0.75rem', color: isSelected ? '#c084fc' : 'transparent', fontWeight: 700 }}>
                              {isSelected ? '✓ Đang chọn' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                    {deliberationResult.status === 'completed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontWeight: 600 }}>
                        <Check size={18} />
                        Đã được Project Manager phê duyệt thành công!
                      </div>
                    ) : (
                      <button
                        className="btn primary"
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          padding: '0.6rem 1.4rem',
                        }}
                        disabled={resolvingHitl}
                        onClick={() => handleResolveHitl(selectedHitlOption)}
                      >
                        {resolvingHitl ? '⏳ Đang xác nhận phê duyệt...' : '✓ Phê duyệt Phương án Lựa chọn này (PM Sign-off)'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DELIBERATION HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Lịch sử Các Phiên Thảo luận & Hòa giải Đa Agent</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                Các quyết định đã được điều phối và giải quyết mâu thuẫn
              </p>
            </div>
            <button className="btn secondary" style={{ fontSize: '0.75rem' }} onClick={loadHistory} disabled={loadingHistory}>
              {loadingHistory ? '⏳ Đang tải...' : '🔄 Làm mới'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Mã phiên</th>
                  <th>Chủ đề / User Story</th>
                  <th>Mức độ Mâu thuẫn</th>
                  <th>Giao thức</th>
                  <th>Phán quyết Hòa giải</th>
                  <th>Story Points</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {deliberationHistory.map((h) => (
                  <tr key={h.id}>
                    <td><strong style={{ fontSize: '0.85rem' }}>#{h.id}</strong></td>
                    <td style={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span title={h.topic} style={{ fontSize: '0.85rem' }}>{h.topic}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background:
                            h.conflict_level === 'CRITICAL'
                              ? '#ef444422'
                              : h.conflict_level === 'MODERATE'
                              ? '#eab30822'
                              : '#22c55e22',
                          color:
                            h.conflict_level === 'CRITICAL'
                              ? '#f87171'
                              : h.conflict_level === 'MODERATE'
                              ? '#facc15'
                              : '#4ade80',
                        }}
                      >
                        {h.conflict_level} ({Math.round(h.conflict_severity * 100)}%)
                      </span>
                    </td>
                    <td>
                      <span className="badge ai" style={{ fontSize: '0.7rem' }}>
                        {h.governance_mode}
                      </span>
                    </td>
                    <td><strong style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{h.final_decision}</strong></td>
                    <td><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{h.reconciled_points || '-'} SP</span></td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: h.status === 'completed' ? '#4ade80' : '#c084fc',
                        }}
                      >
                        {h.status === 'completed' ? '✓ Đã hoàn tất' : '⏳ Chờ PM duyệt'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {h.created_at ? h.created_at.slice(0, 19).replace('T', ' ') : 'Vừa xong'}
                    </td>
                  </tr>
                ))}

                {deliberationHistory.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      Chưa có phiên thảo luận đa Agent nào được lưu lại. Hãy thử chạy một phiên ở Tab "Đa Agent & Hòa giải Mâu thuẫn".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTONOMOUS AGENT RUNTIME & EXECUTION CONSOLE */}
      {/* ========================================================================= */}
      {activeTab === 'legacy' && (
        <div>
          {/* AI Agents Roster Cards */}
          <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
            {agents.map((a) => (
              <div key={a.name} className="card" style={{ padding: '1.25rem', margin: 0, borderLeft: '4px solid #8b5cf6', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="badge ai" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{a.agent_type} Agent</span>
                  <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>● Sẵn sàng</span>
                </div>
                <h4 style={{ margin: '0.2rem 0', fontSize: '1rem', color: '#f8fafc' }}>🤖 {a.name}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>{a.description}</p>
              </div>
            ))}
          </div>

          {/* Interactive Agent Command Console */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderTop: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={18} color="#60a5fa" />
                  Trung tâm Ra lệnh & Thực thi Agent Tự chủ (Autonomous Agent Dispatcher)
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Chọn một Agent chuyên trách để khảo sát dữ liệu dự án (Perceive), suy luận ReAct và đề xuất hành động tự chủ.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className="label" style={{ margin: 0, fontSize: '0.8rem' }}>Dự án mục tiêu:</label>
                <select
                  className="input"
                  style={{ width: 'auto', minWidth: 180, padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả Yêu cầu / Bối cảnh Nghiệp vụ</label>
                <textarea
                  className="input"
                  rows={3}
                  value={legacyText}
                  onChange={(e) => setLegacyText(e.target.value)}
                  placeholder="Nhập yêu cầu cần phân tích, rà soát rủi ro hoặc bối cảnh dự án..."
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả User Story (Dành cho Phân rã Task & Ước lượng SP)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={legacyStory}
                  onChange={(e) => setLegacyStory(e.target.value)}
                  placeholder="Là [vai trò], tôi muốn [hành động] để [lợi ích]..."
                />
              </div>
            </div>

            {/* Agent Action Dispatch Buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                className="btn primary"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', fontSize: '0.85rem' }}
                onClick={runLegacyAnalyze}
                disabled={legacyLoading}
              >
                {legacyLoading ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
                🔍 Requirement Agent (Phân tích Yêu cầu)
              </button>

              <button
                className="btn primary"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', fontSize: '0.85rem' }}
                onClick={runLegacyBreakdown}
                disabled={legacyLoading}
              >
                {legacyLoading ? <RefreshCw size={14} className="animate-spin" /> : <ListTree size={14} />}
                ⚡ Task Agent (Phân rã Subtasks)
              </button>

              <button
                className="btn secondary"
                style={{ fontSize: '0.85rem' }}
                onClick={runLegacyStoryPoint}
                disabled={legacyLoading}
              >
                {legacyLoading ? <RefreshCw size={14} className="animate-spin" /> : <Scale size={14} />}
                🎯 Planning Agent (Ước lượng SP)
              </button>

              <button
                className="btn secondary"
                style={{ fontSize: '0.85rem' }}
                onClick={runLegacyRisk}
                disabled={legacyLoading}
              >
                {legacyLoading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                🛡️ Risk Sentinel (Quét Rủi ro)
              </button>

              <button
                className="btn secondary"
                style={{ fontSize: '0.85rem' }}
                onClick={runLegacyForecast}
                disabled={legacyLoading}
              >
                {legacyLoading ? <RefreshCw size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                📈 Forecast Agent (Dự báo Sprint)
              </button>
            </div>
          </div>

          {/* AGENT EXECUTION INSPECTOR & RESULTS */}
          {agentResult && (
            <div style={{ marginBottom: '1.5rem' }}>
              {/* Agent Identity & Governance Protocol Card */}
              <div
                className="card"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1rem',
                  background: 'linear-gradient(180deg, #131b2e 0%, var(--surface) 100%)',
                  border: `1px solid ${
                    agentResult.governance?.mode === 'HITL'
                      ? '#8b5cf6'
                      : agentResult.governance?.mode === 'HOOL'
                      ? '#22c55e'
                      : '#3b82f6'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#1e293b', padding: '0.6rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <Brain size={28} color="#c084fc" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{agentResult.agent_name || 'AI Autonomous Agent'}</h3>
                        <span className="badge ai" style={{ fontSize: '0.7rem' }}>Job #{agentResult.job_id || 'N/A'}</span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: 600 }}>{agentResult.agent_role || 'Agile Autonomous Specialist'}</span>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>{agentResult.agent_description}</p>
                    </div>
                  </div>

                  {/* Governance Protocol Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        padding: '0.35rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background:
                          agentResult.governance?.mode === 'HITL'
                            ? '#8b5cf622'
                            : agentResult.governance?.mode === 'HOOL'
                            ? '#22c55e22'
                            : '#3b82f622',
                        color:
                          agentResult.governance?.mode === 'HITL'
                            ? '#c084fc'
                            : agentResult.governance?.mode === 'HOOL'
                            ? '#4ade80'
                            : '#60a5fa',
                        border: `1px solid ${
                          agentResult.governance?.mode === 'HITL'
                            ? '#8b5cf6'
                            : agentResult.governance?.mode === 'HOOL'
                            ? '#22c55e'
                            : '#3b82f6'
                        }`,
                      }}
                    >
                      {agentResult.governance?.mode === 'HITL' && '🟣 Giao thức HITL (Duyệt Thủ Công Bắt Buộc)'}
                      {agentResult.governance?.mode === 'HOTL' && '🔵 Giao thức HOTL (Giám Sát Động)'}
                      {agentResult.governance?.mode === 'HOOL' && '🟢 Giao thức HOOL (Tự Động Hoàn Toàn)'}
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      <span>Tự động hóa: <strong>{Math.round((agentResult.governance?.automation_level || 0.6) * 100)}%</strong></span>
                      <span>•</span>
                      <span>Chỉ số Rủi ro: <strong>{Math.round((agentResult.governance?.risk_score || 0.3) * 100)}%</strong></span>
                      <span>•</span>
                      <span>Chi phí: <strong>${(agentResult.governance?.cost_usd || 0.001).toFixed(4)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Plan Steps Timeline */}
                {agentResult.plan_steps && agentResult.plan_steps.length > 0 && (
                  <div style={{ background: '#090d16', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '0.75rem' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={14} /> Chiến lược & Kế hoạch Các Bước của Agent:
                    </strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {agentResult.plan_steps.map((step: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          <span style={{ background: '#1e293b', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa' }}>
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step-by-Step ReAct Execution Trace */}
              {agentResult.execution_trace && agentResult.execution_trace.length > 0 && (
                <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', borderLeft: '4px solid #38bdf8' }}>
                  <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={16} />
                    Nhật ký Thực thi ReAct Step-by-Step (Observation & Tool Perception Trace)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {agentResult.execution_trace.map((tr: any, tIdx: number) => (
                      <div
                        key={tIdx}
                        style={{
                          background: '#090d16',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#1e293b', color: '#38bdf8' }}>
                              {tr.phase || 'STEP'}
                            </span>
                            <strong style={{ fontSize: '0.83rem', color: '#f1f5f9' }}>{tr.step}</strong>
                            {tr.tool && (
                              <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontFamily: 'Courier, monospace' }}>
                                🛠️ {tr.tool}()
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{tr.detail}</p>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                          <Check size={14} /> Hoàn tất
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Autonomous Actions Proposal Panel */}
              {agentResult.proposed_actions && agentResult.proposed_actions.length > 0 && (
                <div
                  className="card"
                  style={{
                    padding: '1.25rem',
                    marginBottom: '1rem',
                    border: '2px solid #8b5cf6',
                    background: 'linear-gradient(180deg, #18112e 0%, var(--surface) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckSquare size={20} color="#c084fc" />
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#c084fc' }}>
                        Hành động Tự chủ Đề xuất vào CSDL (Proposed Autonomous Actions)
                      </h4>
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background:
                          agentResult.action_status === 'executed'
                            ? '#22c55e22'
                            : agentResult.action_status === 'rolled_back'
                            ? '#64748b22'
                            : '#eab30822',
                        color:
                          agentResult.action_status === 'executed'
                            ? '#4ade80'
                            : agentResult.action_status === 'rolled_back'
                            ? '#94a3b8'
                            : '#facc15',
                        border: `1px solid ${
                          agentResult.action_status === 'executed'
                            ? '#22c55e'
                            : agentResult.action_status === 'rolled_back'
                            ? '#64748b'
                            : '#eab308'
                        }`,
                      }}
                    >
                      {agentResult.action_status === 'executed' && '✓ Đã commit CSDL'}
                      {agentResult.action_status === 'rolled_back' && '↩ Đã hoàn tác (Rollback)'}
                      {agentResult.action_status === 'pending' && '⏳ Chờ phê duyệt (Pending)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {agentResult.proposed_actions.map((act: any, aIdx: number) => (
                      <div key={aIdx} style={{ background: '#090d16', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>{act.title}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#a78bfa', fontFamily: 'Courier, monospace' }}>{act.action_type}</span>
                        </div>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{act.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action Execution / Rollback Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    {agentResult.action_record_id && agentResult.action_status === 'pending' && (
                      <button
                        className="btn primary"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '0.85rem' }}
                        onClick={() => handleExecuteAutonomousAction(agentResult.action_record_id!)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        Phê duyệt & Commit Thay đổi vào CSDL (Apply)
                      </button>
                    )}

                    {agentResult.action_record_id && agentResult.action_status === 'executed' && (
                      <button
                        className="btn secondary"
                        style={{ borderColor: '#ef4444', color: '#f87171', fontSize: '0.85rem' }}
                        onClick={() => handleRollbackAutonomousAction(agentResult.action_record_id!)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        Hoàn tác Snapshot (Rollback)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Domain Output Visualizer */}
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>📊 Kết quả Nghiệp vụ Phân tích</h4>
                  <button
                    className="btn secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => setShowRawJson(!showRawJson)}
                  >
                    <Code size={13} style={{ marginRight: '0.25rem' }} />
                    {showRawJson ? 'Ẩn JSON thô' : 'Xem JSON thô'}
                  </button>
                </div>

                {/* Subtasks Table (if breakdown) */}
                {agentResult.tasks && Array.isArray(agentResult.tasks) && (
                  <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Công việc (Subtask)</th>
                          <th>Ước tính</th>
                          <th>Tự động hóa</th>
                          <th>Rủi ro</th>
                          <th>Chế độ điều phối</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentResult.tasks.map((t: any, i: number) => (
                          <tr key={i}>
                            <td>
                              <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{t.title}</strong>
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>{t.description}</p>
                            </td>
                            <td><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.estimated_hours}h</span></td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>
                                {Math.round((t.automation_level || 0) * 100)}%
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: t.risk_level > 0.5 ? '#f87171' : '#facc15' }}>
                                {Math.round((t.risk_level || 0) * 100)}%
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  background: t.collaboration_mode === 'HITL' ? '#8b5cf633' : '#3b82f633',
                                  color: t.collaboration_mode === 'HITL' ? '#c084fc' : '#60a5fa',
                                }}
                              >
                                {t.collaboration_mode || 'HOTL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Requirement Analysis (if analyze) */}
                {agentResult.analysis && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ background: '#090d16', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#38bdf8' }}>Tóm tắt Phạm vi:</strong>
                      <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.82rem', color: '#cbd5e1' }}>{agentResult.analysis.summary}</p>
                      <strong style={{ fontSize: '0.82rem', color: '#a78bfa' }}>Ghi chú Kỹ thuật:</strong>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>{agentResult.analysis.technical_notes}</p>
                    </div>

                    <div style={{ background: '#090d16', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Độ phức tạp: <strong>{agentResult.analysis.estimated_complexity}</strong></span>
                        <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Ưu tiên: <strong>{agentResult.analysis.priority_score}</strong></span>
                      </div>
                      <strong style={{ fontSize: '0.82rem', color: '#facc15' }}>Câu hỏi cần làm rõ:</strong>
                      <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {agentResult.analysis.clarifying_questions?.map((q: string, qIdx: number) => (
                          <li key={qIdx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Story Point & Rationale (if planning) */}
                {agentResult.story_points !== undefined && (
                  <div style={{ background: '#090d16', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '0.75rem' }}>
                    <div style={{ textAlign: 'center', minWidth: 90, background: '#1e293b', padding: '0.6rem', borderRadius: '8px', border: '1px solid #8b5cf6' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Story Points</span>
                      <strong style={{ fontSize: '1.8rem', color: '#c084fc', display: 'block' }}>{agentResult.story_points}</strong>
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#f8fafc' }}>Căn cứ Ước lượng của Planning Agent:</strong>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.45 }}>{agentResult.rationale}</p>
                    </div>
                  </div>
                )}

                {/* Risks Table (if risk) */}
                {agentResult.risks && Array.isArray(agentResult.risks) && (
                  <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Rủi ro nhận diện</th>
                          <th>Phân loại</th>
                          <th>Xác suất</th>
                          <th>Tác động</th>
                          <th>Biện pháp Giảm thiểu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentResult.risks.map((r: any, rIdx: number) => (
                          <tr key={rIdx}>
                            <td>
                              <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{r.title}</strong>
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>{r.description}</p>
                            </td>
                            <td><span className="badge ai" style={{ fontSize: '0.7rem' }}>{r.category}</span></td>
                            <td><span style={{ fontSize: '0.8rem', color: '#facc15' }}>{Math.round((r.probability || 0) * 100)}%</span></td>
                            <td><span style={{ fontSize: '0.8rem', color: '#f87171' }}>{Math.round((r.impact || 0) * 100)}%</span></td>
                            <td><span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{r.mitigation}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Raw JSON Debug View */}
                {showRawJson && (
                  <pre
                    style={{
                      background: '#090d16',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.78rem',
                      color: '#39ff14',
                      fontFamily: 'Courier, monospace',
                      overflow: 'auto',
                      maxHeight: 280,
                      margin: '0.5rem 0 0',
                    }}
                  >
                    {JSON.stringify(agentResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📜 Nhật ký Tác vụ Agent (AI Agent Execution Audit Trail)</h3>
            <div style={{ overflowX: 'auto', maxHeight: 300 }}>
              <table>
                <thead>
                  <tr>
                    <th>Mã tác vụ</th>
                    <th>Loại tác vụ Agent</th>
                    <th>Trạng thái</th>
                    <th>Thời gian khởi tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j: any) => (
                    <tr key={j.id}>
                      <td><strong style={{ fontSize: '0.85rem' }}>#{j.id}</strong></td>
                      <td><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{j.job_type}</span></td>
                      <td>
                        <span className="badge ai" style={{ fontSize: '0.7rem' }}>
                          {j.status === 'completed' ? '✓ Đã xong' : j.status === 'failed' ? '✖ Thất bại' : '⚡ Đang chạy'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{j.created_at ? j.created_at.slice(0, 19).replace('T', ' ') : 'Vừa xong'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
