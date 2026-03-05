# Spec 01: Data Schema & State Management
**Version:** 1.0
**Context:** Defines the data contract between Edge (Android SQLite) and Cloud (Feishu Bitable). ALL models (Minimax/Gemini) must strictly consume and output data matching these definitions.

## 1. Cloud Fact Center (Feishu Bitable Schema)
The Cloud schema acts as the single source of truth for family facts and historical context. It uses a relational structure.

### Table 1: `Family_Members` (Identity & RBAC)
Controls boundary defense for execution permissions.
- `Member_ID` (Primary Key, Auto-increment)
- `Name` (Text)
- `Feishu_Open_ID` (String, Unique Index)
- `Role` (Select: `Admin` | `Spouse` | `Child` | `Guest`) - *Defines HITL (Human-in-the-loop) bypass thresholds.*
- `Device_Push_Token` (String) - For routing OpenClaw commands to specific Android edges.

### Table 2: `Preference_Ledger` (Time-Series AI Context)
CRITICAL: This is the core memory for the AI. It records atomic preferences over time to calculate confidence scores for recommendations.
- `Log_ID` (Primary Key, Auto-increment)
- `Target_Member_ID` (Link to Family_Members) - *Strictly isolates whose preference this is (e.g., specifically tagging the wife's preferences distinct from the admin's).*
- `Domain` (Select: `Dietary` | `Shopping` | `Environment` | `Schedule`)
- `Entity` (Text) - E.g., "Coffee", "Air Conditioning Temp", "Skincare Brand".
- `Sentiment_Weight` (Number: -1.0 to 1.0) - Negative means dislike/avoid, Positive means prefer.
- `Timestamp` (DateTime) - Decay algorithms will use this to prioritize recent preferences over old ones.
- `Source_Context` (Text) - The original trigger (e.g., "Feishu message: 'Too cold today'").

### Table 3: `System_Audit_Log` (Traceability)
- `Trace_ID` (String)
- `Triggered_By` (Link to Family_Members)
- `Action_Type` (String) - E.g., `Update_Preference`, `Execute_OpenClaw`, `Model_Fallback`.
- `Status` (Select: `Success` | `Failed` | `Pending_HITL`)
- `Raw_Payload` (JSON)

---

## 2. Edge Buffer (Android SQLite Schema)
Designed for **Zero-Degradation**. The Android edge must function as a state machine that survives network drops and Minimax API timeouts.

### Table: `async_tasks` (Command Queue)
- `task_id` (VARCHAR(64) PRIMARY KEY) - UUID.
- `intent_action` (VARCHAR(128) NOT NULL) - Maps to OpenClaw protocols.
- `target_member_id` (VARCHAR(64)) - Who this action affects.
- `payload` (TEXT NOT NULL) - JSON string of parameters.
- `status` (VARCHAR(32) DEFAULT 'PENDING') - State machine: `PENDING` -> `EXECUTING` -> `COMPLETED` | `FAILED`.
- `retry_count` (INTEGER DEFAULT 0) - Max retries = 3 before pushing error to Bitable Audit Log.
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### Table: `local_preference_cache` (Offline Context)
A lightweight, synced subset of the Bitable `Preference_Ledger` to ensure the Edge AI (if any offline NLP is used) doesn't make fatal contextual errors when disconnected.
- `entity_hash` (VARCHAR(64) PRIMARY KEY)
- `member_id` (VARCHAR(64))
- `aggregated_preference` (JSON) - Snapshot of current likes/dislikes.
- `last_synced_at` (DATETIME)

## 3. Boundary Defenses & Data Flow Rules
1. **Write Asymmetry:** The Android Edge CANNOT directly mutate `Preference_Ledger`. It must send an `Intent` to the Node.js Gateway. The Gateway uses Minimax to extract the entity/sentiment before writing to Bitable.
2. **Read Syncing:** The Android Edge pulls a delta-sync of `local_preference_cache` every 4 hours or upon WebSocket reconnection.
3. **Data Sanitization:** All JSON payloads in `async_tasks` must be stripped of raw Feishu authentication tokens before local storage.