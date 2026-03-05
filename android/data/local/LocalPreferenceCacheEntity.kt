package com.familyguardian.ai.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Entity: local_preference_cache
 * Offline context cache synced from Bitable Preference_Ledger.
 * Ensures Edge AI doesn't make fatal contextual errors when disconnected.
 */
@Entity(
    tableName = "local_preference_cache",
    indices = [Index(value = ["memberId"])]
)
data class LocalPreferenceCacheEntity(
    @PrimaryKey
    @ColumnInfo(name = "entity_hash")
    val entityHash: String, // VARCHAR(64) PRIMARY KEY

    @ColumnInfo(name = "member_id")
    val memberId: String, // VARCHAR(64)

    @ColumnInfo(name = "aggregated_preference")
    val aggregatedPreference: String, // JSON - Snapshot of current likes/dislikes

    @ColumnInfo(name = "last_synced_at")
    val lastSyncedAt: Long = System.currentTimeMillis() // DATETIME
)
