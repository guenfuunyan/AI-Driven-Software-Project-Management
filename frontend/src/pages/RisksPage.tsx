import { useEffect, useState } from 'react';
import {
  getProjects,
  getRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  aiRisk,
} from '../api/client';
import type { Project, Risk } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

const CATEGORY_OPTIONS = [
  { value: 'Technical', label: '⚙️ Kỹ thuật (Technical)' },
  { value: 'Schedule', label: '📅 Tiến độ (Schedule)' },
  { value: 'Cost', label: '💰 Chi phí (Cost)' },
  { value: 'Resource', label: '👥 Tài nguyên (Resource)' },
];

interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export default function RisksPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('risks', user?.role);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    probability: 0.5,
    impact: 0.5,
    status: 'open',
    mitigation: '',
  });

  // AI Assessment States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  useEffect(() => {
    getProjects(token).then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    });
  }, [token]);

  const loadRisks = () => {
    if (!projectId) return;
    getRisks(token, projectId).then(setRisks);
  };

  useEffect(() => {
    loadRisks();
  }, [token, projectId]);

  const handleStatusToggle = async (risk: Risk) => {
    const newStatus = risk.status === 'open' ? 'closed' : 'open';
    try {
      await updateRisk(token, risk.id, { status: newStatus });
      setNotification({
        type: 'success',
        title: 'Đã cập nhật trạng thái',
        message: `Đã ${newStatus === 'open' ? 'mở lại' : 'đóng'} rủi ro "${risk.title}"`,
      });
      loadRisks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể thay đổi trạng thái rủi ro.',
      });
    }
  };

  const handleEdit = (r: Risk) => {
    setEditingId(r.id);
    setFormData({
      title: r.title,
      description: r.description || '',
      category: r.category || 'Technical',
      probability: r.probability || 0.5,
      impact: r.impact || 0.5,
      status: r.status || 'open',
      mitigation: r.mitigation || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa rủi ro này?')) return;
    try {
      await deleteRisk(token, id);
      setNotification({
        type: 'success',
        title: 'Đã xóa',
        message: 'Rủi ro đã được xóa khỏi hệ thống.',
      });
      loadRisks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể xóa rủi ro.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    const score = Number((formData.probability * formData.impact).toFixed(2));
    const payload = {
      ...formData,
      probability: Number(formData.probability),
      impact: Number(formData.impact),
      score,
    };
    try {
      if (editingId) {
        await updateRisk(token, editingId, payload);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã cập nhật rủi ro "${formData.title}"`,
        });
      } else {
        await createRisk(token, projectId, payload);
        setNotification({
          type: 'success',
          title: 'Thành công',
          message: `Đã tạo rủi ro mới "${formData.title}"`,
        });
      }
      setShowModal(false);
      loadRisks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể lưu rủi ro. Vui lòng thử lại.',
      });
    }
  };

  const handleAIDetect = async () => {
    if (!projectId) return;
    setAiLoading(true);
    const contextStr = 'Bối cảnh dự án cho thấy có thể xảy ra chậm tiến độ tích hợp backend và thay đổi yêu cầu từ phía khách hàng.';
    try {
      const result = await aiRisk(token, projectId, contextStr);
      setAiAnalysis(result);
      setNotification({
        type: 'success',
        title: '✨ AI Đánh giá Rủi ro Thành công',
        message: `Phát hiện ${result.risks?.length || 0} rủi ro tiềm ẩn từ mô hình mạng Bayesian & Logic mờ.`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Phân tích AI',
        message: 'Không thể chạy đánh giá rủi ro tự động bằng AI.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleRegisterAIRisk = async (r: any) => {
    if (!projectId) return;
    const prob = r.probability || 0.6;
    const imp = r.impact || 0.6;
    try {
      await createRisk(token, projectId, {
        title: r.title,
        description: r.description || 'Rủi ro được phát hiện tự động bởi AI Risk Agent.',
        category: r.category || 'Technical',
        probability: prob,
        impact: imp,
        score: Number((prob * imp).toFixed(2)),
        mitigation: r.mitigation || 'Theo dõi và lập kế hoạch dự phòng.',
        detected_by_ai: true,
      });
      setNotification({
        type: 'success',
        title: 'Đã ghi nhận Rủi ro từ AI',
        message: `Rủi ro "${r.title}" đã được lưu vào dự án.`,
      });
      loadRisks();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể lưu rủi ro.',
      });
    }
  };

  // Filtering
  const filteredRisks = risks.filter((r) => {
    if (categoryFilter !== 'all' && (r.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      const matchMit = (r.mitigation || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchMit) return false;
    }
    return true;
  });

  // Risk Score Severity Color
  const getSeverity = (score: number) => {
    if (score >= 0.5) return { label: 'Nghiêm trọng', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (score >= 0.3) return { label: 'Cao', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
    if (score >= 0.15) return { label: 'Trung bình', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
    return { label: 'Thấp', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' };
  };

  const stats = {
    total: risks.length,
    open: risks.filter((r) => r.status === 'open').length,
    highRisk: risks.filter((r) => r.score >= 0.3).length,
    aiDetected: risks.filter((r) => r.detected_by_ai).length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Rủi ro dự án (Risk Matrix & Assessment)</h2>
          {!access.canEdit && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{getReadOnlyNotice('risks', user?.role)}</p>
          )}
        </div>
        {access.canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn ai" disabled={aiLoading} onClick={handleAIDetect}>
              {aiLoading ? '⏳ Đang quét rủi ro...' : '✨ AI Đánh giá rủi ro dự báo'}
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setEditingId(null);
                setFormData({ title: '', description: '', category: 'Technical', probability: 0.5, impact: 0.5, status: 'open', mitigation: '' });
                setShowModal(true);
              }}
            >
              + Ghi nhận rủi ro
            </button>
          </div>
        )}
      </div>

      {/* Floating Notification Toast Banner */}
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

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ maxWidth: 220 }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 180 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">Tất cả danh mục</option>
          <option value="Technical">Kỹ thuật (Technical)</option>
          <option value="Schedule">Tiến độ (Schedule)</option>
          <option value="Cost">Chi phí (Cost)</option>
          <option value="Resource">Tài nguyên (Resource)</option>
        </select>
        <select className="input" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="open">Đang mở (Open)</option>
          <option value="closed">Đã đóng (Closed)</option>
        </select>
        <input
          className="input"
          style={{ maxWidth: 220 }}
          placeholder="🔍 Tìm kiếm rủi ro..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem danh sách rủi ro ở chế độ chỉ xem.</div>
        </div>
      )}

      {/* Risk Summary Widget Cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Tổng Rủi ro</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>{stats.open}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Đang mở (Open)</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{stats.highRisk}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Mức độ Cao / Nghiêm trọng</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '0.75rem 1rem', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c084fc' }}>{stats.aiDetected}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>AI Phát hiện</div>
        </div>
      </div>

      {/* AI Assessment Panel */}
      {aiAnalysis && (
        <div className="card" style={{ marginBottom: '1.25rem', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, color: '#c084fc' }}>✨ Phân tích Rủi ro AI (Bayesian Networks & Logic mờ)</h3>
            <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => setAiAnalysis(null)}>✕ Ẩn bảng phân tích</button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
            AI Risk Agent đã quét dữ liệu tiến độ và phát hiện các mối đe dọa tiềm ẩn đối với dự án:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {aiAnalysis.risks?.map((r: any, i: number) => {
              const prob = r.probability || 0.5;
              const imp = r.impact || 0.5;
              const score = Number((prob * imp).toFixed(2));
              const sev = getSeverity(score);

              return (
                <div key={i} style={{ background: 'var(--surface)', border: `1px solid ${sev.color}`, borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{r.title}</strong>
                      <span className="badge" style={{ background: sev.bg, color: sev.color, fontSize: '0.65rem' }}>{sev.label} ({score})</span>
                    </div>
                    {r.description && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 0.5rem' }}>{r.description}</p>}
                    {r.mitigation && (
                      <div style={{ fontSize: '0.75rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.08)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                        💡 Biện pháp: {r.mitigation}
                      </div>
                    )}
                  </div>
                  {access.canEdit && (
                    <button className="btn primary ai" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', marginTop: '0.6rem', width: '100%' }} onClick={() => handleRegisterAIRisk(r)}>
                      ✅ Ghi nhận rủi ro này
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risks Data Table */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Tên Rủi ro & Biện pháp</th>
              <th>Danh mục</th>
              <th>Khả năng (Prob)</th>
              <th>Ảnh hưởng (Impact)</th>
              <th>Điểm số (Score)</th>
              <th>Mức độ</th>
              <th>Trạng thái</th>
              {access.canEdit && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRisks.map((r) => {
              const score = r.score || Number((r.probability * r.impact).toFixed(2));
              const sev = getSeverity(score);

              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>{r.title}</strong>
                      {r.detected_by_ai && <span className="badge ai" style={{ fontSize: '0.65rem' }}>AI</span>}
                    </div>
                    {r.description && <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{r.description}</div>}
                    {r.mitigation && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                        🛡️ Biện pháp: {r.mitigation}
                      </div>
                    )}
                  </td>
                  <td><span className="badge secondary" style={{ fontSize: '0.7rem' }}>{r.category || 'Technical'}</span></td>
                  <td>{r.probability}</td>
                  <td>{r.impact}</td>
                  <td><strong style={{ color: sev.color }}>{score.toFixed(2)}</strong></td>
                  <td><span className="badge" style={{ background: sev.bg, color: sev.color, fontSize: '0.7rem' }}>{sev.label}</span></td>
                  <td>
                    <span className={`badge ${r.status === 'open' ? 'progress' : 'secondary'}`} style={{ fontSize: '0.7rem' }}>
                      {r.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                    </span>
                  </td>
                  {access.canEdit && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} onClick={() => handleStatusToggle(r)}>
                          {r.status === 'open' ? '🔒 Đóng' : '🔓 Mở'}
                        </button>
                        <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} onClick={() => handleEdit(r)}>
                          ✏️ Sửa / Biện pháp
                        </button>
                        <button className="btn danger" style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }} onClick={() => handleDelete(r.id)}>
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {filteredRisks.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                  Chưa có rủi ro nào. Nhấn <strong>"+ Ghi nhận rủi ro"</strong> hoặc sử dụng <strong>"✨ AI Đánh giá rủi ro dự báo"</strong>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Risk Modal */}
      {showModal && access.canEdit && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '450px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3>{editingId ? '✏️ Chỉnh sửa rủi ro' : '➕ Ghi nhận rủi ro mới'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Tiêu đề rủi ro</label>
                <input className="input" placeholder="Ví dụ: Rủi ro rò rỉ bộ nhớ khi tải dữ liệu lớn" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Mô tả chi tiết</label>
                <textarea className="input" placeholder="Mô tả tác động kỹ thuật và vận hành..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Danh mục</label>
                  <select className="input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="label">Trạng thái</label>
                  <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="open">Đang mở (Open)</option>
                    <option value="closed">Đã đóng (Closed)</option>
                  </select>
                </div>
              </div>

              {/* Sliders for probability & impact */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Khả năng xảy ra (Probability)</span>
                    <span>{formData.probability}</span>
                  </label>
                  <input type="range" min="0.0" max="1.0" step="0.05" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: 'var(--warning)' }} />
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Mức độ ảnh hưởng (Impact)</span>
                    <span>{formData.impact}</span>
                  </label>
                  <input type="range" min="0.0" max="1.0" step="0.05" value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: 'var(--danger)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Điểm rủi ro (Risk Score = P * I):</span>
                  <strong style={{ color: getSeverity(formData.probability * formData.impact).color }}>
                    {(formData.probability * formData.impact).toFixed(2)} ({getSeverity(formData.probability * formData.impact).label})
                  </strong>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Biện pháp giảm thiểu (Mitigation Plan)</label>
                <textarea className="input" placeholder="Các bước kỹ thuật/vận hành để giảm thiểu rủi ro..." value={formData.mitigation} onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })} rows={2} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn primary">Lưu rủi ro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
