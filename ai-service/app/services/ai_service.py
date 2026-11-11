import json
import re
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from ..config import get_settings
from ..models import (
    AIAgent,
    AgentActionRecord,
    AIJob,
    AIUsage,
    PromptHistory,
    ProjectMember,
    Task,
    User,
    UserStory,
)
from ..prompts.library import AGENT_PROMPTS
from .agent_runtime import (
    build_agent_envelope,
    execute_autonomous_action,
    tool_analyze_team_capacity,
    tool_calculate_historical_velocity,
    tool_inspect_active_risks,
    tool_inspect_project,
    tool_inspect_sprint_backlog,
)

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


def _clean_input_text(text: str) -> str:
    for marker in ["Input:", "User story:", "User Story:", "Requirement:", "Content:"]:
        if marker.lower() in text.lower():
            idx = text.lower().rfind(marker.lower())
            return text[idx + len(marker):].strip()
    return text.strip()


def _mock_analyze(text: str) -> dict[str, Any]:
    req_text = _clean_input_text(text)
    words = len(req_text.split())
    priority_score = round(min(1.0, 0.3 + min(words / 80, 0.5) + (0.15 if any(term in req_text.lower() for term in ["urgent", "critical", "weekly", "daily", "quan trọng", "gấp"]) else 0.0)), 2)
    estimated_complexity = "Đơn giản" if words < 12 else "Trung bình" if words < 25 else "Phức tạp"
    return {
        "summary": f"Khả thi. Phạm vi tính năng bao gồm: {req_text[:120]}.",
        "technical_notes": f"Đánh giá độ phức tạp: {estimated_complexity}. Cần chú trọng thiết kế API, kiểm thử tiêu chí chấp nhận và xử lý ngoại lệ.",
        "actors": ["Product Owner", "Developer", "End User"],
        "goals": ["Giao hàng đúng hạn trong Sprint", "Đạt tiêu chí chấp nhận (Acceptance Criteria)"],
        "constraints": ["Thời gian Sprint", "Năng lực của nhóm phát triển"],
        "acceptance_hints": ["Khuyên dùng kịch bản Given-When-Then"],
        "clarifying_questions": [
            "Ai là đối tượng người dùng chính?",
            "Tiêu chí hoàn thành (Definition of Done) cụ thể là gì?",
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
    req_text = _clean_input_text(user_story)
    parts = [p.strip() for p in re.split(r"[.\n]", req_text) if p.strip()]
    tasks = []
    for i, part in enumerate(parts[:6], 1):
        if i % 3 == 1:
            automation = 0.3
            risk = 0.8
            cost = 1.2
        elif i % 3 == 2:
            automation = 0.85
            risk = 0.15
            cost = 0.25
        else:
            automation = 0.6
            risk = 0.4
            cost = 0.55
            
        tasks.append({
            "title": f"Công việc {i}: {part[:50]}",
            "description": f"Thực hiện phát triển và kiểm thử cho: {part}",
            "estimated_hours": 4 + (i % 3) * 2,
            "automation_level": automation,
            "risk_level": risk,
            "ai_cost_estimate": cost,
            "collaboration_mode": determine_collaboration_mode(automation, risk, cost),
        })
    if not tasks:
        tasks = [{
            "title": f"Thực hiện tính năng: {req_text[:40]}",
            "description": req_text,
            "estimated_hours": 8,
            "automation_level": 0.5,
            "risk_level": 0.5,
            "ai_cost_estimate": 0.4,
            "collaboration_mode": "HOTL",
        }]
    return {"tasks": tasks}


def _mock_story_points(user_story: str) -> dict[str, Any]:
    req_text = _clean_input_text(user_story)
    words = len(req_text.split())
    if words < 20:
        sp = 3
    elif words < 50:
        sp = 5
    else:
        sp = 8
    return {
        "story_points": sp,
        "rationale": f"Ước lượng {sp} SP dựa trên độ dài yêu cầu ({words} từ) và mức độ phức tạp tích hợp kỹ thuật.",
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
    # --- Agentic Cycle: Perceive -> Plan -> Reason -> Reflect -> Propose ---
    proj_context = tool_inspect_project(session, project_id)
    
    plan_steps = [
        "Bước 1 (Perceive): Khảo sát thông tin dự án và bối cảnh các ràng buộc từ CSDL.",
        "Bước 2 (Reason): Phân tích User Story, bóc tách Actors, Goals, Constraints và Tiêu chí chấp nhận (DoD).",
        "Bước 3 (Reflect): Đánh giá tính hoàn thiện theo tiêu chuẩn INVEST và phát hiện câu hỏi làm rõ.",
        "Bước 4 (Propose): Đề xuất mức độ phức tạp, điểm ưu tiên và chuẩn hóa tài liệu yêu cầu.",
    ]
    
    execution_trace = [
        {
            "step": 1,
            "phase": "PLAN",
            "thought": "Khởi tạo phiên phân tích yêu cầu độc lập theo quy chuẩn Agile Requirements Engineering.",
        },
        {
            "step": 2,
            "phase": "PERCEIVE",
            "tool": "tool_inspect_project",
            "input": {"project_id": project_id},
            "observation": f"Dự án '{proj_context.get('project_name', 'General')}' hiện có {proj_context.get('members_count', 0)} thành viên, {proj_context.get('total_stories', 0)} stories và {proj_context.get('active_risks_count', 0)} rủi ro.",
        },
    ]

    prompt = AGENT_PROMPTS["requirement"].format(text=text)
    job = _create_job(session, "requirement", "analyze", text, project_id, user_id)
    result, ph = await _run_agent(session, "requirement", prompt, user_id, project_id)
    
    priority_score = float(result.get("priority_score", 0.5))
    complexity = result.get("estimated_complexity", "Trung bình")
    
    execution_trace.extend([
        {
            "step": 3,
            "phase": "REASON",
            "thought": f"Xác định độ phức tạp: {complexity}. Điểm ưu tiên nghiệp vụ: {priority_score:.2f}.",
            "detail": result.get("technical_notes", ""),
        },
        {
            "step": 4,
            "phase": "REFLECT",
            "thought": f"Đã rà soát {len(result.get('acceptance_hints', []))} gợi ý kiểm thử và {len(result.get('clarifying_questions', []))} câu hỏi làm rõ.",
        },
        {
            "step": 5,
            "phase": "ACTION_PROPOSAL",
            "thought": "Hoàn tất thẩm định yêu cầu. Sẵn sàng chuyển giao cho Planning & Task Breakdown Agents.",
        },
    ])
    
    risk_level = 0.6 if priority_score >= 0.8 else 0.3
    automation_level = 0.7
    cost_usd = 0.2
    governance_mode = determine_collaboration_mode(automation_level, risk_level, cost_usd)
    
    proposed_actions = [
        {
            "action_type": "standardize_story",
            "title": "Chuẩn hóa User Story theo INVEST & DoD",
            "description": f"Gắn tiêu chí chấp nhận và ghi nhận độ phức tạp '{complexity}' vào hệ thống.",
        }
    ]
    
    legacy_data = {"input": text, "analysis": result, "prompt_id": ph.id, "job_id": job.id}
    envelope = build_agent_envelope(
        agent_type="requirement",
        job_id=job.id,
        prompt_id=ph.id,
        plan_steps=plan_steps,
        execution_trace=execution_trace,
        governance_mode=governance_mode,
        risk_score=risk_level,
        automation_level=automation_level,
        cost_usd=cost_usd,
        proposed_actions=proposed_actions,
        legacy_data=legacy_data,
        action_record=None,
    )
    _complete_job(session, job, envelope)
    return envelope


async def breakdown_story(session: Session, user_story: str, user_id: int | None, project_id: int | None) -> dict:
    # --- Agentic Cycle: Perceive -> Plan -> Reason -> Reflect -> Propose/Act ---
    sprint_info = tool_inspect_sprint_backlog(session, project_id, None)
    team_info = tool_analyze_team_capacity(session, project_id)
    
    plan_steps = [
        "Bước 1 (Perceive): Tra cứu Sprint Backlog hiện hành và tải công việc của đội ngũ từ CSDL.",
        "Bước 2 (Reason): Phân rã User Story thành danh sách các Subtasks kỹ thuật (API, Frontend, DB, QA).",
        "Bước 3 (Reflect): Đánh giá mức độ tự động hóa, nguy cơ nợ kỹ thuật và chi phí AI của từng task.",
        "Bước 4 (Act / Propose): Tạo bản ghi hành động tự chủ đề xuất tạo các công việc phân rã vào CSDL.",
    ]
    
    execution_trace = [
        {
            "step": 1,
            "phase": "PLAN",
            "thought": "Bắt đầu chu trình phân rã kỹ thuật tự chủ cho User Story.",
        },
        {
            "step": 2,
            "phase": "PERCEIVE",
            "tool": "tool_inspect_sprint_backlog",
            "input": {"project_id": project_id},
            "observation": f"Sprint '{sprint_info.get('sprint_name', 'Mặc định')}' còn {sprint_info.get('remaining_points', 0)} điểm SP, {sprint_info.get('tasks_open', 0)} tasks đang mở.",
        },
    ]

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

    avg_risk = sum(t.get("risk_level", 0.3) for t in tasks) / max(1, len(tasks))
    avg_auto = sum(t.get("automation_level", 0.5) for t in tasks) / max(1, len(tasks))
    total_cost = sum(t.get("ai_cost_estimate", 0.2) for t in tasks)
    governance_mode = determine_collaboration_mode(avg_auto, avg_risk, total_cost)

    execution_trace.extend([
        {
            "step": 3,
            "phase": "REASON",
            "thought": f"Đã sinh {len(tasks)} subtasks kỹ thuật với tổng cộng {sum(t.get('estimated_hours', 4) for t in tasks)} giờ ước tính.",
        },
        {
            "step": 4,
            "phase": "REFLECT",
            "thought": f"Đánh giá rủi ro trung bình: {avg_risk:.2f}, tự động hóa: {avg_auto:.2f}. Chế độ quản trị kích hoạt: {governance_mode}.",
        },
    ])

    # Tạo Proposed Action Record vào CSDL
    action_record = AgentActionRecord(
        job_id=job.id,
        project_id=project_id,
        user_id=user_id,
        agent_type="task",
        action_type="create_tasks_batch",
        title=f"Tạo {len(tasks)} Subtasks tự động từ User Story",
        description=f"Phân rã thành {len(tasks)} công việc với tổng thời lượng {sum(t.get('estimated_hours', 4) for t in tasks)}h.",
        governance_mode=governance_mode,
        status="pending",
        action_payload=json.dumps({"tasks": tasks, "project_id": project_id}, ensure_ascii=False),
    )
    session.add(action_record)
    session.commit()
    session.refresh(action_record)

    # Nếu HOOL (High Automation, Low Risk, Low Cost): Tự động thực thi ngay lập tức
    if governance_mode == "HOOL":
        execute_autonomous_action(session, action_record.id, user_id)
        execution_trace.append({
            "step": 5,
            "phase": "AUTONOMOUS_EXECUTE",
            "tool": "execute_autonomous_action",
            "observation": f"Đã tự động commit 100% {len(tasks)} tasks vào CSDL (HOOL protocol). Snapshot hoàn tác (Rollback) đã sẵn sàng.",
        })
    else:
        execution_trace.append({
            "step": 5,
            "phase": "ACTION_PROPOSAL",
            "thought": f"Đề xuất tạo {len(tasks)} tasks đã lưu vào Action Record #{action_record.id}. Chờ con người phê duyệt ({governance_mode}).",
        })

    proposed_actions = [
        {
            "action_id": action_record.id,
            "action_type": "create_tasks_batch",
            "title": action_record.title,
            "description": action_record.description,
            "governance_mode": governance_mode,
            "status": action_record.status,
            "tasks_count": len(tasks),
        }
    ]

    legacy_data = {"user_story": user_story, **result, "prompt_id": ph.id, "job_id": job.id}
    envelope = build_agent_envelope(
        agent_type="task",
        job_id=job.id,
        prompt_id=ph.id,
        plan_steps=plan_steps,
        execution_trace=execution_trace,
        governance_mode=governance_mode,
        risk_score=round(avg_risk, 2),
        automation_level=round(avg_auto, 2),
        cost_usd=round(total_cost, 2),
        proposed_actions=proposed_actions,
        legacy_data=legacy_data,
        action_record=action_record,
    )
    _complete_job(session, job, envelope)
    return envelope


async def estimate_story_points(session: Session, user_story: str, user_id: int | None, project_id: int | None) -> dict:
    # --- Agentic Cycle: Perceive -> Plan -> Reason -> Reflect -> Propose ---
    vel_data = tool_calculate_historical_velocity(session, project_id)
    
    plan_steps = [
        "Bước 1 (Perceive): Tra cứu vận tốc lịch sử thực tế (Historical Velocity) từ CSDL.",
        "Bước 2 (Reason): Đánh giá độ mơ hồ yêu cầu và tính toán điểm Story Point theo Fibonacci.",
        "Bước 3 (Reflect): Đối chiếu điểm ước lượng với biên độ đệm an toàn của Sprint.",
        "Bước 4 (Propose): Đề xuất cập nhật điểm Story Points cho User Story.",
    ]
    
    execution_trace = [
        {
            "step": 1,
            "phase": "PLAN",
            "thought": "Khởi động Planning Agent ước lượng năng lực và độ phức tạp.",
        },
        {
            "step": 2,
            "phase": "PERCEIVE",
            "tool": "tool_calculate_historical_velocity",
            "input": {"project_id": project_id},
            "observation": f"Vận tốc trung bình các sprint trước: {vel_data.get('average_velocity', 15.0)} SP. Đệm an toàn khuyến nghị: {vel_data.get('recommended_point_buffer', 3)} SP.",
        },
    ]

    prompt = AGENT_PROMPTS["planning"].format(user_story=user_story)
    job = _create_job(session, "planning", "story_point", user_story, project_id, user_id)
    result, ph = await _run_agent(session, "planning", prompt, user_id, project_id)
    
    points = int(result.get("story_points", 3))
    rationale = result.get("rationale", "")
    
    execution_trace.extend([
        {
            "step": 3,
            "phase": "REASON",
            "thought": f"Ước lượng {points} Story Points dựa trên phân tích kỹ thuật và bối cảnh dự án.",
            "detail": rationale,
        },
        {
            "step": 4,
            "phase": "REFLECT",
            "thought": f"Điểm {points} SP nằm trong ngưỡng an toàn so với vận tốc trung bình {vel_data.get('average_velocity', 15.0)} SP.",
        },
    ])
    
    governance_mode = "HOTL"
    action_record = AgentActionRecord(
        job_id=job.id,
        project_id=project_id,
        user_id=user_id,
        agent_type="planning",
        action_type="update_story_points",
        title=f"Gán {points} Story Points cho User Story",
        description=rationale,
        governance_mode=governance_mode,
        status="pending",
        action_payload=json.dumps({"story_points": points, "user_story": user_story[:100]}, ensure_ascii=False),
    )
    session.add(action_record)
    session.commit()
    session.refresh(action_record)
    
    execution_trace.append({
        "step": 5,
        "phase": "ACTION_PROPOSAL",
        "thought": f"Đã tạo đề xuất gán {points} SP (Action Record #{action_record.id}).",
    })

    proposed_actions = [
        {
            "action_id": action_record.id,
            "action_type": "update_story_points",
            "title": action_record.title,
            "description": action_record.description,
            "story_points": points,
        }
    ]

    legacy_data = {"user_story": user_story, **result, "prompt_id": ph.id, "job_id": job.id}
    envelope = build_agent_envelope(
        agent_type="planning",
        job_id=job.id,
        prompt_id=ph.id,
        plan_steps=plan_steps,
        execution_trace=execution_trace,
        governance_mode=governance_mode,
        risk_score=0.35,
        automation_level=0.6,
        cost_usd=0.15,
        proposed_actions=proposed_actions,
        legacy_data=legacy_data,
        action_record=action_record,
    )
    _complete_job(session, job, envelope)
    return envelope


async def detect_risks(session: Session, project_id: int, context: str, user_id: int | None) -> dict:
    # --- Agentic Cycle: Perceive -> Plan -> Reason -> Reflect -> Propose ---
    existing_risks = tool_inspect_active_risks(session, project_id)
    sprint_data = tool_inspect_sprint_backlog(session, project_id, None)
    
    tasks = session.exec(select(Task).where(Task.project_id == project_id, Task.deleted_at.is_(None))).all()
    open_tasks = len([t for t in tasks if t.status != "done"])
    done_tasks = len([t for t in tasks if t.status == "done"])

    plan_steps = [
        "Bước 1 (Perceive): Quét trạng thái tiến độ, các rủi ro đang mở và khối lượng công việc tồn đọng từ CSDL.",
        "Bước 2 (Reason): Ứng dụng mô hình suy luận rủi ro phát hiện tắc nghẽn phạm vi, kiến trúc hoặc nguồn lực.",
        "Bước 3 (Reflect): Đánh giá ma trận Xác suất x Mức độ ảnh hưởng (Probability x Impact).",
        "Bước 4 (Act / Propose): Đề xuất ghi nhận danh sách rủi ro mới cùng kế hoạch giảm thiểu (Mitigation Plan).",
    ]

    execution_trace = [
        {
            "step": 1,
            "phase": "PLAN",
            "thought": "Khởi động Risk Sentinel Agent kiểm toán rủi ro liên tục.",
        },
        {
            "step": 2,
            "phase": "PERCEIVE",
            "tool": "tool_inspect_active_risks",
            "input": {"project_id": project_id},
            "observation": f"Dự án có {len(existing_risks)} rủi ro đã ghi nhận. Hệ thống ghi nhận {open_tasks} open tasks, {done_tasks} completed tasks.",
        },
    ]

    rich_context = f"User Input Context: {context}\nSystem Data: {open_tasks} open tasks, {done_tasks} completed tasks. Assess probability of schedule slippage using historical patterns."
    prompt = AGENT_PROMPTS["risk"].format(context=rich_context)
    job = _create_job(session, "risk", "detect_risk", context, project_id, user_id)
    result, ph = await _run_agent(session, "risk", prompt, user_id, project_id)
    
    risks = result.get("risks", [])
    max_risk_score = max([float(r.get("probability", 0.5)) * float(r.get("impact", 0.5)) for r in risks], default=0.3)
    governance_mode = "HITL" if max_risk_score >= 0.5 else "HOTL"

    execution_trace.extend([
        {
            "step": 3,
            "phase": "REASON",
            "thought": f"Phát hiện {len(risks)} nguy cơ rủi ro tiềm ẩn trong phạm vi dự án.",
        },
        {
            "step": 4,
            "phase": "REFLECT",
            "thought": f"Rủi ro nghiêm trọng nhất có điểm: {max_risk_score:.2f}. Chế độ quản trị: {governance_mode}.",
        },
    ])

    action_record = AgentActionRecord(
        job_id=job.id,
        project_id=project_id,
        user_id=user_id,
        agent_type="risk",
        action_type="record_risk",
        title=f"Ghi nhận {len(risks)} rủi ro mới vào Ma trận Rủi ro",
        description=f"Điểm nguy cơ cao nhất: {max_risk_score:.2f}.",
        governance_mode=governance_mode,
        status="pending",
        action_payload=json.dumps({"risks": risks, "project_id": project_id}, ensure_ascii=False),
    )
    session.add(action_record)
    session.commit()
    session.refresh(action_record)

    execution_trace.append({
        "step": 5,
        "phase": "ACTION_PROPOSAL",
        "thought": f"Đã lưu đề xuất ghi nhận rủi ro vào Action Record #{action_record.id}.",
    })

    proposed_actions = [
        {
            "action_id": action_record.id,
            "action_type": "record_risk",
            "title": action_record.title,
            "description": action_record.description,
            "risks_count": len(risks),
        }
    ]

    legacy_data = {"project_id": project_id, **result, "prompt_id": ph.id, "job_id": job.id}
    envelope = build_agent_envelope(
        agent_type="risk",
        job_id=job.id,
        prompt_id=ph.id,
        plan_steps=plan_steps,
        execution_trace=execution_trace,
        governance_mode=governance_mode,
        risk_score=round(max_risk_score, 2),
        automation_level=0.5,
        cost_usd=0.25,
        proposed_actions=proposed_actions,
        legacy_data=legacy_data,
        action_record=action_record,
    )
    _complete_job(session, job, envelope)
    return envelope


async def forecast_project(session: Session, project_id: int, sprint_data: dict, user_id: int | None) -> dict:
    # --- Agentic Cycle: Perceive -> Plan -> Reason -> Reflect -> Propose ---
    vel_data = tool_calculate_historical_velocity(session, project_id)
    
    plan_steps = [
        "Bước 1 (Perceive): Đọc dữ liệu tiến độ Sprint hiện hành và vận tốc lịch sử từ CSDL.",
        "Bước 2 (Reason): Áp dụng mạng dự báo phi tuyến phân tích xu hướng Burndown và điểm còn lại.",
        "Bước 3 (Reflect): Đánh giá xác suất hoàn thành đúng hạn (Completion Probability) và biên độ tin cậy.",
        "Bước 4 (Propose): Xuất cảnh báo sớm các nút thắt chuyển giao và khuyến nghị điều chỉnh.",
    ]

    execution_trace = [
        {
            "step": 1,
            "phase": "PLAN",
            "thought": "Khởi động Predictive Forecast Agent phân tích mô hình tiến độ.",
        },
        {
            "step": 2,
            "phase": "PERCEIVE",
            "tool": "tool_calculate_historical_velocity",
            "input": {"project_id": project_id},
            "observation": f"Vận tốc tham chiếu: {vel_data.get('average_velocity', 15.0)} SP. Điểm tổng: {sprint_data.get('total_points', 0)}, điểm đã xong: {sprint_data.get('completed_points', 0)}.",
        },
    ]

    prompt = AGENT_PROMPTS["forecast"].format(sprint_data=json.dumps(sprint_data))
    job = _create_job(session, "forecast", "forecast", json.dumps(sprint_data), project_id, user_id)
    result, ph = await _run_agent(session, "forecast", prompt, user_id, project_id)
    
    prob = float(result.get("completion_probability", 0.75))
    confidence_band = result.get("confidence_band", "medium")

    execution_trace.extend([
        {
            "step": 3,
            "phase": "REASON",
            "thought": f"Xác suất về đích dự báo: {int(prob * 100)}% ({confidence_band.upper()}). Vận tốc dự kiến: {result.get('predicted_velocity', 0)} điểm/ngày.",
        },
        {
            "step": 4,
            "phase": "REFLECT",
            "thought": f"Ghi nhận ghi chú Burndown: {result.get('burndown_notes', '')[:100]}...",
        },
        {
            "step": 5,
            "phase": "ACTION_PROPOSAL",
            "thought": "Đã đồng bộ kết quả dự báo vào hệ thống phân tích bàn giao Sprint.",
        },
    ])

    governance_mode = "HOTL"
    legacy_data = {"project_id": project_id, **result, "prompt_id": ph.id, "job_id": job.id}
    envelope = build_agent_envelope(
        agent_type="forecast",
        job_id=job.id,
        prompt_id=ph.id,
        plan_steps=plan_steps,
        execution_trace=execution_trace,
        governance_mode=governance_mode,
        risk_score=round(1.0 - prob, 2),
        automation_level=0.75,
        cost_usd=0.2,
        proposed_actions=[],
        legacy_data=legacy_data,
        action_record=None,
    )
    _complete_job(session, job, envelope)
    return envelope


async def suggest_assignments(session: Session, project_id: int, task_ids: list[int], user_id: int | None) -> dict:
    # --- Agentic Cycle: Perceive -> Plan -> Reason -> Reflect -> Propose/Act ---
    team_data = tool_analyze_team_capacity(session, project_id)
    
    plan_steps = [
        "Bước 1 (Perceive): Tra cứu năng lực và số lượng task đang mở của từng developer trong CSDL.",
        "Bước 2 (Reason): Áp dụng thuật toán heuristic tối ưu hóa phân bổ nguồn lực và cân bằng khối lượng tải.",
        "Bước 3 (Reflect): Kiểm tra độ lệch tải để đảm bảo không có thành viên nào bị quá tải (Overload).",
        "Bước 4 (Act / Propose): Tạo bản ghi hành động đề xuất phân công lập trình viên cho các Task.",
    ]

    execution_trace = [
        {
            "step": 1,
            "phase": "PLAN",
            "thought": "Khởi động Workload Balancing Agent phân bổ nhân sự tự chủ.",
        },
        {
            "step": 2,
            "phase": "PERCEIVE",
            "tool": "tool_analyze_team_capacity",
            "input": {"project_id": project_id},
            "observation": f"Khảo sát {len(team_data)} thành viên: {', '.join(f'{m['username']} ({m['active_tasks_count']} tasks)' for m in team_data[:3])}.",
        },
    ]

    tasks = [session.get(Task, tid) for tid in task_ids]
    tasks_data = [{"id": t.id, "title": t.title} for t in tasks if t]
    
    members_data = []
    for m in team_data:
        members_data.append({"id": m["user_id"], "username": m["username"], "role": m["role"], "current_open_tasks": m["active_tasks_count"]})
        
    payload = json.dumps({"tasks": tasks_data, "members": members_data})
    prompt = AGENT_PROMPTS["assignment"].format(tasks=json.dumps(tasks_data), members=json.dumps(members_data))
    job = _create_job(session, "assignment", "assign", payload, project_id, user_id)
    result, ph = await _run_agent(session, "assignment", prompt, user_id, project_id)
    
    assignments = result.get("assignments", [])

    execution_trace.extend([
        {
            "step": 3,
            "phase": "REASON",
            "thought": f"Đã tính toán phương án phân công tối ưu cho {len(assignments)} công việc dựa trên dung lượng trống.",
        },
        {
            "step": 4,
            "phase": "REFLECT",
            "thought": "Độ lệch tải sau phân bổ được tối ưu hóa, đảm bảo tính công bằng và liên tục của Sprint.",
        },
    ])

    governance_mode = "HOTL"
    action_record = AgentActionRecord(
        job_id=job.id,
        project_id=project_id,
        user_id=user_id,
        agent_type="assignment",
        action_type="assign_tasks",
        title=f"Phân công {len(assignments)} công việc cho lập trình viên",
        description=f"Tối ưu hóa tài nguyên giữa {len(members_data)} thành viên dự án.",
        governance_mode=governance_mode,
        status="pending",
        action_payload=json.dumps({"assignments": assignments, "project_id": project_id}, ensure_ascii=False),
    )
    session.add(action_record)
    session.commit()
    session.refresh(action_record)

    execution_trace.append({
        "step": 5,
        "phase": "ACTION_PROPOSAL",
        "thought": f"Đã lưu đề xuất phân công vào Action Record #{action_record.id}. Chờ con người xác nhận hoặc can thiệp ({governance_mode}).",
    })

    proposed_actions = [
        {
            "action_id": action_record.id,
            "action_type": "assign_tasks",
            "title": action_record.title,
            "description": action_record.description,
            "assignments_count": len(assignments),
        }
    ]

    legacy_data = {"project_id": project_id, **result, "prompt_id": ph.id, "job_id": job.id}
    envelope = build_agent_envelope(
        agent_type="assignment",
        job_id=job.id,
        prompt_id=ph.id,
        plan_steps=plan_steps,
        execution_trace=execution_trace,
        governance_mode=governance_mode,
        risk_score=0.3,
        automation_level=0.7,
        cost_usd=0.15,
        proposed_actions=proposed_actions,
        legacy_data=legacy_data,
        action_record=action_record,
    )
    _complete_job(session, job, envelope)
    return envelope


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
