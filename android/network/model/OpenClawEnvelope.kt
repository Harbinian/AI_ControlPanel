package com.familyguardian.ai.network.model

import com.google.gson.annotations.SerializedName

/**
 * Protocol Envelope - Standard wrapper for all Gateway <-> Android communication.
 * JSON RPC-style payload structure.
 */
data class OpenClawEnvelope(
    @SerializedName("claw_version")
    val clawVersion: String = "1.0",

    @SerializedName("request_id")
    val requestId: String, // UUID-v4

    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis() / 1000,

    @SerializedName("source")
    val source: String = "feishu_gateway",

    @SerializedName("target_device")
    val targetDevice: String,

    @SerializedName("action")
    val action: String, // INTENT_NAME

    @SerializedName("payload")
    val payload: Map<String, Any> = emptyMap()
)

/**
 * ACK Response from Android to Gateway
 */
data class OpenClawAck(
    @SerializedName("request_id")
    val requestId: String,

    @SerializedName("status")
    val status: AckStatus,

    @SerializedName("executed_at")
    val executedAt: Long = System.currentTimeMillis() / 1000,

    @SerializedName("result")
    val result: Map<String, Any>? = null,

    @SerializedName("error")
    val error: String? = null
)

enum class AckStatus {
    @SerializedName("SUCCESS")
    SUCCESS,

    @SerializedName("FAILED")
    FAILED,

    @SerializedName("PENDING_HITL")
    PENDING_HITL
}

/**
 * Sync Request from Android to Gateway
 */
data class SyncRequest(
    @SerializedName("device_id")
    val deviceId: String,

    @SerializedName("last_synced_at")
    val lastSyncedAt: Long,

    @SerializedName("pending_tasks")
    val pendingTasks: List<PendingTaskInfo> = emptyList()
)

data class PendingTaskInfo(
    @SerializedName("task_id")
    val taskId: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("error_message")
    val errorMessage: String? = null
)

/**
 * Sync Response from Gateway to Android
 */
data class SyncResponse(
    @SerializedName("sync_id")
    val syncId: String,

    @SerializedName("sync_timestamp")
    val syncTimestamp: Long,

    @SerializedName("commands")
    val commands: List<OpenClawEnvelope> = emptyList(),

    @SerializedName("preferences_delta")
    val preferencesDelta: List<PreferenceDelta> = emptyList(),

    @SerializedName("full_resync_required")
    val fullResyncRequired: Boolean = false
)

data class PreferenceDelta(
    @SerializedName("entity_hash")
    val entityHash: String,

    @SerializedName("member_id")
    val memberId: String,

    @SerializedName("aggregated_preference")
    val aggregatedPreference: String, // JSON string

    @SerializedName("operation")
    val operation: DeltaOperation
)

enum class DeltaOperation {
    @SerializedName("UPSERT")
    UPSERT,

    @SerializedName("DELETE")
    DELETE
}
