from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..core.dependencies import require_permission
from ..db import get_session
from ..schemas import ForecastRead
from ..services import crud

router = APIRouter(prefix="/forecasts", tags=["forecasts"])


@router.get("/projects/{project_id}", response_model=list[ForecastRead])
def list_forecasts(
    project_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_permission("forecast:read")),
):
    return crud.list_forecasts(session, project_id)
