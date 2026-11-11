import { useEffect, useState } from 'react';
import { getBurndown, getProjects, getSprints, getVelocity } from '../api/client';
import type { Project, Sprint } from '../api/client';
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

export default function ReportsPage() {
  const token = useAuthStore((s) => s.token)!;
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [burndown, setBurndown] = useState<{ date: string; remaining_points: number; ideal_points: number }[]>([]);
  const [velocity, setVelocity] = useState<{ sprint_name: string; completed_points: number }[]>([]);

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
  }, [token, projectId]);

  useEffect(() => {
    if (!sprintId) return;
    getBurndown(token, sprintId).then(setBurndown).catch(() => {});
  }, [token, sprintId]);

  const totalVelocityPoints = velocity.reduce((acc, curr) => acc + (curr.completed_points || 0), 0);
  const avgVelocity = velocity.length ? (totalVelocityPoints / velocity.length).toFixed(1) : '0';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Báo cáo & Phân tích Tiến độ (Agile Reports)</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
          Tổng hợp báo cáo Burndown, chỉ số Velocity và hiệu suất làm việc của đội ngũ phát triển.
        </p>
      </div>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ maxWidth: 240 }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 240 }} value={sprintId ?? ''} onChange={(e) => setSprintId(Number(e.target.value))}>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, padding: '1rem', margin: 0, borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Velocity Trung bình
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', margin: '0.2rem 0' }}>
            {avgVelocity} SP / Sprint
          </div>
          <small style={{ color: 'var(--muted)' }}>Tốc độ trung bình qua các Sprint</small>
        </div>

        <div className="card" style={{ flex: 1, padding: '1rem', margin: 0, borderLeft: '4px solid #22c55e' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Tổng Điểm đã Hoàn thành
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e', margin: '0.2rem 0' }}>
            {totalVelocityPoints} SP
          </div>
          <small style={{ color: 'var(--muted)' }}>Tổng Story Points đã đóng</small>
        </div>
      </div>

      {/* Burndown Chart */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📉 Biểu đồ Sprint Burndown (Khối lượng công việc tồn đọng)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 1rem' }}>So sánh đường tiến độ còn lại thực tế với đường lý thuyết của Sprint</p>
        <div style={{ height: 300 }}>
          {burndown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndown}>
                <defs>
                  <linearGradient id="repRemaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="repIdeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="var(--muted)" tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="var(--muted)" />
                <RechartsTooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
                <Legend />
                <Area type="monotone" dataKey="remaining_points" stroke="#ef4444" fillOpacity={1} fill="url(#repRemaining)" name="Thực tế (Remaining SP)" />
                <Area type="monotone" dataKey="ideal_points" stroke="#22c55e" strokeDasharray="5 5" fillOpacity={1} fill="url(#repIdeal)" name="Lý thuyết (Ideal)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: '4rem' }}>Chưa có dữ liệu Burndown cho Sprint này.</div>
          )}
        </div>
      </div>

      {/* Velocity Report Grid */}
      <div className="grid-2">
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📊 Biểu đồ Velocity theo Sprint</h3>
          <div style={{ height: 260, marginTop: '0.75rem' }}>
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

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📋 Bảng Thống kê Velocity</h3>
          <div style={{ overflowX: 'auto', marginTop: '0.75rem', maxHeight: 260 }}>
            <table>
              <thead>
                <tr>
                  <th>Sprint</th>
                  <th>Điểm hoàn thành (SP)</th>
                  <th>Đánh giá Tốc độ</th>
                </tr>
              </thead>
              <tbody>
                {velocity.map((v) => {
                  const pts = v.completed_points || 0;
                  return (
                    <tr key={v.sprint_name}>
                      <td><strong style={{ fontSize: '0.9rem' }}>{v.sprint_name}</strong></td>
                      <td><span className="badge progress">{pts} SP</span></td>
                      <td>
                        <span className="badge" style={{ background: pts >= 10 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: pts >= 10 ? '#22c55e' : '#60a5fa', fontSize: '0.7rem' }}>
                          {pts >= 10 ? '⚡ Tốc độ cao' : 'Ổn định'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {velocity.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      Chưa có dữ liệu Velocity.
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
