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
                full_name="Nguyễn Văn Minh",
                hashed_password=hash_password("pm123456"),
                role="pm",
            )
            session.add(pm)

        dev = session.exec(select(User).where(User.username == "dev")).first()
        if not dev:
            dev = User(
                username="dev",
                email="dev@example.com",
                full_name="Trần Đức Anh",
                hashed_password=hash_password("dev123456"),
                role="developer",
            )
            session.add(dev)

        # Extra developers
        dev2 = session.exec(select(User).where(User.username == "dev2")).first()
        if not dev2:
            dev2 = User(
                username="dev2",
                email="dev2@example.com",
                full_name="Lê Thị Hương",
                hashed_password=hash_password("dev123456"),
                role="developer",
            )
            session.add(dev2)

        dev3 = session.exec(select(User).where(User.username == "dev3")).first()
        if not dev3:
            dev3 = User(
                username="dev3",
                email="dev3@example.com",
                full_name="Phạm Quang Huy",
                hashed_password=hash_password("dev123456"),
                role="developer",
            )
            session.add(dev3)

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
        session.refresh(dev2)
        session.refresh(dev3)
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
                ("Product Owner Agent", "po_agent", "Đại diện giá trị kinh doanh, trải nghiệm người dùng và ưu tiên thị trường", AGENT_PROMPTS["po_reasoning"][:200]),
                ("Tech Lead & Architect Agent", "tech_lead_agent", "Bảo vệ kiến trúc hệ thống, ngăn chặn nợ kỹ thuật và đảm bảo chất lượng kỹ thuật", AGENT_PROMPTS["tech_lead_reasoning"][:200]),
                ("Scrum Master Delivery Agent", "scrum_master_agent", "Giám sát năng lực nhóm, ổn định vận tốc Sprint và phòng ngừa quá tải", AGENT_PROMPTS["scrum_master_reasoning"][:200]),
                ("AI Chief Project Arbiter", "arbitration_agent", "Điều phối đa agent, phát hiện mâu thuẫn và đề xuất giải pháp hòa giải đồng thuận", AGENT_PROMPTS["arbitration"][:200]),
            ]
            for name, agent_type, desc, prompt in agents:
                session.add(AIAgent(name=name, agent_type=agent_type, description=desc, system_prompt=prompt))
            session.commit()
        else:
            # Seed autonomous agents if not yet added
            autonomous_agents = [
                ("Product Owner Agent", "po_agent", "Đại diện giá trị kinh doanh, trải nghiệm người dùng và ưu tiên thị trường", AGENT_PROMPTS["po_reasoning"][:200]),
                ("Tech Lead & Architect Agent", "tech_lead_agent", "Bảo vệ kiến trúc hệ thống, ngăn chặn nợ kỹ thuật và đảm bảo chất lượng kỹ thuật", AGENT_PROMPTS["tech_lead_reasoning"][:200]),
                ("Scrum Master Delivery Agent", "scrum_master_agent", "Giám sát năng lực nhóm, ổn định vận tốc Sprint và phòng ngừa quá tải", AGENT_PROMPTS["scrum_master_reasoning"][:200]),
                ("AI Chief Project Arbiter", "arbitration_agent", "Điều phối đa agent, phát hiện mâu thuẫn và đề xuất giải pháp hòa giải đồng thuận", AGENT_PROMPTS["arbitration"][:200]),
            ]
            for name, agent_type, desc, prompt in autonomous_agents:
                existing = session.exec(select(AIAgent).where(AIAgent.agent_type == agent_type)).first()
                if not existing:
                    session.add(AIAgent(name=name, agent_type=agent_type, description=desc, system_prompt=prompt))
            session.commit()

        # ==============================================================
        # PROJECT 1: AI-Driven PM Demo (Main project)
        # ==============================================================
        project = session.exec(select(Project).where(Project.name == "AI-Driven PM Demo")).first()
        if not project:
            project = Project(
                name="AI-Driven PM Demo",
                description="Dự án mẫu quản lý phần mềm Agile với AI — bao gồm nhiều sprint, task, risk, và user story để minh họa đầy đủ tính năng hệ thống.",
                status="active",
                owner_id=pm.id,
            )
            session.add(project)
            session.commit()
            session.refresh(project)

            for u in [pm, dev, dev2, dev3, viewer]:
                role_name = "pm" if u.id == pm.id else ("viewer" if u.id == viewer.id else "developer")
                session.add(ProjectMember(project_id=project.id, user_id=u.id, role=role_name))
            session.commit()

            epic1 = Epic(
                project_id=project.id,
                title="Quản lý Sprint thông minh",
                description="Epic cho tính năng sprint board, kanban, và AI forecast",
                status="in_progress",
                priority=1,
            )
            epic2 = Epic(
                project_id=project.id,
                title="Hệ thống AI Agent",
                description="Xây dựng hệ thống đa AI agent cho PM",
                status="in_progress",
                priority=2,
            )
            session.add(epic1)
            session.add(epic2)
            session.commit()
            session.refresh(epic1)
            session.refresh(epic2)

            feature1 = Feature(
                epic_id=epic1.id,
                title="Burndown & Velocity Dashboard",
                description="Hiển thị biểu đồ burndown và velocity theo sprint",
                status="in_progress",
            )
            feature2 = Feature(
                epic_id=epic1.id,
                title="Sprint Kanban Board",
                description="Bảng kanban kéo thả cho sprint",
                status="in_progress",
            )
            feature3 = Feature(
                epic_id=epic2.id,
                title="AI Task Decomposition",
                description="AI tự động phân rã user story thành task",
                status="todo",
            )
            session.add(feature1)
            session.add(feature2)
            session.add(feature3)
            session.commit()
            session.refresh(feature1)
            session.refresh(feature2)
            session.refresh(feature3)

            now = datetime.utcnow()

            # Sprint 1 — Active
            sprint1 = Sprint(
                project_id=project.id,
                name="Sprint 1 — Foundation",
                goal="Hoàn thiện MVP backend và frontend cơ bản, authentication, và dashboard",
                status="active",
                start_date=now - timedelta(days=5),
                end_date=now + timedelta(days=9),
            )
            # Sprint 2 — Planned
            sprint2 = Sprint(
                project_id=project.id,
                name="Sprint 2 — AI Integration",
                goal="Tích hợp AI agents: requirement analysis, task breakdown, risk detection",
                status="planned",
                start_date=now + timedelta(days=10),
                end_date=now + timedelta(days=24),
            )
            # Sprint 3 — Planned
            sprint3 = Sprint(
                project_id=project.id,
                name="Sprint 3 — Polish & Deploy",
                goal="Tối ưu UI, viết test, và triển khai production",
                status="planned",
                start_date=now + timedelta(days=25),
                end_date=now + timedelta(days=39),
            )
            session.add(sprint1)
            session.add(sprint2)
            session.add(sprint3)
            session.commit()
            session.refresh(sprint1)
            session.refresh(sprint2)
            session.refresh(sprint3)

            # User Stories
            stories = [
                UserStory(
                    project_id=project.id,
                    feature_id=feature1.id,
                    sprint_id=sprint1.id,
                    title="Là PM, tôi muốn xem dashboard KPI",
                    description="Hiển thị số project, sprint, task, risk và AI usage",
                    acceptance_criteria="Given dashboard When login Then show KPI cards với dữ liệu real-time",
                    status="in_progress",
                    story_points=5,
                    assignee_id=dev.id,
                    priority=1,
                ),
                UserStory(
                    project_id=project.id,
                    feature_id=feature2.id,
                    sprint_id=sprint1.id,
                    title="Là dev, tôi muốn xem sprint board dạng kanban",
                    description="Kanban board 4 cột: Cần làm, Đang làm, Đánh giá, Hoàn thành",
                    acceptance_criteria="Given sprint board When click task Then move between columns",
                    status="in_progress",
                    story_points=8,
                    assignee_id=dev2.id,
                    priority=1,
                ),
                UserStory(
                    project_id=project.id,
                    feature_id=feature3.id,
                    sprint_id=sprint2.id,
                    title="Là dev, tôi muốn dùng AI breakdown user story",
                    description="AI phân rã story thành các task cụ thể với story point estimate",
                    acceptance_criteria="Given story When call /ai/breakdown Then return task list JSON",
                    status="todo",
                    story_points=8,
                    priority=2,
                ),
                UserStory(
                    project_id=project.id,
                    feature_id=feature1.id,
                    sprint_id=sprint1.id,
                    title="Là PM, tôi muốn xem biểu đồ burndown",
                    description="Burndown chart theo sprint, hiển thị story points còn lại theo ngày",
                    acceptance_criteria="Given burndown chart When select sprint Then show chart data",
                    status="todo",
                    story_points=5,
                    priority=2,
                ),
                UserStory(
                    project_id=project.id,
                    feature_id=feature2.id,
                    sprint_id=sprint2.id,
                    title="Là PM, tôi muốn AI phân công task tự động",
                    description="AI gợi ý phân công dựa trên skill set và workload",
                    acceptance_criteria="Given tasks When call /ai/assign Then return assignment suggestions",
                    status="todo",
                    story_points=5,
                    priority=3,
                ),
            ]
            for story in stories:
                session.add(story)
            session.commit()

            # Sprint 1 Tasks (Active — diverse statuses)
            sprint1_tasks = [
                Task(project_id=project.id, sprint_id=sprint1.id, title="Thiết kế API auth JWT", status="done", story_points=3, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Implement đăng nhập / đăng ký", status="done", story_points=3, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Tạo middleware xác thực token", status="done", story_points=2, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Xây dựng React dashboard layout", status="done", story_points=5, assignee_id=dev2.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Implement sidebar navigation", status="review", story_points=3, assignee_id=dev2.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Thiết kế database schema (SQLModel)", status="done", story_points=5, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="API CRUD cho projects", status="in_progress", story_points=3, assignee_id=dev3.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="API CRUD cho sprints", status="in_progress", story_points=3, assignee_id=dev3.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Frontend trang quản lý dự án", status="in_progress", story_points=5, assignee_id=dev2.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Viết test unit cho auth module", status="todo", story_points=3, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Setup CI/CD pipeline", status="todo", story_points=5),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Cấu hình Docker Compose", status="todo", story_points=3),
                Task(project_id=project.id, sprint_id=sprint1.id, title="Thiết kế giao diện Settings", status="todo", story_points=2, assignee_id=dev2.id),
            ]
            for task in sprint1_tasks:
                session.add(task)

            # Sprint 2 Tasks (Planned / Active)
            sprint2_tasks = [
                Task(project_id=project.id, sprint_id=sprint2.id, title="Tích hợp Gemini API cho AI agents", status="done", story_points=8, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint2.id, title="Implement Requirement Analysis Agent", status="done", story_points=5, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint2.id, title="Implement Task Breakdown Agent", status="in_progress", story_points=5, assignee_id=dev2.id),
                Task(project_id=project.id, sprint_id=sprint2.id, title="Implement Risk Detection Agent", status="todo", story_points=5, assignee_id=dev3.id),
                Task(project_id=project.id, sprint_id=sprint2.id, title="Implement AI Forecast Agent", status="todo", story_points=5),
                Task(project_id=project.id, sprint_id=sprint2.id, title="Frontend tích hợp AI buttons", status="done", story_points=3, assignee_id=dev2.id),
                Task(project_id=project.id, sprint_id=sprint2.id, title="Xử lý AI rate limiting & error handling", status="todo", story_points=3),
            ]
            for task in sprint2_tasks:
                session.add(task)

            # Sprint 3 Tasks (Planned)
            sprint3_tasks = [
                Task(project_id=project.id, sprint_id=sprint3.id, title="Tối ưu UI dark theme", status="done", story_points=3, assignee_id=dev2.id),
                Task(project_id=project.id, sprint_id=sprint3.id, title="Responsive mobile layout", status="done", story_points=5, assignee_id=dev3.id),
                Task(project_id=project.id, sprint_id=sprint3.id, title="Viết E2E tests", status="in_progress", story_points=8, assignee_id=dev.id),
                Task(project_id=project.id, sprint_id=sprint3.id, title="Performance optimization", status="todo", story_points=5),
                Task(project_id=project.id, sprint_id=sprint3.id, title="Deploy to production", status="todo", story_points=3),
            ]
            for task in sprint3_tasks:
                session.add(task)
            session.commit()

            # Risks for Project 1
            risks = [
                Risk(
                    project_id=project.id,
                    title="Thiếu dữ liệu lịch sử velocity",
                    description="Dự án mới chưa có đủ sprint data để AI forecast chính xác",
                    category="data",
                    probability=0.7,
                    impact=0.5,
                    score=0.35,
                    mitigation="Dùng mock data và human-in-the-loop validation cho 2 sprint đầu",
                ),
                Risk(
                    project_id=project.id,
                    title="API rate limit từ Gemini",
                    description="Sử dụng nhiều AI agent đồng thời có thể bị rate limit",
                    category="technical",
                    probability=0.6,
                    impact=0.4,
                    score=0.24,
                    mitigation="Implement request queue và exponential backoff",
                ),
                Risk(
                    project_id=project.id,
                    title="Scope creep do yêu cầu AI phức tạp",
                    description="AI features có thể phình to ngoài scope ban đầu",
                    category="scope",
                    probability=0.5,
                    impact=0.7,
                    score=0.35,
                    mitigation="Giới hạn mỗi sprint tối đa 2 AI feature mới, review scope weekly",
                ),
                Risk(
                    project_id=project.id,
                    title="Chưa có dev chuyên frontend React",
                    description="Team thiếu kinh nghiệm React nâng cao",
                    category="resource",
                    probability=0.4,
                    impact=0.6,
                    score=0.24,
                    mitigation="Pair programming và code review chặt chẽ, sử dụng AI code assist",
                ),
            ]
            for risk in risks:
                session.add(risk)
            session.commit()

        # ==============================================================
        # PROJECT 2: E-Commerce Platform
        # ==============================================================
        project2 = session.exec(select(Project).where(Project.name == "E-Commerce Platform")).first()
        if not project2:
            project2 = Project(
                name="E-Commerce Platform",
                description="Nền tảng thương mại điện tử với thanh toán online, quản lý kho hàng, và hệ thống gợi ý sản phẩm bằng AI.",
                status="active",
                owner_id=pm.id,
            )
            session.add(project2)
            session.commit()
            session.refresh(project2)

            for u in [pm, dev, dev2, viewer]:
                role_name = "pm" if u.id == pm.id else ("viewer" if u.id == viewer.id else "developer")
                session.add(ProjectMember(project_id=project2.id, user_id=u.id, role=role_name))
            session.commit()

            now = datetime.utcnow()
            p2_sprint1 = Sprint(
                project_id=project2.id,
                name="Sprint 1 — Core Shopping",
                goal="Xây dựng trang chủ, danh mục sản phẩm, giỏ hàng",
                status="active",
                start_date=now - timedelta(days=7),
                end_date=now + timedelta(days=7),
            )
            p2_sprint2 = Sprint(
                project_id=project2.id,
                name="Sprint 2 — Payment & Order",
                goal="Tích hợp thanh toán VNPay/Momo, quản lý đơn hàng",
                status="planned",
                start_date=now + timedelta(days=8),
                end_date=now + timedelta(days=22),
            )
            session.add(p2_sprint1)
            session.add(p2_sprint2)
            session.commit()
            session.refresh(p2_sprint1)
            session.refresh(p2_sprint2)

            p2_tasks = [
                Task(project_id=project2.id, sprint_id=p2_sprint1.id, title="Thiết kế trang chủ responsive", status="done", story_points=5, assignee_id=dev2.id),
                Task(project_id=project2.id, sprint_id=p2_sprint1.id, title="API danh mục sản phẩm", status="done", story_points=3, assignee_id=dev.id),
                Task(project_id=project2.id, sprint_id=p2_sprint1.id, title="Trang chi tiết sản phẩm", status="in_progress", story_points=5, assignee_id=dev2.id),
                Task(project_id=project2.id, sprint_id=p2_sprint1.id, title="Giỏ hàng & localStorage", status="in_progress", story_points=3, assignee_id=dev.id),
                Task(project_id=project2.id, sprint_id=p2_sprint1.id, title="Tìm kiếm & lọc sản phẩm", status="todo", story_points=5),
                Task(project_id=project2.id, sprint_id=p2_sprint1.id, title="Upload ảnh sản phẩm (S3)", status="todo", story_points=3),
                Task(project_id=project2.id, sprint_id=p2_sprint1.id, title="SEO meta tags cho sản phẩm", status="review", story_points=2, assignee_id=dev2.id),
                Task(project_id=project2.id, sprint_id=p2_sprint2.id, title="Tích hợp VNPay sandbox", status="todo", story_points=8),
                Task(project_id=project2.id, sprint_id=p2_sprint2.id, title="Tích hợp Momo sandbox", status="todo", story_points=8),
                Task(project_id=project2.id, sprint_id=p2_sprint2.id, title="Quản lý đơn hàng", status="todo", story_points=5),
                Task(project_id=project2.id, sprint_id=p2_sprint2.id, title="Email xác nhận đơn hàng", status="todo", story_points=3),
            ]
            for task in p2_tasks:
                session.add(task)

            p2_stories = [
                UserStory(
                    project_id=project2.id,
                    sprint_id=p2_sprint1.id,
                    title="Là khách hàng, tôi muốn xem danh sách sản phẩm",
                    description="Hiển thị grid sản phẩm với ảnh, giá, tên",
                    status="in_progress",
                    story_points=5,
                    assignee_id=dev2.id,
                    priority=1,
                ),
                UserStory(
                    project_id=project2.id,
                    sprint_id=p2_sprint1.id,
                    title="Là khách hàng, tôi muốn thêm sản phẩm vào giỏ hàng",
                    description="Thêm/xóa/thay đổi số lượng sản phẩm trong giỏ",
                    status="todo",
                    story_points=3,
                    priority=2,
                ),
            ]
            for story in p2_stories:
                session.add(story)

            p2_risks = [
                Risk(
                    project_id=project2.id,
                    title="Sandbox payment API không ổn định",
                    description="VNPay/Momo sandbox thường xuyên downtime",
                    category="technical",
                    probability=0.6,
                    impact=0.7,
                    score=0.42,
                    mitigation="Mock payment gateway cho development, chỉ test sandbox khi staging",
                ),
                Risk(
                    project_id=project2.id,
                    title="Hiệu năng tải ảnh sản phẩm",
                    description="Upload nhiều ảnh chất lượng cao sẽ chậm",
                    category="performance",
                    probability=0.5,
                    impact=0.4,
                    score=0.2,
                    mitigation="Image compression trước upload, CDN cache, lazy loading",
                ),
            ]
            for risk in p2_risks:
                session.add(risk)
            session.commit()

        # ==============================================================
        # PROJECT 3: Mobile Health App
        # ==============================================================
        project3 = session.exec(select(Project).where(Project.name == "Mobile Health App")).first()
        if not project3:
            project3 = Project(
                name="Mobile Health App",
                description="Ứng dụng theo dõi sức khỏe cá nhân: đo nhịp tim, theo dõi giấc ngủ, lịch tập luyện, và chatbot sức khỏe AI.",
                status="planning",
                owner_id=pm.id,
            )
            session.add(project3)
            session.commit()
            session.refresh(project3)

            for u in [pm, dev3, viewer]:
                role_name = "pm" if u.id == pm.id else ("viewer" if u.id == viewer.id else "developer")
                session.add(ProjectMember(project_id=project3.id, user_id=u.id, role=role_name))
            session.commit()

            now = datetime.utcnow()
            p3_sprint1 = Sprint(
                project_id=project3.id,
                name="Sprint 1 — MVP Core",
                goal="Xây dựng tính năng cốt lõi: đăng ký, hồ sơ sức khỏe, dashboard",
                status="planned",
                start_date=now + timedelta(days=3),
                end_date=now + timedelta(days=17),
            )
            session.add(p3_sprint1)
            session.commit()
            session.refresh(p3_sprint1)

            p3_tasks = [
                Task(project_id=project3.id, sprint_id=p3_sprint1.id, title="Thiết kế UI/UX wireframe", status="todo", story_points=5),
                Task(project_id=project3.id, sprint_id=p3_sprint1.id, title="Setup React Native project", status="todo", story_points=3),
                Task(project_id=project3.id, sprint_id=p3_sprint1.id, title="API hồ sơ sức khỏe người dùng", status="todo", story_points=5),
                Task(project_id=project3.id, sprint_id=p3_sprint1.id, title="Dashboard chỉ số sức khỏe", status="todo", story_points=8),
                Task(project_id=project3.id, sprint_id=p3_sprint1.id, title="Tích hợp Google Fit / Apple Health", status="todo", story_points=8),
                Task(project_id=project3.id, sprint_id=p3_sprint1.id, title="AI chatbot sức khỏe cơ bản", status="todo", story_points=8),
            ]
            for task in p3_tasks:
                session.add(task)

            p3_risks = [
                Risk(
                    project_id=project3.id,
                    title="Quy định bảo mật dữ liệu y tế",
                    description="Dữ liệu sức khỏe cần tuân thủ quy định bảo mật nghiêm ngặt",
                    category="compliance",
                    probability=0.8,
                    impact=0.9,
                    score=0.72,
                    mitigation="Encrypt data at rest & in transit, audit logging, HIPAA-like compliance checklist",
                ),
            ]
            for risk in p3_risks:
                session.add(risk)
            session.commit()


if __name__ == "__main__":
    seed_database()
    print("Database seeded successfully.")
