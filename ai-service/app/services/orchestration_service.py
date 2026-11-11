import json
import re
from datetime import datetime
from typing import Any, Optional

from sqlmodel import Session, select

from ..config import get_settings
from ..models import (
    AgentDeliberation,
    AgentThought,
    DeliberationResolution,
    Project,
    Sprint,
    User,
    UserStory,
)
from ..prompts.library import AGENT_PROMPTS
from .ai_service import _call_openai, _record_usage

settings = get_settings()

FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21]


def _nearest_fibonacci(value: float) -> int:
    return min(FIBONACCI_POINTS, key=lambda x: abs(x - value))


def _clean_json_response(raw: str) -> dict[str, Any]:
    try:
        clean = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
        clean = re.sub(r"\s*```$", "", clean, flags=re.MULTILINE)
        return json.loads(clean)
    except Exception:
        # Fallback extraction if LLM outputs markdown wrappers
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        return {}


# ==============================================================================
# MOCK INDEPENDENT REASONING ENGINE (Preserve Offline Capability)
# ==============================================================================
def _mock_po_reasoning(user_story: str, context: Optional[dict] = None) -> dict[str, Any]:
    text_lower = user_story.lower()
    is_urgent = any(k in text_lower for k in ["gấp", "urgent", "critical", "ưu tiên cao", "ngay lập tức", "khách hàng yêu cầu"])
    is_feature = any(k in text_lower for k in ["tính năng", "kpi", "dashboard", "báo cáo", "thanh toán", "login", "ai"])
    
    score = round(min(9.8, 6.5 + (2.5 if is_urgent else 1.0 if is_feature else 0.5)), 1)
    estimated_points = 3 if len(user_story.split()) < 15 else 5
    
    verdict = "ACCEPT_IMMEDIATELY" if is_urgent or score >= 8.5 else "PRIORITIZE_MVP"
    
    return {
        "agent_role": "po_agent",
        "agent_name": "Product & Business Value Agent",
        "role_title": "Product Owner",
        "verdict": verdict,
        "thinking_process": (
            f"Dưới góc độ Product Owner, tính năng '{user_story[:60]}...' mang lại giá trị kinh doanh rất rõ rệt "
            f"cho người dùng cuối và đối tác. {'Đây là yêu cầu có độ cấp thiết thị trường cao, cần đưa vào Sprint ngay để nắm bắt thời cơ.' if is_urgent else 'Tính năng giúp gia tăng trải nghiệm người dùng và hoàn thiện luồng nghiệp vụ cốt lõi.'} "
            "Chúng ta không nên để những rào cản kỹ thuật làm trì hoãn giá trị giao tới khách hàng."
        ),
        "score": score,
        "score_label": "Business Value Score",
        "estimated_points": estimated_points,
        "risk_level": "MEDIUM" if is_urgent else "LOW",
        "key_arguments": [
            "Tối đa hóa giá trị sản phẩm và đáp ứng kỳ vọng cấp bách của người dùng.",
            "Tăng năng lực cạnh tranh và tỷ lệ kích hoạt tính năng (Feature Adoption Rate).",
            "Sẵn sàng đơn giản hóa các giao diện thứ cấp để release phiên bản đầu tiên nhanh nhất.",
        ],
        "concerns_and_tradeoffs": (
            "Có thể chấp nhận bỏ qua các hiệu ứng giao diện phụ hoặc phân tích nâng cao trong giai đoạn 1, "
            "nhưng bắt buộc phải có luồng trải nghiệm chính hoạt động được trong Sprint này."
        ),
    }


