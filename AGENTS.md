# AI-DRIVEN SOFTWARE PROJECT MANAGEMENT - AGENT SYSTEM RULES & GUIDELINES
> **Tệp quy tắc làm việc bắt buộc dành cho AI Agent khi thao tác trên dự án.**  
> Mọi AI Agent tham gia đọc, sửa đổi, kiểm thử hoặc mở rộng mã nguồn dự án này **BẮT BUỘC** phải tuân thủ nghiêm ngặt toàn bộ các chỉ thị trong tài liệu này.

---

## 🧭 1. NGUYÊN TẮC HÀNH XỬ CỐT LÕI (CORE AGENT PROTOCOLS)

1. **Khảo sát trước khi sửa đổi (Inspect Before Modifying)**:
   - Luôn đọc kỹ nội dung file hiện có và các module liên quan trước khi thực hiện thay đổi.
   - Không đưa ra giả định về tên hàm, thuộc tính hay API endpoint khi chưa kiểm tra mã nguồn thực tế.
2. **Bảo toàn chức năng & Khả năng chạy Offline/Mock (Preserve Mock Mode)**:
   - Hệ thống được thiết kế để có thể chạy độc lập không phụ thuộc vào OpenAI API key thông qua cờ `AI_USE_MOCK=true`.
   - Tuyệt đối không được gỡ bỏ, làm hỏng hoặc làm mất tính đồng bộ của logic Mock trong `ai-service/app/services/ai_service.py`.
3. **Toàn vẹn mã nguồn & Tài liệu (Code & Doc Integrity)**:
   - Giữ nguyên các chú thích (comments), docstrings và cấu trúc code hiện có nếu chúng không liên quan trực tiếp đến lỗi/tính năng đang xử lý.
   - Không tự ý tái cấu trúc (refactor) các module lớn ngoài phạm vi yêu cầu của người dùng.
4. **Giao tiếp & Ngôn ngữ (Language Protocol)**:
   - Phản hồi người dùng bằng **tiếng Việt**, văn phong chuyên nghiệp, súc tích và mạch lạc.
   - Giữ nguyên các thuật ngữ kỹ thuật tiêu chuẩn (vd: *User Story, Sprint, Burndown Chart, RBAC, Mock, HITL, Hook, Endpoint, Schema*).
   - Tên biến, hàm, class, commit message và code identifiers viết bằng **tiếng Anh** chuẩn kỹ thuật.
5. **Quy trình 4 bước cho mọi tác vụ (Strict 4-Step Execution Flow)**:
   - **Bước 1 - Phân tích (Analyze)**: Xác định rõ yêu cầu, các file bị ảnh hưởng và giải pháp khả thi.
   - **Bước 2 - Thực thi (Execute)**: Chỉnh sửa mã nguồn tối giản, chính xác, tuân thủ kiến trúc hiện hữu.
   - **Bước 3 - Xác thực (Verify)**: Chạy test hoặc kiểm tra cú pháp, typing để chắc chắn không sinh regression bug.
   - **Bước 4 - Báo cáo (Report)**: Tóm tắt ngắn gọn các file đã thay đổi, kết quả kiểm thử và hướng dẫn chạy/thử nghiệm.

---

## 🏗️ 2. TỔNG QUAN KIẾN TRÚC DỰ ÁN (ARCHITECTURE & STACK)

Hệ thống hoạt động theo mô hình Microservices phân tách (Decoupled Microservices):

```
AI-Driven-Software-Project-Management/
├── frontend/          # React 18 + TypeScript + Vite + Tailwind CSS (Port 5173)
├── ai-service/        # Python 3.10+ FastAPI + SQLModel + AI Agents (Port 8000)
├── backend/           # Java 21 + Spring Boot 3.2.4 + Maven (Port 8080)
└── docker-compose.yml # PostgreSQL (5432) & Redis (6379) orchestration
```

### 2.1. Frontend Service (`frontend/`)
- **Công nghệ**: React 18, TypeScript, Vite, Tailwind CSS / Vanilla CSS dark theme, Zustand, Lucide React, Ant Design, Recharts.
- **Routing & Proxy**:
  - Vite dev server chạy trên port `5173`.
  - Mọi request `/api/*` được Vite proxy sang `http://localhost:8000` (FastAPI AI Service) trong môi trường phát triển cục bộ.
- **Quản lý trạng thái (State)**: Zustand store nằm tại `frontend/src/store/` (như `auth.ts`).
- **Tập trung API**: Mọi lời gọi HTTP phải nằm trong `frontend/src/api/client.ts` hoặc các file API chuyên trách (`project.ts`, v.v.).

