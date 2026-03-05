package com.familyguardian.ai.network

import android.content.Context
import com.familyguardian.ai.network.api.OpenClawApi
import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Network Client Factory for Retrofit
 * Provides singleton instances of API interfaces.
 */
object NetworkClient {

    private const val BASE_URL = "https://your-gateway-url.com/" // TODO: Configure via BuildConfig
    private const val TIMEOUT_SECONDS = 30L

    @Volatile
    private var retrofit: Retrofit? = null

    @Volatile
    private var openClawApi: OpenClawApi? = null

    /**
     * Initialize the network client with application context.
     * Call this in Application.onCreate()
     */
    fun initialize(context: Context) {
        // Pre-warm the client
        getOpenClawApi()
    }

    /**
     * Get the OpenClaw API instance.
     * Thread-safe singleton.
     */
    fun getOpenClawApi(): OpenClawApi {
        return openClawApi ?: synchronized(this) {
            openClawApi ?: buildRetrofit().create(OpenClawApi::class.java).also {
                openClawApi = it
            }
        }
    }

    private fun buildRetrofit(): Retrofit {
        return retrofit ?: synchronized(this) {
            retrofit ?: buildRetrofitInternal().also { retrofit = it }
        }
    }

    private fun buildRetrofitInternal(): Retrofit {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val original = chain.request()
                val request = original.newBuilder()
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .method(original.method, original.body)
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()

        val gson = GsonBuilder()
            .setLenient()
            .create()

        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    /**
     * Reset client (for testing or logout).
     */
    fun reset() {
        synchronized(this) {
            retrofit = null
            openClawApi = null
        }
    }
}