def _mock_tech_lead_reasoning(user_story: str, context: Optional[dict] = None) -> dict[str, Any]:
    text_lower = user_story.lower()
    has_complex_tech = any(k in text_lower for k in ["bảo mật", "jwt", "database", "tích hợp", "microservice", "ai", "realtime", "thanh toán", "migration"])
    words = len(user_story.split())
    
    tech_score = round(min(9.5, 5.0 + (3.0 if has_complex_tech else 1.5) + (1.0 if words > 20 else 0.0)), 1)
    risk_level = "CRITICAL" if has_complex_tech and words > 20 else "HIGH" if has_complex_tech else "MEDIUM"
    
    # Tech lead realistically estimates higher story points to include testing, migration & architecture
    base_points = 8 if has_complex_tech else (5 if words > 15 else 3)
    estimated_points = _nearest_fibonacci(base_points)
    
    verdict = "REQUIRE_SPIKE_REFACTOR" if has_complex_tech or tech_score >= 8.0 else "APPROVE_FEASIBLE"
    
    return {
        "agent_role": "tech_lead_agent",
        "agent_name": "Architecture & Engineering Guardian",
        "role_title": "Tech Lead / Architect",
        "verdict": verdict,
        "thinking_process": (
            f"Từ góc nhìn Kỹ thuật & Kiến trúc, yêu cầu '{user_story[:60]}...' ẩn chứa nhiều yếu tố phức tạp "
            f"về mặt thiết kế hệ thống, mô hình dữ liệu và kiểm thử tiêu chí hoàn thành (DoD). "
            f"{'Cảnh báo: Tích hợp này đụng chạm tới các tầng nhạy cảm (DB schema/Security/API contracts), nguy cơ phát sinh nợ kỹ thuật và lỗi hồi quy (regression) rất lớn nếu làm vội.' if has_complex_tech else 'Kiến trúc tương đối rõ ràng nhưng vẫn cần kiểm thử tích hợp và xử lý các ca biên ngoại lệ.'} "
            "Tôi không ủng hộ việc rút ngắn kiểm thử hoặc làm tắt chỉ để kịp tiến độ."
        ),
        "score": tech_score,
        "score_label": "Technical Complexity Score",
        "estimated_points": estimated_points,
        "risk_level": risk_level,
        "key_arguments": [
            "Bắt buộc tuân thủ tiêu chuẩn thiết kế API chuẩn mực và bảo vệ toàn vẹn dữ liệu.",
            "Cần dành thời gian viết Unit/Integration Tests đầy đủ để ngăn chặn lỗi hồi quy.",
            "Cần xây dựng tài liệu kỹ thuật và kịch bản Rollback an toàn trước khi deploy.",
        ],
        "concerns_and_tradeoffs": (
            "Kiên quyết không thỏa hiệp về bảo mật và kiểm thử tự động. "
            "Nếu cần ra mắt sớm, phải cắt gọn phạm vi API xuống mức tối giản (Minimal API) thay vì làm ẩu toàn bộ."
        ),
    }


def _mock_scrum_master_reasoning(user_story: str, context: Optional[dict] = None) -> dict[str, Any]:
    text_lower = user_story.lower()
    words = len(user_story.split())
    
    # Simulate team velocity and capacity constraints
    capacity_score = 6.0  # Moderate capacity remaining
    schedule_risk = "HIGH" if words > 20 or "gấp" in text_lower else "MEDIUM"
    
    estimated_points = 5 if words > 15 else 3
    verdict = "SPLIT_ACROSS_SPRINTS" if schedule_risk in ["HIGH", "CRITICAL"] else "COMMITTED_IN_SPRINT"
    
    return {
        "agent_role": "scrum_master_agent",
        "agent_name": "Delivery, Capacity & Velocity Stabilizer",
        "role_title": "Scrum Master",
        "verdict": verdict,
        "thinking_process": (
            f"Về khía cạnh Quản lý Tiến độ và Năng lực Đội ngũ (Sprint Capacity), Sprint hiện tại đã cam kết nhiều hạng mục quan trọng. "
            f"Nếu đưa trọn vẹn yêu cầu này vào mà không loại bỏ bớt task khác, Velocity của nhóm sẽ bị vượt ngưỡng an toàn (Over-allocation), "
            f"dẫn tới nguy cơ vỡ cam kết Sprint (Spillover) và gây áp lực quá tải (Burnout) cho các lập trình viên. "
            "Giải pháp an toàn là phân kỳ triển khai hoặc hoán đổi task tương đương ra khỏi Sprint."
        ),
        "score": capacity_score,
        "score_label": "Sprint Capacity Fit Score",
        "estimated_points": estimated_points,
        "risk_level": schedule_risk,
        "key_arguments": [
            "Bảo vệ cam kết Sprint Goal và đường Burndown ổn định.",
            "Tránh hiện tượng Scope Creep (phình phạm vi) làm trễ deadline toàn đội.",
            "Đề xuất chia nhỏ story thành 2 phần: Core MVP trong Sprint này, phần mở rộng ở Sprint sau.",
        ],
        "concerns_and_tradeoffs": (
            "Chỉ chấp nhận tối đa 5 Story Points cho hạng mục này trong Sprint hiện tại. "
            "Mọi phần công việc vượt quá 5 SP phải được chuyển sang Sprint kế tiếp."
        ),
    }


