from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlmodel import Session, select

from ..core.dependencies import require_permission
from ..db import get_session
from ..models import AIAgent, AIJob, Task
from ..schemas import (
    AIAgentRead,
    AIJobRead,
    AnalyzeRequest,
    AssignRequest,
    BreakdownRequest,
    DocumentationRequest,
    ForecastRequest,
    ReviewRequest,
    RiskCreate,
    RiskDetectRequest,
    StoryPointRequest,
    TaskUpdate,
)
from ..services import ai_service, crud

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/agents", response_model=list[AIAgentRead])
def list_agents(session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    return session.exec(select(AIAgent).where(AIAgent.is_active == True)).all()


@router.get("/jobs", response_model=list[AIJobRead])
def list_jobs(session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    return session.exec(select(AIJob).order_by(desc(AIJob.created_at)).limit(50)).all()


@router.post("/analyze")
async def analyze(req: AnalyzeRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    return await ai_service.analyze_requirement(session, req.text, user.id, req.project_id)


@router.post("/breakdown")
async def breakdown(req: BreakdownRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    return await ai_service.breakdown_story(session, req.user_story, user.id, req.project_id)


@router.post("/story-point")
async def story_point(req: StoryPointRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    return await ai_service.estimate_story_points(session, req.user_story, user.id, req.project_id)


@router.post("/forecast")
async def forecast(req: ForecastRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    sprint_data = ai_service.gather_sprint_data(session, req.project_id, req.sprint_id)
    result = await ai_service.forecast_project(session, req.project_id, sprint_data, user.id)
    crud.create_forecast(
        session,
        req.project_id,
        "velocity",
        float(result.get("predicted_velocity", 0)),
        float(result.get("completion_probability", 0.75)),
        str(result.get("burndown_notes", "")),
        req.sprint_id,
    )
    return result


@router.post("/risk")
async def detect_risk(req: RiskDetectRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    project = crud.get_project(session, req.project_id)
    context = req.context or f"Project: {project.name if project else req.project_id}"
    result = await ai_service.detect_risks(session, req.project_id, context, user.id)
    for risk in result.get("risks", []):
        crud.create_risk(
            session,
            req.project_id,
            RiskCreate(
                title=risk.get("title", "AI Risk"),
                description=risk.get("description"),
                category=risk.get("category", "technical"),
                probability=float(risk.get("probability", 0.5)),
                impact=float(risk.get("impact", 0.5)),
                mitigation=risk.get("mitigation"),
            ),
            detected_by_ai=True,
        )
    return result


@router.post("/assign")
async def assign(req: AssignRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    result = await ai_service.suggest_assignments(session, req.project_id, req.task_ids, user.id)
    applied = []
    for assignment in result.get("assignments", []):
        task_id = assignment.get("task_id")
        assignee_id = assignment.get("assignee_id")
        if not task_id or not assignee_id:
            continue
        task = session.get(Task, task_id)
        if not task or task.deleted_at or task.project_id != req.project_id:
            continue
        crud.update_task(session, task, TaskUpdate(assignee_id=assignee_id), user.id)
        applied.append({"task_id": task_id, "assignee_id": assignee_id})
    result["applied"] = applied
    return result


@router.post("/review")
async def review(req: ReviewRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    return await ai_service.review_content(session, req.content, user.id, req.project_id)


@router.post("/documentation")
async def documentation(req: DocumentationRequest, session: Session = Depends(get_session), user=Depends(require_permission("ai:use"))):
    return await ai_service.generate_documentation(session, req.topic, user.id, req.project_id)
