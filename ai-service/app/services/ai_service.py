import json
import re
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from ..config import get_settings
from ..models import AIAgent, AIJob, AIUsage, PromptHistory, ProjectMember, Task, User, UserStory
from ..prompts.library import AGENT_PROMPTS

settings = get_settings()


def _estimate_tokens(text: str) -> int:
    return max(1, len(text.split()))


def _record_usage(
    session: Session,
    agent_name: str,
    prompt: str,
    response: str,
    user_id: int | None = None,
    project_id: int | None = None,
    agent_id: int | None = None,
) -> PromptHistory:
    prompt_tokens = _estimate_tokens(prompt)
    completion_tokens = _estimate_tokens(response)
    total = prompt_tokens + completion_tokens
    ph = PromptHistory(
        agent_id=agent_id,
        user_id=user_id,
        prompt=prompt,
        response=response,
        tokens_used=total,
    )
    session.add(ph)
    session.add(
        AIUsage(
            user_id=user_id,
            project_id=project_id,
            agent_name=agent_name,
            model=settings.openai_model if not settings.ai_use_mock else "mock",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total,
            cost_usd=total * 0.000002,
        )
    )
    session.commit()
    session.refresh(ph)
    return ph


async def _call_openai(prompt: str) -> str:
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        resp = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or "{}"
    except Exception as exc:
        return json.dumps({"error": str(exc), "fallback": True})


def _mock_analyze(text: str) -> dict[str, Any]:
    words = len(text.split())
    priority_score = round(min(1.0, 0.3 + min(words / 80, 0.5) + (0.15 if any(term in text.lower() for term in ["urgent", "critical", "weekly", "daily"]) else 0.0)), 2)
    estimated_complexity = "simple" if words < 12 else "moderate" if words < 25 else "complex"
    return {
        "summary": f"Phân tích yêu cầu: {text[:120]}...",
        "actors": ["Product Owner", "Developer", "End User"],
        "goals": ["Deliver value incrementally", "Meet acceptance criteria"],
        "constraints": ["Sprint timeline", "Team capacity"],
        "acceptance_hints": ["Given-When-Then scenarios recommended"],
        "clarifying_questions": [
            "Ai là người dùng chính?",
            "Tiêu chí hoàn thành cụ thể là gì?",
        ],
        "priority_score": priority_score,
        "estimated_complexity": estimated_complexity,
    }


def determine_collaboration_mode(automation_level: float, risk_level: float, ai_cost_estimate: float) -> str:
    if risk_level >= 0.6 or automation_level < 0.4 or ai_cost_estimate >= 1.0:
        return "HITL"
    elif risk_level < 0.3 and automation_level >= 0.7 and ai_cost_estimate < 0.5:
        return "HOOL"
    return "HOTL"


def _mock_breakdown(user_story: str) -> dict[str, Any]:
    parts = [p.strip() for p in re.split(r"[.\n]", user_story) if p.strip()]
    tasks = []
    for i, part in enumerate(parts[:6], 1):
        # Vary parameters based on task index to demonstrate different collaboration mechanisms
        if i % 3 == 1:
            # HITL task
            automation = 0.3
            risk = 0.8
            cost = 1.2
        elif i % 3 == 2:
            # HOOL task
            automation = 0.85
            risk = 0.15
            cost = 0.25
        else:
            # HOTL task
            automation = 0.6
            risk = 0.4
            cost = 0.55
            
        tasks.append({
            "title": f"Task {i}: {part[:60]}",
            "description": part,
            "estimated_hours": 4 + (i % 3) * 2,
            "automation_level": automation,
            "risk_level": risk,
            "ai_cost_estimate": cost,
            "collaboration_mode": determine_collaboration_mode(automation, risk, cost),
        })
    if not tasks:
        tasks = [{
            "title": "Implement feature",
            "description": user_story,
            "estimated_hours": 8,
            "automation_level": 0.5,
            "risk_level": 0.5,
            "ai_cost_estimate": 0.4,
            "collaboration_mode": "HOTL",
        }]
    return {"tasks": tasks}



