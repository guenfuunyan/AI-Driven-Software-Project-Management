import json
from datetime import datetime
from typing import Any, Optional

from sqlmodel import Session, select

from ..config import get_settings
from ..models import (
    AIAgent,
    AgentActionRecord,
    AIJob,
    AIUsage,
    Project,
    ProjectMember,
    PromptHistory,
    Risk,
    Sprint,
    Task,
    User,
    UserStory,
)

settings = get_settings()


# ==============================================================================
# 1. AGENT PERSONAS & METADATA
# ==============================================================================
AGENT_PERSONAS: dict[str, dict[str, Any]] = {
    "requirement": {
        "name": "Requirement Engineering Agent",
        "role_title": "Agile Business Analyst & Requirements Architect",
        "description": "Chuyên gia thẩm định yêu cầu, chuẩn hóa INVEST, sinh tiêu chí nghiệm thu (Given-When-Then) và phát hiện thiếu sót phạm vi.",
        "avatar": "brain",
        "base_automation": 0.65,
    },
    "task": {
        "name": "Task Decomposition Agent",
        "role_title": "Full-Stack System Decomposition Specialist",
        "description": "Kỹ sư phân rã kỹ thuật, tự động chia nhỏ User Story thành các Subtasks chuyên môn (Frontend, Backend, DB, QA) kèm ước tính giờ và rủi ro.",
        "avatar": "list-tree",
        "base_automation": 0.75,
    },
    "planning": {
        "name": "Story Point Estimation Agent",
        "role_title": "Agile Planning & Estimation Specialist",
        "description": "Chuyên gia ước lượng điểm Fibonacci, đối chiếu với vận tốc lịch sử thực tế của nhóm để đảm bảo cam kết Sprint an toàn.",
        "avatar": "scale",
        "base_automation": 0.55,
    },
    "risk": {
        "name": "Risk Sentinel Agent",
        "role_title": "Continuous Project Risk & Bottleneck Auditor",
        "description": "Đặc vụ phát hiện rủi ro chủ động, quét liên tục tiến độ Sprint, nợ kỹ thuật và độ lệch tải để đề xuất kế hoạch giảm thiểu.",
        "avatar": "shield-alert",
        "base_automation": 0.50,
    },
    "forecast": {
        "name": "Predictive Forecast Agent",
        "role_title": "Project Delivery Analytics & Monte-Carlo Modeler",
        "description": "Nhà phân tích tiến độ, dự báo đường cong Burndown, xác suất về đích đúng hạn và cảnh báo nguy cơ vỡ tiến độ.",
        "avatar": "trending-up",
        "base_automation": 0.70,
    },
    "assignment": {
        "name": "Workload Balancing Agent",
        "role_title": "Resource Optimization & Task Allocation Coordinator",
        "description": "Điều phối viên tối ưu hóa phân công, cân bằng khối lượng công việc giữa các lập trình viên nhằm phòng tránh quá tải và trễ deadline.",
        "avatar": "user-check",
        "base_automation": 0.60,
    },
}


# ==============================================================================
# 2. AGENT ENVIRONMENT TOOLS (Database Perception & Inspection)
# ==============================================================================
def tool_inspect_project(session: Session, project_id: Optional[int]) -> dict[str, Any]:
    """Agent tool: Retrieves comprehensive real-time context of a project."""
    if not project_id:
        return {"project_found": False, "project_name": "General Backlog", "members_count": 0}
    
    proj = session.get(Project, project_id)
    if not proj:
        return {"project_found": False, "project_id": project_id}
        
    members = session.exec(
        select(User).join(ProjectMember, ProjectMember.user_id == User.id).where(ProjectMember.project_id == project_id)
    ).all()
    
    stories = session.exec(select(UserStory).where(UserStory.project_id == project_id)).all()
    tasks = session.exec(select(Task).where(Task.project_id == project_id, Task.deleted_at.is_(None))).all()
    risks = session.exec(select(Risk).where(Risk.project_id == project_id)).all()
    
    return {
        "project_found": True,
        "project_id": proj.id,
        "project_name": proj.name,
        "description": proj.description or "",
        "members_count": len(members),
        "members": [{"id": m.id, "username": m.username, "role": m.role} for m in members],
        "total_stories": len(stories),
        "total_tasks": len(tasks),
        "active_risks_count": len(risks),
    }


