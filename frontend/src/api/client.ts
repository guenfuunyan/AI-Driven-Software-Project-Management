import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Models
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
}

export interface Sprint {
  id: number;
  project_id: number;
  name: string;
  goal?: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

export interface UserStory {
  id: number;
  project_id: number;
  feature_id?: number;
  sprint_id?: number;
  title: string;
  description?: string;
  acceptance_criteria?: string;
  status: string;
  story_points?: number;
  assignee_id?: number;
  priority: number;
}

export interface Task {
  id: number;
  project_id: number;
  sprint_id?: number;
  story_id?: number;
  title: string;
  description?: string;
  status: string;
  story_points?: number;
  assignee_id?: number;
  automation_level: number;
  risk_level: number;
  ai_cost_estimate: number;
  collaboration_mode: string;
}

export interface Risk {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  category: string;
  probability: number;
  impact: number;
  score: number;
  status: string;
  mitigation?: string;
  detected_by_ai: boolean;
  created_at: string;
}

export interface Forecast {
  id: number;
  project_id: number;
  sprint_id?: number;
  forecast_type: string;
  predicted_value: number;
  confidence: number;
  details?: string;
  generated_by_ai: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_projects: number;
  active_sprints: number;
  open_tasks: number;
  completed_tasks: number;
  open_risks: number;
  ai_jobs_today: number;
  velocity_avg: number;
}

// Helper to make request headers with token
function getHeaders(token?: string) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

// API Functions

// Auth
export async function login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  const response = await apiClient.post<{ access_token: string; refresh_token: string }>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
}

export async function getMe(token: string): Promise<User> {
  const response = await apiClient.get<User>('/auth/me', getHeaders(token));
  return response.data;
}

export async function refreshToken(token: string): Promise<{ access_token: string; refresh_token: string }> {
  const response = await apiClient.post<{ access_token: string; refresh_token: string }>('/auth/refresh', { refresh_token: token });
  return response.data;
}

export async function updateProfile(token: string, data: { full_name?: string; email?: string }): Promise<User> {
  const response = await apiClient.patch<User>('/auth/me', data, getHeaders(token));
  return response.data;
}

export async function getUsers(token: string): Promise<User[]> {
  const response = await apiClient.get<User[]>('/auth/users', getHeaders(token));
  return response.data;
}

// Projects
export async function getProjects(token?: string): Promise<Project[]> {
  const response = await apiClient.get<Project[]>('/projects/', getHeaders(token));
  return response.data;
}

export async function createProject(token: string, data: Partial<Project>): Promise<Project> {
  const response = await apiClient.post<Project>('/projects/', data, getHeaders(token));
  return response.data;
}

export async function updateProject(token: string, id: number, data: Partial<Project>): Promise<Project> {
  const response = await apiClient.patch<Project>(`/projects/${id}`, data, getHeaders(token));
  return response.data;
}

export async function deleteProject(token: string, id: number): Promise<void> {
  await apiClient.delete(`/projects/${id}`, getHeaders(token));
}

// Sprints
export async function getSprints(token: string, projectId: number): Promise<Sprint[]> {
  const response = await apiClient.get<Sprint[]>(`/sprints/projects/${projectId}`, getHeaders(token));
  return response.data;
}

export async function createSprint(token: string, projectId: number, data: Partial<Sprint>): Promise<Sprint> {
  const response = await apiClient.post<Sprint>(`/sprints/projects/${projectId}`, data, getHeaders(token));
  return response.data;
}

export async function updateSprint(token: string, sprintId: number, data: Partial<Sprint>): Promise<Sprint> {
  const response = await apiClient.patch<Sprint>(`/sprints/${sprintId}`, data, getHeaders(token));
  return response.data;
}

// User Stories
export async function getStories(token: string, projectId: number): Promise<UserStory[]> {
  const response = await apiClient.get<UserStory[]>(`/stories/projects/${projectId}`, getHeaders(token));
  return response.data;
}

export async function createStory(token: string, projectId: number, data: Partial<UserStory>): Promise<UserStory> {
  const response = await apiClient.post<UserStory>(`/stories/projects/${projectId}`, data, getHeaders(token));
  return response.data;
}

export async function updateStory(token: string, storyId: number, data: Partial<UserStory>): Promise<UserStory> {
  const response = await apiClient.patch<UserStory>(`/stories/${storyId}`, data, getHeaders(token));
  return response.data;
}

export async function deleteStory(token: string, storyId: number): Promise<void> {
  await apiClient.delete(`/stories/${storyId}`, getHeaders(token));
}