def _mock_story_points(user_story: str) -> dict[str, Any]:
    words = len(user_story.split())
    if words < 20:
        sp = 3
    elif words < 50:
        sp = 5
    elif words < 100:
        sp = 8
    else:
        sp = 13
    return {
        "story_points": sp,
        "rationale": f"Độ phức tạp ước lượng dựa trên {words} từ và phạm vi mô tả.",
        "confidence": 0.72,
    }


def _mock_risks(context: str) -> dict[str, Any]:
    return {
        "risks": [
            {
                "title": "Scope creep",
                "description": "Yêu cầu có thể mở rộng ngoài sprint",
                "category": "scope",
                "probability": 0.6,
                "impact": 0.7,
                "mitigation": "Freeze scope sau sprint planning",
            },
            {
                "title": "Technical debt",
                "description": "Thiếu test coverage có thể làm chậm delivery",
                "category": "technical",
                "probability": 0.5,
                "impact": 0.6,
                "mitigation": "Allocate 20% capacity cho refactoring",
            },
            {
                "title": "Resource availability",
                "description": "Thành viên có thể bị phân công song song",
                "category": "resource",
                "probability": 0.4,
                "impact": 0.8,
                "mitigation": "Cross-train và backup assignee",
            },
        ]
    }


def _mock_forecast(sprint_data: dict) -> dict[str, Any]:
    total = sprint_data.get("total_points", 40)
    done = sprint_data.get("completed_points", 15)
    remaining = max(0, total - done)
    predicted_velocity = round(done / max(sprint_data.get("days_elapsed", 5), 1), 1)
    completion_probability = round(min(0.95, done / max(total, 1) + 0.2), 2)
    confidence_band = "high" if completion_probability >= 0.8 else "medium" if completion_probability >= 0.6 else "low"
    forecast_summary = (
        f"Velocity dự kiến {predicted_velocity} điểm/ngày, còn {remaining} điểm chưa hoàn thành."
        f" Khả năng hoàn thành sprint ở mức {confidence_band}."
    )
    return {
        "predicted_velocity": predicted_velocity,
        "remaining_story_points": remaining,
        "completion_probability": completion_probability,
        "burndown_notes": "Tiến độ ổn định nếu velocity duy trì ở mức hiện tại.",
        "forecast_summary": forecast_summary,
        "confidence_band": confidence_band,
    }


def _mock_assign(tasks: list[dict], members: list[dict]) -> dict[str, Any]:
    assignments = []
    for i, task in enumerate(tasks):
        member = members[i % len(members)] if members else {"id": None, "username": "unassigned"}
        assignments.append({
            "task_id": task["id"],
            "assignee_id": member.get("id"),
            "reason": f"Phân công theo workload cân bằng cho {member.get('username', 'N/A')}",
        })
    return {"assignments": assignments}


def _mock_review(content: str) -> dict[str, Any]:
    return {
        "score": 7,
        "strengths": ["Cấu trúc rõ ràng", "Tuân thủ convention"],
        "issues": ["Thiếu edge case handling", "Cần thêm unit test"],
        "recommendations": ["Bổ sung error handling", "Refactor hàm dài thành module nhỏ"],
        "summary": f"Review nội dung ({len(content)} ký tự): chất lượng khá, cần cải thiện test coverage.",
    }


def _mock_documentation(topic: str) -> dict[str, Any]:
    return {
        "title": f"Tài liệu: {topic[:80]}",
        "sections": [
            {"heading": "Tổng quan", "body": f"Mô tả chức năng và mục tiêu của {topic}."},
            {"heading": "API", "body": "Liệt kê endpoint REST, request/response schema."},
            {"heading": "Triển khai", "body": "Hướng dẫn cài đặt, cấu hình môi trường và chạy Docker."},
        ],
    }


