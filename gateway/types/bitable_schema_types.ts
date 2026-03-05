/**
 * Bitable Schema Types
 * TypeScript interfaces mapping to Feishu Bitable tables.
 * Cloud Fact Center - Single source of truth for family facts.
 */

// ============================================================================
// Family_Members (Identity & RBAC)
// ============================================================================

export enum MemberRole {
  Admin = "Admin",
  Spouse = "Spouse",
  Child = "Child",
  Guest = "Guest",
}

export interface IFamilyMember {
  /** Primary Key, Auto-increment */
  Member_ID: number;
  /** Display name */
  Name: string;
  /** Feishu Open ID, Unique Index */
  Feishu_Open_ID: string;
  /** Role defines HITL bypass thresholds */
  Role: MemberRole;
  /** For routing OpenClaw commands to specific Android edges */
  Device_Push_Token?: string;
  /** Record creation timestamp */
  Created_At?: string;
  /** Last update timestamp */
  Updated_At?: string;
}

// ============================================================================
// Preference_Ledger (Time-Series AI Context)
// ============================================================================

export enum PreferenceDomain {
  Dietary = "Dietary",
  Shopping = "Shopping",
  Environment = "Environment",
  Schedule = "Schedule",
}

export interface IPreferenceLedger {
  /** Primary Key, Auto-increment */
  Log_ID: number;
  /** Link to Family_Members - Strictly isolates whose preference */
  Target_Member_ID: number;
  /** Preference domain category */
  Domain: PreferenceDomain;
  /** Entity name, e.g., "Coffee", "Air Conditioning Temp" */
  Entity: string;
  /** -1.0 (dislike) to 1.0 (prefer) */
  Sentiment_Weight: number;
  /** For decay algorithms to prioritize recent preferences */
  Timestamp: string;
  /** Original trigger context */
  Source_Context?: string;
  /** Record creation timestamp */
  Created_At?: string;
}

export interface AggregatedPreference {
  /** Entity name */
  entity: string;
  /** Average sentiment weight */
  avgSentiment: number;
  /** Total count of preference logs */
  count: number;
  /** Latest timestamp */
  latestTimestamp: string;
}

// ============================================================================
// System_Audit_Log (Traceability)
// ============================================================================

export enum AuditActionType {
  UpdatePreference = "Update_Preference",
  ExecuteOpenClaw = "Execute_OpenClaw",
  ModelFallback = "Model_Fallback",
  SyncDelta = "Sync_Delta",
}

export enum AuditStatus {
  Success = "Success",
  Failed = "Failed",
  PendingHITL = "Pending_HITL",
}

export interface ISystemAuditLog {
  /** Trace ID (UUID) */
  Trace_ID: string;
  /** Link to Family_Members */
  Triggered_By: number;
  /** Action type */
  Action_Type: AuditActionType;
  /** Execution status */
  Status: AuditStatus;
  /** JSON payload */
  Raw_Payload: Record<string, unknown>;
  /** Record creation timestamp */
  Created_At?: string;
}

// ============================================================================
// Edge Buffer Sync Types (for Android <-> Gateway communication)
// ============================================================================

export interface ISyncDeltaRequest {
  /** Member ID to sync preferences for */
  memberId: number;
  /** Last sync timestamp (ISO 8601) */
  lastSyncedAt: string;
}

export interface ISyncDeltaResponse {
  /** List of new/modified preferences since last sync */
  preferences: IPreferenceLedger[];
  /** Sync timestamp */
  syncedAt: string;
  /** Whether full resync is needed */
  fullResync: boolean;
}

// ============================================================================
// OpenClaw Command Types (for async_tasks payload)
// ============================================================================

export interface IOpenClawCommand {
  /** Command ID */
  commandId: string;
  /** Action type */
  action: string;
  /** Target device or member */
  target: string;
  /** Command parameters */
  params: Record<string, unknown>;
  /** Priority (1-5) */
  priority: number;
}

export interface ITaskPayload {
  /** OpenClaw command */
  command: IOpenClawCommand;
  /** Original source context */
  sourceContext?: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
}
