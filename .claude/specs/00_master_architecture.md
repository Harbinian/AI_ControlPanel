# Family Guardian AI (FGA) - Project Specifications
**Version:** 1.0
**OS Environment:** Windows 10/11 (Strictly use `\` or `path.join` for script generation)
**IDE:** Trae

## 1. System Architecture & Topology
FGA is a home-scenario AI Agent distributed across Cloud and Edge.
- **User Interface:** Feishu Bot (Group Chat mode for family members).
- **Control Plane (Cloud):** Node.js / Python webhook gateway deployed on Aliyun/Tencent Cloud.
- **Execution Edge (Local):** Android Application (Client).
- **Standard Protocol:** ALL agent actions MUST conform to the OpenClaw standard interface.

## 2. Model Routing Strategy (Dual-Core)
- **Primary (Level 1):** Minimax + MCP (Model Context Protocol). Used for routing intent, daily conversation, basic web search, and primary image recognition.
- **Fallback & Audit (Level 2):** Gemini-1.5-Flash. Triggered ONLY when:
  1. Minimax MCP returns confidence score < 0.8 on images/data extraction.
  2. User explicitly questions the result (e.g., "Are you sure?", "Look again").
  3. High-stakes logic (financial logs, health data).

## 3. Data Schema & State Management
### 3.1 Cloud Fact Center (Feishu Bitable)
Must maintain isolation of family members' data.
- `Family_Members`: ID, Name, Feishu_Open_ID (Unique), Role.
- `Preference_Ledger`: Time-series data of preferences. Used for contextual inference. Fields: Log_ID, Member_ID, Category, Entity_Tag, Sentiment_Score, Source_Message_ID.
- `Action_Logs`: System audit trail.

### 3.2 Edge Buffer (Android SQLite)
Zero-degradation principle: The Android client operates in potentially weak network environments.
- ALL incoming OpenClaw commands MUST be written to an `async_tasks` SQLite table first.
- Schema MUST include: `task_id`, `intent_action`, `payload` (JSON), `status` (PENDING/EXECUTING/COMPLETED/FAILED), `retry_count`.
- Execution is driven by querying this table, NOT directly by the network request.

## 4. Coding Conventions & Guardrails
- **Zero-Degradation:** Never assume network availability on the Android edge. Always implement SQLite caching for actions.
- **Boundary Defense:** Any action involving destructive data changes or local Android privacy (camera, SMS) MUST require a Human-In-The-Loop (HITL) confirmation via the Feishu UI before execution.
- **Windows Pathing:** When generating build scripts or Node.js file operations, strictly handle Windows path separators.
- **No Placeholders:** Generate complete, production-ready functions with rigorous Error/Exception catching. Silent failures are strictly prohibited.