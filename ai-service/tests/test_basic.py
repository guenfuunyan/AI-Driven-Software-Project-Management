import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.db import engine, init_db
from app.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    SQLModel.metadata.drop_all(engine)
    init_db()
    seed_database()
    yield


@pytest.fixture(autouse=True)
def reset_auth():
    yield


def _login(username="admin", password="admin123"):
    r = client.post("/auth/login", data={"username": username, "password": password})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login():
    token = _login()
    assert token


def test_create_and_get_project():
    token = _login()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Test Project", "description": "demo"}
    r = client.post("/projects/", json=payload, headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Test Project"
    pid = data["id"]
    r2 = client.get(f"/projects/{pid}", headers=headers)
    assert r2.status_code == 200


def test_ai_analyze():
    token = _login("pm", "pm123456")
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(
        "/ai/analyze",
        json={"text": "As a user I want to login with JWT"},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert "analysis" in data


def test_ai_breakdown():
    token = _login("dev", "dev123456")
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(
        "/ai/breakdown",
        json={"user_story": "As PM I want dashboard. Show KPI cards. Export report."},
        headers=headers,
    )
    assert r.status_code == 200
    assert "tasks" in r.json()


def test_dashboard_stats():
    token = _login()
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/dashboard/stats", headers=headers)
    assert r.status_code == 200
    assert "total_projects" in r.json()


def test_user_cannot_escalate_role_via_profile_update():
    token = _login("dev", "dev123456")
    headers = {"Authorization": f"Bearer {token}"}
    r = client.patch("/auth/me", json={"role": "admin"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["role"] == "developer"


def test_viewer_is_blocked_from_unshared_project():
    admin_token = _login("admin", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    project_resp = client.post(
        "/projects/",
        json={"name": "Restricted Project", "description": "internal"},
        headers=admin_headers,
    )
    assert project_resp.status_code == 200
    project_id = project_resp.json()["id"]

    viewer_token = _login("viewer", "viewer123456")
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
    r = client.get(f"/projects/{project_id}", headers=viewer_headers)
    assert r.status_code == 403


def test_ai_analysis_returns_enriched_structured_output():
    token = _login("pm", "pm123456")
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(
        "/ai/analyze",
        json={"text": "As a user I want to receive a weekly digest of overdue tasks with priority filters"},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()["analysis"]
    assert "priority_score" in data
    assert "estimated_complexity" in data


def test_forecast_returns_richer_summary():
    token = _login("pm", "pm123456")
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(
        "/ai/forecast",
        json={"project_id": 1, "sprint_id": 1},
        headers=headers,
    )
    assert r.status_code == 200
    assert "forecast_summary" in r.json()
    assert "confidence_band" in r.json()
