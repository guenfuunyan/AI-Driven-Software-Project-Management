import { useEffect, useState } from 'react';
import {
  aiForecast,
  getBurndown,
  getForecasts,
  getProjects,
  getSprints,
  getVelocity,
} from '../api/client';
import type { Forecast, Project, Sprint } from '../api/client';
import { useAuthStore } from '../store/auth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

interface Notification {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export default function ForecastPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('forecast', user?.role);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [velocity, setVelocity] = useState<{ sprint_name: string; completed_points: number }[]>([]);
  const [burndown, setBurndown] = useState<{ date: string; remaining_points: number; ideal_points: number }[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [forecast, setForecast] = useState<Record<string, any> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    getProjects(token).then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    });
  }, [token]);

  useEffect(() => {
    if (!projectId) return;
    getSprints(token, projectId).then((ss) => {
      setSprints(ss);
      if (ss[0]) setSprintId(ss[0].id);
    });
    getVelocity(token, projectId).then(setVelocity).catch(() => {});
    getForecasts(token, projectId).then(setForecasts).catch(() => {});
  }, [token, projectId]);

  useEffect(() => {
    if (!sprintId) return;
    getBurndown(token, sprintId).then(setBurndown).catch(() => {});
  }, [token, sprintId]);

  const runForecast = async () => {
    if (!projectId) return;
    setAiLoading(true);
    try {
      const result = await aiForecast(token, projectId, sprintId ?? undefined);
      setForecast(result);
      setNotification({
        type: 'success',
        title: '✨ Dự báo Mạng Nơ-ron ANN Hoàn tất',
        message: `Tốc độ dự kiến: ${result.predicted_velocity} SP/ngày | Khả năng hoàn thành: ${(Number(result.completion_probability || 0.5) * 100).toFixed(0)}%`,
      });
      getForecasts(token, projectId).then(setForecasts).catch(() => {});
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi Dự báo AI',
        message: 'Không thể chạy mô hình dự báo AI. Vui lòng kiểm tra lại kết nối API.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const prob = forecast ? Number(forecast.completion_probability || 0) : 0;
  const probPercent = (prob * 100).toFixed(0);
  const probColor = prob >= 0.7 ? '#22c55e' : prob >= 0.5 ? '#eab308' : '#ef4444';

  const formatForecastType = (t: string) => {
    if (t === 'completion_probability') return 'Khả năng hoàn thành';
    if (t === 'predicted_velocity') return 'Tốc độ dự kiến (Velocity)';
    if (t === 'remaining_story_points') return 'Story Points còn lại';
    return t;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Dự báo AI & Biểu đồ Burndown</h2>
          {!access.canEdit && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{getReadOnlyNotice('forecast', user?.role)}</p>
          )}
        </div>
        {access.canEdit && (
          <button className="btn ai" disabled={aiLoading} onClick={runForecast}>
            {aiLoading ? '⏳ Đang tính toán Mạng Nơ-ron ANN...' : '✨ Chạy Dự báo AI (ANN)'}
          </button>
        )}
      </div>

      {/* Notification Banner */}
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

      {/* Selectors */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ maxWidth: 240 }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 240 }} value={sprintId ?? ''} onChange={(e) => setSprintId(Number(e.target.value))}>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem biểu đồ dự báo ở chế độ chỉ xem.</div>
        </div>
      )}

      {/* AI Forecast KPI Summary Cards */}
      {forecast && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, padding: '1rem', margin: 0, borderLeft: '4px solid #3b82f6', background: 'var(--surface)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Velocity Dự kiến
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa', margin: '0.2rem 0' }}>
              {forecast.predicted_velocity || 0} SP / ngày
            </div>
            <small style={{ color: 'var(--muted)' }}>Tốc độ hoàn thành công việc từ ANN</small>
          </div>

          <div className="card" style={{ flex: 1, padding: '1rem', margin: 0, borderLeft: `4px solid ${probColor}`, background: 'var(--surface)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Khả năng Hoàn thành Sprint
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: probColor, margin: '0.2rem 0' }}>
              {probPercent}%
            </div>
            <small style={{ color: 'var(--muted)' }}>Xác suất đúng hạn trước ngày kết thúc</small>
          </div>

          <div className="card" style={{ flex: 1, padding: '1rem', margin: 0, borderLeft: '4px solid #c084fc', background: 'var(--surface)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Story Points Còn lại
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc', margin: '0.2rem 0' }}>
              {forecast.remaining_story_points || 0} SP
            </div>
            <small style={{ color: 'var(--muted)' }}>Tổng khối lượng chưa đóng</small>
          </div>
        </div>
      )}

      {/* Grid 1: Velocity Chart & AI Neural Model Output */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📊 Tốc độ (Velocity) theo Sprint</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 1rem' }}>Số điểm Story Points đã hoàn thành qua các Sprint gần nhất</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="sprint_name" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <RechartsTooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Bar dataKey="completed_points" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Story Points Đã xong" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#c084fc' }}>🤖 AI Neural Network Model (ANN)</h3>
              <span className="badge ai" style={{ fontSize: '0.7rem' }}>ANN Engine</span>
            </div>
            {forecast ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px', padding: '0.85rem' }}>
                  <strong style={{ color: '#c084fc', fontSize: '0.875rem' }}>📌 Tóm tắt Dự báo:</strong>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {forecast.forecast_summary || forecast.burndown_notes}
                  </p>
                </div>
                {forecast.burndown_notes && (
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem' }}>
                    <strong style={{ color: '#60a5fa', fontSize: '0.875rem' }}>🔍 Ghi chú Burndown & Cảnh báo sớm:</strong>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--muted)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                      {forecast.burndown_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem 1rem' }}>
                Nhấn <strong>"✨ Chạy Dự báo AI (ANN)"</strong> ở góc trên để kích hoạt mô hình dự báo mạng nơ-ron phân tích dữ liệu vận hành.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid 2: Sprint Burndown Area Chart & Forecast History Table */}
      <div className="grid-2">
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📉 Biểu đồ Sprint Burndown</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 1rem' }}>So sánh khối lượng còn lại thực tế với đường tiêu chuẩn lý thuyết</p>
          <div style={{ height: 280 }}>
            {burndown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndown}>
                  <defs>
                    <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorIdeal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" stroke="var(--muted)" tickFormatter={(val) => val.slice(5)} />
                  <YAxis stroke="var(--muted)" />
                  <RechartsTooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="remaining_points" stroke="#ef4444" fillOpacity={1} fill="url(#colorRemaining)" name="Thực tế (Remaining SP)" />
                  <Area type="monotone" dataKey="ideal_points" stroke="#22c55e" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorIdeal)" name="Lý thuyết (Ideal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: '4rem' }}>Chưa có dữ liệu Burndown cho Sprint này.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📜 Lịch sử các lần Dự báo</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 1rem' }}>Các kết quả đã được ghi nhận trong cơ sở dữ liệu</p>
          <div style={{ overflowX: 'auto', maxHeight: 280 }}>
            <table>
              <thead>
                <tr>
                  <th>Loại dự báo</th>
                  <th>Giá trị</th>
                  <th>Độ tin cậy</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => {
                  const conf = f.confidence ? (f.confidence * 100).toFixed(0) : '85';
                  return (
                    <tr key={f.id}>
                      <td><strong style={{ fontSize: '0.85rem' }}>{formatForecastType(f.forecast_type)}</strong></td>
                      <td><span className="badge progress">{f.predicted_value.toFixed(1)}</span></td>
                      <td>
                        <span className="badge" style={{ background: Number(conf) >= 70 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: Number(conf) >= 70 ? '#22c55e' : '#eab308' }}>
                          {conf}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{f.created_at ? f.created_at.slice(0, 10) : 'Hôm nay'}</td>
                    </tr>
                  );
                })}

                {forecasts.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      Chưa có lịch sử dự báo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