### 2.2. AI Microservice (`ai-service/`)
- **Công nghệ**: Python 3.10+, FastAPI, SQLModel (ORM trên nền SQLAlchemy + Pydantic), SQLite (`dev.db`) cho local / PostgreSQL cho Docker, Uvicorn.
- **Cấu hình**: `ai-service/app/config.py` dùng `pydantic.BaseSettings` đọc từ `.env`.
- **Cấu trúc module**:
  - `app/api/`: Các router REST API phân theo domain (`ai.py`, `auth.py`, `projects.py`, `sprints.py`, `stories.py`, `tasks.py`, `risks.py`, `forecasts.py`, `dashboard.py`).
  - `app/core/`: Bảo mật, JWT token (`security.py`), dependencies kiểm tra quyền RBAC (`dependencies.py`).
  - `app/models.py`: Định nghĩa toàn bộ SQLModel Database Tables.
  - `app/services/`: Nghiệp vụ AI (`ai_service.py`), CRUD cơ sở dữ liệu (`crud.py`), báo cáo thống kê (`reports.py`).
  - `app/prompts/library.py`: Thư viện prompt mẫu chuẩn hóa cho từng AI Agent.
  - `app/seed.py`: Dữ liệu mẫu khởi tạo (Users, Projects, Sprints, Tasks, Risks).

### 2.3. Backend Gateway Service (`backend/`)
- **Công nghệ**: Java 21, Spring Boot 3.2.4, Spring Data JPA, Lombok, Maven.
- **Nhiệm vụ**: API Gateway và quản lý thực thể lõi khi tích hợp toàn diện hệ sinh thái doanh nghiệp.

---

## 🤖 3. QUY TẮC NGHIỆP VỤ ĐA AGENT (MULTI-AGENT SUITE RULES)

Hệ thống sở hữu 6 AI Agents chuyên trách. Agent khi thao tác với module AI phải tuân thủ đúng định dạng đầu vào/đầu ra và vai trò:

| AI Agent | Endpoint | Vai trò & Đầu vào | Chuẩn dữ liệu đầu ra |
| :--- | :--- | :--- | :--- |
| **Requirement Agent** | `POST /ai/analyze` | Phân tích User Story / Yêu cầu tính năng | JSON: `summary`, `technical_notes`, `actors`, `goals`, `constraints`, `acceptance_hints`, `clarifying_questions`, `priority_score` (0.0-1.0), `estimated_complexity` ("Đơn giản" \| "Trung bình" \| "Phức tạp") |
| **Planning Agent** | `POST /ai/story-point` | Ước lượng độ phức tạp theo Fibonacci | JSON: `story_points` $\in \{1, 2, 3, 5, 8, 13, 21\}$, `confidence` (0.0-1.0), `justification`, `factors` (complexity, uncertainty, effort) |
| **Task Agent** | `POST /ai/breakdown` | Phân rã Story thành Subtasks | JSON: `tasks`: danh sách các object `{title, description, estimated_hours, automation_level (0.0-1.0), risk_level (0.0-1.0), token_cost}` |
| **Risk Agent** | `POST /ai/risk` | Đánh giá rủi ro dựa trên tiến độ | JSON: `overall_risk_score`, `risk_level` ("LOW" \| "MEDIUM" \| "HIGH" \| "CRITICAL"), `risks`: `[{category, probability, impact, mitigation_plan}]` |
| **Forecast Agent** | `POST /ai/forecast` | Dự báo tiến độ & Burndown | JSON: `completion_probability`, `predicted_completion_date`, `burndown_data`, `bottlenecks`, `velocity_trend` |
| **Assignment Agent** | `POST /ai/assign` | Phân công lập trình viên tối ưu | JSON: `assignments`: `[{task_id, assigned_user_id, match_score, rationale, workload_balance}]` |

> [!IMPORTANT]
> **Ghi nhận Token & Chi phí**: Mọi tương tác AI Agent (kể cả live hay mock) đều **phải** được ghi nhận lịch sử vào bảng `PromptHistory` và bảng `AIUsage` thông qua hàm `_record_usage()`.

---

## 🛡️ 4. QUY TẮC GIAO THỨC ĐIỀU PHỐI AI DEVOPS (HUMAN-AI COLLABORATION)

Mọi công việc hoặc quy trình tự động hóa AI trong dự án đều chịu sự chi phối của 3 giao thức:

1. **🟣 HITL (Human-in-the-Loop) - Duyệt thủ công bắt buộc**:
   - **Điều kiện kích hoạt**: `risk_score >= 0.60` HOẶC `automation_level < 0.40` HOẶC `estimated_cost >= $1.00`.
   - **Hành vi**: AI không được tự ý thực thi hoặc commit trạng thái mới mà phải chờ con người phê duyệt (Approve) từng bước.
2. **🔵 HOTL (Human-on-the-Loop) - Giám sát động (Mặc định)**:
   - **Điều kiện kích hoạt**: Mặc định cho các tác vụ nằm ngoài ngưỡng HITL và HOOL.
   - **Hành vi**: AI tự động xử lý, giao diện hiển thị trạng thái realtime; con người có quyền bấm **"Can thiệp" (Intervene)** để ghi đè tham số hoặc hủy lệnh.
3. **🟢 HOOL (Human-out-of-the-Loop) - Tự động hoàn toàn**:
   - **Điều kiện kích hoạt**: `risk_score < 0.30` VÀ `automation_level >= 0.70` VÀ `estimated_cost < $0.50`.
   - **Hành vi**: AI tự động hoàn tất 100% không cần xác nhận. **Bắt buộc** phải cung cấp cơ chế **"Hoàn tác" (Rollback)** để phục hồi dữ liệu ban đầu khi cần.

