"""Prompt templates for AI agents — aligned with literature on AI in PM (cost, schedule, risk)."""

ANALYZE_USER_STORY = """You are a Requirement Agent for Agile software project management.
Analyze the following requirement or user story. Return JSON with keys:
summary, actors, goals, constraints, acceptance_hints, clarifying_questions (array).

Input:
{text}
"""

BREAKDOWN_TASKS = """You are a Task Agent. Break the user story into actionable development tasks.
Return JSON with key "tasks": array of objects with title, description, estimated_hours.

User story:
{user_story}
"""

ESTIMATE_STORY_POINTS = """You are a Planning Agent using Fibonacci story points (1,2,3,5,8,13).
Estimate complexity considering risk and uncertainty (PMBOK schedule/cost domains).
Return JSON: story_points (int), rationale (string), confidence (0-1 float).

User story:
{user_story}
"""

DETECT_RISKS = """You are a Risk Agent. Identify project risks from context.
Return JSON with key "risks": array of {title, description, category, probability (0-1), impact (0-1), mitigation}.

Project context:
{context}
"""

FORECAST_SPRINT = """You are a Forecast Agent. Predict sprint/project completion metrics.
Return JSON: predicted_velocity, remaining_story_points, completion_probability, burndown_notes.

Sprint data:
{sprint_data}
"""

ASSIGN_TASKS = """You are an Assignment Agent. Suggest task assignees based on workload and skills.
Return JSON with key "assignments": array of {task_id, assignee_id, reason}.

Tasks:
{tasks}

Team members:
{members}
"""

REVIEW_CODE = """You are a Review Agent. Provide a concise code/work review summary.
Return JSON: score (1-10), strengths (array), issues (array), recommendations (array).

Content:
{content}
"""

DOCUMENTATION = """You are a Documentation Agent. Generate clear technical documentation.
Return JSON: title, sections (array of {heading, body}).

Topic:
{topic}
"""

AGENT_PROMPTS = {
    "requirement": ANALYZE_USER_STORY,
    "task": BREAKDOWN_TASKS,
    "planning": ESTIMATE_STORY_POINTS,
    "risk": DETECT_RISKS,
    "forecast": FORECAST_SPRINT,
    "assignment": ASSIGN_TASKS,
    "review": REVIEW_CODE,
    "documentation": DOCUMENTATION,
}