def tool_inspect_sprint_backlog(session: Session, project_id: Optional[int], sprint_id: Optional[int]) -> dict[str, Any]:
    """Agent tool: Inspects sprint goal, velocity, committed tasks, and progress."""
    q_sprint = select(Sprint)
    if sprint_id:
        q_sprint = q_sprint.where(Sprint.id == sprint_id)
    elif project_id:
        q_sprint = q_sprint.where(Sprint.project_id == project_id).order_by(Sprint.id.desc())
        
    sprint = session.exec(q_sprint).first()
    if not sprint:
        return {"sprint_found": False, "message": "Không tìm thấy Sprint hiện hành trong phạm vi dự án."}
        
    tasks = session.exec(
        select(Task).where(Task.sprint_id == sprint.id, Task.deleted_at.is_(None))
    ).all()
    
    total_points = sum(t.story_points or 0 for t in tasks)
    completed_points = sum(t.story_points or 0 for t in tasks if t.status == "done")
    open_tasks = [t for t in tasks if t.status != "done"]
    
    return {
        "sprint_found": True,
        "sprint_id": sprint.id,
        "sprint_name": sprint.name,
        "sprint_goal": sprint.goal or "N/A",
        "status": sprint.status,
        "total_story_points": total_points,
        "completed_points": completed_points,
        "remaining_points": max(0, total_points - completed_points),
        "tasks_total": len(tasks),
        "tasks_open": len(open_tasks),
        "completion_rate_percent": round((completed_points / max(1, total_points)) * 100, 1),
    }


def tool_analyze_team_capacity(session: Session, project_id: Optional[int]) -> list[dict[str, Any]]:
    """Agent tool: Analyzes developer workloads and bottlenecks."""
    if not project_id:
        users = session.exec(select(User).where(User.role.in_(["developer", "pm"]))).all()
    else:
        users = session.exec(
            select(User).join(ProjectMember, ProjectMember.user_id == User.id).where(ProjectMember.project_id == project_id)
        ).all()
        
    team_data = []
    for u in users:
        active_tasks = session.exec(
            select(Task).where(Task.assignee_id == u.id, Task.status != "done", Task.deleted_at.is_(None))
        ).all()
        task_count = len(active_tasks)
        points_assigned = sum(t.story_points or 0 for t in active_tasks)
        
        status = "AVAILABLE" if task_count <= 2 else "BALANCED" if task_count <= 5 else "OVERLOADED"
        team_data.append({
            "user_id": u.id,
            "username": u.username,
            "full_name": u.full_name or u.username,
            "role": u.role,
            "active_tasks_count": task_count,
            "active_points_assigned": points_assigned,
            "workload_status": status,
        })
    return team_data


def tool_calculate_historical_velocity(session: Session, project_id: Optional[int]) -> dict[str, Any]:
    """Agent tool: Analyzes past sprints and tasks completion velocity."""
    if not project_id:
        return {"average_velocity": 18.0, "reliability_score": 0.85, "data_points": "default"}
        
    sprints = session.exec(select(Sprint).where(Sprint.project_id == project_id)).all()
    completed_points_list = []
    for s in sprints:
        tasks = session.exec(select(Task).where(Task.sprint_id == s.id, Task.status == "done", Task.deleted_at.is_(None))).all()
        pts = sum(t.story_points or 0 for t in tasks)
        if pts > 0:
            completed_points_list.append(pts)
            
    if completed_points_list:
        avg_vel = round(sum(completed_points_list) / len(completed_points_list), 1)
    else:
        avg_vel = 15.0
        
    return {
        "average_velocity": avg_vel,
        "completed_sprints_evaluated": len(completed_points_list),
        "reliability_score": 0.9 if len(completed_points_list) >= 2 else 0.65,
        "recommended_point_buffer": max(3, int(avg_vel * 0.15)),
    }


def tool_inspect_active_risks(session: Session, project_id: Optional[int]) -> list[dict[str, Any]]:
    """Agent tool: Reads existing active risk matrix from database."""
    if not project_id:
        return []
    risks = session.exec(select(Risk).where(Risk.project_id == project_id)).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category,
            "probability": r.probability,
            "impact": r.impact,
            "score": r.score,
            "status": r.status,
            "mitigation": r.mitigation,
        }
        for r in risks
    ]


