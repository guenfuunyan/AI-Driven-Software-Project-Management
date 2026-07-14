from datetime import datetime, timedelta

from sqlmodel import Session, func, select

from ..models import AIJob, Forecast, Project, Risk, Sprint, Task
from ..schemas import BurndownPoint, DashboardStats, VelocityPoint


def get_dashboard_stats(session: Session) -> DashboardStats:
    projects = session.exec(select(func.count(Project.id)).where(Project.deleted_at.is_(None))).one()
    active_sprints = session.exec(
        select(func.count(Sprint.id)).where(Sprint.deleted_at.is_(None), Sprint.status == "active")
    ).one()
    open_tasks = session.exec(
        select(func.count(Task.id)).where(Task.deleted_at.is_(None), Task.status != "done")
    ).one()
    completed_tasks = session.exec(
        select(func.count(Task.id)).where(Task.deleted_at.is_(None), Task.status == "done")
    ).one()
    open_risks = session.exec(
        select(func.count(Risk.id)).where(Risk.deleted_at.is_(None), Risk.status == "open")
    ).one()
    today = datetime.utcnow().date()
    ai_jobs_today = session.exec(
        select(func.count(AIJob.id)).where(func.date(AIJob.created_at) == today)
    ).one()

    done_points = session.exec(
        select(func.coalesce(func.sum(Task.story_points), 0)).where(
            Task.deleted_at.is_(None), Task.status == "done"
        )
    ).one()
    sprint_count = session.exec(
        select(func.count(Sprint.id)).where(Sprint.deleted_at.is_(None))
    ).one()
    velocity_avg = float(done_points) / max(sprint_count, 1)

    return DashboardStats(
        total_projects=projects or 0,
        active_sprints=active_sprints or 0,
        open_tasks=open_tasks or 0,
        completed_tasks=completed_tasks or 0,
        open_risks=open_risks or 0,
        ai_jobs_today=ai_jobs_today or 0,
        velocity_avg=round(velocity_avg, 1),
    )


def get_burndown(session: Session, sprint_id: int) -> list[BurndownPoint]:
    sprint = session.get(Sprint, sprint_id)
    if not sprint:
        return []
    tasks = session.exec(
        select(Task).where(Task.sprint_id == sprint_id, Task.deleted_at.is_(None))
    ).all()
    total = sum(t.story_points or 1 for t in tasks) or 10
    days = 10
    if sprint.start_date and sprint.end_date:
        days = max((sprint.end_date - sprint.start_date).days, 1)
    done = sum(t.story_points or 1 for t in tasks if t.status == "done")
    remaining = total - done
    points = []
    for i in range(days + 1):
        ideal = total - (total / days) * i
        rem = remaining + (done * (1 - i / days)) if days else remaining
        date = (sprint.start_date or datetime.utcnow()) + timedelta(days=i)
        points.append(
            BurndownPoint(
                date=date.strftime("%Y-%m-%d"),
                remaining_points=round(max(0, rem), 1),
                ideal_points=round(max(0, ideal), 1),
            )
        )
    return points


def get_velocity(session: Session, project_id: int) -> list[VelocityPoint]:
    sprints = session.exec(
        select(Sprint).where(Sprint.project_id == project_id, Sprint.deleted_at.is_(None))
    ).all()
    result = []
    for sprint in sprints:
        tasks = session.exec(
            select(Task).where(Task.sprint_id == sprint.id, Task.status == "done", Task.deleted_at.is_(None))
        ).all()
        points = sum(t.story_points or 0 for t in tasks)
        result.append(VelocityPoint(sprint_name=sprint.name, completed_points=float(points)))
    return result
