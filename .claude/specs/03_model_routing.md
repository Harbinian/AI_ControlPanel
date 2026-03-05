# Spec 03: Dual-Core Model Routing & Fallback Protocol
**Version:** 1.0
**Context:** Defines the strict routing logic in the Node.js Gateway for handling Feishu text/image inputs, querying the Bitable context, and generating OpenClaw Action JSONs.

## 1. Routing Engine (网关大脑)
The Gateway acts as an Orchestrator. When a webhook arrives from Feishu:
1. **Context Hydration:** Query `local_preference_cache` (or Bitable directly) to inject family context (e.g., specific preferences of the spouse recorded previously).
2. **Intent Classification:** Use a lightweight prompt to determine if this is a `Record_Preference` task or an `Execute_Action` task.
3. **Model Selection:** Route to Minimax (L1) or Gemini (L2).

## 2. Level 1: Minimax (Primary Edge/Daily Engine)
- **Role:** Fast NLP, daily chatter, entity extraction, and formatting OpenClaw commands.
- **System Prompt Guardrail:** MUST include instructions to output STRICT JSON matching the `OpenClawEnvelope`. No markdown wrapping, no conversational filler.
- **Output Validation:** The Node.js service MUST parse the JSON. If parsing fails, retry once. If it fails again, trigger L2 Fallback.

## 3. Level 2: Gemini (Deep Logic & Fallback)
- **Role:** Complex reasoning, high-stakes auditing, and multi-modal fallback.
- **Trigger Conditions (Strict):**
  - `Minimax_Confidence_Score < 0.8` (e.g., ambiguous instructions).
  - **High-Stakes Entities:** Any request modifying the `Family_Members` table or deleting data.
  - **Explicit User Doubt:** Feishu message contains "不对", "确定吗", "重新看" (Wrong, Are you sure, Look again).
  - **Complex Multi-modal:** High-resolution image analysis where Minimax fails to extract structured data (e.g., a complex medical bill or a detailed appliance error code).

## 4. Bitable MCP Tooling Rules (大模型调用工具规范)
Models do not write to the database directly. They output a JSON `tool_call`.
- **Read Action:** `{ "tool": "query_preference", "args": {"member_role": "Spouse", "category": "Dietary"} }`
- **Write Action:** `{ "tool": "record_preference", "args": {"entity": "Matcha Latte", "sentiment": 0.9} }`
The Gateway executes these tool calls against the Bitable API and feeds the result back to the model.