# ==============================================================================
# 3. AUTONOMOUS ACTIONS EXECUTION & ROLLBACK ENGINE
# ==============================================================================
def execute_autonomous_action(
    session: Session,
    action_record_id: int,
    user_id: Optional[int],
    custom_notes: Optional[str] = None,
) -> dict[str, Any]:
    """
    Executes a proposed autonomous action committed to the database.
    Stores a rollback snapshot for safe restoration.
    """
    record = session.get(AgentActionRecord, action_record_id)
    if not record:
        raise ValueError(f"Không tìm thấy Action Record với ID: {action_record_id}")
    if record.status == "executed":
        return {
            "status": "already_executed",
            "message": "Hành động này đã được thực thi trước đó.",
            "record_id": record.id,
        }

    action_type = record.action_type
    payload = json.loads(record.action_payload) if record.action_payload else {}
    project_id = record.project_id

    execution_result: dict[str, Any] = {}
    rollback_payload: dict[str, Any] = {}

    if action_type == "create_tasks_batch":
        # Create Subtasks into Task Table
        created_tasks = []
        tasks_list = payload.get("tasks", [])
        user_story_id = payload.get("user_story_id")
        sprint_id = payload.get("sprint_id")
        
        for item in tasks_list:
            new_task = Task(
                project_id=project_id,
                user_story_id=user_story_id,
                sprint_id=sprint_id,
                title=item.get("title", "AI Task"),
                description=item.get("description", ""),
                status="todo",
                priority=item.get("priority", 3),
                story_points=item.get("story_points", 2),
                estimated_hours=float(item.get("estimated_hours", 4)),
                automation_level=float(item.get("automation_level", 0.7)),
                risk_level=float(item.get("risk_level", 0.3)),
                ai_cost_estimate=float(item.get("ai_cost_estimate", 0.2)),
                collaboration_mode=item.get("collaboration_mode", "HOTL"),
            )
            session.add(new_task)
            session.flush()
            created_tasks.append(new_task.id)

        session.commit()
        execution_result = {"created_task_ids": created_tasks, "count": len(created_tasks)}
        rollback_payload = {"created_task_ids": created_tasks}

    elif action_type == "assign_tasks":
        # Assign developers to tasks
        assignments = payload.get("assignments", [])
        updated_tasks = []
        old_assignments = []

        for item in assignments:
            tid = item.get("task_id")
            aid = item.get("assignee_id")
            if not tid:
                continue
            t = session.get(Task, tid)
            if t:
                old_assignments.append({"task_id": t.id, "old_assignee_id": t.assignee_id})
                t.assignee_id = aid
                session.add(t)
                updated_tasks.append(t.id)

        session.commit()
        execution_result = {"assigned_task_ids": updated_tasks, "count": len(updated_tasks)}
        rollback_payload = {"old_assignments": old_assignments}

    elif action_type == "update_story_points":
        # Update Story Points on User Story
        story_id = payload.get("user_story_id")
        new_points = payload.get("story_points")
        if story_id and new_points:
            story = session.get(UserStory, story_id)
            if story:
                rollback_payload = {"user_story_id": story.id, "old_points": story.story_points}
                story.story_points = new_points
                session.add(story)
                session.commit()
                execution_result = {"user_story_id": story.id, "new_points": new_points}

    elif action_type == "record_risk":
        # Record a new Risk into database
        risks_list = payload.get("risks", [])
        created_risks = []
        for r_item in risks_list:
            prob = float(r_item.get("probability", 0.5))
            imp = float(r_item.get("impact", 0.5))
            new_risk = Risk(
                project_id=project_id,
                title=r_item.get("title", "AI Identified Risk"),
                description=r_item.get("description", ""),
                category=r_item.get("category", "technical"),
                probability=prob,
                impact=imp,
                score=round(prob * imp, 2),
                status="identified",
                mitigation=r_item.get("mitigation", ""),
            )
            session.add(new_risk)
            session.flush()
            created_risks.append(new_risk.id)
            
        session.commit()
        execution_result = {"created_risk_ids": created_risks, "count": len(created_risks)}
        rollback_payload = {"created_risk_ids": created_risks}

    # Update record state
    record.status = "executed"
    record.executed_at = datetime.utcnow()
    record.execution_result = json.dumps(execution_result, ensure_ascii=False)
    record.rollback_payload = json.dumps(rollback_payload, ensure_ascii=False)
    if custom_notes:
        record.description = f"{record.description or ''} | Notes: {custom_notes}"
    session.add(record)
    session.commit()
    session.refresh(record)

    return {
        "status": "success",
        "action_record_id": record.id,
        "action_type": action_type,
        "execution_result": execution_result,
        "message": f"Hành động tự chủ '{action_type}' đã được thực thi thành công vào CSDL.",
    }


