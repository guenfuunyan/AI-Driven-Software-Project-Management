from datetime import datetime, timedelta

from sqlmodel import Session, select

from .config import get_settings
from .core.security import hash_password
from .db import engine, init_db
from .models import (
    AIAgent,
    Epic,
    Feature,
    Project,
    ProjectMember,
    Risk,
    Role,
    Sprint,
    Task,
    User,
    UserStory,
)
from .prompts.library import AGENT_PROMPTS

settings = get_settings()


def seed_database() -> None:
    init_db()
    with Session(engine) as session:
        roles = [
            ("admin", "System administrator"),
            ("pm", "Project manager"),
            ("developer", "Developer"),
            ("viewer", "Read-only viewer"),
        ]
        for role_name, description in roles:
            existing_role = session.exec(select(Role).where(Role.name == role_name)).first()
            if not existing_role:
                session.add(Role(name=role_name, description=description))
        session.commit()

        admin = session.exec(select(User).where(User.username == "admin")).first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@example.com",
                full_name="System Admin",
                hashed_password=hash_password("admin123"),
                role="admin",
            )
            session.add(admin)

        pm = session.exec(select(User).where(User.username == "pm")).first()
        if not pm:
            pm = User(
                username="pm",
                email="pm@example.com",
                full_name="Project Manager",
                hashed_password=hash_password("pm123456"),
                role="pm",
            )
            session.add(pm)

        dev = session.exec(select(User).where(User.username == "dev")).first()
        if not dev:
            dev = User(
                username="dev",
                email="dev@example.com",
                full_name="Developer One",
                hashed_password=hash_password("dev123456"),
                role="developer",
            )
            session.add(dev)

        viewer = session.exec(select(User).where(User.username == "viewer")).first()
        if not viewer:
            viewer = User(
                username="viewer",
                email="viewer@example.com",
                full_name="Read Only Viewer",
                hashed_password=hash_password("viewer123456"),
                role="viewer",
            )
            session.add(viewer)

        session.commit()
        session.refresh(admin)
        session.refresh(pm)
        session.refresh(dev)
        session.refresh(viewer)

        if not session.exec(select(AIAgent).where(AIAgent.agent_type == "requirement")).first():
            agents = [
                ("Requirement Agent", "requirement", "Phân tích yêu cầu và user story", AGENT_PROMPTS["requirement"][:200]),
                ("Planning Agent", "planning", "Ước lượng story point và lập kế hoạch", AGENT_PROMPTS["planning"][:200]),
                ("Task Agent", "task", "Phân rã user story thành task", AGENT_PROMPTS["task"][:200]),
                ("Risk Agent", "risk", "Phát hiện và đánh giá rủi ro", AGENT_PROMPTS["risk"][:200]),
                ("Forecast Agent", "forecast", "Dự báo velocity và burndown", AGENT_PROMPTS["forecast"][:200]),
                ("Assignment Agent", "assignment", "Gợi ý phân công task", AGENT_PROMPTS["assignment"][:200]),
                ("Review Agent", "review", "Review công việc và code", AGENT_PROMPTS["review"][:200]),
                ("Documentation Agent", "documentation", "Sinh tài liệu kỹ thuật", AGENT_PROMPTS["documentation"][:200]),
            ]
            for name, agent_type, desc, prompt in agents:
                session.add(AIAgent(name=name, agent_type=agent_type, description=desc, system_prompt=prompt))
            session.commit()

        project = session.exec(select(Project).where(Project.name == "AI-Driven PM Demo")).first()
        if not project:
            project = Project(
                name="AI-Driven PM Demo",
                description="Dự án mẫu quản lý phần mềm Agile với AI",
                status="active",
                owner_id=pm.id,
            )
            session.add(project)
            session.commit()
            session.refresh(project)

            session.add(ProjectMember(project_id=project.id, user_id=pm.id, role="pm"))
            session.add(ProjectMember(project_id=project.id, user_id=dev.id, role="developer"))
            session.add(ProjectMember(project_id=project.id, user_id=viewer.id, role="viewer"))
            session.commit()

            epic = Epic(
                project_id=project.id,
                title="Quản lý Sprint thông minh",
                description="Epic cho tính năng sprint và AI forecast",
                status="in_progress",
                priority=1,
            )
            session.add(epic)
            session.commit()
            session.refresh(epic)

            feature = Feature(
                epic_id=epic.id,
                title="Burndown & Velocity Dashboard",
                description="Hiển thị biểu đồ burndown và velocity",
                status="in_progress",
            )
            session.add(feature)
            session.commit()
            session.refresh(feature)

            now = datetime.utcnow()
            sprint = Sprint(
                project_id=project.id,
                name="Sprint 1",
                goal="Hoàn thiện MVP backend và frontend",
                status="active",
                start_date=now - timedelta(days=3),
                end_date=now + timedelta(days=11),
            )
            session.add(sprint)
            session.commit()
            session.refresh(sprint)

            stories = [
                UserStory(
                    project_id=project.id,
                    feature_id=feature.id,
                    sprint_id=sprint.id,
                    title="Là PM, tôi muốn xem dashboard KPI",
                    description="Hiển thị số project, sprint, task, risk và AI usage",
                    acceptance_criteria="Given dashboard When login Then show KPI cards",
                    status="in_progress",
                    story_points=5,
                    assignee_id=dev.id,
                    priority=1,
                ),
                UserStory(
                    project_id=project.id,
                    feature_id=feature.id,
                    sprint_id=sprint.id,
                    title="Là dev, tôi muốn dùng AI breakdown user story",
                    description="AI phân rã story thành các task cụ thể",
                    acceptance_criteria="Given story When call /ai/breakdown Then return task list",
                    status="todo",
                    story_points=8,
                    priority=2,
                ),
            ]
            for story in stories:
                session.add(story)
            session.commit()

            tasks = [
                Task(project_id=project.id, sprint_id=sprint.id, title="Thiết kế API auth JWT", status="done", story_points=3, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint.id, title="Implement AI agents", status="in_progress", story_points=5, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint.id, title="Xây dựng React dashboard", status="todo", story_points=5, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint.id, title="Viết test integration", status="todo", story_points=3, assignee_id=dev.id),
            ]
            for task in tasks:
                session.add(task)
            session.commit()

            session.add(
                Risk(
                    project_id=project.id,
                    title="Thiếu dữ liệu lịch sử velocity",
                    description="Dự án mới chưa có đủ sprint để forecast chính xác",
                    category="data",
                    probability=0.7,
                    impact=0.5,
                    score=0.35,
                    mitigation="Dùng mock data và human-in-the-loop validation",
                )
            )
            session.commit()


if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully.")
