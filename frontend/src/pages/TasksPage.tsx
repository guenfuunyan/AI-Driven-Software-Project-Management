import { useEffect, useState, useRef } from 'react';
import { getProjects, getTasks, createTask, updateTask, aiAssign } from '../api/client';
import type { Project, Task } from '../api/client';
import { useAuthStore } from '../store/auth';
import { getPageAccess, getReadOnlyNotice, getRoleLabel } from '../utils/roleAccess';

const COLS = ['todo', 'in_progress', 'review', 'done'] as const;
const LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function TasksPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Forms include collaboration parameters
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    automation_level: 0.5,
    risk_level: 0.3,
    ai_cost_estimate: 0.1,
    collaboration_mode: 'HOTL'
  });

  // Rollback registry for HOOL tasks
  const [hoolRollbacks, setHoolRollbacks] = useState<Record<number, { prevStatus: string }>>({});

  // Simulator States
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorStatus, setSimulatorStatus] = useState<'idle' | 'running' | 'waiting_approval' | 'paused' | 'completed'>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [interventionInput, setInterventionInput] = useState('');
  
  const timerRef = useRef<number | null>(null);

  const PIPELINE_STEPS = [
    { name: '1. Init Environment', desc: 'Initialize DevOps sandbox environment and map repo files.' },
    { name: '2. Static Analysis', desc: 'Read code files, analyze dependencies, check for syntax issues.' },
    { name: '3. Generate Changes', desc: 'Run LLM generator to create commits and inject code/tests.' },
    { name: '4. DevOps Testing', desc: 'Run integration test suites in isolated test docker containers.' },
    { name: '5. Release Pipeline', desc: 'Trigger CD deployment script, update project documentation.' }
  ];

  useEffect(() => {
    getProjects(token).then((ps) => {
      setProjects(ps);
      if (ps[0]) setProjectId(ps[0].id);
    });
  }, [token]);

  const loadTasks = () => {
    if (!projectId) return;
    getTasks(token, projectId).then((ts) => {
      // Ensure collaboration fields are safe defaults if they are missing
      const mapped = ts.map(t => ({
        ...t,
        automation_level: t.automation_level !== undefined ? t.automation_level : 0.0,
        risk_level: t.risk_level !== undefined ? t.risk_level : 0.0,
        ai_cost_estimate: t.ai_cost_estimate !== undefined ? t.ai_cost_estimate : 0.0,
        collaboration_mode: t.collaboration_mode || 'HITL'
      }));
      setTasks(mapped);
    });
  };

  useEffect(() => {
    loadTasks();
  }, [token, projectId]);

  const determineCollaborationMode = (automation: number, risk: number, cost: number): string => {
    if (risk >= 0.6 || automation < 0.4 || cost >= 1.0) {
      return 'HITL';
    } else if (risk < 0.3 && automation >= 0.7 && cost < 0.5) {
      return 'HOOL';
    }
    return 'HOTL';
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'automation_level' || field === 'risk_level' || field === 'ai_cost_estimate') {
        const aut = field === 'automation_level' ? parseFloat(value) : prev.automation_level;
        const rsk = field === 'risk_level' ? parseFloat(value) : prev.risk_level;
        const cst = field === 'ai_cost_estimate' ? parseFloat(value) : prev.ai_cost_estimate;
        updated.collaboration_mode = determineCollaborationMode(aut, rsk, cst);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    const payload = {
      ...formData,
      automation_level: Number(formData.automation_level),
      risk_level: Number(formData.risk_level),
      ai_cost_estimate: Number(formData.ai_cost_estimate),
    };
    if (editingId) {
      await updateTask(token, editingId, payload);
    } else {
      await createTask(token, projectId, payload);
    }
    setShowModal(false);
    loadTasks();
  };

  const handleEdit = (t: Task) => {
    setEditingId(t.id);
    setFormData({
      title: t.title,
      description: t.description || '',
      status: t.status,
      automation_level: t.automation_level !== undefined ? t.automation_level : 0.5,
      risk_level: t.risk_level !== undefined ? t.risk_level : 0.3,
      ai_cost_estimate: t.ai_cost_estimate !== undefined ? t.ai_cost_estimate : 0.1,
      collaboration_mode: t.collaboration_mode || 'HITL'
    });
    setShowModal(true);
  };

  const moveTask = async (task: Task, status: string) => {
    await updateTask(token, task.id, { status });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
  };

  const handleAIAssign = async () => {
    if (!projectId) return;
    const taskIds = tasks.filter(t => t.status === 'todo' && !t.assignee_id).map(t => t.id);
    if (taskIds.length === 0) {
      alert("No unassigned 'todo' tasks available.");
      return;
    }
    const result = await aiAssign(token, projectId, taskIds);
    const applied = (result.applied as { task_id: number; assignee_id: number }[] | undefined)?.length ?? 0;
    alert(`AI đã phân công ${applied} task thành công.`);
    loadTasks();
  };

  // Trigger AI simulator execution
  const startAIExecution = (task: Task) => {
    setActiveTask(task);
    setLogs([`[SYSTEM] Init autonomous execution for task: "${task.title}" under ${task.collaboration_mode} protocol.`]);
    setCurrentStep(0);
    setInterventionInput('');
    
    if (task.collaboration_mode === 'HOOL') {
      // HOOL runs immediately and saves status to done
      const batchLogs = [
        `[SYSTEM] Running HOOL fully autonomous mode. Cost: $${task.ai_cost_estimate || 0.05}`,
        `[INFO] Spawning docker workspace container...`,
        `[INFO] Code generation finished. Commit pushed automatically.`,
        `[INFO] All automated test stages passed successfully.`,
        `[SYSTEM] Task moved to Done. Audit state cached for undo.`
      ];
      setLogs(batchLogs);
      setSimulatorStatus('completed');
      setShowSimulator(true);
      
      // Auto save task state to done
      updateTask(token, task.id, { status: 'done' }).then(() => {
        // Register rollback record
        setHoolRollbacks(prev => ({
          ...prev,
          [task.id]: { prevStatus: task.status }
        }));
        loadTasks();
      });
    } else {
      // HITL or HOTL opens visual pipeline simulation
      setSimulatorStatus('running');
      setShowSimulator(true);
      runNextStep(0, task);
    }
  };

  const runNextStep = (stepIdx: number, task: Task) => {
    if (stepIdx >= PIPELINE_STEPS.length) {
      // Completed!
      setLogs(prev => [...prev, `[SYSTEM] DevOps pipeline execution complete! Moving task to Review.`]);
      setSimulatorStatus('completed');
      updateTask(token, task.id, { status: 'review' }).then(() => loadTasks());
      return;
    }
    
    setCurrentStep(stepIdx);
    const step = PIPELINE_STEPS[stepIdx];
    setLogs(prev => [...prev, `[RUNNING] ${step.name}: ${step.desc}`]);

    if (task.collaboration_mode === 'HITL') {
      // Pause after printing step description - needs manual human approval
      setSimulatorStatus('waiting_approval');
    } else {
      // HOTL runs step automatically with delay
      setSimulatorStatus('running');
      timerRef.current = window.setTimeout(() => {
        setLogs(prev => [
          ...prev, 
          `[SUCCESS] Completed ${step.name} successfully.`
        ]);
        runNextStep(stepIdx + 1, task);
      }, 1500);
    }
  };

  // HITL manual step approval
  const approveCurrentStep = () => {
    if (!activeTask) return;
    const step = PIPELINE_STEPS[currentStep];
    setLogs(prev => [
      ...prev,
      `[HUMAN APPROVED] Step "${step.name}" manually approved.`,
      `[SUCCESS] Completed ${step.name} successfully.`
    ]);
    runNextStep(currentStep + 1, activeTask);
  };

  // HOTL intervention
  const handleIntervene = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setSimulatorStatus('paused');
    setLogs(prev => [...prev, `[WARNING] Execution paused by Human Operator.`]);
  };

  const submitIntervention = () => {
    if (!activeTask) return;
    if (!interventionInput.trim()) return;
    
    setLogs(prev => [
      ...prev,
      `[HUMAN OVERRIDE] Operator injected override command: "${interventionInput}"`,
      `[INFO] Applying override parameter to runtime env...`,
      `[SYSTEM] Resuming execution with updated configurations.`
    ]);
    setInterventionInput('');
    setSimulatorStatus('running');
    
    // Resume execution
    timerRef.current = window.setTimeout(() => {
      const step = PIPELINE_STEPS[currentStep];
      setLogs(prev => [...prev, `[SUCCESS] Completed ${step.name} successfully.`]);
      runNextStep(currentStep + 1, activeTask);
    }, 1500);
  };

  const abortExecution = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setLogs(prev => [...prev, `[ERROR] Execution aborted by operator. Sandbox state cleaned up.`]);
    setSimulatorStatus('idle');
    setShowSimulator(false);
  };

  // HOOL Rollback / Undo action
  const handleUndoHOOL = async (taskId: number) => {
    const rollbackRecord = hoolRollbacks[taskId];
    if (!rollbackRecord) return;
    
    try {
      const prevStatus = rollbackRecord.prevStatus;
      await updateTask(token, taskId, { status: prevStatus });
      alert("HOOL Rollback Successful: Reverted task status and restored sandbox state to version history.");
      // Remove from rollback map
      setHoolRollbacks(prev => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
      loadTasks();
    } catch (err) {
      console.error(err);
      alert("Undo failed");
    }
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Summary statistics
  const totalCost = tasks.reduce((sum, t) => sum + (t.ai_cost_estimate || 0), 0);
  const countHITL = tasks.filter(t => t.collaboration_mode === 'HITL').length;
  const countHOTL = tasks.filter(t => t.collaboration_mode === 'HOTL').length;
  const countHOOL = tasks.filter(t => t.collaboration_mode === 'HOOL').length;
  const access = getPageAccess('tasks', user?.role);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Tasks Board</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {access.canEdit ? `Bạn đang thao tác như ${getRoleLabel(user?.role)}.` : getReadOnlyNotice('tasks', user?.role)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {access.canEdit && (
            <button className="btn ai" onClick={handleAIAssign}>
              ✨ AI Auto-Assign (Heuristic)
            </button>
          )}
          {access.canEdit && (
            <button className="btn primary" onClick={() => {
              setEditingId(null);
              setFormData({
                title: '',
                description: '',
                status: 'todo',
                automation_level: 0.5,
                risk_level: 0.3,
                ai_cost_estimate: 0.1,
                collaboration_mode: 'HOTL'
              });
              setShowModal(true);
            }}>
              + New Task
            </button>
          )}
        </div>
      </div>

      {!access.canEdit && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <strong>Chỉ xem</strong>
          <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Bạn đang xem bảng công việc ở chế độ chỉ xem. Các nút AI tự động phân công và thao tác cập nhật trạng thái sẽ bị ẩn.</div>
        </div>
      )}

      <select className="input" style={{ maxWidth: 280, marginBottom: '1.25rem' }} value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* DevOps AI Summary Widget */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--ai)', background: 'var(--surface)' }}>
          <h3>Total Token Budget</h3>
          <p style={{ color: 'var(--ai)' }}>${totalCost.toFixed(2)}</p>
          <small style={{ color: 'var(--muted)' }}>Approx. {(totalCost * 500000).toLocaleString()} total tokens</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <h3>HITL (Human in Loop)</h3>
          <p style={{ color: '#a855f7' }}>{countHITL}</p>
          <small style={{ color: 'var(--muted)' }}>Manual Step Approvals</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h3>HOTL (Human on Loop)</h3>
          <p style={{ color: '#3b82f6' }}>{countHOTL}</p>
          <small style={{ color: 'var(--muted)' }}>AI Runs, Human Supervises</small>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
          <h3>HOOL (Human out of Loop)</h3>
          <p style={{ color: '#22c55e' }}>{countHOOL}</p>
          <small style={{ color: 'var(--muted)' }}>Fully Autonomous with Undo</small>
        </div>
      </div>

      <div className="kanban">
        {COLS.map((col) => (
          <div key={col} className="kanban-col">
            <h4>{LABELS[col]}</h4>
            {tasks.filter((t) => t.status === col || (col === 'todo' && !COLS.includes(t.status as typeof COLS[number]))).map((t) => (
              <div key={t.id} className="task-card" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Visual Collaboration Indicator bar on top of the card */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: t.collaboration_mode === 'HOOL' ? '#22c55e' : t.collaboration_mode === 'HOTL' ? '#3b82f6' : '#a855f7'
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem', marginTop: '0.25rem' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{t.title}</strong>
                  {access.canEdit && (
                    <button className="btn secondary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', height: 'fit-content' }} onClick={() => handleEdit(t)}>Edit</button>
                  )}
                </div>
                
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '0.4rem 0' }}>{t.description}</div>
                
                {t.assignee_id && <small style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--primary)' }}>Assigned ID: {t.assignee_id}</small>}
                
                {/* Metadata details */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '0.35rem', borderRadius: '4px', marginBottom: '0.6rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                  <span>Risk: <strong style={{ color: (t.risk_level || 0) >= 0.6 ? 'var(--danger)' : (t.risk_level || 0) < 0.3 ? 'var(--success)' : 'var(--warning)' }}>{t.risk_level}</strong></span>
                  <span>Aut: <strong style={{ color: (t.automation_level || 0) >= 0.7 ? 'var(--success)' : (t.automation_level || 0) < 0.4 ? 'var(--danger)' : 'var(--warning)' }}>{t.automation_level}</strong></span>
                  <span>Cost: <strong style={{ color: 'var(--text)' }}>${t.ai_cost_estimate}</strong></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  {/* Collaboration Mode badge */}
                  <div>
                    {t.collaboration_mode === 'HITL' && <span className="badge" style={{ background: '#a855f7', color: 'white' }}>HITL</span>}
                    {t.collaboration_mode === 'HOTL' && <span className="badge" style={{ background: '#3b82f6', color: 'white' }}>HOTL</span>}
                    {t.collaboration_mode === 'HOOL' && <span className="badge" style={{ background: '#22c55e', color: 'white' }}>HOOL</span>}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {access.canEdit && hoolRollbacks[t.id] && (
                      <button className="btn danger" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }} onClick={() => handleUndoHOOL(t.id)}>
                        ↩️ Revert
                      </button>
                    )}
                    
                    {access.canEdit && t.status !== 'done' && (
                      <button className="btn ai" style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }} onClick={() => startAIExecution(t)}>
                        🤖 Run AI
                      </button>
                    )}
                  </div>
                </div>

                {/* Move status buttons */}
                {access.canEdit && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.6rem', borderTop: '1px solid var(--border)', paddingTop: '0.4rem', flexWrap: 'wrap' }}>
                    {COLS.filter((c) => c !== t.status).map((c) => (
                      <button key={c} className="btn secondary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.3rem' }} onClick={() => moveTask(t, c)}>
                        &rarr; {LABELS[c]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Task Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', zIndex: 100, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="card" style={{ width: '450px', background: 'var(--surface)' }}>
            <h3>{editingId ? 'Edit Task' : 'New Task'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input className="input" placeholder="Title" value={formData.title} onChange={(e) => handleFieldChange('title', e.target.value)} required />
              <textarea className="input" placeholder="Description" value={formData.description} onChange={(e) => handleFieldChange('description', e.target.value)} rows={3} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <select className="input" value={formData.status} onChange={(e) => handleFieldChange('status', e.target.value)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Sliders for automation and risk */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--ai)' }}>DevOps AI Collaboration Parameters</h4>
                
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Automation Capability</span>
                    <span>{formData.automation_level}</span>
                  </label>
                  <input type="range" min="0.0" max="1.0" step="0.05" value={formData.automation_level} onChange={(e) => handleFieldChange('automation_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Task Risk Level</span>
                    <span>{formData.risk_level}</span>
                  </label>
                  <input type="range" min="0.0" max="1.0" step="0.05" value={formData.risk_level} onChange={(e) => handleFieldChange('risk_level', parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--danger)' }} />
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estimated Token Cost ($)</span>
                    <span>${formData.ai_cost_estimate}</span>
                  </label>
                  <input type="number" min="0.0" max="5.0" step="0.05" className="input" value={formData.ai_cost_estimate} onChange={(e) => handleFieldChange('ai_cost_estimate', parseFloat(e.target.value) || 0.0)} style={{ padding: '0.4rem', fontSize: '0.85rem', color: 'var(--text)', background: 'var(--bg)' }} />
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Recommended Loop:</span>
                  {formData.collaboration_mode === 'HITL' && <span className="badge" style={{ background: '#a855f7', color: 'white', padding: '0.25rem 0.5rem' }}>HITL (Manual steps approval)</span>}
                  {formData.collaboration_mode === 'HOTL' && <span className="badge" style={{ background: '#3b82f6', color: 'white', padding: '0.25rem 0.5rem' }}>HOTL (AI runs, Human supervises)</span>}
                  {formData.collaboration_mode === 'HOOL' && <span className="badge" style={{ background: '#22c55e', color: 'white', padding: '0.25rem 0.5rem' }}>HOOL (Autonomous with undo)</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI DevOps Execution Simulator Modal */}
      {showSimulator && activeTask && (
        <div style={{ position: 'fixed', zIndex: 200, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge ai" style={{ marginBottom: '0.25rem' }}>DevOps Agent Terminal</span>
                <h3>AI Sandbox Execution Engine</h3>
              </div>
              <span className="badge" style={{
                background: activeTask.collaboration_mode === 'HOOL' ? '#22c55e' : activeTask.collaboration_mode === 'HOTL' ? '#3b82f6' : '#a855f7',
                color: 'white',
                padding: '0.35rem 0.6rem'
              }}>
                {activeTask.collaboration_mode} Protocol
              </span>
            </div>

            <div>
              <p style={{ fontSize: '0.9rem' }}>Executing task: <strong>{activeTask.title}</strong></p>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{activeTask.description}</p>
            </div>

            {/* Pipeline progress steps (only shown for HITL and HOTL) */}
            {activeTask.collaboration_mode !== 'HOOL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                {PIPELINE_STEPS.map((s, idx) => {
                  let statusColor = 'var(--muted)';
                  let stepStatusText = 'Pending';
                  if (idx < currentStep) {
                    statusColor = 'var(--success)';
                    stepStatusText = '✓ Success';
                  } else if (idx === currentStep) {
                    if (simulatorStatus === 'waiting_approval') {
                      statusColor = 'var(--danger)';
                      stepStatusText = '✖ Blocked (Human Approval)';
                    } else if (simulatorStatus === 'paused') {
                      statusColor = 'var(--warning)';
                      stepStatusText = '⏸ Paused';
                    } else {
                      statusColor = 'var(--ai)';
                      stepStatusText = '⚡ Executing...';
                    }
                  }
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderLeft: `3px solid ${statusColor}`, background: idx === currentStep ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <span style={{ fontWeight: idx === currentStep ? '600' : '400', color: idx === currentStep ? 'var(--text)' : 'var(--muted)' }}>{s.name}</span>
                      <span style={{ color: statusColor, fontSize: '0.75rem', fontWeight: 'bold' }}>{stepStatusText}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Terminal logs container */}
            <div style={{
              background: '#090d16',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              height: '180px',
              overflowY: 'auto',
              fontFamily: 'Courier, monospace',
              fontSize: '0.75rem',
              color: '#39ff14',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              {logs.map((log, i) => {
                let color = '#39ff14';
                if (log.startsWith('[SYSTEM]')) color = 'var(--ai)';
                else if (log.startsWith('[WARNING]')) color = 'var(--warning)';
                else if (log.startsWith('[ERROR]')) color = 'var(--danger)';
                else if (log.startsWith('[HUMAN')) color = '#00ffff';
                else if (log.startsWith('[SUCCESS]')) color = 'var(--success)';
                return (
                  <div key={i} style={{ color }}>
                    {log}
                  </div>
                );
              })}
            </div>

            {/* Simulation Status Alerts & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              
              {/* Waiting Approval (HITL) */}
              {simulatorStatus === 'waiting_approval' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚠️ <strong>Task Blocked:</strong> Human Review required. Risk coefficient is high ({activeTask.risk_level}).</span>
                  <button className="btn primary" onClick={approveCurrentStep}>Approve Step</button>
                </div>
              )}

              {/* Running (HOTL) */}
              {simulatorStatus === 'running' && activeTask.collaboration_mode === 'HOTL' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>⚡ Execution loops autonomously. Review metrics or press Intervene.</span>
                  <button className="btn danger" style={{ padding: '0.35rem 0.75rem' }} onClick={handleIntervene}>⏸ Intervene</button>
                </div>
              )}

              {/* Paused for Human Intervention (HOTL) */}
              {simulatorStatus === 'paused' && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>⏸ <strong>Operator Intervention Panel:</strong> Inject dynamic configuration, custom prompt or code override to redirect the runtime.</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" placeholder="e.g. override db connection strings or skip staging checks" value={interventionInput} onChange={(e) => setInterventionInput(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.4rem', color: 'var(--text)', background: 'var(--bg)' }} />
                    <button className="btn" style={{ background: 'var(--warning)', color: '#111', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={submitIntervention}>Submit</button>
                  </div>
                </div>
              )}

              {/* Completion Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                {simulatorStatus !== 'completed' && (
                  <button className="btn secondary" onClick={abortExecution}>Abort / Close</button>
                )}
                {simulatorStatus === 'completed' && (
                  <button className="btn primary" onClick={() => { setShowSimulator(false); setActiveTask(null); }}>
                    ✓ Finish & Save Run
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