// Tasks
export async function getTasks(token: string, projectId: number, sprintId?: number): Promise<Task[]> {
  const url = sprintId 
    ? `/tasks/?project_id=${projectId}&sprint_id=${sprintId}` 
    : `/tasks/?project_id=${projectId}`;
  const response = await apiClient.get<Task[]>(url, getHeaders(token));
  return response.data;
}

export async function createTask(token: string, projectId: number, data: Partial<Task>): Promise<Task> {
  const response = await apiClient.post<Task>(`/tasks/projects/${projectId}`, data, getHeaders(token));
  return response.data;
}

export async function updateTask(token: string, taskId: number, data: Partial<Task>): Promise<Task> {
  const response = await apiClient.patch<Task>(`/tasks/${taskId}`, data, getHeaders(token));
  return response.data;
}

export async function deleteTask(token: string, taskId: number): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`, getHeaders(token));
}

// Risks
export async function getRisks(token: string, projectId: number): Promise<Risk[]> {
  const response = await apiClient.get<Risk[]>(`/risks/projects/${projectId}`, getHeaders(token));
  return response.data;
}

export async function createRisk(token: string, projectId: number, data: Partial<Risk>): Promise<Risk> {
  const response = await apiClient.post<Risk>(`/risks/projects/${projectId}`, data, getHeaders(token));
  return response.data;
}

export async function updateRisk(token: string, riskId: number, data: Partial<Risk>): Promise<Risk> {
  const response = await apiClient.patch<Risk>(`/risks/${riskId}`, data, getHeaders(token));
  return response.data;
}

export async function deleteRisk(token: string, riskId: number): Promise<void> {
  await apiClient.delete(`/risks/${riskId}`, getHeaders(token));
}

// Forecasts
export async function getForecasts(token: string, projectId: number): Promise<Forecast[]> {
  const response = await apiClient.get<Forecast[]>(`/forecasts/projects/${projectId}`, getHeaders(token));
  return response.data;
}

export async function getBurndown(token: string, sprintId: number): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/dashboard/burndown/${sprintId}`, getHeaders(token));
  return response.data;
}

