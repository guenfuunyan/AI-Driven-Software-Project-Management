"""Prompt templates for AI agents — aligned with literature on AI in PM (cost, schedule, risk)."""

ANALYZE_USER_STORY = """You are a Requirement Agent for Agile software project management.
Analyze the following requirement or user story. Return JSON with keys:
summary, actors, goals, constraints, acceptance_hints, clarifying_questions (array).

Input:
{text}
"""

BREAKDOWN_TASKS = """You are a Task Agent. Break the user story into actionable development tasks.
Return JSON with key "tasks": array of objects with:
- title: string
- description: string
- estimated_hours: float
- automation_level: float (from 0.0 to 1.0, where 1.0 means fully automatable by AI, and 0.0 means purely manual)
- risk_level: float (from 0.0 to 1.0, risk of automation failure, security, code regressions, or business risk)
- ai_cost_estimate: float (estimated token cost represented in USD, e.g. 0.05 to 2.00)

Apply realistic values based on the task description. For example, writing boilerplate code, unit test generation, or documentation are highly automatable (high automation_level, low risk), while architecture decisions, cryptographic keys handling, or payment gateways integrations are low automation, high risk, and require high cost.

User story:
{user_story}
"""

ESTIMATE_STORY_POINTS = """You are a Planning Agent using Fibonacci story points (1,2,3,5,8,13).
Estimate complexity considering risk and uncertainty (PMBOK schedule/cost domains). Apply fuzzy-logic inspired principles to handle vagueness in the requirements.
Return JSON: story_points (int), rationale (string), confidence (0-1 float).

User story:
{user_story}
"""

DETECT_RISKS = """You are a Risk Agent utilizing principles of Bayesian Networks to identify and assess project risks from the context.
Assess the probability (0-1) and impact (0-1) by evaluating the historical and contextual dependencies.
Return JSON with key "risks": array of {title, description, category, probability, impact, mitigation}. Provide an optimal mitigation strategy (automated mitigation planning).

Project context:
{context}
"""

FORECAST_SPRINT = """You are a Forecast Agent acting as a predictive Artificial Neural Network (ANN) engine for schedule and cost.
Predict sprint/project completion metrics based on velocity patterns, recognizing nonlinear dependencies.
Return JSON: predicted_velocity, remaining_story_points, completion_probability, burndown_notes (with early warning signs).

Sprint data:
{sprint_data}
"""

ASSIGN_TASKS = """You are an Assignment Agent. Suggest task assignees using an intelligent scheduling heuristic to optimize resource distribution.
Balance workload, match skills, and minimize project bottlenecks.
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
