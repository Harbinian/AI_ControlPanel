package com.familyguardian.ai.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * DAO: AsyncTaskDao
 * Data Access Object for async_tasks table operations.
 */
@Dao
interface AsyncTaskDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(task: AsyncTaskEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tasks: List<AsyncTaskEntity>)

    @Update
    suspend fun update(task: AsyncTaskEntity)

    @Delete
    suspend fun delete(task: AsyncTaskEntity)

    @Query("SELECT * FROM async_tasks WHERE task_id = :taskId")
    suspend fun getById(taskId: String): AsyncTaskEntity?

    @Query("SELECT * FROM async_tasks WHERE task_id = :taskId")
    fun getByIdFlow(taskId: String): Flow<AsyncTaskEntity?>

    @Query("SELECT * FROM async_tasks WHERE status = :status ORDER BY created_at ASC")
    suspend fun getByStatus(status: String): List<AsyncTaskEntity>

    @Query("SELECT * FROM async_tasks WHERE status = :status ORDER BY created_at ASC")
    fun getByStatusFlow(status: String): Flow<List<AsyncTaskEntity>>

    @Query("SELECT * FROM async_tasks ORDER BY created_at DESC")
    fun getAllFlow(): Flow<List<AsyncTaskEntity>>

    @Query("SELECT * FROM async_tasks WHERE status IN ('PENDING', 'EXECUTING') ORDER BY created_at ASC LIMIT 1")
    suspend fun getNextPendingTask(): AsyncTaskEntity?

    @Query("UPDATE async_tasks SET status = :status WHERE task_id = :taskId")
    suspend fun updateStatus(taskId: String, status: String)

    @Query("UPDATE async_tasks SET status = :status, retry_count = retry_count + 1 WHERE task_id = :taskId")
    suspend fun incrementRetryCount(taskId: String, status: String)

    @Query("DELETE FROM async_tasks WHERE status IN ('COMPLETED', 'FAILED') AND created_at < :timestamp")
    suspend fun deleteOldCompletedTasks(timestamp: Long)

    @Query("SELECT COUNT(*) FROM async_tasks WHERE status = :status")
    fun getCountByStatus(status: String): Flow<Int>
}
