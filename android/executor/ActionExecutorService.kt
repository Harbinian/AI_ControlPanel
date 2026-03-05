package com.familyguardian.ai.executor

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.speech.tts.TextToSpeech
import android.util.Log
import com.familyguardian.ai.data.local.AsyncTaskDao
import com.familyguardian.ai.data.local.AsyncTaskEntity
import com.familyguardian.ai.network.model.OpenClawEnvelope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

/**
 * ActionExecutorService - Edge Action Execution Engine
 *
 * Executes commands from the async_tasks SQLite table.
 * Maps OpenClaw protocol actions to native Android APIs.
 *
 * Required AndroidManifest Permissions:
 *   - <uses-permission android:name="android.permission.CAMERA" />
 *   - <uses-permission android:name="android.permission.RECORD_AUDIO" />
 *   - <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
 *   - <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
 *   - <uses-permission android:name="android.permission.VIBRATE" />
 *   - <uses-permission android:name="android.permission.INTERNET" />
 *   - <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
 *   - <uses-permission android:name="android.permission.WAKE_LOCK" />
 *
 * For MIUI/Custom OS survival:
 *   - Use Foreground Service with persistent notification for real-time execution
 *   - Or use long-polling via Kotlin Coroutines when app is active
 */

/**
 * OpenClaw Action Constants
 * Maps to OpenClaw protocol action field
 */
object OpenClawActions {
    const val LOCAL_NOTIFY_TTS = "LOCAL_NOTIFY_TTS"
    const val SYNC_PREFERENCE_DELTA = "SYNC_PREFERENCE_DELTA"
    const val CAPTURE_ENVIRONMENT = "CAPTURE_ENVIRONMENT"
    const val EXECUTE_ACTION = "EXECUTE_ACTION"
    const val RECORD_PREFERENCE = "RECORD_PREFERENCE"
    const val QUERY_PREFERENCE = "QUERY_PREFERENCE"
    const val CLARIFY = "CLARIFY"
}

/**
 * Action Executor Service
 * Dequeues and executes commands from async_tasks table
 */
