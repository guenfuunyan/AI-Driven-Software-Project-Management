from datetime import datetime
from typing import Optional

from sqlalchemy import desc
from sqlmodel import Session, select

from ..core.security import hash_password, verify_password
from ..models import (
    Comment,
    Epic,
    Feature,
    Forecast,
    Notification,
    Project,
    ProjectMember,
    Release,
    Risk,
    Sprint,
    Task,
    TaskHistory,
    User,
    UserStory,
)
from ..schemas import (
    CommentCreate,
    EpicCreate,
    FeatureCreate,
    ProjectCreate,
    ProjectUpdate,
    ReleaseCreate,
    RiskCreate,
    SprintCreate,
    SprintUpdate,
    TaskCreate,
    TaskUpdate,
    UserRegister,
    UserStoryCreate,
    UserStoryUpdate,
)


def get_user_by_username(session: Session, username: str) -> Optional[User]:
    return session.exec(select(User).where(User.username == username, User.deleted_at.is_(None))).first()


def create_user(session: Session, data: UserRegister) -> User:
    user = User(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
    user = get_user_by_username(session, username)
    if user and verify_password(password, user.hashed_password):
        return user
    return None


def list_users(session: Session) -> list[User]:
    return session.exec(select(User).where(User.deleted_at.is_(None))).all()


# Projects
def create_project(session: Session, data: ProjectCreate, owner_id: int) -> Project:
    project = Project(name=data.name, description=data.description, status=data.status, owner_id=owner_id)
    session.add(project)
    session.commit()
    session.refresh(project)
    session.add(ProjectMember(project_id=project.id, user_id=owner_id, role="pm"))
    session.commit()
    return project


def list_projects(session: Session) -> list[Project]:
    return session.exec(select(Project).where(Project.deleted_at.is_(None))).all()


def get_project(session: Session, project_id: int) -> Optional[Project]:
    p = session.get(Project, project_id)
    return p if p and not p.deleted_at else None


def update_project(session: Session, project: Project, data: ProjectUpdate) -> Project:
    for field, value in data.dict(exclude_unset=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.utcnow()
    project.version += 1
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def soft_delete_project(session: Session, project: Project) -> None:
    project.deleted_at = datetime.utcnow()
    session.add(project)
    session.commit()


def add_project_member(session: Session, project_id: int, user_id: int, role: str) -> ProjectMember:
    member = ProjectMember(project_id=project_id, user_id=user_id, role=role)
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


def list_project_members(session: Session, project_id: int) -> list[ProjectMember]:
    return session.exec(select(ProjectMember).where(ProjectMember.project_id == project_id)).all()


# Epics & Features
def create_epic(session: Session, project_id: int, data: EpicCreate) -> Epic:
    epic = Epic(project_id=project_id, **data.dict())
    session.add(epic)
    session.commit()
    session.refresh(epic)
    return epic


def list_epics(session: Session, project_id: int) -> list[Epic]:
    return session.exec(select(Epic).where(Epic.project_id == project_id, Epic.deleted_at.is_(None))).all()


def create_feature(session: Session, epic_id: int, data: FeatureCreate) -> Feature:
    feature = Feature(epic_id=epic_id, **data.dict())
    session.add(feature)
    session.commit()
    session.refresh(feature)
    return feature


def list_features(session: Session, epic_id: int) -> list[Feature]:
    return session.exec(select(Feature).where(Feature.epic_id == epic_id, Feature.deleted_at.is_(None))).all()


# Stories
def create_story(session: Session, project_id: int, data: UserStoryCreate) -> UserStory:
    story = UserStory(project_id=project_id, **data.dict())
    session.add(story)
    session.commit()
    session.refresh(story)
    return story


def list_stories(session: Session, project_id: int, sprint_id: Optional[int] = None) -> list[UserStory]:
    q = select(UserStory).where(UserStory.project_id == project_id, UserStory.deleted_at.is_(None))
    if sprint_id is not None:
        q = q.where(UserStory.sprint_id == sprint_id)
    return session.exec(q).all()


def update_story(session: Session, story: UserStory, data: UserStoryUpdate) -> UserStory:
    for field, value in data.dict(exclude_unset=True).items():
        setattr(story, field, value)
    session.add(story)
    session.commit()
    session.refresh(story)
    return story


# Sprints
def create_sprint(session: Session, project_id: int, data: SprintCreate) -> Sprint:
    sprint = Sprint(project_id=project_id, **data.dict())
    session.add(sprint)
    session.commit()
    session.refresh(sprint)
    return sprint


def list_sprints(session: Session, project_id: int) -> list[Sprint]:
    return session.exec(select(Sprint).where(Sprint.project_id == project_id, Sprint.deleted_at.is_(None))).all()


def update_sprint(session: Session, sprint: Sprint, data: SprintUpdate) -> Sprint:
    for field, value in data.dict(exclude_unset=True).items():
        setattr(sprint, field, value)
    session.add(sprint)
    session.commit()
    session.refresh(sprint)
    return sprint


# Tasks
def create_task(session: Session, project_id: int, data: TaskCreate) -> Task:
    task = Task(project_id=project_id, **data.dict())
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def list_tasks(session: Session, project_id: Optional[int] = None, sprint_id: Optional[int] = None) -> list[Task]:
    q = select(Task).where(Task.deleted_at.is_(None))
    if project_id:
        q = q.where(Task.project_id == project_id)
    if sprint_id:
        q = q.where(Task.sprint_id == sprint_id)
    return session.exec(q).all()


def update_task(session: Session, task: Task, data: TaskUpdate, user_id: Optional[int] = None) -> Task:
    changes = data.dict(exclude_unset=True)
    for field, new_val in changes.items():
        old_val = getattr(task, field)
        if old_val != new_val:
            session.add(
                TaskHistory(
                    task_id=task.id,
                    user_id=user_id,
                    field_name=field,
                    old_value=str(old_val) if old_val is not None else None,
                    new_value=str(new_val) if new_val is not None else None,
                )
            )
        setattr(task, field, new_val)
    task.updated_at = datetime.utcnow()
    task.version += 1
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


# Risks
def create_risk(session: Session, project_id: int, data: RiskCreate, detected_by_ai: bool = False) -> Risk:
    score = data.probability * data.impact
    risk = Risk(
        project_id=project_id,
        title=data.title,
        description=data.description,
        category=data.category,
        probability=data.probability,
        impact=data.impact,
        score=score,
        mitigation=data.mitigation,
        detected_by_ai=detected_by_ai,
    )
    session.add(risk)
    session.commit()
    session.refresh(risk)
    return risk


def list_risks(session: Session, project_id: int) -> list[Risk]:
    return session.exec(select(Risk).where(Risk.project_id == project_id, Risk.deleted_at.is_(None))).all()


def update_risk(session: Session, risk: Risk, data) -> Risk:
    changes = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else data.dict(exclude_unset=True)
    for field, new_val in changes.items():
        setattr(risk, field, new_val)
    if "probability" in changes or "impact" in changes:
        risk.score = risk.probability * risk.impact
    session.add(risk)
    session.commit()
    session.refresh(risk)
    return risk


# Forecasts
def create_forecast(session: Session, project_id: int, forecast_type: str, value: float, confidence: float, details: str, sprint_id: Optional[int] = None) -> Forecast:
    fc = Forecast(
        project_id=project_id,
        sprint_id=sprint_id,
        forecast_type=forecast_type,
        predicted_value=value,
        confidence=confidence,
        details=details,
    )
    session.add(fc)
    session.commit()
    session.refresh(fc)
    return fc


def list_forecasts(session: Session, project_id: int) -> list[Forecast]:
    return session.exec(select(Forecast).where(Forecast.project_id == project_id)).all()


# Comments
def create_comment(session: Session, user_id: int, data: CommentCreate) -> Comment:
    comment = Comment(user_id=user_id, **data.dict())
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


def list_comments(session: Session, entity_type: str, entity_id: int) -> list[Comment]:
    return session.exec(
        select(Comment).where(
            Comment.entity_type == entity_type,
            Comment.entity_id == entity_id,
            Comment.deleted_at.is_(None),
        )
    ).all()


# Notifications
def create_notification(session: Session, user_id: int, title: str, message: str, link: Optional[str] = None) -> Notification:
    n = Notification(user_id=user_id, title=title, message=message, link=link)
    session.add(n)
    session.commit()
    session.refresh(n)
    return n


def list_notifications(session: Session, user_id: int) -> list[Notification]:
    return session.exec(
        select(Notification).where(Notification.user_id == user_id).order_by(desc(Notification.created_at))
    ).all()


def mark_notification_read(session: Session, notification: Notification) -> Notification:
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


# Releases
def create_release(session: Session, project_id: int, data: ReleaseCreate) -> Release:
    release = Release(project_id=project_id, **data.dict())
    session.add(release)
    session.commit()
    session.refresh(release)
    return release


def list_releases(session: Session, project_id: int) -> list[Release]:
    return session.exec(select(Release).where(Release.project_id == project_id)).all()
