# AI-Driven PM — Backend

FastAPI backend với SQLModel, JWT auth, multi-agent AI service.

## API chính

| Method | Path | Mô tả |
|--------|------|-------|
| POST | /auth/login | Đăng nhập JWT |
| GET | /projects/ | Danh sách project |
| POST | /projects/{id}/sprints | Tạo sprint |
| POST | /tasks/projects/{id} | Tạo task |
| POST | /ai/analyze | Phân tích requirement |
| POST | /ai/breakdown | Phân rã user story |
| POST | /ai/story-point | Ước lượng story point |
| POST | /ai/forecast | Dự báo sprint |
| POST | /ai/risk | Phát hiện rủi ro |
| GET | /dashboard/stats | KPI dashboard |

Xem đầy đủ tại `/docs`.

## Chạy

```powershell
py -3 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
py -m app.seed
$env:PYTHONPATH="."
uvicorn app.main:app --reload --port 8000
```
