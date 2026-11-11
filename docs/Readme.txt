DỰ ÁN: HỆ THỐNG QUẢN LÝ DỰ ÁN PHẦN MỀM AGILE TÍCH HỢP AI MULTI-AGENT
Tài liệu Đặc tả Kỹ thuật và Kiến trúc Hệ thống (Single Source of Truth)
========================================================================

PHẦN I. TỔNG QUAN DỰ ÁN
=======================
1. Giới thiệu
Dự án "AI-Driven Software Project Management" là hệ thống quản lý dự án phần mềm theo phương pháp luận Agile (Scrum/Kanban) tích hợp trí tuệ nhân tạo đa tác tử (AI Multi-Agent). Hệ thống hỗ trợ đắc lực cho các nhóm phát triển phần mềm trong việc tự động hóa quy trình nghiệp vụ, phân tích yêu cầu, phân rã công việc, dự báo rủi ro và tối ưu hóa nguồn lực.

2. Vấn đề thực tế
- Quản lý dự án truyền thống tốn nhiều thời gian cho việc phân tích yêu cầu thô từ khách hàng thành các tài liệu nghiệp vụ (Epic, Feature, User Story).
- Việc ước lượng độ phức tạp (Story Point) và phân chia công việc (Task Breakdown) thường mang tính cảm tính, thiếu dữ liệu lịch sử đối chiếu.
- Khó khăn trong việc phát hiện sớm các rủi ro kỹ thuật hoặc rủi ro tiến độ (vượt tiến trình, thiếu hụt nhân lực).
- Lập kế hoạch Sprint thủ công dễ dẫn tới sai số lớn trong việc tính toán Velocity (Vận tốc Sprint) và biểu đồ Burndown.

3. Mục tiêu
- Xây dựng một nền tảng quản lý dự án Agile hiện đại với giao diện trực quan và bảo mật cao.
- Tích hợp hệ thống Multi-Agent AI sử dụng mô hình ngôn ngữ lớn (LLM - OpenAI) để tự động hóa và hỗ trợ ra quyết định.
- Triển khai cơ chế cộng tác Human-AI linh hoạt theo các mô hình tương tác tương ứng với mức độ tự động hóa và rủi ro công việc.

4. Phạm vi
Hệ thống bao gồm ứng dụng web tương tác thời gian thực, dịch vụ RESTful API xử lý CRUD nghiệp vụ dự án, và dịch vụ xử lý AI tác tử chạy song song. Hỗ trợ đầy đủ vòng đời Agile từ khâu tiếp nhận Requirement thô đến khâu Deployment.

5. Đối tượng sử dụng
- Project Manager (PM) / Scrum Master: Theo dõi tiến độ, quản lý rủi ro, dự báo tiến trình và tối ưu hóa Sprint.
- Developer / Team Member: Xem danh sách task, báo cáo tiến độ, cập nhật trạng thái công việc và nhận hỗ trợ gợi ý từ AI.
- Product Owner (PO): Quản lý Product Backlog, tạo lập User Story và duyệt tiêu chí hoàn thành.
- System Admin: Cấu hình hệ thống, quản lý tài khoản, phân quyền và cấu hình AI Agents.
- Viewer: Khách hàng hoặc đối tác cần theo dõi báo cáo tiến độ dưới dạng chỉ đọc.

6. Giá trị mang lại
- Giảm đến 60% thời gian tạo lập tài liệu và phân rã task nhờ AI.
- Tăng độ chính xác của dự báo tiến độ thông qua phân tích dữ liệu lịch sử thực tế kết hợp với mô hình dự báo của Forecast Agent.
- Cải thiện chất lượng phần mềm nhờ cơ chế Review Agent liên tục rà soát mã nguồn và tài liệu.

7. Product Vision
Trở thành trợ lý số đắc lực cho các dự án phát triển phần mềm, biến việc quản lý dự án từ thụ động (ghi nhận trạng thái) sang chủ động (dự báo và tự động thực thi các tác vụ lặp lại).

8. Kiến trúc Human-AI
Hệ thống thiết kế theo kiến trúc Human-in-the-loop (HITL) và Human-on-the-loop (HOTL), phân chia mức độ cộng tác thành 3 chế độ tương tác (Collaboration Modes):
- HITL (Human-in-the-loop): Áp dụng khi công việc có độ rủi ro cao (Risk >= 0.6) hoặc độ tự động hóa thấp (< 0.4). AI sẽ sinh ra các đề xuất (ví dụ: code, phân rã task phức tạp), nhưng hệ thống yêu cầu con người phê duyệt thủ công từng bước trước khi lưu trữ hoặc thực thi.
- HOTL (Human-on-the-loop): Chế độ mặc định. AI tự động thực hiện luồng công việc liên tục, con người đứng ngoài giám sát tiến trình trực quan qua UI pipeline, có quyền tạm dừng, can thiệp hoặc hủy bỏ giữa chừng.
- HOOL (Human-out-of-loop): Áp dụng khi công việc có độ rủi ro thấp (Risk < 0.3), độ tự động hóa cao (>= 0.7) và chi phí ước lượng thấp. AI sẽ tự động thực hiện hoàn toàn từ đầu đến cuối và lưu kết quả. Để đảm bảo an toàn, hệ thống cung cấp tính năng Undo/Rollback khôi phục trạng thái cũ.


