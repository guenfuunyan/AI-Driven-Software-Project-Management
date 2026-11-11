from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class Role(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    full_name: Optional[str] = None
    hashed_password: str
    role: str = Field(default="developer", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    status: str = Field(default="active", index=True)
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    version: int = Field(default=1)


class ProjectMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    role: str = Field(default="developer")
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class Epic(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    title: str
    description: Optional[str] = None
    status: str = Field(default="backlog", index=True)
    priority: int = Field(default=3)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None


class Feature(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    epic_id: int = Field(foreign_key="epic.id", index=True)
    title: str
    description: Optional[str] = None
    status: str = Field(default="backlog")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None


class UserStory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    feature_id: Optional[int] = Field(default=None, foreign_key="feature.id")
    sprint_id: Optional[int] = Field(default=None, foreign_key="sprint.id", index=True)
    title: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    status: str = Field(default="backlog", index=True)
    story_points: Optional[int] = None
    assignee_id: Optional[int] = Field(default=None, foreign_key="user.id")
    priority: int = Field(default=3)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None


class Sprint(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    name: str
    goal: Optional[str] = None
    status: str = Field(default="planned", index=True)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    sprint_id: Optional[int] = Field(default=None, foreign_key="sprint.id", index=True)
    story_id: Optional[int] = Field(default=None, foreign_key="userstory.id", index=True)
    title: str
    description: Optional[str] = None
    status: str = Field(default="todo", index=True)
    story_points: Optional[int] = None
    assignee_id: Optional[int] = Field(default=None, foreign_key="user.id")
    due_date: Optional[datetime] = None
    
    automation_level: float = Field(default=0.0)
    risk_level: float = Field(default=0.0)
    ai_cost_estimate: float = Field(default=0.0)
    collaboration_mode: str = Field(default="HITL")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
    version: int = Field(default=1)


class TaskHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="task.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_at: datetime = Field(default_factory=datetime.utcnow)


class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)
    entity_id: int = Field(index=True)
    user_id: int = Field(foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None


class Attachment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)
    entity_id: int = Field(index=True)
    file_name: str
    file_url: str
    uploaded_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Release(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    name: str
    version: str
    status: str = Field(default="planned")
    release_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Risk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    title: str
    description: Optional[str] = None
    category: str = Field(default="technical")
    probability: float = Field(default=0.5)
    impact: float = Field(default=0.5)
    score: float = Field(default=0.25)
    status: str = Field(default="open", index=True)
    mitigation: Optional[str] = None
    detected_by_ai: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None


class Forecast(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", index=True)
    sprint_id: Optional[int] = Field(default=None, foreign_key="sprint.id")
    forecast_type: str = Field(default="velocity")
    predicted_value: float
    confidence: float = Field(default=0.75)
    details: Optional[str] = None
    generated_by_ai: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    message: str
    is_read: bool = Field(default=False)
    link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AIAgent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    agent_type: str
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    is_active: bool = Field(default=True)


class AIJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="aiagent.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    job_type: str
    status: str = Field(default="pending", index=True)
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class PromptHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: Optional[int] = Field(default=None, foreign_key="aiagent.id")
    job_id: Optional[int] = Field(default=None, foreign_key="aijob.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    prompt_template: Optional[str] = None
    prompt: str
    response: Optional[str] = None
    tokens_used: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AIUsage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    agent_name: str
    model: str
    prompt_tokens: int = Field(default=0)
    completion_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)
    cost_usd: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentDeliberation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id", index=True)
    sprint_id: Optional[int] = Field(default=None, foreign_key="sprint.id", index=True)
    user_story_id: Optional[int] = Field(default=None, foreign_key="userstory.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    topic: str
    status: str = Field(default="completed", index=True)  # "pending_hitl", "completed", "rejected"
    conflict_severity: float = Field(default=0.0)
    conflict_level: str = Field(default="NONE")  # "NONE", "MODERATE", "CRITICAL"
    governance_mode: str = Field(default="HOTL", index=True)  # "HITL", "HOTL", "HOOL"
    final_decision: Optional[str] = None
    reconciled_points: Optional[int] = None
    consensus_summary: Optional[str] = None
    actionable_plan: Optional[str] = None
    tradeoff_analysis: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgentThought(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    deliberation_id: int = Field(foreign_key="agentdeliberation.id", index=True)
    agent_role: str = Field(index=True)  # "po_agent", "tech_lead_agent", "scrum_master_agent"
    agent_name: str
    verdict: str  # e.g., "ACCEPT_IMMEDIATELY", "REQUIRE_SPIKE_REFACTOR", "DEFER_NEXT_SPRINT"
    thinking_process: str  # Chain-of-thought markdown / text
    score: float = Field(default=0.0)  # Primary metric (1-10)
    estimated_points: Optional[int] = None
    risk_level: str = Field(default="LOW")  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    key_arguments: Optional[str] = None  # JSON list or formatted bullet points
    concerns_and_tradeoffs: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DeliberationResolution(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    deliberation_id: int = Field(foreign_key="agentdeliberation.id", index=True)
    resolution_type: str = Field(default="ARBITRATION")  # "ARBITRATION" or "HITL"
    selected_option: Optional[str] = None
    approved_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    resolution_notes: Optional[str] = None
    resolved_at: datetime = Field(default_factory=datetime.utcnow)


class AgentActionRecord(SQLModel, table=True):
    """
    Stores autonomous actions proposed or executed by AI Agents.
    Supports HITL manual approval, HOTL live intervention, and HOOL auto-rollback.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: Optional[int] = Field(default=None, foreign_key="aijob.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id", index=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    agent_type: str = Field(index=True)
    action_type: str = Field(index=True)  # e.g., "create_tasks_batch", "assign_tasks", "update_story_points", "record_risk"
    title: str = Field(default="Autonomous Action")
    description: Optional[str] = None
    governance_mode: str = Field(default="HITL", index=True)  # "HITL", "HOTL", "HOOL"
    status: str = Field(default="pending", index=True)  # "pending", "executed", "rejected", "rolled_back"
    action_payload: str = Field(default="{}")  # JSON string
    execution_result: Optional[str] = None  # JSON string
    rollback_payload: Optional[str] = None  # JSON snapshot to restore original state
    created_at: datetime = Field(default_factory=datetime.utcnow)
    executed_at: Optional[datetime] = None
    rolled_back_at: Optional[datetime] = None


