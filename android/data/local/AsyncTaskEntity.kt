package com.familyguardian.ai.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entity: async_tasks
 * Command queue for offline-first task execution.
 * State machine: PENDING -> EXECUTING -> COMPLETED | FAILED
 */
@Entity(tableName = "async_tasks")
data class AsyncTaskEntity(
    @PrimaryKey
    @ColumnInfo(name = "task_id")
    val taskId: String, // UUID, VARCHAR(64)

    @ColumnInfo(name = "intent_action")
    val intentAction: String, // VARCHAR(128), NOT NULL - Maps to OpenClaw protocols

    @ColumnInfo(name = "target_member_id")
    val targetMemberId: String?, // VARCHAR(64) - Who this action affects

    @ColumnInfo(name = "payload")
    val payload: String, // TEXT, NOT NULL - JSON string of parameters

    @ColumnInfo(name = "status")
    val status: String = "PENDING", // VARCHAR(32), DEFAULT 'PENDING'

    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0, // INTEGER, DEFAULT 0

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis() // DATETIME DEFAULT CURRENT_TIMESTAMP
) {
    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_EXECUTING = "EXECUTING"
        const val STATUS_COMPLETED = "COMPLETED"
        const val STATUS_FAILED = "FAILED"

        const val MAX_RETRY_COUNT = 3
    }
}