PHẦN II. PHÂN TÍCH NGHIỆP VỤ AGILE
=================================
1. Quy trình Agile đầy đủ trong hệ thống:
Requirement (Yêu cầu thô từ khách hàng)
  │
  ▼
User Story (Câu chuyện người dùng cụ thể, mang lại giá trị)
  │
  ▼
Epic (Chủ đề lớn chứa nhiều Feature)
  │
  ▼
Feature (Tính năng sản phẩm cụ thể)
  │
  ▼
Task (Công việc chi tiết cho lập trình viên để hoàn thành Story)
  │
  ▼
Sprint (Chu kỳ làm việc ngắn từ 1-4 tuần)
  │
  ▼
Release (Phiên bản phần mềm đóng gói sản phẩm của Sprint)
  │
  ▼
Deployment (Triển khai sản phẩm lên môi trường staging/production)

2. Giải thích thiết kế quy trình:
- Hệ thống duy trì mối quan hệ chặt chẽ giữa các cấp độ nghiệp vụ để đảm bảo khả năng truy vết nguồn gốc (Traceability). Mỗi dòng code hay task được thực thi đều phải ánh xạ ngược lại một User Story và một Requirement cụ thể.
- Việc phân tách rõ ràng giúp AI Agents có thể hoạt động đúng ngữ cảnh chuyên biệt: Requirement Agent chỉ làm việc ở tầng phân tích yêu cầu vĩ mô, trong khi Task Agent chỉ tập trung phân rã các bước kỹ thuật vi mô ở cấp độ Task.


PHẦN III. TOÀN BỘ USE CASE
===========================
Hệ thống hỗ trợ 14 Use Case chính được phân chia theo phân quyền hệ thống:

UC-01: Quản lý dự án (Tạo mới, Sửa, Xóa, Xem danh sách dự án)
- Actor: PM, Admin.
- Pre-condition: Đã đăng nhập vào hệ thống.
- Normal Flow: Người dùng vào trang dự án -> Chọn Tạo mới -> Nhập thông tin -> Hệ thống lưu trữ vào CSDL PostgreSQL và thông báo thành công.

UC-02: Quản lý Sprint (Lập kế hoạch Sprint, Kích hoạt, Đóng Sprint)
- Actor: PM.
- Normal Flow: Chọn dự án -> Chọn Tạo Sprint -> Nhập Goal, Start/End Date -> Thêm User Story vào Sprint -> Bắt đầu Sprint.

UC-03: Quản lý User Story (Tạo, Sửa, Xem Backlog)
- Actor: PM, PO, Developer.

UC-04: Quản lý Task (Tạo task thủ công, cập nhật trạng thái task trên Kanban)
- Actor: PM, Developer.

UC-05: Phân tích yêu cầu thô với AI (AI Requirement Analysis)
- Actor: PM, PO.
- Description: Gửi văn bản yêu cầu thô của khách hàng lên Requirement Agent để bóc tách thành tóm tắt, tác nhân, ràng buộc và các câu hỏi làm rõ.

UC-06: Phân rã User Story thành Tasks tự động (AI Task Breakdown)
- Actor: PM, Developer.
- Description: Task Agent tự động phân tích User Story và sinh ra danh sách Task kỹ thuật kèm theo các chỉ số: Automation Level, Risk Level, AI Cost và Collaboration Mode (HITL/HOTL/HOOL).

UC-07: Ước lượng Story Point với AI (AI Story Point Estimation)
- Actor: PM, PO.
- Description: Planning Agent ước lượng độ phức tạp của User Story dựa trên mô tả và các tiêu chí chấp nhận.

UC-08: Phát hiện rủi ro dự án bằng AI (AI Risk Detection)
- Actor: PM.
- Description: Risk Agent quét toàn bộ dữ liệu dự án và đưa ra cảnh báo về rủi ro kỹ thuật, nhân sự hoặc tiến độ kèm phương án giảm thiểu.

UC-09: Dự báo tiến độ Sprint bằng AI (AI Project Forecasting)
- Actor: PM.
- Description: Forecast Agent sử dụng dữ liệu thực tế của Sprint hiện tại và quá khứ để dự đoán Vận tốc (Velocity) và biểu đồ Burndown của các Sprint tiếp theo.

