import { useEffect, useState } from 'react';
import { aiForecast, getBurndown, getForecasts, getProjects, getSprints, getVelocity } from '../api/client';
import type { Forecast, Project, Sprint } from '../api/client';
import { useAuthStore } from '../store/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ForecastPage() {
  const token = useAuthStore((s) => s.token)!;
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [velocity, setVelocity] = useState<{ sprint_name: string; completed_points: number }[]>([]);
  const [burndown, setBurndown] = useState<{ date: string; remaining_points: number; ideal_points: number }[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [forecast, setForecast] = useState<Record<string, unknown> | null>(null);

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
    getVelocity(token, projectId).then(setVelocity);
    getForecasts(token, projectId).then(setForecasts);
  }, [token, projectId]);

  useEffect(() => {
    if (!sprintId) return;
    getBurndown(token, sprintId).then(setBurndown);
  }, [token, sprintId]);

  const runForecast = async () => {
    if (!projectId) return;
    const result = await aiForecast(token, projectId, sprintId ?? undefined);
    setForecast(result);
    getForecasts(token, projectId).then(setForecasts);
  };

  const maxB = Math.max(...burndown.map((b) => b.remaining_points), 1);

  return (
    <div>
      <h2 className="page-title">Forecast & Burndown</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select className="input" style={{ maxWidth: 220 }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 220 }} value={sprintId ?? ''} onChange={(e) => setSprintId(Number(e.target.value))}>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn ai" onClick={runForecast}>AI Forecast</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Velocity by Sprint</h3>
          <div style={{ height: 300, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="sprint_name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="completed_points" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Completed SP" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>AI Forecast Result (ANN model)</h3>
          {forecast ? (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ background: '#f8fbff', border: '1px solid #cce5ff', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.5rem' }}><strong>Predicted Velocity:</strong> {String(forecast.predicted_velocity)}</p>
                <p style={{ margin: '0 0 0.5rem' }}><strong>Remaining Story Points:</strong> {String(forecast.remaining_story_points)}</p>
                <p style={{ margin: '0 0 0.5rem' }}>
                  <strong>Completion Probability:</strong>{' '}
                  <span style={{ color: Number(forecast.completion_probability) > 0.7 ? 'green' : 'red' }}>
                    {(Number(forecast.completion_probability) * 100).toFixed(0)}%
                  </span>
                </p>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <strong>Burndown Notes:</strong>
                <p style={{ color: 'var(--muted)', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>{String(forecast.burndown_notes)}</p>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', marginTop: '1rem' }}>Nhấn "AI Forecast" để hệ thống phân tích và dự báo khả năng hoàn thành dựa trên dữ liệu lịch sử.</p>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <h3>Sprint Burndown</h3>
          <div className="chart-bar" style={{ marginTop: '1rem' }}>
            {burndown.slice(0, 14).map((b) => (
              <div key={b.date} style={{ flex: 1, textAlign: 'center' }}>
                <div className="bar" style={{ height: `${(b.remaining_points / maxB) * 100}%`, opacity: 0.9 }} />
                <span>{b.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Forecast History</h3>
          <table>
            <thead>
              <tr><th>Type</th><th>Value</th><th>Confidence</th><th>Date</th></tr>
            </thead>
            <tbody>
              {forecasts.map((f) => (
                <tr key={f.id}>
                  <td>{f.forecast_type}</td>
                  <td>{f.predicted_value.toFixed(1)}</td>
                  <td>{(f.confidence * 100).toFixed(0)}%</td>
                  <td>{f.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
