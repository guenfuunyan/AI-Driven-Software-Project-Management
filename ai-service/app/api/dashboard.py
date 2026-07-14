from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..core.dependencies import get_current_user, require_permission
from ..db import get_session
from ..schemas import BurndownPoint, CommentCreate, CommentRead, DashboardStats, NotificationRead, VelocityPoint
from ..services import crud, reports

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(session: Session = Depends(get_session), user=Depends(require_permission("report:read"))):
    return reports.get_dashboard_stats(session)


@router.get("/dashboard/burndown/{sprint_id}", response_model=list[BurndownPoint])
def burndown(sprint_id: int, session: Session = Depends(get_session), user=Depends(require_permission("report:read"))):
    return reports.get_burndown(session, sprint_id)


@router.get("/dashboard/velocity/{project_id}", response_model=list[VelocityPoint])
def velocity(project_id: int, session: Session = Depends(get_session), user=Depends(require_permission("report:read"))):
    return reports.get_velocity(session, project_id)


@router.post("/comments", response_model=CommentRead)
def add_comment(
    data: CommentCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    return crud.create_comment(session, user.id, data)


@router.get("/comments/{entity_type}/{entity_id}", response_model=list[CommentRead])
def list_comments(entity_type: str, entity_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    return crud.list_comments(session, entity_type, entity_id)


@router.get("/notifications", response_model=list[NotificationRead])
def notifications(session: Session = Depends(get_session), user=Depends(get_current_user)):
    return crud.list_notifications(session, user.id)


@router.patch("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_read(notification_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    from ..models import Notification

    n = session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Notification not found")
    return crud.mark_notification_read(session, n)