UC-10: Gợi ý phân công công việc tự động (AI Task Assignment)
- Actor: PM.
- Description: Assignment Agent đánh giá kỹ năng của các thành viên trong dự án và khối lượng công việc hiện tại để đề xuất phân công tối ưu.

UC-11: Review nội dung và tài liệu với AI (AI Review)
- Actor: PM, Developer.
- Description: Review Agent kiểm tra chéo nội dung công việc để phát hiện điểm thiếu sót hoặc không đồng bộ.

UC-12: Sinh tài liệu kỹ thuật tự động (AI Documentation)
- Actor: PM, Developer.
- Description: Documentation Agent sinh tài liệu kỹ thuật chi tiết dựa trên mã nguồn hoặc nghiệp vụ đã thiết kế.

UC-13: Hoàn tác tác vụ tự động (Undo HOOL Task)
- Actor: PM, Developer.
- Description: Hoàn tác một task chạy ở chế độ HOOL về trạng thái cũ thông qua lịch sử phiên bản lưu trong DB.

UC-14: Quản lý Lịch sử tác vụ và Nhật ký hệ thống (Audit Log & Task History)
- Actor: Admin, PM.


PHẦN IV. DOMAIN MODEL (MÔ HÌNH MIỀN)
=====================================
Hệ thống sử dụng các thực thể nghiệp vụ cốt lõi sau:
1. User: Thông tin tài khoản người dùng (id, username, email, full_name, hashed_password, role, is_active, created_at, deleted_at).
2. Role: Danh mục vai trò trong hệ thống (admin, pm, developer, viewer).
3. Project: Dự án phần mềm (id, name, description, status, owner_id, created_at, updated_at, deleted_at, version).
4. ProjectMember: Bảng trung gian liên kết User và Project kèm vai trò cụ thể trong dự án (project_id, user_id, role, joined_at).
5. Epic: Chủ đề lớn trong dự án (id, project_id, title, description, status, priority, created_at, deleted_at).
6. Feature: Tính năng thuộc Epic (id, epic_id, title, description, status, created_at, deleted_at).
7. UserStory: Câu chuyện người dùng (id, project_id, feature_id, sprint_id, title, description, acceptance_criteria, status, story_points, assignee_id, priority, created_at, deleted_at).
8. Task: Công việc chi tiết của lập trình viên (id, project_id, sprint_id, story_id, title, description, status, story_points, assignee_id, automation_level, risk_level, ai_cost_estimate, collaboration_mode, created_at, updated_at, deleted_at).
9. Comment: Bình luận trong các thực thể (id, user_id, entity_type, entity_id, content, created_at).
10. Notification: Thông báo thời gian thực gửi tới người dùng (id, user_id, title, content, is_read, created_at).
11. Risk: Rủi ro dự án do AI phát hiện hoặc PM tạo thủ công (id, project_id, title, description, category, probability, impact, mitigation, detected_by_ai, status, created_at, deleted_at).
12. Forecast: Dự báo tiến độ (id, project_id, sprint_id, forecast_type, predicted_value, confidence, notes, created_at).
13. AIAgent: Định nghĩa cấu hình tác tử AI (id, name, agent_type, description, system_prompt, is_active).
14. AIJob: Nhật ký tiến trình chạy tác vụ AI (id, agent_type, project_id, status, input_data, output_data, error_message, created_at, updated_at).
15. PromptHistory: Lịch sử gọi LLM (id, agent_id, user_id, prompt, response, tokens_used, created_at).
16. AIUsage: Nhật ký đo lường lượng token tiêu thụ và chi phí (id, user_id, project_id, agent_name, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at).


PHẦN V. THIẾT KẾ DATABASE (POSTGRESQL)
======================================
1. Hệ quản trị CSDL: PostgreSQL 16.
2. Các quan hệ chính:
- One-to-Many: Project -> Sprints, Project -> UserStories, Project -> Tasks, Project -> Risks.
- Many-to-Many: Project <-> User qua bảng trung gian ProjectMember.
- One-to-Many: UserStory -> Tasks.
3. Chỉ mục (Indexes):
- Tối ưu hóa truy vấn tìm kiếm nhanh: index trên các cột `username`, `email` của bảng `users`.
- Tối ưu hóa truy vấn dự án: index trên `project_id`, `sprint_id`, `story_id` của bảng `tasks` và `user_stories`.
4. Ràng buộc bảo toàn dữ liệu:
- Sử dụng Foreign Keys (Khóa ngoại) đảm bảo tính toàn vẹn tham chiếu.
- Sử dụng Soft Delete (Xóa mềm): Các bảng nghiệp vụ quan trọng đều có trường `deleted_at`. Khi xóa, hệ thống chỉ cập nhật trường này bằng thời gian hiện tại thay vị xóa vật lý khỏi đĩa cứng, giúp tránh mất mát dữ liệu và phục vụ việc khôi phục trạng thái.
- Trường `version` (kiểm soát phiên bản đồng thời - Optimistic Locking) được tích hợp trong bảng `projects` để tránh xung đột ghi đè dữ liệu.