# ==============================================================================
# CONFLICT DETECTION & ARBITRATION LOGIC
# ==============================================================================
def detect_conflicts(po_result: dict, tech_result: dict, scrum_result: dict) -> tuple[float, str, list[dict]]:
    conflicts = []
    
    po_points = po_result.get("estimated_points", 3)
    tech_points = tech_result.get("estimated_points", 8)
    scrum_points = scrum_result.get("estimated_points", 5)
    
    # 1. Effort Estimation Variance Conflict
    point_diff = abs(tech_points - po_points)
    if point_diff >= 3:
        severity = "HIGH" if point_diff >= 5 else "MEDIUM"
        conflicts.append({
            "id": "conf_effort_variance",
            "category": "Mâu thuẫn Ước lượng Điểm Story Point (Effort Variance)",
            "severity": severity,
            "opposing_agents": ["po_agent", "tech_lead_agent"],
            "description": f"Tech Lead ước lượng {tech_points} SP (tính cả kiến trúc và kiểm thử) trong khi PO chỉ kỳ vọng {po_points} SP (chênh lệch {point_diff} điểm).",
            "impact_analysis": "Dẫn đến bất đồng khi lập kế hoạch Sprint; nếu theo PO sẽ thiếu thời gian kiểm thử, nếu theo Tech Lead sẽ chiếm quá nhiều capacity.",
        })
    
    # 2. Scope vs Capacity Conflict
    po_verdict = po_result.get("verdict", "")
    scrum_verdict = scrum_result.get("verdict", "")
    if po_verdict == "ACCEPT_IMMEDIATELY" and scrum_verdict in ["SPLIT_ACROSS_SPRINTS", "DEFER_NEXT_SPRINT"]:
        conflicts.append({
            "id": "conf_scope_capacity",
            "category": "Mâu thuẫn Phạm vi vs Năng lực Sprint (Scope vs Capacity)",
            "severity": "HIGH",
            "opposing_agents": ["po_agent", "scrum_master_agent"],
            "description": "Product Owner muốn đưa toàn bộ tính năng vào Sprint ngay lập tức, nhưng Scrum Master cảnh báo Sprint không đủ capacity trống.",
            "impact_analysis": "Nguy cơ trễ hạn giao hàng Sprint (Slippage) và gây kiệt sức (Burnout) cho đội ngũ phát triển.",
        })
        
    # 3. Business Urgency vs Technical Debt Conflict
    tech_risk = tech_result.get("risk_level", "LOW")
    tech_verdict = tech_result.get("verdict", "")
    if tech_verdict == "REQUIRE_SPIKE_REFACTOR" or tech_risk in ["HIGH", "CRITICAL"]:
        conflicts.append({
            "id": "conf_urgency_tech_debt",
            "category": "Mâu thuẫn Cấp bách Nghiệp vụ vs Nợ Kỹ thuật (Urgency vs Tech Debt)",
            "severity": "HIGH" if tech_risk == "CRITICAL" else "MEDIUM",
            "opposing_agents": ["po_agent", "tech_lead_agent"],
            "description": "PO thúc đẩy release nhanh để lấy giá trị kinh doanh, nhưng Tech Lead kiên quyết yêu cầu refactor và hoàn thiện kiểm thử an toàn trước.",
            "impact_analysis": "Nếu thỏa hiệp vội vã, hệ thống sẽ gánh nợ kỹ thuật nghiêm trọng, dễ phát sinh lỗi crash trên môi trường Production.",
        })
        
    # Calculate overall conflict severity (0.0 to 1.0)
    if not conflicts:
        severity_score = 0.15
        level = "NONE"
    elif any(c["severity"] == "HIGH" for c in conflicts) or len(conflicts) >= 2:
        severity_score = round(min(0.95, 0.65 + len(conflicts) * 0.1), 2)
        level = "CRITICAL"
    else:
        severity_score = round(min(0.60, 0.35 + len(conflicts) * 0.1), 2)
        level = "MODERATE"
        
    return severity_score, level, conflicts


