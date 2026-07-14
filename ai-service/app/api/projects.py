from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..core.dependencies import get_current_user, require_permission, require_project_access
from ..db import get_session, log_audit
from ..schemas import (
    EpicCreate,
    EpicRead,
    FeatureCreate,
    FeatureRead,
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberRead,
    ProjectRead,
    ProjectUpdate,
    ReleaseCreate,
    ReleaseRead,
)
from ..services import crud

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectRead)
def create_project(
    data: ProjectCreate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("project:write")),
):
    project = crud.create_project(session, data, user.id)
    log_audit(session, "create", "project", project.id, user.id, {"name": project.name})
    return project


@router.get("/", response_model=list[ProjectRead])
def list_projects(session: Session = Depends(get_session), user=Depends(require_permission("project:read"))):
    return crud.list_projects(session)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, session: Session = Depends(get_session), user=Depends(require_project_access("project:read"))):
    project = crud.get_project(session, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("project:write")),
):
    project = crud.get_project(session, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.update_project(session, project, data)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_permission("project:write")),
):
    project = crud.get_project(session, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    crud.soft_delete_project(session, project)
    return {"ok": True}


@router.post("/{project_id}/members", response_model=ProjectMemberRead)
def add_member(
    project_id: int,
    data: ProjectMemberCreate,
    session: Session = Depends(get_session),
    user=Depends(require_project_access("project:write")),
):
    if not crud.get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.add_project_member(session, project_id, data.user_id, data.role)


@router.get("/{project_id}/members", response_model=list[ProjectMemberRead])
def list_members(project_id: int, session: Session = Depends(get_session), user=Depends(require_project_access("project:read"))):
    return crud.list_project_members(session, project_id)


@router.post("/{project_id}/epics", response_model=EpicRead)
def create_epic(
    project_id: int,
    data: EpicCreate,
    session: Session = Depends(get_session),
    user=Depends(require_project_access("project:write")),
):
    if not crud.get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.create_epic(session, project_id, data)


@router.get("/{project_id}/epics", response_model=list[EpicRead])
def list_epics(project_id: int, session: Session = Depends(get_session), user=Depends(require_project_access("project:read"))):
    return crud.list_epics(session, project_id)


@router.post("/epics/{epic_id}/features", response_model=FeatureRead)
def create_feature(
    epic_id: int,
    data: FeatureCreate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("project:write")),
):
    return crud.create_feature(session, epic_id, data)


@router.get("/epics/{epic_id}/features", response_model=list[FeatureRead])
def list_features(epic_id: int, session: Session = Depends(get_session), user=Depends(require_permission("project:read"))):
    return crud.list_features(session, epic_id)


@router.post("/{project_id}/releases", response_model=ReleaseRead)
def create_release(
    project_id: int,
    data: ReleaseCreate,
    session: Session = Depends(get_session),
    user=Depends(require_project_access("project:write")),
):
    if not crud.get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.create_release(session, project_id, data)


@router.get("/{project_id}/releases", response_model=list[ReleaseRead])
def list_releases(project_id: int, session: Session = Depends(get_session), user=Depends(require_project_access("project:read"))):
    return crud.list_releases(session, project_id)