PHẦN VI. BACKEND SPECIFICATION (SPRING BOOT)
============================================
Spring Boot đóng vai trò là Backend REST API chính xử lý nghiệp vụ lưu trữ dữ liệu cốt lõi của hệ thống.
1. Kiến trúc phân tầng (Layered Architecture):
Controller ──► Service ──► Repository ──► CSDL PostgreSQL
- Controllers (tầng giao tiếp): Tiếp nhận HTTP Request từ Frontend, thực hiện tiền kiểm tra định dạng và gọi tầng Service tương ứng.
- Services (tầng nghiệp vụ): Xử lý logic nghiệp vụ, giao dịch database (Transactions) và gọi các Repository để truy xuất dữ liệu.
- Repositories (tầng dữ liệu): Kế thừa từ `JpaRepository` của Spring Data JPA để tự động sinh các câu lệnh SQL tương tác với PostgreSQL.
- Models (tầng thực thể): Sử dụng JPA annotations (@Entity, @Table, @Id, @GeneratedValue, @ManyToOne...) kết hợp với thư viện Lombok (@Data) để sinh tự động các hàm Getter/Setter/ToString giúp code ngắn gọn.

2. Cấu hình chính (`backend/src/main/resources/application.yml`):
- Chạy trên cổng 8080.
- Datasource cấu hình kết nối PostgreSQL với cơ chế tự động cập nhật schema (`ddl-auto: update`).
- Định nghĩa biến môi trường phục vụ gọi dịch vụ tác tử `ai-service`: `ai-service.url` mặc định là `http://localhost:8000`.


PHẦN VII. FRONTEND SPECIFICATION (REACT + TYPESCRIPT)
=====================================================
Frontend được xây dựng bằng React 18 sử dụng công cụ build Vite siêu nhanh và lập trình chặt chẽ với TypeScript.
1. Quản lý trạng thái (State Management): Sử dụng thư viện `Zustand` kết hợp middleware `persist` lưu trạng thái đăng nhập (`authStore.ts`) và trạng thái dự án đang chọn (`projectStore.ts`).
2. CSS Styling: Sử dụng Vanilla CSS tùy biến cao được khai báo hệ thống biến màu sắc hiện đại trong `index.css`, tạo giao diện Glassmorphism thời thượng, hiệu ứng Dark Mode dịu mắt và chuyển động mượt mà khi di chuột.
3. Thư viện kết nối API: Axios (`apiClient`) cấu hình interceptor tự động chèn Authorization Bearer token vào Header của mọi request và tự động đăng xuất người dùng nếu nhận mã lỗi 401.
4. Danh sách các trang chính:
- LoginPage: Đăng nhập hệ thống với tài khoản demo có sẵn.
- DashboardPage: Xem tổng quan số lượng dự án, danh sách AI Jobs đang thực thi gần đây.
- ProjectsPage: Tạo mới, cập nhật dự án và xem danh sách dự án hiện có.
- SprintPage: Hiển thị bảng Kanban kéo thả trực quan để cập nhật trạng thái Task (To Do, In Progress, Review, Done).
- StoriesPage: Quản lý Product Backlog, tích hợp các nút gọi AI phân tích yêu cầu, phân rã task và ước lượng story point.
- RisksPage: Xem danh sách rủi ro và nút bấm gọi AI Risk Agent quét phát hiện rủi ro tự động.
- ForecastPage: Hiển thị biểu đồ Burndown và đồ thị Velocity dự kiến của dự án.
- AIPage: Quản lý danh sách các tác tử AI Agent, cấu hình prompt hệ thống cho từng Agent và theo dõi lịch sử tiêu thụ token.
- SettingsPage: Cập nhật thông tin cá nhân.


PHẦN VIII. KIẾN TRÚC AI (AI ARCHITECTURE)
=========================================
Hệ thống tích hợp mô hình OpenAI thông qua dịch vụ trung gian FastAPI (`ai-service`).
1. Prompt Engineering: Sử dụng prompt cấu trúc chặt chẽ có phân vai (Role Prompting), định hướng rõ ràng mục tiêu và cung cấp ví dụ mẫu (Few-shot Prompting).
2. JSON Mode & Structured Output: Để đảm bảo AI trả về định dạng dữ liệu có cấu trúc ổn định cho backend bóc tách, hệ thống cấu hình tham số `response_format={"type": "json_object"}` của OpenAI API. Mọi phản hồi từ LLM đều được bắt buộc trả về dưới dạng JSON thô tuân thủ schema định nghĩa sẵn.
3. Quá trình xử lý:
Yêu cầu từ Frontend ──► API Route FastAPI ──► Nạp System Prompt tương ứng từ Library ──► Gọi OpenAI API (JSON Mode) ──► Phân tích dữ liệu JSON trả về ──► Lưu lịch sử tiêu thụ token ──► Lưu kết quả vào PostgreSQL ──► Trả phản hồi về Frontend.


