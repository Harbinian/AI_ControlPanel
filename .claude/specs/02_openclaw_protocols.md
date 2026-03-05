# Spec 02: OpenClaw Communication Protocols
**Version:** 1.0
**Context:** Defines the strict JSON RPC-style payload structure between the Node.js Gateway and the Android Edge. ALL AI-generated actions must compile down to these precise payloads.

## 1. Protocol Envelope (标准信封)
All requests from the Gateway to Android, and all sync requests from Android to Gateway, MUST wrap their data in this standard envelope.

```json
{
  "claw_version": "1.0",
  "request_id": "uuid-v4",
  "timestamp": 1718000000,
  "source": "feishu_gateway",
  "target_device": "spouse_android_01",
  "action": "INTENT_NAME",
  "payload": {} 
}