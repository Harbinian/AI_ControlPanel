/**
 * OpenClaw Protocol Types
 * TypeScript interfaces for Gateway <-> Android communication
 */

export interface OpenClawEnvelope {
  claw_version: string;
  request_id: string;
  timestamp: number;
  source: string;
  target_device: string;
  action: OpenClawAction;
  payload: Record<string, any>;
}

export enum OpenClawAction {
  RECORD_PREFERENCE = 'RECORD_PREFERENCE',
  EXECUTE_ACTION = 'EXECUTE_ACTION',
  QUERY_PREFERENCE = 'QUERY_PREFERENCE',
  SYNC_DELTA = 'SYNC_DELTA',
  CLARIFY = 'CLARIFY',
  // Android Edge-specific actions
  LOCAL_NOTIFY_TTS = 'LOCAL_NOTIFY_TTS',
  SYNC_PREFERENCE_DELTA = 'SYNC_PREFERENCE_DELTA',
  CAPTURE_ENVIRONMENT = 'CAPTURE_ENVIRONMENT'
}

export interface OpenClawAck {
  request_id: string;
  status: AckStatus;
  executed_at: number;
  result?: Record<string, any>;
  error?: string;
}

export enum AckStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING_HITL = 'PENDING_HITL'
}

export interface SyncRequest {
  device_id: string;
  last_synced_at: number;
  pending_tasks?: PendingTaskInfo[];
}

export interface PendingTaskInfo {
  task_id: string;
  status: string;
  error_message?: string;
}

export interface SyncResponse {
  sync_id: string;
  sync_timestamp: number;
  commands: OpenClawEnvelope[];
  preferences_delta: PreferenceDelta[];
  full_resync_required: boolean;
}

export interface PreferenceDelta {
  entity_hash: string;
  member_id: string;
  aggregated_preference: string;
  operation: DeltaOperation;
}

export enum DeltaOperation {
  UPSERT = 'UPSERT',
  DELETE = 'DELETE'
}