PHẦN IX. KIẾN TRÚC TÁC TỬ (AI AGENT & COLLABORATION)
===================================================
1. Sơ đồ tương tác đa tác tử (Multi-Agent Cooperation):
- Khi người dùng gửi một Requirement thô:
  Requirement Agent (Phân tích, tóm tắt) ──► Planning Agent (Ước lượng tổng quan) ──► Task Agent (Phân rã thành tasks kỹ thuật cụ thể).
- Trong suốt tiến trình chạy dự án:
  Risk Agent (Quét rủi ro hàng ngày) ◄──► Forecast Agent (Phân tích tốc độ hoàn thành) ──► Assignment Agent (Gợi ý phân chia task).

2. Quy trình tương tác cộng tác Human-AI trong ứng dụng:
- HOOL: Người dùng kích hoạt tác vụ -> AI chạy và lưu kết quả ngay lập tức -> Giao diện cập nhật trạng thái kèm nút "Undo" để người dùng hủy bỏ nếu muốn phục hồi trạng thái trước đó.
- HOTL: Giao diện hiển thị một pipeline trực quan mô tả các bước công việc Agent đang làm. Người dùng có thể nhấn Pause để dừng luồng, can thiệp chỉnh sửa dữ liệu trung gian, hoặc Abort để hủy bỏ tiến trình trước khi AI lưu vào CSDL.
- HITL: Tại các điểm nút quan trọng (ví dụ: tạo task có chi phí cao hoặc rủi ro lớn), tiến trình sẽ dừng lại và hiển thị hộp thoại yêu cầu người dùng xác nhận "Approve" (Đồng ý) hoặc "Reject" (Từ chối). AI chỉ thực hiện tiếp khi được phê duyệt thủ công.


PHẦN X. THƯ VIỆN PROMPT MẪU (PROMPT LIBRARY)
=============================================
Hệ thống quản lý các System Prompts chuyên biệt cho từng tác tử trong `ai-service/app/prompts/library.py`:

1. Prompt phân tích User Story (Requirement Agent):
"Bạn là một Product Owner giàu kinh nghiệm. Hãy phân tích User Story dưới đây và trả về một đối tượng JSON chứa: tóm tắt ý nghĩa, các tác nhân liên quan, điều kiện tiên quyết và danh sách gợi ý tiêu chí chấp nhận (acceptance criteria)..."

2. Prompt phân rã Task (Task Agent):
"Bạn là kỹ sư hệ thống. Hãy phân rã User Story sau thành danh sách các task kỹ thuật cụ thể. Với mỗi task, hãy ước lượng số giờ cần thực hiện, đánh giá chỉ số Automation Level (từ 0.0 đến 1.0), chỉ số Risk Level (từ 0.0 đến 1.0) và ước lượng chi phí AI Cost ($). Hãy trả về đúng cấu trúc JSON quy định..."

3. Prompt phát hiện rủi ro (Risk Agent):
"Hãy quét qua danh sách các task, sprint và lịch sử hoàn thành của dự án dưới đây. Hãy tìm ra ít nhất 3 rủi ro tiềm ẩn lớn nhất về tiến độ, chất lượng mã nguồn hoặc sự quá tải nhân sự. Đề xuất phương án giảm thiểu cụ thể cho mỗi rủi ro..."


PHẦN XI. API DESIGN (THIẾT KẾ REST API ĐẦY ĐỦ)
==============================================
Hệ thống thiết kế API chuẩn RESTful, dữ liệu truyền nhận qua định dạng JSON.

