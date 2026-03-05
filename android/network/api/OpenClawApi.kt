package com.familyguardian.ai.network.api

import com.familyguardian.ai.network.model.OpenClawAck
import com.familyguardian.ai.network.model.OpenClawEnvelope
import com.familyguardian.ai.network.model.SyncRequest
import com.familyguardian.ai.network.model.SyncResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit API Interface for Gateway Communication
 * Handles command dispatch and sync operations between Android Edge and Node.js Gateway.
 */
interface OpenClawApi {

    /**
     * Receive pending commands from Gateway.
     * Called on app start or periodic sync.
     *
     * @param deviceId Unique device identifier
     * @param lastSyncTimestamp Last successful sync timestamp
     * @return List of OpenClawEnvelope commands to execute
     */
    @GET("api/v1/commands")
    suspend fun getPendingCommands(
        @Query("device_id") deviceId: String,
        @Query("last_sync") lastSyncTimestamp: Long
    ): Response<List<OpenClawEnvelope>>

    /**
     * Send ACK back to Gateway after command execution.
     *
     * @param requestId The original request ID being acknowledged
     * @param ack The ACK payload
     * @return 200 on success, 400 on bad request, 500 on server error
     */
    @POST("api/v1/commands/{requestId}/ack")
    suspend fun sendAck(
        @Path("requestId") requestId: String,
        @Body ack: OpenClawAck
    ): Response<Unit>

    /**
     * Request delta sync from Gateway.
     * Pulls new preferences and commands since last sync.
     *
     * @param deviceId Unique device identifier
     * @param lastSyncedAt Last sync timestamp
     * @return SyncResponse with commands and preference deltas
     */
    @POST("api/v1/sync/delta")
    suspend fun requestDeltaSync(
        @Body syncRequest: SyncRequest
    ): Response<SyncResponse>

    /**
     * Request full resync (used when local DB is corrupted or first install).
     *
     * @param deviceId Unique device identifier
     * @return Full sync response with all data
     */
    @GET("api/v1/sync/full")
    suspend fun requestFullSync(
        @Query("device_id") deviceId: String
    ): Response<SyncResponse>

    /**
     * Health check endpoint.
     *
     * @return 200 if Gateway is healthy
     */
    @GET("health")
    suspend fun healthCheck(): Response<Unit>
}