---

## 🔐 5. BẢO MẬT & PHÂN QUYỀN (RBAC RULES)

Hệ thống có 4 cấp độ quyền hạn, Agent phải tôn trọng cấu trúc bảo mật này khi viết code hoặc API:
- `admin`: Toàn quyền hệ thống, xem nhật ký AI (`/ai/history`), xem thống kê usage toàn diện.
- `pm` (Project Manager): Quản lý dự án, Sprint, User Stories, kích hoạt AI phân tích, phân công, quản lý rủi ro.
- `dev` (Developer): Xem dự án được phân công, cập nhật task, chạy sandbox AI DevOps, phân rã công việc.
- `viewer`: Chỉ xem (Read-only) các báo cáo, Burndown, Dashboard, không có quyền chỉnh sửa.

> [!WARNING]
> Mọi endpoint nhạy cảm trong `ai-service/app/api/` phải được bảo vệ bằng dependency `get_current_user` hoặc `require_role([...])`.

---

## 💻 6. TIÊU CHUẨN MÃ NGUỒN CHO TỪNG PHÂN HỆ (CODING STANDARDS)

### 6.1. Python (`ai-service/`)
- Sử dụng cú pháp Python 3.10+ hiện đại: `str | None` thay cho `Optional[str]`, `list[str]` thay cho `List[str]`.
- Tuân thủ chuẩn PEP 8. Format sạch, đặt tên biến có ý nghĩa.
- Đảm bảo xử lý ngoại lệ async (`try...except`) an toàn, không để unhandled exceptions làm crash Uvicorn process.
- Khi tạo hoặc cập nhật SQLModel Schema trong `app/models.py`, phải kiểm tra:
  - Kiểu dữ liệu tương thích SQLite và PostgreSQL.
  - Khóa ngoại (`foreign_key`), quan hệ (`Relationship`), và giá trị mặc định (`Field(default=...)`).
  - Cập nhật tương ứng trong `app/schemas.py` và `frontend/src/api/client.ts`.

### 6.2. Frontend (`frontend/`)
- **TypeScript**: Bật chế độ kiểm tra kiểu chặt chẽ, không sử dụng `any` vô tội vạ. Khai báo rõ interface cho Props và API Responses.
- **Component Design**: Viết component dạng functional, nhỏ gọn, tách biệt Presentation và Logic.
- **State Management**: Sử dụng Zustand cho Global State; dùng `useState`/`useMemo`/`useCallback` hợp lý cho Local State.
- **Giao diện & Trải nghiệm**:
  - Giữ phong cách Dark Theme hiện đại (nền `#0f172a`, card `#1e293b`, viền `#334155`).
  - Luôn có Skeleton hoặc Spinner khi tải dữ liệu (`isLoading`).
  - Xử lý thông báo lỗi thân thiện (Toast/Alert) khi gọi API thất bại.
- **Icons**: Ưu tiên sử dụng `lucide-react` để đồng bộ phong cách icon toàn app.

### 6.3. Backend (`backend/`)
- Tuân thủ nguyên tắc Spring Boot 3 & Clean Architecture: Controller $\rightarrow$ Service $\rightarrow$ Repository $\rightarrow$ Database Entity.
- Sử dụng Lombok để giảm boilerplate (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`).
- Trả về `ResponseEntity<T>` với HTTP status code chuẩn mực (200, 201, 400, 401, 403, 404, 500).

---

## 🧪 7. QUY TẮC KIỂM THỬ & XÁC MINH (TESTING & VERIFICATION)

Trước khi hoàn tất bất kỳ thay đổi nào, Agent phải chủ động chạy kiểm thử:

1. **Kiểm thử AI Service (Python)**:
   ```bash
   cd ai-service
   pytest tests/
   ```
   *Nếu chưa kích hoạt môi trường ảo, chạy bằng python venv hoặc đảm bảo cú pháp không có lỗi syntax.*
2. **Kiểm thử Frontend (React)**:
   ```bash
   cd frontend
   npm test
   # hoặc kiểm tra type check & build
   npm run build
   ```
3. **Kiểm thử Backend (Java)** (khi có thay đổi Java):
   ```bash
   cd backend
   .\mvnw.cmd test
   ```

---

## 🚫 8. CÁC ĐIỀU TUYỆT ĐỐI CẤM (NEVER DO)

- ❌ **KHÔNG** commit API keys, passwords hoặc chuỗi bí mật thật vào Git repository.
- ❌ **KHÔNG** xóa hoặc vô hiệu hóa file cấu hình môi trường `.env` hoặc dữ liệu mẫu trong `seed.py`.
- ❌ **KHÔNG** tự ý hạ cấp version các thư viện trong `package.json`, `requirements.txt` hay `pom.xml` trừ khi có chỉ thị rõ ràng.
- ❌ **KHÔNG** sửa đổi logic endpoint API mà không cập nhật client tương ứng ở frontend, gây vỡ giao thức kết nối.
- ❌ **KHÔNG** tự ý tạo thêm server/service ngầm chạy nền ngoài phạm vi của dự án.