1. Nhóm API Hệ thống & Nghiệp vụ (được phân tải giữa Spring Boot và FastAPI):
- `POST /api/auth/register`: Đăng ký tài khoản mới.
- `POST /api/auth/login`: Đăng nhập hệ thống (trả về access_token JWT và refresh_token).
- `POST /api/auth/refresh`: Cấp mới access_token bằng refresh_token.
- `GET /api/auth/me`: Lấy thông tin tài khoản hiện tại.
- `GET /api/projects`: Danh sách dự án người dùng tham gia.
- `POST /api/projects`: Tạo dự án mới.
- `PATCH /api/projects/{project_id}`: Cập nhật thông tin dự án.
- `DELETE /api/projects/{project_id}`: Xóa mềm dự án.
- `GET /api/sprints/projects/{project_id}`: Lấy danh sách Sprint thuộc dự án.
- `POST /api/sprints/projects/{project_id}`: Tạo mới Sprint.
- `PATCH /api/sprints/{sprint_id}`: Cập nhật trạng thái Sprint.
- `GET /api/tasks?project_id={id}&sprint_id={id}`: Lấy danh sách Task có bộ lọc.
- `POST /api/tasks/projects/{project_id}`: Tạo task mới.
- `PATCH /api/tasks/{task_id}`: Cập nhật trạng thái hoặc phân công task.
- `GET /api/stories/projects/{project_id}`: Danh sách User Stories.
- `POST /api/stories/projects/{project_id}`: Tạo mới User Story.

2. Nhóm API AI Agents:
- `POST /api/ai/analyze`: Gửi văn bản yêu cầu để Requirement Agent phân tích.
- `POST /api/ai/breakdown`: Gửi User Story để Task Agent phân rã thành tasks kỹ thuật.
- `POST /api/ai/story-point`: Ước lượng độ phức tạp của User Story.
- `POST /api/ai/risk`: Quét và phát hiện rủi ro dự án.
- `POST /api/ai/forecast`: Dự báo tiến độ hoàn thành Sprint.
- `POST /api/ai/assign`: Đưa ra gợi ý phân chia công việc tối ưu cho các lập trình viên.
- `GET /api/ai/agents`: Xem danh sách và trạng thái hoạt động của các AI Agent.
- `GET /api/ai/jobs`: Xem lịch sử chạy và nhật ký lỗi của các tác vụ tác tử AI.


PHẦN XII. UML DIAGRAMS CATALOG
==============================
Hệ thống được thiết kế dựa trên các biểu đồ chuẩn UML (có các file ảnh tương ứng lưu trong thư mục `docs/`):
1. Use Case Diagram: Mô tả 14 hành vi sử dụng hệ thống của các Actor (PM, Developer, PO, Admin, Viewer).
2. Class Diagram: Mô tả cấu trúc các lớp thực thể trong hệ thống, thuộc tính, kiểu dữ liệu và mối quan hệ ràng buộc (1-n, n-n) giữa chúng.
3. Component Diagram: Mô tả các thành phần cấu trúc vật lý của dự án bao gồm Frontend (React), Backend Gateway (Spring Boot), AI Microservice (FastAPI), Database Server (PostgreSQL) và bộ đệm (Redis).
4. Deployment Diagram: Mô tả kiến trúc mạng và môi trường triển khai thực tế sử dụng công nghệ ảo hóa Docker Containers trên máy chủ ảo.


PHẦN XIII. LUỒNG TRÌNH TỰ TƯƠNG TÁC (SEQUENCE DIAGRAM)
======================================================
Ví dụ luồng trình tự tương tác của chức năng Phân rã công việc tự động (AI Task Breakdown):

User (Frontend UI)        System Controller (FastAPI)     AI Agent Service             OpenAI API
       │                             │                            │                         │
       │─── (1) Gửi Yêu Cầu ────────>│                            │                         │
       │    User Story               │─── (2) Lấy System Prompt ─>│                         │
       │                             │        & nạp dữ liệu       │                         │
       │                             │                            │─── (3) Request Chat ───>│
       │                             │                            │    Completions (JSON)   │
       │                             │                            │<── (4) Trả về JSON ─────│
       │                             │<── (5) Phân tích JSON ─────│                         │
       │                             │        & tính chi phí      │                         │
       │                             │─── (6) Lưu DB thực thể ───>│                         │
       │                             │        Task & AI usage     │                         │
       │<── (7) Trả kết quả Task ────│                            │                         │
       │    & Collaboration Mode     │                            │                         │
       │                             │                            │                         │


PHẦN XIV. BIỂU ĐỒ BCE (BOUNDARY - CONTROL - ENTITY)
====================================================
Thiết kế kiến trúc BCE đảm bảo tính độc lập và khả năng mở rộng của hệ thống:
1. Boundary (Lớp biên/giao diện):
- LoginForm, DashboardPanel, KanbanBoard, BacklogList, AIRiskPanel. Nhận tương tác trực tiếp của người dùng và chuyển đổi thành các sự kiện hệ thống.
2. Control (Lớp điều khiển/xử lý logic):
- AuthController, ProjectController, AIController (ở Spring Boot và FastAPI). Tiếp nhận dữ liệu từ lớp biên, điều phối các luồng nghiệp vụ và tương tác với AI Agents.
3. Entity (Lớp dữ liệu thực thể):
- User, Project, Sprint, UserStory, Task, Risk, Forecast. Biểu diễn dữ liệu bền vững được ánh xạ trực tiếp xuống cơ sở dữ liệu PostgreSQL.


