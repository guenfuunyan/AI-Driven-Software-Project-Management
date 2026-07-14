from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# Auth
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None
    role: str = "developer"


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None


# Project
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    owner_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    version: int

    class Config:
        orm_mode = True


class ProjectMemberCreate(BaseModel):
    user_id: int
    role: str = "developer"


class ProjectMemberRead(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: str
    joined_at: datetime

    class Config:
        orm_mode = True


# Epic / Feature / Story
class EpicCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "backlog"
    priority: int = 3


class EpicRead(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    status: str
    priority: int
    created_at: datetime

    class Config:
        orm_mode = True


class FeatureCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "backlog"


class FeatureRead(BaseModel):
    id: int
    epic_id: int
    title: str
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        orm_mode = True


class UserStoryCreate(BaseModel):
    title: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    feature_id: Optional[int] = None
    sprint_id: Optional[int] = None
    status: str = "backlog"
    story_points: Optional[int] = None
    assignee_id: Optional[int] = None
    priority: int = 3


class UserStoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    feature_id: Optional[int] = None
    sprint_id: Optional[int] = None
    status: Optional[str] = None
    story_points: Optional[int] = None
    assignee_id: Optional[int] = None
    priority: Optional[int] = None


class UserStoryRead(BaseModel):
    id: int
    project_id: int
    feature_id: Optional[int]
    sprint_id: Optional[int]
    title: str
    description: Optional[str]
    acceptance_criteria: Optional[str]
    status: str
    story_points: Optional[int]
    assignee_id: Optional[int]
    priority: int
    created_at: datetime

    class Config:
        orm_mode = True


# Sprint
class SprintCreate(BaseModel):
    name: str
    goal: Optional[str] = None
    status: str = "planned"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SprintRead(BaseModel):
    id: int
    project_id: int
    name: str
    goal: Optional[str]
    status: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime

    class Config:
        orm_mode = True


# Task
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    sprint_id: Optional[int] = None
    story_id: Optional[int] = None
    status: str = "todo"
    story_points: Optional[int] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    automation_level: Optional[float] = 0.0
    risk_level: Optional[float] = 0.0
    ai_cost_estimate: Optional[float] = 0.0
    collaboration_mode: Optional[str] = "HITL"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    sprint_id: Optional[int] = None
    story_id: Optional[int] = None
    status: Optional[str] = None
    story_points: Optional[int] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    automation_level: Optional[float] = None
    risk_level: Optional[float] = None
    ai_cost_estimate: Optional[float] = None
    collaboration_mode: Optional[str] = None


class TaskRead(BaseModel):
    id: int
    project_id: int
    sprint_id: Optional[int]
    story_id: Optional[int]
    title: str
    description: Optional[str]
    status: str
    story_points: Optional[int]
    assignee_id: Optional[int]
    due_date: Optional[datetime]
    automation_level: float
    risk_level: float
    ai_cost_estimate: float
    collaboration_mode: str
    created_at: datetime
    updated_at: datetime
    version: int

    class Config:
        orm_mode = True


# Risk
class RiskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "technical"
    probability: float = 0.5
    impact: float = 0.5
    mitigation: Optional[str] = None


class RiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[float] = None
    impact: Optional[float] = None
    status: Optional[str] = None
    mitigation: Optional[str] = None


class RiskRead(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    category: str
    probability: float
    impact: float
    score: float
    status: str
    mitigation: Optional[str]
    detected_by_ai: bool
    created_at: datetime

    class Config:
        orm_mode = True


# Forecast
class ForecastRead(BaseModel):
    id: int
    project_id: int
    sprint_id: Optional[int]
    forecast_type: str
    predicted_value: float
    confidence: float
    details: Optional[str]
    generated_by_ai: bool
    created_at: datetime

    class Config:
        orm_mode = True


# Comment
class CommentCreate(BaseModel):
    entity_type: str
    entity_id: int
    content: str


class CommentRead(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    user_id: int
    content: str
    created_at: datetime

    class Config:
        orm_mode = True


# Notification
class NotificationRead(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    link: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


# Release
class ReleaseCreate(BaseModel):
    name: str
    version: str
    status: str = "planned"
    release_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReleaseRead(BaseModel):
    id: int
    project_id: int
    name: str
    version: str
    status: str
    release_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


# Dashboard / Reports
class DashboardStats(BaseModel):
    total_projects: int
    active_sprints: int
    open_tasks: int
    completed_tasks: int
    open_risks: int
    ai_jobs_today: int
    velocity_avg: float


class BurndownPoint(BaseModel):
    date: str
    remaining_points: float
    ideal_points: float


class VelocityPoint(BaseModel):
    sprint_name: str
    completed_points: float


# AI
class AnalyzeRequest(BaseModel):
    text: str
    project_id: Optional[int] = None


class BreakdownRequest(BaseModel):
    user_story: str
    project_id: Optional[int] = None


class StoryPointRequest(BaseModel):
    user_story: str
    project_id: Optional[int] = None


class ForecastRequest(BaseModel):
    project_id: int
    sprint_id: Optional[int] = None


class RiskDetectRequest(BaseModel):
    project_id: int
    context: Optional[str] = None


class ReviewRequest(BaseModel):
    content: str
    project_id: Optional[int] = None


class DocumentationRequest(BaseModel):
    topic: str
    project_id: Optional[int] = None


class AssignRequest(BaseModel):
    project_id: int
    task_ids: list[int]


class AIAgentRead(BaseModel):
    id: int
    name: str
    agent_type: str
    description: Optional[str]
    is_active: bool

    class Config:
        orm_mode = True


class AIJobRead(BaseModel):
    id: int
    agent_id: int
    project_id: Optional[int]
    job_type: str
    status: str
    output_data: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        orm_mode = True
