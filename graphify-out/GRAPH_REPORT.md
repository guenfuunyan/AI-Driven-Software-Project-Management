# Graph Report - AI-Driven-Software-Project-Management  (2026-11-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 778 nodes · 2057 edges · 38 communities (24 shown, 14 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 118 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `be51b549`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 26
- Community 27
- Community 37

## God Nodes (most connected - your core abstractions)
1. `getHeaders()` - 39 edges
2. `useAuthStore` - 30 edges
3. `User` - 23 edges
4. `_run_agent()` - 23 edges
5. `Task` - 20 edges
6. `getProjects()` - 20 edges
7. `getPageAccess()` - 18 edges
8. `seed_database()` - 18 edges
9. `execute_multi_agent_deliberation()` - 18 edges
10. `StoriesPage()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `_is_project_member()` --uses--> `ProjectMember`  [INFERRED]
  ai-service/app/core/dependencies.py → ai-service/app/models.py
- `suggest_assignments()` --uses--> `ProjectMember`  [INFERRED]
  ai-service/app/services/ai_service.py → ai-service/app/models.py
- `create_sprint()` --uses--> `SprintCreate`  [INFERRED]
  ai-service/app/services/crud.py → ai-service/app/schemas.py
- `update_sprint()` --uses--> `SprintUpdate`  [INFERRED]
  ai-service/app/services/crud.py → ai-service/app/schemas.py
- `create_task()` --uses--> `TaskCreate`  [INFERRED]
  ai-service/app/services/crud.py → ai-service/app/schemas.py

## Import Cycles
- 2-file cycle: `frontend/src/api/project.ts -> frontend/src/store/projectStore.ts -> frontend/src/api/project.ts`
- 2-file cycle: `frontend/src/api/client.ts -> frontend/src/store/auth.ts -> frontend/src/api/client.ts`

## Communities (38 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (98): AgentThoughtDetail, aiAnalyze(), aiAssign(), aiBreakdown(), aiDeliberate(), aiForecast(), aiResolveHitl(), aiRisk() (+90 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (66): mark_read(), list_forecasts(), add_member(), create_epic(), create_feature(), create_project(), create_release(), delete_project() (+58 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (15): Project, Sprint, Task, User, UserStory, ProjectRepository, SprintRepository, TaskRepository (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (37): get_deliberation(), get_settings(), Settings, Config, hash_password(), init_db(), log_audit(), on_startup() (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (42): build, depends_on, environment, ports, build, depends_on, environment, ports (+34 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (36): add_comment(), AgentThoughtDetail, AIAgentRead, Config, AIJobRead, Config, BurndownPoint, CommentCreate (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (24): get_users(), login(), me(), refresh(), register(), update_me(), can_access_project(), get_current_user() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (29): devDependencies, autoprefixer@^10.5.2, jsdom@^26.1.0, postcss@^8.5.19, tailwindcss@^4.3.2, @tailwindcss/postcss@^4.3.2, @testing-library/jest-dom@^6.6.3, @testing-library/react@^16.1.0 (+21 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (27): AIUsage, PromptHistory, analyze_requirement(), breakdown_story(), _call_openai(), _clean_input_text(), _complete_job(), _create_job() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (21): analyze(), assign(), breakdown(), deliberate(), documentation(), forecast(), list_agents(), list_deliberations() (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (25): build, condition, environment, healthcheck, ports, volumes, context, backend (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (10): create_sprint(), list_sprints(), update_sprint(), require_permission(), get_session(), health(), ForecastRead, Config (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): ai-service, url, name, password, url, username, ddl-auto, format_sql (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (11): _login(), reset_auth(), test_ai_analysis_returns_enriched_structured_output(), test_ai_analyze(), test_ai_breakdown(), test_create_and_get_project(), test_dashboard_stats(), test_forecast_returns_richer_summary() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (11): detect_risk(), create_risk(), delete_risk(), list_risks(), update_risk(), RiskCreate, RiskDetectRequest, RiskRead (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (10): create_task(), list_tasks(), task_history(), update_task(), TaskHistory, TaskCreate, TaskRead, Config (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.23
Nodes (10): @ant-design/icons@^6.3.2, framer-motion@^12.42.2, columns, containerVariants, Dashboard(), itemVariants, ProjectList(), useProjectStore (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (11): dependencies, antd@^6.5.1, axios@^1.18.1, lucide-react@^1.24.0, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.30.4, recharts@^3.9.0 (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.32
Nodes (6): zustand@^5.0.2, apiClient, ProjectService, Project, ProjectState, zustand

### Community 21 - "Community 21"
Cohesion: 0.48
Nodes (5): burndown(), dashboard_stats(), list_comments(), notifications(), velocity()

### Community 23 - "Community 23"
Cohesion: 0.40
Nodes (4): @vitejs/plugin-react@^4.3.4, vitest@^2.1.8, @vitejs/plugin-react, vitest

### Community 24 - "Community 24"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): dependencies, docker@^1.0.0, docker

## Knowledge Gaps
- **1 isolated node(s):** `com.aipm:backend`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 203 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 0` to `Community 18`, `Community 19`, `Community 7`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `com.aipm:backend` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06358543417366946 - nodes in this community are weakly interconnected._
- **Why does `User` connect `Community 6` to `Community 3`, `Community 8`, `Community 11`, `Community 1`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05789009697325889 - nodes in this community are weakly interconnected._
- **Why does `Task` connect `Community 3` to `Community 8`, `Community 9`, `Community 17`, `Community 1`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0639386189258312 - nodes in this community are weakly interconnected._