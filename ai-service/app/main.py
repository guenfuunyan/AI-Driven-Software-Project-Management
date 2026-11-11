from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db
from .api import ai, auth, projects, sprints, tasks, stories, risks, forecasts, dashboard

settings = get_settings()

app = FastAPI(
    title=settings.app_name + " (AI Service)",
    description="AI Service for Software Project Management",
    version="1.0.0",
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes
app.include_router(ai.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(sprints.router)
app.include_router(tasks.router)
app.include_router(stories.router)
app.include_router(risks.router)
app.include_router(forecasts.router)
app.include_router(dashboard.router)

@app.on_event("startup")
def on_startup():
    init_db()
    try:
        from .seed import seed_database
        seed_database()
        print("Database initialized and seeded successfully.")
    except Exception as e:
        print(f"Seeding skipped or failed: {e}")

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name + " (AI Service)"}
