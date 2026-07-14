from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from ..core.dependencies import require_permission
from ..db import get_session
from ..models import UserStory
from ..schemas import UserStoryCreate, UserStoryRead, UserStoryUpdate
from ..services import crud

router = APIRouter(prefix="/stories", tags=["stories"])


@router.post("/projects/{project_id}", response_model=UserStoryRead)
def create_story(
    project_id: int,
    data: UserStoryCreate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("story:write")),
):
    if not crud.get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.create_story(session, project_id, data)


@router.get("/projects/{project_id}", response_model=list[UserStoryRead])
def list_stories(
    project_id: int,
    sprint_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
    user=Depends(require_permission("story:read")),
):
    return crud.list_stories(session, project_id, sprint_id)


@router.patch("/{story_id}", response_model=UserStoryRead)
def update_story(
    story_id: int,
    data: UserStoryUpdate,
    session: Session = Depends(get_session),
    user=Depends(require_permission("story:write")),
):
    story = session.get(UserStory, story_id)
    if not story or story.deleted_at:
        raise HTTPException(status_code=404, detail="Story not found")
    return crud.update_story(session, story, data)
