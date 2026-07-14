import { useEffect, useState } from 'react';
import { getBurndown, getProjects, getSprints, getVelocity } from '../api/client';
import type { Project, Sprint } from '../api/client';
import { useAuthStore } from '../store/auth';

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
    getVelocity(token, projectId).then(setVelocity);
  }, [token, projectId]);

  useEffect(() => {
    if (!sprintId) return;
    getBurndown(token, sprintId).then(setBurndown);
  }, [token, sprintId]);

  const maxB = Math.max(...burndown.map((b) => b.remaining_points), 1);

  return (
    <div>
      <h2 className="page-title">Reports</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select className="input" style={{ maxWidth: 220 }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 220 }} value={sprintId ?? ''} onChange={(e) => setSprintId(Number(e.target.value))}>
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="card">
        <h3>Burndown Chart</h3>
        <div className="chart-bar">
          {burndown.slice(0, 14).map((b) => (
            <div key={b.date} style={{ flex: 1, textAlign: 'center' }}>
              <div className="bar" style={{ height: `${(b.remaining_points / maxB) * 100}%`, opacity: 0.9 }} />
              <span>{b.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Velocity Report</h3>
        <table>
          <thead><tr><th>Sprint</th><th>Completed Points</th></tr></thead>
          <tbody>
            {velocity.map((v) => (
              <tr key={v.sprint_name}><td>{v.sprint_name}</td><td>{v.completed_points}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
