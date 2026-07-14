from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..core.dependencies import require_permission
from ..db import get_session
from ..models import Risk
from ..schemas import RiskCreate, RiskRead, RiskUpdate
from ..services import crud

router = APIRouter(prefix="/risks", tags=["risks"])


@router.post("/projects/{project_id}", response_model=RiskRead)
def create_risk(
    project_id: int,
    data: RiskCreate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("risk:write")),
):
    if not crud.get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.create_risk(session, project_id, data)


@router.get("/projects/{project_id}", response_model=list[RiskRead])
def list_risks(
    project_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_permission("project:read")),
):
    return crud.list_risks(session, project_id)


@router.patch("/{risk_id}", response_model=RiskRead)
def update_risk(
    risk_id: int,
    data: RiskUpdate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("risk:write")),
):
    risk = session.get(Risk, risk_id)
    if not risk or risk.deleted_at:
        raise HTTPException(status_code=404, detail="Risk not found")
    return crud.update_risk(session, risk, data)