async def _run_agent(
    session: Session,
    agent_type: str,
    prompt: str,
    user_id: int | None = None,
    project_id: int | None = None,
) -> tuple[dict[str, Any], PromptHistory]:
    agent = session.exec(select(AIAgent).where(AIAgent.agent_type == agent_type)).first()
    agent_id = agent.id if agent else None
    agent_name = agent.name if agent else agent_type

    if settings.ai_use_mock or not settings.openai_api_key:
        mock_map = {
            "requirement": lambda: _mock_analyze(prompt),
            "task": lambda: _mock_breakdown(prompt),
            "planning": lambda: _mock_story_points(prompt),
            "risk": lambda: _mock_risks(prompt),
            "forecast": lambda: _mock_forecast(json.loads(prompt) if prompt.startswith("{") else {}),
            "assignment": lambda: _mock_assign([], []),
            "review": lambda: _mock_review(prompt),
            "documentation": lambda: _mock_documentation(prompt),
        }
        result = mock_map.get(agent_type, lambda: {"message": "ok"})()
        if agent_type == "assignment":
            data = json.loads(prompt)
            result = _mock_assign(data.get("tasks", []), data.get("members", []))
        raw = json.dumps(result, ensure_ascii=False)
    else:
        raw = await _call_openai(prompt)
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            result = {"raw": raw}

    ph = _record_usage(session, agent_name, prompt, raw, user_id, project_id, agent_id)
    return result, ph