export async function getVelocity(token: string, projectId: number): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/dashboard/velocity/${projectId}`, getHeaders(token));
  return response.data;
}

// Dashboard
export async function getDashboardStats(token: string): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>('/dashboard/stats', getHeaders(token));
  return response.data;
}

// AI Service
export async function getAIJobs(token: string): Promise<any[]> {
  const response = await apiClient.get<any[]>('/ai/jobs', getHeaders(token));
  return response.data;
}

export async function getAIAgents(token: string): Promise<any[]> {
  const response = await apiClient.get<any[]>('/ai/agents', getHeaders(token));
  return response.data;
}

export async function aiAnalyze(token: string, text: string, projectId?: number): Promise<any> {
  const response = await apiClient.post<any>('/ai/analyze', { text, project_id: projectId }, getHeaders(token));
  return response.data;
}

export async function aiBreakdown(token: string, userStory: string, projectId?: number): Promise<any> {
  const response = await apiClient.post<any>('/ai/breakdown', { user_story: userStory, project_id: projectId }, getHeaders(token));
  return response.data;
}

export async function aiStoryPoint(token: string, userStory: string, projectId?: number): Promise<any> {
  const response = await apiClient.post<any>('/ai/story-point', { user_story: userStory, project_id: projectId }, getHeaders(token));
  return response.data;
}

export async function aiForecast(token: string, projectId: number, sprintId?: number): Promise<any> {
  const response = await apiClient.post<any>('/ai/forecast', { project_id: projectId, sprint_id: sprintId }, getHeaders(token));
  return response.data;
}

export async function aiRisk(token: string, projectId: number, context?: string): Promise<any> {
  const response = await apiClient.post<any>('/ai/risk', { project_id: projectId, context }, getHeaders(token));
  return response.data;
}

export async function aiAssign(token: string, projectId: number, taskIds: number[]): Promise<any> {
  const response = await apiClient.post<any>('/ai/assign', { project_id: projectId, task_ids: taskIds }, getHeaders(token));
  return response.data;
}

// Autonomous Multi-Agent Deliberation & Conflict Resolution
export interface AgentThoughtDetail {
  agent_role: string;
  agent_name: string;
  role_title: string;
  verdict: string;
  thinking_process: string;
  score: number;
  score_label: string;
  estimated_points: number;
  risk_level: string;
  key_arguments: string[];
  concerns_and_tradeoffs: string;
}

export interface ConflictItem {
  id: string;
  category: string;
  severity: string;
  opposing_agents: string[];
  description: string;
  impact_analysis: string;
}

export interface TradeoffOption {
  option_id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  points: number;
  target_sprint: string;
  favored_agent: string;
}

export interface DeliberationResponse {
  deliberation_id: number;
  topic: string;
  agents_thoughts: AgentThoughtDetail[];
  conflict_severity: number;
  conflict_level: 'NONE' | 'MODERATE' | 'CRITICAL';
  conflicts_detected: ConflictItem[];
  governance_mode: 'HITL' | 'HOTL' | 'HOOL';
  final_verdict: string;
  reconciled_points: number;
  consensus_summary: string;
  actionable_plan: string[];
  tradeoff_analysis: string;
  hitl_options: TradeoffOption[];
  status: string;
}

export interface DeliberationRead {
  id: number;
  project_id?: number;
  sprint_id?: number;
  topic: string;
  status: string;
  conflict_severity: number;
  conflict_level: string;
  governance_mode: string;
  final_decision?: string;
  reconciled_points?: number;
  created_at: string;
}

export async function aiDeliberate(
  token: string,
  payload: {
    user_story: string;
    project_id?: number;
    sprint_id?: number;
    acceptance_criteria?: string;
    context?: any;
  }
): Promise<DeliberationResponse> {
  const response = await apiClient.post<DeliberationResponse>('/ai/deliberate', payload, getHeaders(token));
  return response.data;
}

export async function aiResolveHitl(
  token: string,
  deliberationId: number,
  selectedOption: string,
  customNotes?: string
): Promise<any> {
  const response = await apiClient.post<any>(
    `/ai/deliberate/${deliberationId}/resolve-hitl`,
    { selected_option: selectedOption, custom_notes: customNotes },
    getHeaders(token)
  );
  return response.data;
}

export async function getAIDeliberations(token: string, projectId?: number): Promise<DeliberationRead[]> {
  const params = projectId ? { project_id: projectId } : {};
  const response = await apiClient.get<DeliberationRead[]>('/ai/deliberations', {
    ...getHeaders(token),
    params,
  });
  return response.data;
}

export async function getAIDeliberation(token: string, deliberationId: number): Promise<any> {
  const response = await apiClient.get<any>(`/ai/deliberations/${deliberationId}`, getHeaders(token));
  return response.data;
}

// ==============================================================================
// AUTONOMOUS AGENT RUNTIME & ACTION INTERFACES
// ==============================================================================
export interface AgentGovernance {
  mode: 'HITL' | 'HOTL' | 'HOOL';
  risk_score: number;
  automation_level: number;
  cost_usd: number;
  can_rollback: boolean;
}

export interface AgentExecutionStep {
  step: string;
  phase?: 'PLAN' | 'PERCEIVE' | 'REASON' | 'REFLECT' | 'ACTION_PROPOSAL';
  status: 'completed' | 'pending' | 'skipped' | 'executing';
  detail: string;
  tool?: string;
  observation?: any;
  timestamp: string;
}

export interface AgentProposedAction {
  action_type: string;
  title: string;
  description: string;
  payload: any;
}

export interface AgentEnvelope {
  is_agent: boolean;
  agent_name: string;
  agent_role: string;
  agent_avatar: string;
  agent_description: string;
  plan_steps: string[];
  execution_trace: AgentExecutionStep[];
  governance: AgentGovernance;
  proposed_actions: AgentProposedAction[];
  action_record_id: number | null;
  action_status: 'pending' | 'executed' | 'rolled_back' | 'none';
  job_id: number;
  prompt_id: number;
  [key: string]: any;
}

export interface AgentActionRecord {
  id: number;
  job_id?: number;
  project_id?: number;
  user_id?: number;
  agent_type: string;
  action_type: string;
  title: string;
  description?: string;
  governance_mode: string;
  status: 'pending' | 'executed' | 'rejected' | 'rolled_back';
  action_payload: string;
  execution_result?: string;
  created_at: string;
  executed_at?: string;
  rolled_back_at?: string;
}

export async function executeAgentAction(
  token: string,
  actionId: number,
  notes?: string
): Promise<{ status: string; message: string; execution_result?: any }> {
  const response = await apiClient.post(
    `/ai/actions/${actionId}/execute`,
    { action_record_id: actionId, custom_notes: notes },
    getHeaders(token)
  );
  return response.data;
}

export async function rollbackAgentAction(
  token: string,
  actionId: number
): Promise<{ status: string; message: string }> {
  const response = await apiClient.post(
    `/ai/actions/${actionId}/rollback`,
    { action_record_id: actionId },
    getHeaders(token)
  );
  return response.data;
}

export async function getAgentActions(token: string, projectId?: number): Promise<AgentActionRecord[]> {
  const params = projectId ? { project_id: projectId } : {};
  const response = await apiClient.get<AgentActionRecord[]>('/ai/actions', {
    ...getHeaders(token),
    params,
  });
  return response.data;
}