def formulate_arbitration(
    user_story: str,
    po_res: dict,
    tech_res: dict,
    scrum_res: dict,
    conflict_severity: float,
    conflict_level: str,
    conflicts: list[dict],
) -> dict[str, Any]:
    po_points = po_res.get("estimated_points", 3)
    tech_points = tech_res.get("estimated_points", 8)
    scrum_points = scrum_res.get("estimated_points", 5)
    
    # Weighted reconciliation formula
    weighted_points = (tech_points * 0.45) + (scrum_points * 0.35) + (po_points * 0.20)
    reconciled_points = _nearest_fibonacci(weighted_points)
    
    # Determine governance mode according to GEMINI.md protocol
    if conflict_severity >= 0.65:
        governance_mode = "HITL"  # Human approval required
    elif conflict_severity >= 0.25:
        governance_mode = "HOTL"  # Human monitoring with override
    else:
        governance_mode = "HOOL"  # Full auto with rollback
        
    final_verdict = "PHASED_DELIVERY"
    if conflict_level == "NONE":
        final_verdict = "FULL_COMMIT_IN_SPRINT"
    elif "conf_urgency_tech_debt" in [c["id"] for c in conflicts] and tech_res.get("risk_level") == "CRITICAL":
        final_verdict = "SPIKE_FIRST_THEN_BUILD"
    else:
        final_verdict = "SCOPE_TRIMMED_COMMIT"
        
    summary = (
        f"Phán quyết Điều phối Đa Agent (Consensus Arbiter): Đạt thỏa thuận hòa giải theo chiến lược '{final_verdict}'. "
        f"Dung hòa điểm Story Points ở mức {reconciled_points} SP (thay vì {po_points} SP của PO hay {tech_points} SP của Tech Lead). "
        "Chiến lược thực thi: Triển khai 2 giai đoạn (Phased Delivery). Nhóm sẽ phát triển Core MVP logic trong Sprint hiện tại "
        "với tiêu chuẩn kiểm thử tự động bắt buộc của Tech Lead, đồng thời dời phần giao diện mở rộng và báo cáo nâng cao sang Sprint kế tiếp để giữ đúng cam kết thời gian của Scrum Master."
    )
    
    actionable_plan = [
        f"Bước 1 (Tech Lead): Khởi tạo Technical Spike (1-2 SP) để hoàn thiện Data Schema và API Contract an toàn.",
        f"Bước 2 (Product Owner): Thống nhất phạm vi Core MVP (giới hạn trong {reconciled_points} SP), lược bỏ các màn hình mở rộng chưa thiết yếu.",
        f"Bước 3 (Scrum Master): Đưa hạng mục {reconciled_points} SP vào Sprint Backlog và theo dõi sát sao biểu đồ Burndown 3 ngày đầu.",
        f"Bước 4 (Đội ngũ Dev): Viết Unit Tests đạt độ bao phủ tối thiểu 80% trước khi mở Pull Request.",
    ]
    
    tradeoff_analysis = (
        "- Product Owner nhượng bộ: Chấp nhận cắt giảm một số giao diện phụ để kịp deadline Sprint.\n"
        "- Tech Lead nhượng bộ: Đồng ý cho phép triển khai phiên bản tinh gọn trước, sau đó refactor mở rộng ở Sprint sau.\n"
        "- Scrum Master nhượng bộ: Đồng ý chèn thêm Story Points trong giới hạn dung sai cho phép (Buffer Capacity)."
    )
    
    hitl_options = [
        {
            "option_id": "opt_balanced_phased",
            "title": "Phương án 1 (Khuyến nghị): Triển khai Phân kỳ 2 Giai đoạn",
            "description": f"Chỉ làm phần Core MVP trong Sprint này ({reconciled_points} SP), chuyển các tính năng nâng cao sang Sprint sau.",
            "pros": ["Đảm bảo không vỡ Sprint", "Đáp ứng được nhu cầu người dùng cốt lõi", "Giữ vững chất lượng mã nguồn"],
            "cons": ["Người dùng phải chờ Sprint sau để có trải nghiệm trọn vẹn 100%"],
            "points": reconciled_points,
            "target_sprint": "Sprint hiện tại (Core MVP) + Sprint sau (Full)",
            "favored_agent": "Consensus Arbiter (Cân bằng)",
        },
        {
            "option_id": "opt_po_fasttrack",
            "title": "Phương án 2: Tối đa hóa Giá trị Nghiệp vụ (Ưu tiên PO)",
            "description": f"Cố gắng làm toàn bộ tính năng với điểm ước tính rút gọn ({po_points} SP), chỉ kiểm thử các luồng cơ bản.",
            "pros": ["Người dùng có toàn bộ tính năng ngay lập tức", "Thời gian ra thị trường nhanh nhất"],
            "cons": ["Tăng nguy cơ nợ kỹ thuật", "Khả năng cao gây quá tải cho team và trễ hạn Sprint"],
            "points": po_points,
            "target_sprint": "Sprint hiện tại",
            "favored_agent": "Product Owner",
        },
        {
            "option_id": "opt_tech_lead_spike",
            "title": "Phương án 3: Ưu tiên Kiến trúc & Chất lượng (Ưu tiên Tech Lead)",
            "description": f"Thực hiện nghiên cứu Spike kiến trúc ({tech_points} SP) trong Sprint này, hoãn việc xây dựng tính năng sang Sprint kế.",
            "pros": ["Hệ thống cực kỳ bền vững, an toàn", "Tránh hoàn toàn nợ kỹ thuật và lỗi phát sinh"],
            "cons": ["Khách hàng chưa nhận được tính năng người dùng trong Sprint này"],
            "points": tech_points,
            "target_sprint": "Sprint kế tiếp",
            "favored_agent": "Tech Lead",
        },
    ]
    
    return {
        "conflict_severity": conflict_severity,
        "conflict_level": conflict_level,
        "conflicts_detected": conflicts,
        "governance_mode": governance_mode,
        "final_verdict": final_verdict,
        "reconciled_points": reconciled_points,
        "consensus_summary": summary,
        "actionable_plan": actionable_plan,
        "tradeoff_analysis": tradeoff_analysis,
        "hitl_options": hitl_options,
    }