def _create_job(session: Session, agent_type: str, job_type: str, input_data: str, project_id: int | None, user_id: int | None) -> AIJob:
    agent = session.exec(select(AIAgent).where(AIAgent.agent_type == agent_type)).first()
    job = AIJob(
        agent_id=agent.id if agent else 1,
        project_id=project_id,
        user_id=user_id,
        job_type=job_type,
        status="running",
        input_data=input_data,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def _complete_job(session: Session, job: AIJob, output: dict) -> AIJob:
    job.status = "completed"
    job.output_data = json.dumps(output, ensure_ascii=False)
    job.completed_at = datetime.utcnow()
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


async def analyze_requirement(session: Session, text: str, user_id: int | None, project_id: int | None) -> dict:
    prompt = AGENT_PROMPTS["requirement"].format(text=text)
    job = _create_job(session, "requirement", "analyze", text, project_id, user_id)
    result, ph = await _run_agent(session, "requirement", prompt, user_id, project_id)
    _complete_job(session, job, result)
    return {"input": text, "analysis": result, "prompt_id": ph.id, "job_id": job.id}


async def breakdown_story(session: Session, user_story: str, user_id: int | None, project_id: int | None) -> dict:
    prompt = AGENT_PROMPTS["task"].format(user_story=user_story)
    job = _create_job(session, "task", "breakdown", user_story, project_id, user_id)
    result, ph = await _run_agent(session, "task", prompt, user_id, project_id)
    
    # Post-process tasks to ensure safety and defaults for all collaboration fields
    tasks = result.get("tasks", [])
    if isinstance(tasks, list):
        for task in tasks:
            # Parse or assign default parameters if not returned by LLM
            if "automation_level" not in task:
                task["automation_level"] = 0.5
            else:
                task["automation_level"] = float(task["automation_level"])
                
            if "risk_level" not in task:
                task["risk_level"] = 0.3
            else:
                task["risk_level"] = float(task["risk_level"])
                
            if "ai_cost_estimate" not in task:
                hours = float(task.get("estimated_hours", 4))
                task["ai_cost_estimate"] = round(hours * 0.05, 2)
            else:
                task["ai_cost_estimate"] = float(task["ai_cost_estimate"])
                
            task["collaboration_mode"] = determine_collaboration_mode(
                task["automation_level"],
                task["risk_level"],
                task["ai_cost_estimate"]
            )
        result["tasks"] = tasks

    _complete_job(session, job, result)
    return {"user_story": user_story, **result, "prompt_id": ph.id, "job_id": job.id}



async def estimate_story_points(session: Session, user_story: str, user_id: int | None, project_id: int | None) -> dict:
    prompt = AGENT_PROMPTS["planning"].format(user_story=user_story)
    job = _create_job(session, "planning", "story_point", user_story, project_id, user_id)
    result, ph = await _run_agent(session, "planning", prompt, user_id, project_id)
    _complete_job(session, job, result)
    return {"user_story": user_story, **result, "prompt_id": ph.id, "job_id": job.id}


async def detect_risks(session: Session, project_id: int, context: str, user_id: int | None) -> dict:
    tasks = session.exec(select(Task).where(Task.project_id == project_id)).all()
    open_tasks = len([t for t in tasks if t.status != "done"])
    done_tasks = len([t for t in tasks if t.status == "done"])
    rich_context = f"User Input Context: {context}\nSystem Data: {open_tasks} open tasks, {done_tasks} completed tasks. Assess probability of schedule slippage using historical patterns."
    prompt = AGENT_PROMPTS["risk"].format(context=rich_context)
    job = _create_job(session, "risk", "detect_risk", context, project_id, user_id)
    result, ph = await _run_agent(session, "risk", prompt, user_id, project_id)
    _complete_job(session, job, result)
    return {"project_id": project_id, **result, "prompt_id": ph.id, "job_id": job.id}


async def forecast_project(session: Session, project_id: int, sprint_data: dict, user_id: int | None) -> dict:
    prompt = AGENT_PROMPTS["forecast"].format(sprint_data=json.dumps(sprint_data))
    job = _create_job(session, "forecast", "forecast", json.dumps(sprint_data), project_id, user_id)
    result, ph = await _run_agent(session, "forecast", prompt, user_id, project_id)
    _complete_job(session, job, result)
    return {"project_id": project_id, **result, "prompt_id": ph.id, "job_id": job.id}


async def suggest_assignments(session: Session, project_id: int, task_ids: list[int], user_id: int | None) -> dict:
    tasks = [session.get(Task, tid) for tid in task_ids]
    tasks_data = [{"id": t.id, "title": t.title} for t in tasks if t]
    members = session.exec(
        select(User).join(ProjectMember, ProjectMember.user_id == User.id).where(ProjectMember.project_id == project_id)
    ).all()
    
    members_data = []
    for m in members:
        workload = len(session.exec(select(Task).where(Task.assignee_id == m.id, Task.status != "done")).all())
        members_data.append({"id": m.id, "username": m.username, "role": m.role, "current_open_tasks": workload})
        
    payload = json.dumps({"tasks": tasks_data, "members": members_data})
    prompt = AGENT_PROMPTS["assignment"].format(tasks=json.dumps(tasks_data), members=json.dumps(members_data))
    job = _create_job(session, "assignment", "assign", payload, project_id, user_id)
    result, ph = await _run_agent(session, "assignment", prompt, user_id, project_id)
    _complete_job(session, job, result)
    return {"project_id": project_id, **result, "prompt_id": ph.id, "job_id": job.id}


async def review_content(session: Session, content: str, user_id: int | None, project_id: int | None) -> dict:
    prompt = AGENT_PROMPTS["review"].format(content=content)
    job = _create_job(session, "review", "review", content, project_id, user_id)
    result, ph = await _run_agent(session, "review", prompt, user_id, project_id)
    _complete_job(session, job, result)
    return {"content": content, "review": result, "prompt_id": ph.id, "job_id": job.id}


async def generate_documentation(session: Session, topic: str, user_id: int | None, project_id: int | None) -> dict:
    prompt = AGENT_PROMPTS["documentation"].format(topic=topic)
    job = _create_job(session, "documentation", "documentation", topic, project_id, user_id)
    result, ph = await _run_agent(session, "documentation", prompt, user_id, project_id)
    _complete_job(session, job, result)
    return {"topic": topic, "documentation": result, "prompt_id": ph.id, "job_id": job.id}


def gather_sprint_data(session: Session, project_id: int, sprint_id: int | None) -> dict:
    q = select(Task).where(Task.project_id == project_id, Task.deleted_at.is_(None))
    if sprint_id:
        q = q.where(Task.sprint_id == sprint_id)
    tasks = session.exec(q).all()
    total_points = sum(t.story_points or 0 for t in tasks)
    completed = sum(t.story_points or 0 for t in tasks if t.status == "done")
    return {
        "total_points": total_points,
        "completed_points": completed,
        "task_count": len(tasks),
        "days_elapsed": 5,
    }
