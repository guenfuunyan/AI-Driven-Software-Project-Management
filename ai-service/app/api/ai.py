from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlmodel import Session, select

from ..core.dependencies import require_permission
from ..db import get_session
from ..models import (
    AIAgent,
    AIJob,
    AgentActionRecord,
    AgentDeliberation,
    AgentThought,
    DeliberationResolution,
    Task,
)
from ..schemas import (
    AIAgentRead,
    AIJobRead,
    AgentActionExecuteRequest,
    AgentActionRecordRead,
    AgentRollbackRequest,
    AnalyzeRequest,
    AssignRequest,
    BreakdownRequest,
    DeliberateRequest,
    DeliberationRead,
    DeliberationResponse,
    DocumentationRequest,
    ForecastRequest,
    ResolveHITLRequest,
    ReviewRequest,
    RiskCreate,
    RiskDetectRequest,
    StoryPointRequest,
    TaskUpdate,
)
from ..services import agent_runtime, ai_service, crud, orchestration_service

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


# ==============================================================================
# AUTONOMOUS MULTI-AGENT DELIBERATION & CONFLICT RESOLUTION ENDPOINTS
# ==============================================================================
@router.post("/deliberate", response_model=DeliberationResponse)
async def deliberate(
    req: DeliberateRequest,
    session: Session = Depends(get_session),
    user=Depends(require_permission("ai:use")),
):
    """
    Coordinates 3 Autonomous Reasoning Agents (PO, Tech Lead, Scrum Master),
    detects conflicts in scope, effort, and risk, and formulates a consensus compromise.
    """
    return await orchestration_service.execute_multi_agent_deliberation(
        session=session,
        user_story=req.user_story,
        project_id=req.project_id,
        sprint_id=req.sprint_id,
        acceptance_criteria=req.acceptance_criteria,
        context=req.context,
        user_id=user.id,
    )


@router.post("/deliberate/{deliberation_id}/resolve-hitl")
def resolve_hitl(
    deliberation_id: int,
    req: ResolveHITLRequest,
    session: Session = Depends(get_session),
    user=Depends(require_permission("ai:use")),
):
    """Applies a human PM decision to resolve a severe deliberation conflict (HITL protocol)."""
    try:
        return orchestration_service.resolve_hitl_decision(
            session=session,
            deliberation_id=deliberation_id,
            selected_option=req.selected_option,
            custom_notes=req.custom_notes,
            user_id=user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/deliberations", response_model=list[DeliberationRead])
def list_deliberations(
    project_id: int | None = None,
    session: Session = Depends(get_session),
    user=Depends(require_permission("ai:use")),
):
    """Retrieves recent multi-agent deliberation sessions."""
    stmt = select(AgentDeliberation)
    if project_id:
        stmt = stmt.where(AgentDeliberation.project_id == project_id)
    stmt = stmt.order_by(desc(AgentDeliberation.created_at)).limit(30)
    return session.exec(stmt).all()


@router.get("/deliberations/{deliberation_id}")
def get_deliberation(
    deliberation_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_permission("ai:use")),
):
    """Retrieves full deliberation details, including thoughts of each autonomous agent."""
    delib = session.get(AgentDeliberation, deliberation_id)
    if not delib:
        raise HTTPException(status_code=404, detail="Deliberation not found")
    
    thoughts = session.exec(
        select(AgentThought).where(AgentThought.deliberation_id == deliberation_id)
    ).all()
    
    resolutions = session.exec(
        select(DeliberationResolution).where(DeliberationResolution.deliberation_id == deliberation_id)
    ).all()

    return {
        "deliberation": delib,
        "thoughts": thoughts,
        "resolutions": resolutions,
    }


# ==============================================================================
# AUTONOMOUS AGENT ACTIONS EXECUTION & ROLLBACK ENDPOINTS (HITL / HOOL Protocols)
# ==============================================================================
@router.get("/actions", response_model=list[AgentActionRecordRead])
def list_agent_actions(
    project_id: int | None = None,
    agent_type: str | None = None,
    status: str | None = None,
    session: Session = Depends(get_session),
    user=Depends(require_permission("ai:use")),
):
    """Lists recent autonomous actions proposed or executed by AI Agents."""
    stmt = select(AgentActionRecord)
    if project_id:
        stmt = stmt.where(AgentActionRecord.project_id == project_id)
    if agent_type:
        stmt = stmt.where(AgentActionRecord.agent_type == agent_type)
    if status:
        stmt = stmt.where(AgentActionRecord.status == status)
    stmt = stmt.order_by(desc(AgentActionRecord.created_at)).limit(50)
    return session.exec(stmt).all()


@router.post("/actions/{action_id}/execute")
def execute_agent_action(
    action_id: int,
    req: AgentActionExecuteRequest | None = None,
    session: Session = Depends(get_session),
    user=Depends(require_permission("ai:use")),
):
    """
    Executes a proposed autonomous action (HITL Approval protocol).
    Commits proposed items (e.g. Subtasks, Assignments, Points) directly to the database.
    """
    try:
        custom_notes = req.custom_notes if req else None
        return agent_runtime.execute_autonomous_action(
            session=session,
            action_record_id=action_id,
            user_id=user.id,
            custom_notes=custom_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi thực thi hành động Agent: {str(e)}")


@router.post("/actions/{action_id}/rollback")
def rollback_agent_action(
    action_id: int,
    session: Session = Depends(get_session),
    user=Depends(require_permission("ai:use")),
):
    """
    Rolls back an executed action using its snapshot (HOOL Rollback protocol).
    Safely undoes created tasks, assignments, or risks.
    """
    try:
        return agent_runtime.rollback_autonomous_action(
            session=session,
            action_record_id=action_id,
            user_id=user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi hoàn tác hành động Agent: {str(e)}")


