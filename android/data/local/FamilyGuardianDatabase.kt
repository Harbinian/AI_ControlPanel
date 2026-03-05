package com.familyguardian.ai.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * Room Database: FamilyGuardianDatabase
 * Zero-degradation edge buffer for offline-first task execution.
 */
@Database(
    entities = [
        AsyncTaskEntity::class,
        LocalPreferenceCacheEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class FamilyGuardianDatabase : RoomDatabase() {

    abstract fun asyncTaskDao(): AsyncTaskDao
    abstract fun localPreferenceCacheDao(): LocalPreferenceCacheDao

    companion object {
        private const val DATABASE_NAME = "family_guardian_db"

        @Volatile
        private var INSTANCE: FamilyGuardianDatabase? = null

        fun getInstance(context: Context): FamilyGuardianDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: buildDatabase(context).also { INSTANCE = it }
            }
        }

        private fun buildDatabase(context: Context): FamilyGuardianDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                FamilyGuardianDatabase::class.java,
                DATABASE_NAME
            )
                .fallbackToDestructiveMigration()
                .build()
        }
    }
}
