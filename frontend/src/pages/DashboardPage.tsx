import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getAIJobs, getProjects } from '../api/client';
import type { DashboardStats, Project } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getRoleLabel } from '../utils/roleAccess';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    getDashboardStats(token).then(setStats).catch(() => {});
    getProjects(token).then(setProjects).catch(() => {});
    getAIJobs(token).then(setJobs).catch(() => {});
  }, [token]);

  if (!stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>⏳ Đang tải dữ liệu tổng quan Bảng điều khiển...</p>
      </div>
    );
  }

  const role = (user?.role || 'viewer') as 'admin' | 'pm' | 'developer' | 'viewer';
  const roleFocus: Record<'admin' | 'pm' | 'developer' | 'viewer', string[]> = {
    admin: ['Xem xét sức khỏe tổng thể các dự án', 'Giám sát phân bổ tài nguyên & hoạt động của AI Agents', 'Cấu hình quyền hạn và bảo mật hệ thống'],
    pm: ['Theo dõi tiến độ các Sprint đang chạy', 'Đánh giá ma trận rủi ro và dự báo hoàn thành', 'Điều phối ưu tiên backlog và phân công công việc'],
    developer: ['Tập trung thực thi công việc được phân công', 'Chạy mô phỏng AI DevOps Sandbox cho các task', 'Sử dụng AI phân rã câu chuyện người dùng'],
    viewer: ['Theo dõi tổng quan tiến độ các dự án', 'Xem xét chỉ số velocity và biểu đồ burndown', 'Cập nhật tin tức và thông báo mới nhất'],
  };
  const focusItems = roleFocus[role] || roleFocus.viewer;

  const formatJobType = (t: string) => {
    const map: Record<string, string> = {
      analyze: '🔍 Phân tích Yêu cầu',
      story_point: '🎯 Ước lượng Story Points',
      breakdown: '⚡ Phân rã Công việc',
      risk: '⚠️ Đánh giá Rủi ro Dự báo',
      forecast: '📈 Dự báo Mạng Nơ-ron ANN',
      assign: '✨ Tự động Phân công AI',
    };
    return map[t] || t;
  };

  const taskPieData = [
    { name: 'Công việc đang mở', value: stats.open_tasks, color: '#3b82f6' },
    { name: 'Đã hoàn thành', value: stats.completed_tasks, color: '#22c55e' },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Bảng điều khiển (Dashboard)</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Xin chào, <strong>{user?.full_name || user?.username}</strong>! Bạn đang đăng nhập với vai trò <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{getRoleLabel(role)}</span>.
          </p>
        </div>
        <span className="badge ai" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
          🔒 Giao diện {getRoleLabel(role)}
        </span>
      </div>

      {/* Quick Navigation Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn secondary" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/projects')}>
          📂 Danh sách Dự án
        </button>
        <button className="btn secondary" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/sprints')}>
          🏃 Bảng Sprint
        </button>
        <button className="btn secondary" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/stories')}>
          📋 Yêu cầu (Stories)
        </button>
        <button className="btn secondary" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/tasks')}>
          ⚡ Bảng Công việc
        </button>
        <button className="btn secondary" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/risks')}>
          ⚠️ Bảng Rủi ro
        </button>
        <button className="btn secondary" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/forecast')}>
          📈 Biểu đồ Dự báo
        </button>
      </div>

      {/* Today's Role Focus Card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>🎯 Tiêu điểm công việc dành cho {getRoleLabel(role)}</h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {focusItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      {/* Key Metric Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h3>Dự án Hoạt động</h3>
          <p style={{ color: '#3b82f6' }}>{stats.total_projects}</p>
          <small style={{ color: 'var(--muted)' }}>Tổng số dự án trong hệ thống</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #c084fc' }}>
          <h3>Sprint đang chạy</h3>
          <p style={{ color: '#c084fc' }}>{stats.active_sprints}</p>
          <small style={{ color: 'var(--muted)' }}>Các Sprint đang phát hành</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #60a5fa' }}>
          <h3>Công việc Đang mở</h3>
          <p style={{ color: '#60a5fa' }}>{stats.open_tasks}</p>
          <small style={{ color: 'var(--muted)' }}>Backlog & Đang thực hiện</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <h3>Đã hoàn thành</h3>
          <p style={{ color: '#22c55e' }}>{stats.completed_tasks}</p>
          <small style={{ color: 'var(--muted)' }}>Công việc đạt DoD</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <h3>Rủi ro đang mở</h3>
          <p style={{ color: '#ef4444' }}>{stats.open_risks}</p>
          <small style={{ color: 'var(--muted)' }}>Mối đe dọa cần theo dõi</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--ai)' }}>
          <h3>Tác vụ AI hôm nay</h3>
          <p style={{ color: 'var(--ai)' }}>{stats.ai_jobs_today}</p>
          <small style={{ color: 'var(--muted)' }}>Lượt gọi AI Agents</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #eab308' }}>
          <h3>Velocity Trung bình</h3>
          <p style={{ color: '#eab308' }}>{stats.velocity_avg} SP</p>
          <small style={{ color: 'var(--muted)' }}>Tốc độ trung bình / Sprint</small>
        </div>
      </div>

      {/* Grid 2: Recent Projects & Recent AI Jobs */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📂 Dự án gần đây</h3>
            <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} onClick={() => navigate('/projects')}>
              Xem tất cả
            </button>
          </div>
          <table>
            <thead>
              <tr><th>Tên dự án</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {projects.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td><strong style={{ fontSize: '0.9rem' }}>{p.name}</strong></td>
                  <td>
                    <span className="badge progress" style={{ fontSize: '0.7rem' }}>
                      {p.status === 'active' ? '🟢 Đang chạy' : p.status === 'completed' ? '🔵 Đã hoàn thành' : '🟡 Tạm dừng'}
                    </span>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Chưa có dự án nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#c084fc' }}>🤖 Yêu cầu AI gần đây</h3>
            <button className="btn secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} onClick={() => navigate('/ai')}>
              Xem nhật ký AI
            </button>
          </div>
          <table>
            <thead>
              <tr><th>Tác vụ AI Agent</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {jobs.slice(0, 5).map((j: any, i: number) => (
                <tr key={i}>
                  <td><strong style={{ fontSize: '0.85rem' }}>{formatJobType(j.job_type)}</strong></td>
                  <td>
                    <span className="badge ai" style={{ fontSize: '0.7rem' }}>
                      {j.status === 'completed' ? '✓ Đã xong' : j.status === 'failed' ? '✖ Thất bại' : j.status === 'running' ? '⚡ Đang chạy' : '⏳ Chờ'}
                    </span>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Chưa có nhật ký AI nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Distribution Pie Chart */}
      <div className="card">
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>📊 Phân bố Công việc (Task Distribution)</h3>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                {taskPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
