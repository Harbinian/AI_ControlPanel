package com.familyguardian.ai.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * DAO: LocalPreferenceCacheDao
 * Data Access Object for local_preference_cache table operations.
 */
@Dao
interface LocalPreferenceCacheDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(cache: LocalPreferenceCacheEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(caches: List<LocalPreferenceCacheEntity>)

    @Update
    suspend fun update(cache: LocalPreferenceCacheEntity)

    @Delete
    suspend fun delete(cache: LocalPreferenceCacheEntity)

    @Query("SELECT * FROM local_preference_cache WHERE entity_hash = :entityHash")
    suspend fun getByEntityHash(entityHash: String): LocalPreferenceCacheEntity?

    @Query("SELECT * FROM local_preference_cache WHERE entity_hash = :entityHash")
    fun getByEntityHashFlow(entityHash: String): Flow<LocalPreferenceCacheEntity?>

    @Query("SELECT * FROM local_preference_cache WHERE member_id = :memberId")
    suspend fun getByMemberId(memberId: String): List<LocalPreferenceCacheEntity>

    @Query("SELECT * FROM local_preference_cache WHERE member_id = :memberId")
    fun getByMemberIdFlow(memberId: String): Flow<List<LocalPreferenceCacheEntity>>

    @Query("SELECT * FROM local_preference_cache ORDER BY last_synced_at DESC")
    fun getAllFlow(): Flow<List<LocalPreferenceCacheEntity>>

    @Query("DELETE FROM local_preference_cache WHERE last_synced_at < :timestamp")
    suspend fun deleteOldCache(timestamp: Long)

    @Query("DELETE FROM local_preference_cache")
    suspend fun clearAll()

    @Query("SELECT COUNT(*) FROM local_preference_cache")
    fun getCount(): Flow<Int>

    @Query("SELECT * FROM local_preference_cache WHERE entity_hash IN (:entityHashes)")
    suspend fun getByEntityHashes(entityHashes: List<String>): List<LocalPreferenceCacheEntity>
}
