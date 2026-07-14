import { useEffect, useState } from 'react';
import { aiStoryPoint, aiAnalyze, aiBreakdown, getProjects, getStories, createStory, updateStory, createTask } from '../api/client';
import type { Project, UserStory } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice } from '../utils/roleAccess';

export default function StoriesPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const access = getPageAccess('stories', user?.role);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [estimate, setEstimate] = useState<Record<number, any>>({});
  const [analysis, setAnalysis] = useState<Record<number, any>>({});
  const [breakdown, setBreakdown] = useState<Record<number, any>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'backlog', story_points: '' });

  // Human-AI Collaboration Breakdown Modal States
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [activeBreakdownStory, setActiveBreakdownStory] = useState<UserStory | null>(null);
  const [breakdownTasks, setBreakdownTasks] = useState<any[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useEffect(() => {
    getProjects(token).then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    });
  }, [token]);

  const loadStories = () => {
    if (!projectId) return;
    getStories(token, projectId).then(setStories);
  };

  useEffect(() => {
    loadStories();
  }, [token, projectId]);

  const determineCollaborationMode = (automation: number, risk: number, cost: number): string => {
    if (risk >= 0.6 || automation < 0.4 || cost >= 1.0) {
      return 'HITL';
    } else if (risk < 0.3 && automation >= 0.7 && cost < 0.5) {
      return 'HOOL';
    }
    return 'HOTL';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { ...formData, story_points: formData.story_points ? Number(formData.story_points) : null };
    if (editingId) {
      await updateStory(token, editingId, data);
    } else {
      await createStory(token, projectId, data);
    }
    setShowModal(false);
    loadStories();
  };

  const handleEdit = (s: UserStory) => {
    setEditingId(s.id);
    setFormData({ title: s.title, description: s.description || '', status: s.status, story_points: s.story_points?.toString() || '' });
    setShowModal(true);
  };

  const handleEstimate = async (story: UserStory) => {
    const text = `${story.title}. ${story.description || ''}`;
    const result = await aiStoryPoint(token, text, projectId ?? undefined);
    setEstimate((prev) => ({ ...prev, [story.id]: result }));
  };

  const handleAnalyze = async (story: UserStory) => {
    const text = `${story.title}. ${story.description || ''}`;
    const result = await aiAnalyze(token, text, projectId ?? undefined);
    setAnalysis((prev) => ({ ...prev, [story.id]: result }));
  };

  const handleBreakdown = async (story: UserStory) => {
    setBreakdownLoading(true);
    setActiveBreakdownStory(story);
    const text = `${story.title}. ${story.description || ''}`;
    try {
      const result = await aiBreakdown(token, text, projectId ?? undefined);
      setBreakdown((prev) => ({ ...prev, [story.id]: result }));
      
      const tasks = (result.tasks || []).map((t: any, idx: number) => {
        const aut = t.automation_level !== undefined ? t.automation_level : 0.5;
        const rsk = t.risk_level !== undefined ? t.risk_level : 0.3;
        const cst = t.ai_cost_estimate !== undefined ? t.ai_cost_estimate : parseFloat((t.estimated_hours * 0.05).toFixed(2));
        return {
          id: idx,
          title: t.title,
          description: t.description || '',
          estimated_hours: t.estimated_hours || 4,
          automation_level: aut,
          risk_level: rsk,
          ai_cost_estimate: cst,
          collaboration_mode: determineCollaborationMode(aut, rsk, cst),
          selected: true,
        };
      });
      setBreakdownTasks(tasks);
      setShowBreakdownModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to get AI Breakdown");
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleTaskFieldChange = (idx: number, field: string, value: any) => {
    setBreakdownTasks(prev => prev.map((t) => {
      if (t.id === idx) {
        const updated = { ...t, [field]: value };
        if (field === 'automation_level' || field === 'risk_level' || field === 'ai_cost_estimate') {
          const aut = field === 'automation_level' ? parseFloat(value) : t.automation_level;
          const rsk = field === 'risk_level' ? parseFloat(value) : t.risk_level;
          const cst = field === 'ai_cost_estimate' ? parseFloat(value) : t.ai_cost_estimate;
          updated.collaboration_mode = determineCollaborationMode(aut, rsk, cst);
        }
        return updated;
      }
      return t;
    }));
  };

  const handleImportTasks = async () => {
    if (!projectId || !activeBreakdownStory) return;
    const selected = breakdownTasks.filter(t => t.selected);
    if (selected.length === 0) {
      alert("No tasks selected for import.");
      return;
    }
    
    setBreakdownLoading(true);
    try {
      for (const t of selected) {
        await createTask(token, projectId, {
          title: t.title,
          description: t.description,
          story_id: activeBreakdownStory.id,
          story_points: Math.max(1, Math.round(t.estimated_hours / 2)),
          automation_level: t.automation_level,
          risk_level: t.risk_level,
          ai_cost_estimate: t.ai_cost_estimate,
          collaboration_mode: t.collaboration_mode,
          status: 'todo',
        });
      }
      alert(`Successfully imported ${selected.length} tasks to Tasks Board!`);
      setShowBreakdownModal(false);
      loadStories();
    } catch (err) {
      console.error(err);
      alert("Failed to import tasks");
    } finally {
      setBreakdownLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>User Stories</h2>
          {!access.canEdit && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>{getReadOnlyNotice('stories', user?.role)}</p>
          )}
        </div>
        {access.canEdit && (
          <button className="btn primary" onClick={() => { setEditingId(null); setFormData({ title: '', description: '', status: 'backlog', story_points: '' }); setShowModal(true); }}>
            + New Story
          </button>
        )}
      </div>

      <select className="input" style={{ maxWidth: 280, marginBottom: '1rem' }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {breakdownLoading && (
        <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--ai)', borderRadius: 'var(--radius)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="spinner" style={{ border: '3px solid #f3f3f3', borderTop: '3px solid var(--ai)', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
          <span>Processing AI Agents workflow... (Analyzing and decomposing tasks)</span>
        </div>
      )}

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem user stories và kết quả AI, nhưng không thể thêm, chỉnh sửa, hay khởi tạo breakdown task.</div>
        </div>
      )}

      <table>
        <thead>
          <tr><th>Title</th><th>Status</th><th>SP</th><th>AI Actions</th><th>AI Results</th></tr>
        </thead>
        <tbody>
          {stories.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.title}</strong>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{s.description}</div>
                {access.canEdit && (
                  <button className="btn" style={{ fontSize: '0.7rem', marginTop: '0.5rem', padding: '0.1rem 0.3rem' }} onClick={() => handleEdit(s)}>Edit</button>
                )}
              </td>
              <td><span className="badge progress">{s.status}</span></td>
              <td>{s.story_points ?? '-'}</td>
              <td style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {access.canEdit ? (
                  <>
                    <button className="btn ai" onClick={() => handleAnalyze(s)}>Analyze (Fuzzy)</button>
                    <button className="btn ai" onClick={() => handleEstimate(s)}>Estimate</button>
                    <button className="btn ai" onClick={() => handleBreakdown(s)} disabled={breakdownLoading}>Breakdown Tasks</button>
                  </>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Read-only</span>
                )}
              </td>
              <td style={{ maxWidth: '300px', fontSize: '0.85rem' }}>
                {analysis[s.id] && <div style={{ marginBottom: '0.5rem', background: '#eef', padding: '0.5rem', borderRadius: '4px', color: '#111' }}><strong>Analysis:</strong> {(analysis[s.id] as any).analysis?.summary || 'Done'}</div>}
                {estimate[s.id] && <div style={{ marginBottom: '0.5rem', background: '#efe', padding: '0.5rem', borderRadius: '4px', color: '#111' }}><strong>SP Estimate:</strong> {(estimate[s.id] as any).story_points} SP - {(estimate[s.id] as any).rationale?.slice(0, 60)}...</div>}
                {breakdown[s.id] && <div style={{ marginBottom: '0.5rem', background: '#fee', padding: '0.5rem', borderRadius: '4px', color: '#111' }}><strong>Tasks:</strong> {(breakdown[s.id] as any).tasks?.length} proposed tasks</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Main story create/edit modal */}
      {showModal && access.canEdit && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '400px', background: 'var(--surface)' }}>
            <h3>{editingId ? 'Edit Story' : 'New Story'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input className="input" placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              <textarea className="input" placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              <input type="number" className="input" placeholder="Story Points" value={formData.story_points} onChange={(e) => setFormData({ ...formData, story_points: e.target.value })} />
              <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="backlog">Backlog</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task breakdown interactive modal */}
      {showBreakdownModal && activeBreakdownStory && (
        <div style={{ position: 'fixed', zIndex: 200, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '950px', background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <span className="badge ai" style={{ marginBottom: '0.25rem' }}>AI Task Breakdown Agent</span>
                <h2>Human-AI DevOps Collaboration Planner</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Story: <strong>{activeBreakdownStory.title}</strong>
                </p>
              </div>
              <button className="btn secondary" onClick={() => setShowBreakdownModal(false)}>✕</button>
            </div>

            <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
              <strong>Selection Criteria Rules for Collaboration Mechanisms:</strong>
              <ul style={{ marginLeft: '1.25rem', marginTop: '0.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <li>🟣 <strong>HITL (Human-in-the-Loop):</strong> Risk &ge; 0.60 OR Automation &lt; 0.40 OR Cost &ge; $1.00. (Steps require manual approval)</li>
                <li>🔵 <strong>HOTL (Human-on-the-Loop):</strong> Default case. (AI executes, Human monitors and can intervene or abort)</li>
                <li>🟢 <strong>HOOL (Human-out-of-Loop):</strong> Risk &lt; 0.30 AND Automation &ge; 0.70 AND Cost &lt; $0.50. (Fully automated with Undo option)</li>
              </ul>
            </div>

            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ minWidth: '850px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', color: 'var(--text)' }}>Select</th>
                    <th style={{ width: '220px', color: 'var(--text)' }}>Task Details</th>
                    <th style={{ width: '160px', color: 'var(--text)' }}>Automation Level</th>
                    <th style={{ width: '160px', color: 'var(--text)' }}>Risk Level</th>
                    <th style={{ width: '130px', color: 'var(--text)' }}>Cost Estimate ($)</th>
                    <th style={{ width: '120px', color: 'var(--text)' }}>Recommended Mechanism</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownTasks.map((t) => (
                    <tr key={t.id} style={{ opacity: t.selected ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <input type="checkbox" checked={t.selected} onChange={(e) => handleTaskFieldChange(t.id, 'selected', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      </td>
                      <td>
                        <input className="input" value={t.title} onChange={(e) => handleTaskFieldChange(t.id, 'title', e.target.value)} style={{ fontSize: '0.85rem', padding: '0.4rem', marginBottom: '0.25rem', color: 'var(--text)', background: 'var(--bg)' }} placeholder="Task title" />
                        <textarea className="input" value={t.description} onChange={(e) => handleTaskFieldChange(t.id, 'description', e.target.value)} style={{ fontSize: '0.75rem', padding: '0.4rem', height: '45px', resize: 'none', color: 'var(--text)', background: 'var(--bg)' }} placeholder="Description" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input type="range" min="0.0" max="1.0" step="0.05" value={t.automation_level} onChange={(e) => handleTaskFieldChange(t.id, 'automation_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                          <span style={{ fontSize: '0.75rem', textAlign: 'center', color: t.automation_level >= 0.7 ? 'var(--success)' : t.automation_level < 0.4 ? 'var(--danger)' : 'var(--warning)' }}>
                            {t.automation_level >= 0.7 ? 'High' : t.automation_level < 0.4 ? 'Low' : 'Medium'} ({t.automation_level})
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input type="range" min="0.0" max="1.0" step="0.05" value={t.risk_level} onChange={(e) => handleTaskFieldChange(t.id, 'risk_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--danger)' }} />
                          <span style={{ fontSize: '0.75rem', textAlign: 'center', color: t.risk_level >= 0.6 ? 'var(--danger)' : t.risk_level < 0.3 ? 'var(--success)' : 'var(--warning)' }}>
                            {t.risk_level >= 0.6 ? 'High' : t.risk_level < 0.3 ? 'Low' : 'Medium'} ({t.risk_level})
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input type="number" min="0.0" max="5.0" step="0.05" className="input" value={t.ai_cost_estimate} onChange={(e) => handleTaskFieldChange(t.id, 'ai_cost_estimate', parseFloat(e.target.value) || 0.0)} style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', textAlign: 'center', color: 'var(--text)', background: 'var(--bg)' }} />
                          <span style={{ fontSize: '0.75rem', textAlign: 'center', color: t.ai_cost_estimate >= 1.0 ? 'var(--danger)' : 'var(--muted)' }}>
                            ~{Math.round(t.ai_cost_estimate * 500000).toLocaleString()} tokens
                          </span>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        {t.collaboration_mode === 'HITL' && (
                          <span className="badge" style={{ background: '#a855f7', color: 'white', padding: '0.4rem 0.6rem', width: '70px', display: 'inline-block', textAlign: 'center' }}>HITL</span>
                        )}
                        {t.collaboration_mode === 'HOTL' && (
                          <span className="badge" style={{ background: '#3b82f6', color: 'white', padding: '0.4rem 0.6rem', width: '70px', display: 'inline-block', textAlign: 'center' }}>HOTL</span>
                        )}
                        {t.collaboration_mode === 'HOOL' && (
                          <span className="badge" style={{ background: '#22c55e', color: 'white', padding: '0.4rem 0.6rem', width: '70px', display: 'inline-block', textAlign: 'center' }}>HOOL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                Selected: <strong>{breakdownTasks.filter(t => t.selected).length} tasks</strong> | Total Estimated AI Cost:{' '}
                <strong style={{ color: 'var(--ai)' }}>
                  ${breakdownTasks.filter(t => t.selected).reduce((acc, curr) => acc + curr.ai_cost_estimate, 0).toFixed(2)}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn secondary" onClick={() => setShowBreakdownModal(false)} disabled={breakdownLoading}>Cancel</button>
                <button className="btn primary ai" onClick={handleImportTasks} disabled={breakdownLoading}>
                  {breakdownLoading ? 'Importing...' : '✨ Approve and Import Tasks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add spin animation locally */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
