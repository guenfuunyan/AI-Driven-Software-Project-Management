import { useEffect, useState } from 'react';
import { getProjects, getRisks, createRisk, updateRisk, aiRisk } from '../api/client';
import type { Project, Risk } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

export default function RisksPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('risks', user?.role);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'Technical', probability: 0.5, impact: 0.5, status: 'open', mitigation: '' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const handleCloseRisk = async (risk: Risk) => {
    await updateRisk(token, risk.id, { status: 'closed' });
    loadRisks();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    await createRisk(token, projectId, formData);
    setShowModal(false);
    loadRisks();
  };

  const handleAIDetect = async () => {
    if (!projectId) return;
    const contextStr = "Current project status indicates potential backend delays and changing client requirements.";
    const result = await aiRisk(token, projectId, contextStr);
    setAiAnalysis(result);
    loadRisks();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Project Risks (Predictive Assessment)</h2>
          {!access.canEdit && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{getReadOnlyNotice('risks', user?.role)}</p>
          )}
        </div>
        {access.canEdit && (
          <div>
            <button className="btn ai" style={{ marginRight: '1rem' }} onClick={handleAIDetect}>
              ✨ AI Predictive Risk Assessment
            </button>
            <button className="btn primary" onClick={() => { setFormData({ title: '', description: '', category: 'Technical', probability: 0.5, impact: 0.5, status: 'open', mitigation: '' }); setShowModal(true); }}>
              + Log Risk
            </button>
          </div>
        )}
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem danh sách rủi ro và phân tích AI, nhưng không thể ghi mới hoặc cập nhật trạng thái rủi ro.</div>
        </div>
      )}

      <select className="input" style={{ maxWidth: 280, marginBottom: '1rem' }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {aiAnalysis && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid #cce5ff', background: '#f8fbff' }}>
          <h3>AI Analysis (Bayesian & Fuzzy Logic)</h3>
          <p>The AI evaluated historical patterns and the current context.</p>
          <ul>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {aiAnalysis.risks?.map((r: any, i: number) => (
              <li key={i}><strong>{r.title}</strong> - Prob: {r.probability}, Impact: {r.impact}. <em>Mitigation: {r.mitigation}</em></li>
            ))}
          </ul>
        </div>
      )}

      <table>
        <thead>
          <tr><th>Risk</th><th>Category</th><th>Prob</th><th>Impact</th><th>Score</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {risks.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.title}</strong> {r.detected_by_ai && <span className="badge ai">AI Detected</span>}
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{r.description}</div>
                {r.mitigation && <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#006600' }}>Mitigation: {r.mitigation}</div>}
              </td>
              <td>{r.category}</td>
              <td>{r.probability}</td>
              <td>{r.impact}</td>
              <td><strong style={{ color: r.score > 0.5 ? 'red' : 'inherit' }}>{r.score.toFixed(2)}</strong></td>
              <td><span className={`badge ${r.status === 'open' ? 'todo' : 'progress'}`}>{r.status}</span></td>
              <td>
                {access.canEdit && r.status === 'open' && (
                  <button className="btn" style={{ fontSize: '0.8rem' }} onClick={() => handleCloseRisk(r)}>
                    Close
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && access.canEdit && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '400px', background: 'white' }}>
            <h3>Log Risk</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input className="input" placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              <textarea className="input" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="number" step="0.1" max="1" min="0" className="input" placeholder="Probability (0-1)" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })} />
                <input type="number" step="0.1" max="1" min="0" className="input" placeholder="Impact (0-1)" value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: Number(e.target.value) })} />
              </div>
              <input className="input" placeholder="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
              <textarea className="input" placeholder="Mitigation Strategy" value={formData.mitigation} onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })} rows={2} />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
