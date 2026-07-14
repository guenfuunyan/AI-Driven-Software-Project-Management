from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from ..db import get_session
from ..models import Project, ProjectMember, User
from .security import safe_decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

ROLE_PERMISSIONS = {
    "admin": {"*"},
    "pm": {
        "project:read", "project:write", "sprint:read", "sprint:write",
        "story:read", "story:write", "task:read", "task:write",
        "risk:read", "risk:write", "forecast:read", "ai:use", "report:read", "user:read",
    },
    "developer": {
        "project:read", "sprint:read", "story:read", "task:read", "task:write",
        "comment:write", "ai:use", "risk:read", "forecast:read", "report:read",
    },
    "viewer": {"project:read", "sprint:read", "story:read", "task:read", "report:read"},
}


def _has_permission(user: User, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(user.role, set())
    return "*" in perms or permission in perms


def _is_project_member(session: Session, project_id: int, user_id: int) -> bool:
    member = session.exec(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
    ).first()
    return bool(member)


def can_access_project(session: Session, user: User, project_id: int, permission: str) -> bool:
    if user.role == "admin":
        return True
    if not _has_permission(user, permission):
        return False
    project = session.get(Project, project_id)
    if not project or project.deleted_at:
        return False
    if user.role == "pm":
        return project.owner_id == user.id or _is_project_member(session, project_id, user.id)
    return _is_project_member(session, project_id, user.id)


def require_project_access(permission: str):
    def checker(project_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> User:
        if not can_access_project(session, user, project_id, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return checker


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    payload = safe_decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = session.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
    token_role = payload.get("role")
    if token_role and token_role != user.role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return user


def require_permission(permission: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if not _has_permission(user, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return checker


def get_optional_user(
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)),
    session: Session = Depends(get_session),
) -> User | None:
    if not token:
        return None
    payload = safe_decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return session.get(User, int(user_id))