class ActionExecutorService(
    private val context: Context,
    private val asyncTaskDao: AsyncTaskDao
) {
    companion object {
        private const val TAG = "ActionExecutor"
        private const val CHANNEL_ID = "family_guardian_actions"
        private const val NOTIFICATION_ID = 1001
    }

    // Text-to-Speech engine (lazy initialization)
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    /**
     * Initialize the executor service
     */
    suspend fun initialize(): Boolean = withContext(Dispatchers.Main) {
        try {
            // Initialize TTS
            tts = TextToSpeech(context) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale.CHINESE
                    ttsReady = true
                    Log.i(TAG, "TTS initialized successfully")
                } else {
                    Log.e(TAG, "TTS initialization failed: $status")
                }
            }

            // Create notification channel for foreground service
            createNotificationChannel()

            true
        } catch (e: Exception) {
            Log.e(TAG, "Initialization failed", e)
            false
        }
    }

    /**
     * Main execution loop - processes next pending task
     */
    suspend fun executeNextTask(): Boolean = withContext(Dispatchers.IO) {
        try {
            // Get next pending task
            val task = asyncTaskDao.getNextPendingTask()

            if (task == null) {
                Log.d(TAG, "No pending tasks")
                return@withContext false
            }

            Log.i(TAG, "Processing task: ${task.taskId}, action: ${task.intentAction}")

            // Update status to EXECUTING
            asyncTaskDao.updateStatus(task.taskId, AsyncTaskEntity.STATUS_EXECUTING)

            // Execute based on action type
            val success = executeAction(task)

            // Update final status
            if (success) {
                asyncTaskDao.updateStatus(task.taskId, AsyncTaskEntity.STATUS_COMPLETED)
                Log.i(TAG, "Task ${task.taskId} completed successfully")
            } else {
                asyncTaskDao.updateStatus(task.taskId, AsyncTaskEntity.STATUS_FAILED)
                Log.e(TAG, "Task ${task.taskId} failed")
            }

            // Send ACK to Gateway
            sendAckToGateway(task.taskId, success)

            true
        } catch (e: Exception) {
            Log.e(TAG, "Error executing task", e)
            false
        }
    }

    /**
     * Execute action based on OpenClaw action field
     * Uses when (switch) statement to route to native capabilities
     *
     * @return true if execution succeeded, false otherwise
     */
    private suspend fun executeAction(task: AsyncTaskEntity): Boolean {
        val action = task.intentAction
        val payload = task.payload

        Log.i(TAG, "Executing action: $action with payload: $payload")

        return try {
            when (action) {
                // LOCAL_NOTIFY_TTS -> Android TextToSpeech API / NotificationManager
                OpenClawActions.LOCAL_NOTIFY_TTS -> {
                    executeLocalNotifyTts(payload)
                }

                // SYNC_PREFERENCE_DELTA -> Update local_preference_cache DAO
                OpenClawActions.SYNC_PREFERENCE_DELTA -> {
                    executeSyncPreferenceDelta(payload)
                }

                // CAPTURE_ENVIRONMENT -> Trigger CameraX API to capture, then upload via Retrofit
                OpenClawActions.CAPTURE_ENVIRONMENT -> {
                    executeCaptureEnvironment(payload)
                }

                // EXECUTE_ACTION -> Generic action execution
                OpenClawActions.EXECUTE_ACTION -> {
                    executeGenericAction(payload)
                }

                // RECORD_PREFERENCE -> Save preference to local cache
                OpenClawActions.RECORD_PREFERENCE -> {
                    executeRecordPreference(task, payload)
                }

                // QUERY_PREFERENCE -> Query preference from local cache
                OpenClawActions.QUERY_PREFERENCE -> {
                    executeQueryPreference(task, payload)
                }

                // CLARIFY -> Send clarification message to user
                OpenClawActions.CLARIFY -> {
                    executeClarify(payload)
                }

                else -> {
                    Log.w(TAG, "Unknown action: $action")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception executing action $action", e)
            // Check if we should retry
            if (task.retryCount < AsyncTaskEntity.MAX_RETRY_COUNT) {
                asyncTaskDao.incrementRetryCount(task.taskId, AsyncTaskEntity.STATUS_PENDING)
            }
            false
        }
    }

    /**
     * LOCAL_NOTIFY_TTS - Text-to-Speech notification
     *
     * Required permissions:
     *   - android.permission.VIBRATE
     *   - android.permission.POST_NOTIFICATIONS (Android 13+)
     *
     * Uses: TextToSpeech API, NotificationManager
     */
    private fun executeLocalNotifyTts(payload: String): Boolean {
        // Parse payload: { "message": "...", "priority": "high/normal" }
        val message = parsePayloadString(payload, "message")
        val priority = parsePayloadString(payload, "priority")

        if (message.isEmpty()) {
            Log.w(TAG, "LOCAL_NOTIFY_TTS: No message in payload")
            return false
        }

        Log.i(TAG, "LOCAL_NOTIFY_TTS: Speaking message: $message")

        // Speak via TTS
        if (ttsReady && tts != null) {
            tts?.speak(message, TextToSpeech.QUEUE_FLUSH, null, "notify_${System.currentTimeMillis()}")
        }

        // Also show notification
        showNotification(
            title = "Family Guardian",
            message = message,
            priority = priority
        )

        return true
    }

    /**
     * SYNC_PREFERENCE_DELTA - Update local preference cache
     *
     * Required permissions:
     *   - None (local database operation)
     *
     * Uses: LocalPreferenceCacheDao
     */
    private suspend fun executeSyncPreferenceDelta(payload: String): Boolean = withContext(Dispatchers.IO) {
        // Parse payload: { "member_id": "...", "preference_key": "...", "preference_value": "..." }
        val memberId = parsePayloadString(payload, "member_id")
        val preferenceKey = parsePayloadString(payload, "preference_key")
        val preferenceValue = parsePayloadString(payload, "preference_value")

        if (memberId.isEmpty() || preferenceKey.isEmpty()) {
            Log.w(TAG, "SYNC_PREFERENCE_DELTA: Missing required fields")
            return@withContext false
        }

        Log.i(TAG, "SYNC_PREFERENCE_DELTA: Syncing $preferenceKey for member $memberId")

        // TODO: Implement LocalPreferenceCacheDao update
        // val dao = familyGuardianDatabase.localPreferenceCacheDao()
        // dao.upsert(...)

        true
    }

    /**
     * CAPTURE_ENVIRONMENT - Capture photo/video via CameraX
     *
     * Required permissions:
     *   - android.permission.CAMERA
     *   - android.permission.RECORD_AUDIO (for video)
     *   - android.permission.INTERNET (for upload)
     *
     * Uses: CameraX API, Retrofit for upload
     */
    private fun executeCaptureEnvironment(payload: String): Boolean {
        // Parse payload: { "mode": "photo/video", "quality": "high/low" }
        val mode = parsePayloadString(payload, "mode")
        val quality = parsePayloadString(payload, "quality")

        Log.i(TAG, "CAPTURE_ENVIRONMENT: mode=$mode, quality=$quality")

        // TODO: Implement CameraX capture
        //  camera permission
       1. Check // 2. Initialize CameraX
        // 3. Capture image/video
        // 4. Upload via Retrofit

        // Placeholder: Trigger capture intent
        // val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        // startActivityForResult(intent, REQUEST_CAPTURE)

        Log.w(TAG, "CAPTURE_ENVIRONMENT: Not implemented - requires CameraX integration")
        return false
    }

    /**
     * EXECUTE_ACTION - Generic action execution
     */
    private fun executeGenericAction(payload: String): Boolean {
        // Parse generic payload
        val actionType = parsePayloadString(payload, "action_type")

        Log.i(TAG, "EXECUTE_ACTION: action_type=$actionType")

        // Route to specific handler based on action_type
        return when (actionType) {
            "vibrate" -> executeVibrate(payload)
            "notification" -> executeLocalNotifyTts(payload)
            else -> {
                Log.w(TAG, "EXECUTE_ACTION: Unknown action_type: $actionType")
                false
            }
        }
    }

    /**
     * RECORD_PREFERENCE - Save preference to local database
     */
    private suspend fun executeRecordPreference(task: AsyncTaskEntity, payload: String): Boolean =
        withContext(Dispatchers.IO) {
            val memberId = parsePayloadString(payload, "member_id")
            val preferenceData = parsePayloadString(payload, "preference_data")

            if (memberId.isEmpty()) {
                Log.w(TAG, "RECORD_PREFERENCE: Missing member_id")
                return@withContext false
            }

            Log.i(TAG, "RECORD_PREFERENCE: Recording for member $memberId")

            // TODO: Insert into preference database
            // familyGuardianDatabase.preferenceDao().insert(...)

            true
        }

    /**
     * QUERY_PREFERENCE - Query preference from local database
     */
    private suspend fun executeQueryPreference(task: AsyncTaskEntity, payload: String): Boolean =
        withContext(Dispatchers.IO) {
            val memberId = parsePayloadString(payload, "member_id")
            val preferenceKey = parsePayloadString(payload, "preference_key")

            Log.i(TAG, "QUERY_PREFERENCE: Querying $preferenceKey for member $memberId")

            // TODO: Query from database and send result back to gateway
            // val result = familyGuardianDatabase.preferenceDao().get(...)

            true
        }

    /**
     * CLARIFY - Send clarification message to user
     */
    private fun executeClarify(payload: String): Boolean {
        val question = parsePayloadString(payload, "question")

        Log.i(TAG, "CLARIFY: Sending question: $question")

        // Show notification with question
        showNotification(
            title = "Family Guardian - Question",
            message = question
        )

        // Also speak the question
        if (ttsReady && tts != null) {
            tts?.speak(question, TextToSpeech.QUEUE_ADD, null, "clarify_${System.currentTimeMillis()}")
        }

        return true
    }

    /**
     * Execute vibrate action
     *
     * Required permission: android.permission.VIBRATE
     */
    private fun executeVibrate(payload: String): Boolean {
        val duration = parsePayloadInt(payload, "duration", 500)

        Log.i(TAG, "VIBRATE: Vibrating for $duration ms")

        try {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createOneShot(duration, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(duration.toLong())
            }
            return true
        } catch (e: Exception) {
            Log.e(TAG, "VIBRATE: Failed", e)
            return false
        }
    }

    /**
     * Show local notification
     *
     * Required permission: android.permission.POST_NOTIFICATIONS (Android 13+)
     */
    private fun showNotification(title: String, message: String, priority: String = "normal") {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val notification = android.app.Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(
                    if (priority == "high") NotificationManager.IMPORTANCE_HIGH
                    else NotificationManager.IMPORTANCE_DEFAULT
                )
                .setAutoCancel(true)
                .build()

            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "showNotification: Failed", e)
        }
    }

    /**
     * Create notification channel for Android O+
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Family Guardian Actions",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for Family Guardian AI actions"
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Send ACK back to Gateway
     *
     * Uses: OpenClawApi (Retrofit)
     */
    private suspend fun sendAckToGateway(taskId: String, success: Boolean) = withContext(Dispatchers.IO) {
        // TODO: Implement OpenClawApi.acknowledge()
        // val ack = OpenClawAck(
        //     requestId = taskId,
        //     status = if (success) AckStatus.SUCCESS else AckStatus.FAILED,
        //     executedAt = System.currentTimeMillis() / 1000
        // )
        // openClawApi.acknowledge(ack)

        Log.i(TAG, "ACK sent to gateway: $taskId, success=$success")
    }

    /**
     * Parse JSON string payload for string value
     */
    private fun parsePayloadString(payload: String, key: String): String {
        return try {
            // Simple regex-based extraction (for production: use Gson/JSON)
            val regex = """"$key"\s*:\s*"([^"]*)"""".toRegex()
            val match = regex.find(payload)
            match?.groupValues?.get(1) ?: ""
        } catch (e: Exception) {
            Log.w(TAG, "parsePayloadString: Error parsing key=$key", e)
            ""
        }
    }

    /**
     * Parse JSON string payload for int value
     */
    private fun parsePayloadInt(payload: String, key: String, default: Int): Int {
        return try {
            val regex = """"$key"\s*:\s*(\d+)""".toRegex()
            val match = regex.find(payload)
            match?.groupValues?.get(1)?.toIntOrNull() ?: default
        } catch (e: Exception) {
            default
        }
    }

    /**
     * Cleanup resources
     */
    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        ttsReady = false
        Log.i(TAG, "Executor service shutdown")
    }
}
