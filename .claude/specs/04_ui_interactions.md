# Spec 04: Endpoints & Edge Execution
**Version:** 1.0
**Context:** Defines the Feishu Webhook entry point for the Gateway and the Action Executor engine on the Android Client.

## 1. Feishu Webhook Gateway (Node.js)
The Gateway must expose a public, secure endpoint to receive Feishu events.
- **Endpoint:** `POST /api/v1/feishu/webhook`
- **Security:** Must verify the `X-Lark-Signature` to prevent malicious payloads.
- **Event Types Handled:**
  - `im.message.receive_v1` (Text & Image messages).
  - `card.action.trigger` (HITL button clicks - e.g., Admin clicks "Approve Payment").
- **Flow:** Event -> Signature Verify -> Context Hydration -> RouterService -> Bitable Update / OpenClaw Action generation.

## 2. Android Action Executor (Edge Limbs)
The Android client must safely dequeue and execute commands from the `async_tasks` SQLite table.
- **Component:** `ActionExecutorService` (Kotlin Coroutines + Flow).
- **Execution Mapping (OpenClaw -> Native API):**
  - `LOCAL_NOTIFY_TTS` -> Android `TextToSpeech` API / `NotificationManager`.
  - `SYNC_PREFERENCE_DELTA` -> Update `local_preference_cache` DAO.
  - `CAPTURE_ENVIRONMENT` -> Trigger CameraX API to capture, then upload via Retrofit.
- **MIUI/Custom OS Survival Strategy (Critical):**
  - Do NOT rely solely on standard `WorkManager` for real-time OpenClaw commands, as aggressive battery managers (like those on Xiaomi devices) will delay them.
  - Must implement a Foreground Service (with a persistent notification) if real-time Feishu-to-Android execution is required, or use long-polling via Kotlin Coroutines when the app is active.
- **State Feedback:** Upon success/failure of a Native API call, update the `async_tasks` table status to `COMPLETED` or `FAILED`, triggering the network layer to send an ACK back to the Gateway.

## 3. Human-In-The-Loop (HITL) Execution
- Any action flagged with `require_hitl: true` in the OpenClaw envelope MUST be halted on the Gateway.
- The Gateway sends an Interactive Message Card to the Feishu Group.
- Only when an authorized `Admin` clicks "Approve" does the Gateway push the command to the Android Edge's pending queue.