# ==============================================================================
# MAIN MULTI-AGENT DELIBERATION ORCHESTRATOR
# ==============================================================================
async def execute_multi_agent_deliberation(
    session: Session,
    user_story: str,
    project_id: Optional[int] = None,
    sprint_id: Optional[int] = None,
    acceptance_criteria: Optional[str] = None,
    context: Optional[dict] = None,
    user_id: Optional[int] = None,
) -> dict[str, Any]:
    """
    Coordinates 3 Autonomous Reasoning Agents (PO, Tech Lead, Scrum Master),
    detects ideological conflicts, and produces an authoritative arbitration compromise.
    """
    ctx = context or {}
    if project_id:
        proj = session.get(Project, project_id)
        if proj:
            ctx["project_name"] = proj.name
    if sprint_id:
        spr = session.get(Sprint, sprint_id)
        if spr:
            ctx["sprint_name"] = spr.name
            ctx["sprint_goal"] = spr.goal

    acc_crit = acceptance_criteria or "Given user interaction, when executed, then satisfy expected business outcome."

    # 1. Autonomous Independent Reasoning Stage
    if settings.ai_use_mock:
        po_res = _mock_po_reasoning(user_story, ctx)
        tech_res = _mock_tech_lead_reasoning(user_story, ctx)
        scrum_res = _mock_scrum_master_reasoning(user_story, ctx)
    else:
        # Live LLM Reasoning
        po_prompt = AGENT_PROMPTS["po_reasoning"].format(
            user_story=user_story, acceptance_criteria=acc_crit, context=json.dumps(ctx)
        )
        tech_prompt = AGENT_PROMPTS["tech_lead_reasoning"].format(
            user_story=user_story, acceptance_criteria=acc_crit, context=json.dumps(ctx)
        )
        scrum_prompt = AGENT_PROMPTS["scrum_master_reasoning"].format(
            user_story=user_story, acceptance_criteria=acc_crit, context=json.dumps(ctx)
        )

        po_raw = await _call_openai(po_prompt)
        tech_raw = await _call_openai(tech_prompt)
        scrum_raw = await _call_openai(scrum_prompt)

        po_res = _clean_json_response(po_raw) or _mock_po_reasoning(user_story, ctx)
        tech_res = _clean_json_response(tech_raw) or _mock_tech_lead_reasoning(user_story, ctx)
        scrum_res = _clean_json_response(scrum_raw) or _mock_scrum_master_reasoning(user_story, ctx)

    # 2. Conflict Detection Stage
    conflict_severity, conflict_level, conflicts = detect_conflicts(po_res, tech_res, scrum_res)

    # 3. Arbitration Formulation Stage
    arbitration = formulate_arbitration(
        user_story=user_story,
        po_res=po_res,
        tech_res=tech_res,
        scrum_res=scrum_res,
        conflict_severity=conflict_severity,
        conflict_level=conflict_level,
        conflicts=conflicts,
    )

    # 4. Persistence into Database
    deliberation = AgentDeliberation(
        project_id=project_id,
        sprint_id=sprint_id,
        user_id=user_id,
        topic=user_story[:250],
        status="pending_hitl" if arbitration["governance_mode"] == "HITL" else "completed",
        conflict_severity=arbitration["conflict_severity"],
        conflict_level=arbitration["conflict_level"],
        governance_mode=arbitration["governance_mode"],
        final_decision=arbitration["final_verdict"],
        reconciled_points=arbitration["reconciled_points"],
        consensus_summary=arbitration["consensus_summary"],
        actionable_plan="\n".join(arbitration["actionable_plan"]),
        tradeoff_analysis=arbitration["tradeoff_analysis"],
    )
    session.add(deliberation)
    session.commit()
    session.refresh(deliberation)

    # Save 3 Agent Thoughts
    for res in [po_res, tech_res, scrum_res]:
        thought = AgentThought(
            deliberation_id=deliberation.id,
            agent_role=res.get("agent_role", "unknown"),
            agent_name=res.get("agent_name", "Agent"),
            verdict=res.get("verdict", "REVIEW"),
            thinking_process=res.get("thinking_process", ""),
            score=float(res.get("score", 0.0)),
            estimated_points=res.get("estimated_points"),
            risk_level=res.get("risk_level", "LOW"),
            key_arguments=json.dumps(res.get("key_arguments", [])),
            concerns_and_tradeoffs=res.get("concerns_and_tradeoffs", ""),
        )
        session.add(thought)
    session.commit()

    # Log usage history
    _record_usage(
        session=session,
        agent_name="Multi-Agent Deliberation Suite",
        prompt=f"Topic: {user_story}",
        response=arbitration["consensus_summary"],
        user_id=user_id,
        project_id=project_id,
    )

    return {
        "deliberation_id": deliberation.id,
        "topic": deliberation.topic,
        "agents_thoughts": [po_res, tech_res, scrum_res],
        "conflict_severity": arbitration["conflict_severity"],
        "conflict_level": arbitration["conflict_level"],
        "conflicts_detected": arbitration["conflicts_detected"],
        "governance_mode": arbitration["governance_mode"],
        "final_verdict": arbitration["final_verdict"],
        "reconciled_points": arbitration["reconciled_points"],
        "consensus_summary": arbitration["consensus_summary"],
        "actionable_plan": arbitration["actionable_plan"],
        "tradeoff_analysis": arbitration["tradeoff_analysis"],
        "hitl_options": arbitration["hitl_options"],
        "status": deliberation.status,
    }


def resolve_hitl_decision(
    session: Session,
    deliberation_id: int,
    selected_option: str,
    custom_notes: Optional[str] = None,
    user_id: Optional[int] = None,
) -> dict[str, Any]:
    """Applies a human PM approval to a high-conflict deliberation session."""
    delib = session.get(AgentDeliberation, deliberation_id)
    if not delib:
        raise ValueError("Deliberation session not found")

    delib.status = "completed"
    delib.updated_at = datetime.utcnow()
    session.add(delib)

    resolution = DeliberationResolution(
        deliberation_id=delib.id,
        resolution_type="HITL",
        selected_option=selected_option,
        approved_by_user_id=user_id,
        resolution_notes=custom_notes or f"Phê duyệt phương án {selected_option} bởi Project Manager.",
    )
    session.add(resolution)
    session.commit()

    return {
        "deliberation_id": delib.id,
        "status": "completed",
        "selected_option": selected_option,
        "resolved_at": datetime.utcnow().isoformat(),
        "message": f"Phương án '{selected_option}' đã được phê duyệt thành công bởi con người (HITL).",
    }

