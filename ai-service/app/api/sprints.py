from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..core.dependencies import require_permission
from ..db import get_session
from ..models import Sprint
from ..schemas import SprintCreate, SprintRead, SprintUpdate
from ..services import crud

router = APIRouter(prefix="/sprints", tags=["sprints"])


@router.post("/projects/{project_id}", response_model=SprintRead)
def create_sprint(
    project_id: int,
    data: SprintCreate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("sprint:write")),
):
    if not crud.get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.create_sprint(session, project_id, data)


@router.get("/projects/{project_id}", response_model=list[SprintRead])
def list_sprints(
    project_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_permission("sprint:read")),
):
    return crud.list_sprints(session, project_id)


@router.patch("/{sprint_id}", response_model=SprintRead)
def update_sprint(
    sprint_id: int,
    data: SprintUpdate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("sprint:write")),
):
    sprint = session.get(Sprint, sprint_id)
    if not sprint or sprint.deleted_at:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return crud.update_sprint(session, sprint, data)