PHẦN XV. GIAO DIỆN NGƯỜI DÙNG (UI/UX)
======================================
Hệ thống được thiết kế theo trường phái hiện đại, khoa học dữ liệu kết hợp bảng màu tối dịu mắt (Sleek Dark Mode):
- Chủ đề màu: Xanh tối (Dark navy #0b0f19), chữ trắng sáng và các màu phản trạng thái (Xanh lá HOOL #22c55e, Xanh dương HOTL #3b82f6, Tím HITL #a855f7).
- Responsive Layout: Giao diện thích ứng tốt trên cả màn hình máy tính để bàn kích thước lớn (Desktop) lẫn màn hình máy tính xách tay (Laptop), sử dụng hệ thống CSS Grid và Flexbox linh hoạt.
- Bảng Kanban tương tác: Cho phép kéo thả trực quan để cập nhật trạng thái của các task, tạo cảm giác mượt mà và trực quan cho người dùng.
- Pipeline AI trực quan: Hiển thị các khối hộp tiến trình chạy của AI tác tử thời gian thực giúp giảm bớt cảm giác chờ đợi khi gọi mô hình ngôn ngữ lớn (LLM).


PHẦN XVI. BẢO MẬT (SECURITY)
============================
Hệ thống được thiết kế bảo mật nhiều lớp:
1. Xác thực người dùng (Authentication): Sử dụng chuẩn mã hóa mật khẩu một chiều mạnh Bcrypt. Cơ chế cấp phát cặp mã thông báo JWT (JSON Web Token) bao gồm `access_token` có thời hạn ngắn (15 phút) bảo mật phiên làm việc và `refresh_token` có thời hạn dài (7 ngày) để duy trì trạng thái đăng nhập mà không cần nhập lại mật khẩu.
2. Phân quyền truy cập (RBAC - Role-Based Access Control):
- Phân quyền chặt chẽ thông qua các permission kết hợp vai trò (Role):
  * admin: Có toàn quyền hệ thống.
  * pm (Project Manager): Có các quyền liên quan đến dự án, lập kế hoạch, kích hoạt AI Agents (`project:write`, `sprint:write`, `task:write`, `ai:use`, `report:read`).
  * developer: Có quyền đọc thông tin dự án, cập nhật trạng thái task do mình phụ trách (`task:write`, `project:read`).
  * viewer: Chỉ có quyền đọc thông tin, không được sửa đổi dữ liệu hoặc kích hoạt AI.
3. Nhật ký kiểm toán (Audit Logs): Ghi nhận toàn bộ thao tác thay đổi dữ liệu nhạy cảm của người dùng (ai thực hiện, tác vụ gì, thời gian nào, dữ liệu trước và sau thay đổi) để phục vụ việc rà soát an ninh.


PHẦN XVII. CHIẾN LƯỢC KIỂM THỬ (TESTING)
=========================================
Dự án áp dụng quy trình kiểm thử toàn diện:
1. Unit Test (Kiểm thử đơn vị): Viết testcase cho tầng Service của Java Spring Boot và các hàm xử lý logic nghiệp vụ phụ trợ của Python (pytest) để kiểm tra tính đúng đắn của logic tính toán toán học.
2. Integration Test (Kiểm thử tích hợp): Kiểm tra sự tương tác giữa các service của dự án (Spring Boot kết nối PostgreSQL, FastAPI kết nối PostgreSQL).
3. AI Prompt Testing: Sử dụng bộ dữ liệu kiểm thử (Test Suite) chứa các yêu cầu thô đầu vào biên để đánh giá mức độ ổn định và tính hợp lệ của định dạng JSON đầu ra do LLM trả về, hạn chế hiện tượng "ảo tưởng" (hallucination) của AI.


PHẦN XVIII. TRIỂN KHAI VÀ VẬN HÀNH (DEPLOYMENT)
===============================================
Hệ thống hỗ trợ đóng gói hoàn toàn bằng công nghệ Docker giúp việc triển khai trên mọi môi trường (Staging, Production) trở nên cực kỳ đơn giản thông qua file `docker-compose.yml` ở thư mục gốc:

1. Cơ sở dữ liệu (`db`): Container chạy PostgreSQL 16 Alpine, dữ liệu được ghi đè bền vững qua Docker volume `postgres-data`.
2. Dịch vụ lưu trữ đệm (`redis`): Container chạy Redis 7 Alpine tối ưu bộ nhớ.
3. Backend Service (`backend`): Container chạy Java Spring Boot 3.2.4 trên môi trường Java 21, kết nối database qua cổng nội bộ 5432.
4. AI Service (`ai-service`): Container chạy Python FastAPI dựa trên nền tảng python:3.11-slim, tiếp nhận các tác vụ AI qua cổng nội bộ 8000.
5. Frontend Web (`frontend`): Container chạy Nginx Server chứa các file tĩnh (HTML/CSS/JS) đã được biên dịch sẵn của React Vite trên cổng mặc định 80 (được ánh xạ ra cổng 5173 của máy vật lý). Nginx đóng vai trò reverse proxy chuyển tiếp các yêu cầu có tiền tố `/api/` trực tiếp tới backend tương ứng.


PHẦN XIX. LỘ TRÌNH PHÁT TRIỂN (ROADMAP)
========================================
1. Phiên bản MVP (Hiện tại):
- Đã hoàn thiện toàn bộ khung kiến trúc 3 tầng: Frontend React, Backend Spring Boot CRUD, AI Service FastAPI.
- Kết nối CSDL PostgreSQL đồng bộ.
- Tích hợp 8 tác tử AI Agent xử lý qua OpenAI API (hỗ trợ cả cơ chế mock khi không có API key).
- Triển khai thành công Docker Compose chạy cục bộ.

2. Phiên bản 1.0 (Kế hoạch):
- Tích hợp dịch vụ lưu trữ file MinIO làm nơi chứa các tệp tin đính kèm của dự án (Tài liệu SRS, biểu đồ).
- Triển khai xác thực qua bên thứ ba (OAuth2 với Google/GitHub).
- Tối ưu hóa chi phí gọi AI bằng cách tích hợp cache lưu các câu trả lời trùng lặp trên Redis.

3. Phiên bản 2.0 (Kế hoạch):
- Chuyển dịch hệ thống sang kiến trúc Microservices thuần túy.
- Tích hợp hệ thống hàng đợi thông điệp RabbitMQ/Kafka để xử lý bất đồng bộ các luồng tác vụ Agent chạy tốn thời gian.
- Triển khai quy trình CI/CD tự động kiểm thử và deploy lên Cloud thông qua GitHub Actions.


PHẦN XX. HƯỚNG DẪN TRIỂN KHAI VÀ KHỞI CHẠY DỰ ÁN
================================================
Để chạy dự án, máy tính của bạn cần được cài đặt sẵn: Docker, Docker Compose, Node.js (phiên bản >= 18), Java JDK 21 và Python 3.11.

Cách 1: Khởi chạy nhanh toàn bộ hệ thống bằng Docker Compose (Khuyên dùng)
-----------------------------------------------------------------------
1. Sao chép dự án về máy tính cục bộ.
2. Mở terminal tại thư mục gốc của dự án.
3. Chạy lệnh:
   docker compose up --build
4. Chờ Docker build và khởi động các container. Khi hoàn tất, các dịch vụ sẽ sẵn sàng tại:
   - Frontend Web UI: http://localhost:5173
   - Backend API Docs: http://localhost:8080/swagger-ui/index.html (nếu bật Swagger)
   - AI Service API Docs: http://localhost:8000/docs
5. Đăng nhập hệ thống bằng các tài khoản demo có sẵn trong database:
   * Vai trò Admin: Tài khoản `admin` / mật khẩu `admin123`
   * Vai trò Project Manager: Tài khoản `pm` / mật khẩu `pm123456`
   * Vai trò Developer: Tài khoản `dev` / mật khẩu `dev123456`
   * Vai trò Viewer: Tài khoản `viewer` / mật khẩu `viewer123456`

Cách 2: Chạy thủ công từng dịch vụ ở môi trường phát triển (Local Development)
-----------------------------------------------------------------------------
1. Chạy cơ sở dữ liệu PostgreSQL cục bộ (hoặc dùng docker compose chỉ khởi động container database: `docker compose up db redis -d`).

2. Khởi chạy Dịch vụ AI (ai-service):
   cd ai-service
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   pip install -r requirements.txt
   # Tạo file .env dựa trên file .env.example và điền OPENAI_API_KEY nếu muốn chạy LLM thật
   # Khởi chạy dữ liệu mẫu (seed database):
   python -m app.seed
   # Khởi chạy FastAPI server:
   uvicorn app.main:app --reload --port 8000

3. Khởi chạy Dịch vụ Backend (backend):
   cd backend
   # Build dự án Maven:
   mvn clean install -DskipTests
   # Chạy ứng dụng Spring Boot:
   mvn spring-boot:run
   # (Hoặc mở thư mục backend bằng IntelliJ IDEA/Eclipse và nhấn Run ứng dụng AiProjectManagementApplication)

4. Khởi chạy Frontend (frontend):
   cd frontend
   npm install
   npm run dev
   # Ứng dụng React sẽ khởi chạy tại: http://localhost:5173
   # Nginx proxy hoặc cấu hình proxy nội bộ của Vite sẽ tự động chuyển tiếp request sang backend local.