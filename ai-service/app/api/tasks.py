from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from ..core.dependencies import require_permission
from ..db import get_session
from ..models import Task
from ..schemas import TaskCreate, TaskRead, TaskUpdate
from ..services import crud

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/projects/{project_id}", response_model=TaskRead)
def create_task(
    project_id: int,
    data: TaskCreate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("task:write")),
):
    if not crud.get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.create_task(session, project_id, data)


@router.get("/", response_model=list[TaskRead])
def list_tasks(
    project_id: int | None = Query(default=None),
    sprint_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
    user=Depends(require_permission("task:read")),
):
    return crud.list_tasks(session, project_id, sprint_id)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    data: TaskUpdate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("task:write")),
):
    task = session.get(Task, task_id)
    if not task or task.deleted_at:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.update_task(session, task, data, user.id)


@router.get("/{task_id}/history")
def task_history(task_id: int, session: Session = Depends(get_session), user=Depends(require_permission("task:read"))):
    from sqlmodel import select
    from ..models import TaskHistory

    rows = session.exec(select(TaskHistory).where(TaskHistory.task_id == task_id)).all()
    return rows
