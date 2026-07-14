from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import List

from ..core.dependencies import get_current_user, require_permission
from ..core.security import create_access_token, create_refresh_token, safe_decode_token
from ..db import get_session
from ..models import User
from ..schemas import RefreshRequest, TokenResponse, UserRead, UserRegister, UserUpdate
from ..services import crud

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
def register(data: UserRegister, session: Session = Depends(get_session)):
    if crud.get_user_by_username(session, data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    return crud.create_user(session, data)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = crud.authenticate_user(session, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(str(user.id), {"role": user.role}),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, session: Session = Depends(get_session)):
    payload = safe_decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = session.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return TokenResponse(
        access_token=create_access_token(str(user.id), {"role": user.role}),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.get("/me", response_model=UserRead)
def me(user=Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserRead)
def update_me(data: UserUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    updates = data.model_dump(exclude_unset=True) if hasattr(data, "model_dump") else data.dict(exclude_unset=True)
    for key, value in updates.items():
        if key in {"full_name", "email"}:
            setattr(user, key, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.get("/users", response_model=List[UserRead])
def get_users(session: Session = Depends(get_session), user=Depends(require_permission("user:read"))):
    return session.exec(select(User)).all()