def rollback_autonomous_action(
    session: Session,
    action_record_id: int,
    user_id: Optional[int],
) -> dict[str, Any]:
    """Rolls back an autonomous action, returning the system to its pre-execution state."""
    record = session.get(AgentActionRecord, action_record_id)
    if not record:
        raise ValueError(f"Không tìm thấy Action Record với ID: {action_record_id}")
    if record.status != "executed":
        return {
            "status": "cannot_rollback",
            "message": f"Không thể rollback hành động ở trạng thái '{record.status}'.",
        }

    rollback_data = json.loads(record.rollback_payload) if record.rollback_payload else {}
    action_type = record.action_type

    if action_type == "create_tasks_batch":
        task_ids = rollback_data.get("created_task_ids", [])
        for tid in task_ids:
            task = session.get(Task, tid)
            if task:
                session.delete(task)
        session.commit()

    elif action_type == "assign_tasks":
        old_assignments = rollback_data.get("old_assignments", [])
        for item in old_assignments:
            tid = item.get("task_id")
            old_aid = item.get("old_assignee_id")
            t = session.get(Task, tid)
            if t:
                t.assignee_id = old_aid
                session.add(t)
        session.commit()

    elif action_type == "update_story_points":
        sid = rollback_data.get("user_story_id")
        old_pts = rollback_data.get("old_points")
        if sid:
            story = session.get(UserStory, sid)
            if story:
                story.story_points = old_pts
                session.add(story)
                session.commit()

    elif action_type == "record_risk":
        risk_ids = rollback_data.get("created_risk_ids", [])
        for rid in risk_ids:
            risk = session.get(Risk, rid)
            if risk:
                session.delete(risk)
        session.commit()

    record.status = "rolled_back"
    record.rolled_back_at = datetime.utcnow()
    session.add(record)
    session.commit()

    return {
        "status": "rolled_back",
        "action_record_id": record.id,
        "message": f"Hành động '{action_type}' đã được hoàn tác thành công (Rollback Snapshot applied).",
    }


# ==============================================================================
# 4. AGENTIC EXECUTION DISPATCHER & REASONING ENVELOPE
# ==============================================================================
def build_agent_envelope(
    agent_type: str,
    job_id: int,
    prompt_id: int,
    plan_steps: list[str],
    execution_trace: list[dict[str, Any]],
    governance_mode: str,
    risk_score: float,
    automation_level: float,
    cost_usd: float,
    proposed_actions: list[dict[str, Any]],
    legacy_data: dict[str, Any],
    action_record: Optional[AgentActionRecord] = None,
) -> dict[str, Any]:
    """Wraps agent output into an authoritative Agent Execution Envelope."""
    persona = AGENT_PERSONAS.get(agent_type, {
        "name": f"{agent_type.capitalize()} Agent",
        "role_title": "Autonomous Agile Specialist",
        "description": "Thực thể AI tự chủ trong hệ thống quản lý dự án.",
        "avatar": "cpu",
    })

    return {
        **legacy_data,
        "is_agent": True,
        "agent_name": persona["name"],
        "agent_role": persona["role_title"],
        "agent_avatar": persona["avatar"],
        "agent_description": persona["description"],
        "job_id": job_id,
        "prompt_id": prompt_id,
        "plan_steps": plan_steps,
        "execution_trace": execution_trace,
        "governance": {
            "mode": governance_mode,
            "risk_score": risk_score,
            "automation_level": automation_level,
            "cost_usd": cost_usd,
            "can_rollback": bool(action_record and action_record.status == "executed"),
        },
        "proposed_actions": proposed_actions,
        "action_record_id": action_record.id if action_record else None,
        "action_status": action_record.status if action_record else "none",
    }

