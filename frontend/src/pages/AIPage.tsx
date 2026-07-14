import { useEffect, useState } from 'react';
import { aiAnalyze, aiBreakdown, getAIAgents, getAIJobs } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function AIPage() {
  const token = useAuthStore((s) => s.token)!;
  const [text, setText] = useState('As a PM, I want an AI dashboard so that I can monitor project KPIs.');
  const [story, setStory] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [agents, setAgents] = useState<{ name: string; agent_type: string; description?: string }[]>([]);
  const [jobs, setJobs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAIAgents(token).then(setAgents);
    getAIJobs(token).then(setJobs);
  }, [token]);

  const runAnalyze = async () => {
    setLoading(true);
    setResult(await aiAnalyze(token, text));
    setLoading(false);
    getAIJobs(token).then(setJobs);
  };

  const runBreakdown = async () => {
    setLoading(true);
    setResult(await aiBreakdown(token, story || text));
    setLoading(false);
    getAIJobs(token).then(setJobs);
  };

  return (
    <div>
      <h2 className="page-title">AI Agents</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
        Multi-agent architecture: Requirement → Task → Planning → Risk → Forecast → Assignment
      </p>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        {agents.map((a) => (
          <div key={a.name} className="card">
            <span className="badge ai">{a.agent_type}</span>
            <h4 style={{ margin: '0.5rem 0' }}>{a.name}</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{a.description}</p>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Requirement Analysis</h3>
          <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn ai" onClick={runAnalyze} disabled={loading}>Analyze</button>
            <button className="btn secondary" onClick={runBreakdown} disabled={loading}>Breakdown Tasks</button>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="label">User Story (for breakdown)</label>
            <textarea className="input" rows={2} value={story} onChange={(e) => setStory(e.target.value)} placeholder="Optional — uses text above if empty" />
          </div>
        </div>
        <div className="card">
          <h3>Result</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--muted)', maxHeight: 360, overflow: 'auto' }}>
            {result ? JSON.stringify(result, null, 2) : 'Chạy AI để xem kết quả JSON structured output'}
          </pre>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Recent AI Jobs</h3>
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {(jobs as { id: number; job_type: string; status: string; created_at: string }[]).map((j) => (
              <tr key={j.id}><td>{j.id}</td><td>{j.job_type}</td><td>{j.status}</td><td>{j.created_at?.slice(0, 19)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
