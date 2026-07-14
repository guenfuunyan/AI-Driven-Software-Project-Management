import { useEffect, useState } from 'react';
import { getDashboardStats, getAIJobs, getProjects } from '../api/client';
import type { DashboardStats, Project } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getRoleLabel } from '../utils/roleAccess';

export default function DashboardPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<unknown[]>([]);

  useEffect(() => {
    getDashboardStats(token).then(setStats);
    getProjects(token).then(setProjects);
    getAIJobs(token).then(setJobs);
  }, [token]);

  if (!stats) return <p>Loading...</p>;

  const role = (user?.role || 'viewer') as 'admin' | 'pm' | 'developer' | 'viewer';
  const roleFocus: Record<'admin' | 'pm' | 'developer' | 'viewer', string[]> = {
    admin: ['Review portfolio health', 'Approve roadmap changes', 'Monitor AI governance'],
    pm: ['Track delivery and risks', 'Coordinate sprint priorities', 'Review team capacity'],
    developer: ['Focus on assigned tasks', 'Move work through the board', 'Use AI breakdown for stories'],
    viewer: ['Monitor progress', 'Review sprint health', 'Follow project updates'],
  };
  const focusItems = roleFocus[role] || roleFocus.viewer;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ marginBottom: '0.25rem' }}>Dashboard</h2>
          <p style={{ color: 'var(--muted)' }}>Welcome back, {user?.full_name || user?.username}. You are signed in as {getRoleLabel(role)}.</p>
        </div>
        <div className="badge ai">{getRoleLabel(role)} view</div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Your focus today</h3>
        <ul style={{ marginLeft: '1rem', color: 'var(--muted)' }}>
          {focusItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          ['Projects', stats.total_projects],
          ['Active Sprints', stats.active_sprints],
          ['Open Tasks', stats.open_tasks],
          ['Completed', stats.completed_tasks],
          ['Open Risks', stats.open_risks],
          ['AI Jobs Today', stats.ai_jobs_today],
          ['Avg Velocity', stats.velocity_avg],
        ].map(([label, val]) => (
          <div key={label as string} className="card stat-card">
            <h3>{label as string}</h3>
            <p>{val as number}</p>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Recent Projects</h3>
          <table>
            <thead>
              <tr><th>Name</th><th>Status</th></tr>
            </thead>
            <tbody>
              {projects.slice(0, 5).map((p) => (
                <tr key={p.id}><td>{p.name}</td><td><span className="badge progress">{p.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Recent AI Jobs</h3>
          <table>
            <thead>
              <tr><th>Type</th><th>Status</th></tr>
            </thead>
            <tbody>
              {(jobs as { job_type: string; status: string }[]).slice(0, 5).map((j, i) => (
                <tr key={i}><td>{j.job_type}</td><td><span className="badge ai">{j.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
