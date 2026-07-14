# AI-Driven Software Project Management

Hệ thống quản lý dự án phần mềm Agile tích hợp AI multi-agent, theo kiến trúc Human-in-the-loop (Human-on-the-loop).

## Tính năng

- **Agile workflow**: Requirement → User Story → Epic → Feature → Task → Sprint → Release
- **REST API** (FastAPI): Projects, Sprints, Stories, Tasks, Risks, Forecasts
- **AI Agents**: Requirement, Planning, Task, Risk, Forecast, Assignment, Review, Documentation
- **AI endpoints**: `/ai/analyze`, `/ai/breakdown`, `/ai/story-point`, `/ai/forecast`, `/ai/risk`, `/ai/assign`
- **Security**: JWT + RBAC (admin, pm, developer, viewer)
- **Dashboard**: KPI, burndown, velocity, AI job tracking
- **React UI**: Login, Dashboard, Sprint Kanban, Stories, Tasks, Risks, Forecast, AI, Reports, Settings

## Cấu trúc

```
AI-Driven-Software-Project-Management/
├── backend/          # FastAPI + SQLModel
├── frontend/         # React + Vite + TypeScript
├── prompts/          # Prompt library (mirror)
├── docker-compose.yml
└── Readme.txt        # Đặc tả đồ án đầy đủ
```

## Chạy nhanh (Development)

### Backend

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py -m app.seed
$env:PYTHONPATH="."
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

### Tài khoản demo

| User  | Password  | Role      |
|-------|-----------|-----------|
| admin | admin123  | admin     |
| pm    | pm123456  | pm        |
| dev   | dev123456 | developer |

## Docker

```powershell
docker compose up --build
```

- Frontend: http://localhost
- Backend: http://localhost:8000

## OpenAI (tùy chọn)

Đặt `AI_USE_MOCK=false` và `OPENAI_API_KEY=sk-...` trong `.env` để dùng LLM thật thay vì mock.

## Kiểm thử

```powershell
cd backend
$env:PYTHONPATH="."
pytest tests/ -q
```

## Tham khảo nghiên cứu

- Bachari et al. (2025) — AI in PM systematic review (PMBOK domains)
- Adamantiadou & Tsironis (2025) — AI cost/schedule/risk forecasting

## Roadmap (Readme.txt)

MVP hiện tại bao gồm backend + frontend + AI mock. Các phần mở rộng: MySQL/Redis, OAuth2, MinIO attachments, microservices, CI/CD GitHub Actions.
