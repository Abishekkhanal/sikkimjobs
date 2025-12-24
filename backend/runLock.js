/**
 * Single-Run Lock - STEP 5 CRITICAL
 * 
 * MANDATORY: Prevents concurrent scraper runs
 * 
 * Mechanism: Firestore-based distributed lock
 * Document: scraper_locks/current
 * 
 * Rules:
 * - Lock acquired at startup
 * - If lock exists → log WARNING → exit immediately (NOT an error)
 * - Lock TTL: 30 minutes
 * - Lock released on clean exit
 * - Lock auto-expires on crash
 */

import admin from 'firebase-admin';
import { logInfo, logWarning, logError } from './logger.js';

const LOCK_COLLECTION = 'scraper_locks';
const LOCK_DOC_ID = 'current';
const LOCK_TTL_MS = 30 * 60 * 1000;  // 30 minutes

let db;
let lockAcquired = false;

/**
 * Set Firestore instance
 */
export function setFirestoreDb(firestoreDb) {
    db = firestoreDb;
}

/**
 * Acquire distributed lock
 * 
 * Returns: true if lock acquired, false if already locked
 */
export async function acquireLock() {
    if (!db) {
        throw new Error('Firestore not initialized - call setFirestoreDb() first');
    }

    const lockRef = db.collection(LOCK_COLLECTION).doc(LOCK_DOC_ID);
    const now = Date.now();
    const expiresAt = now + LOCK_TTL_MS;

    try {
        // Check if lock exists and is still valid
        const lockDoc = await lockRef.get();

        if (lockDoc.exists) {
            const lockData = lockDoc.data();
            const lockExpiry = lockData.expiresAt?.toMillis() || 0;

            if (lockExpiry > now) {
                // Lock is still valid - another instance is running
                const remainingMs = lockExpiry - now;
                const remainingMin = Math.ceil(remainingMs / 60000);

                logWarning('Scraper is already running (lock held by another instance)');
                logWarning(`Lock expires in ${remainingMin} minutes`);
                logWarning(`Lock acquired at: ${lockData.acquiredAt?.toDate()}`);
                logWarning(`Lock holder: ${lockData.hostname || 'unknown'}`);

                return false;  // Lock NOT acquired
            } else {
                // Lock expired - clean up stale lock
                logWarning('Found expired lock - cleaning up');
            }
        }

        // Acquire lock
        await lockRef.set({
            acquiredAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
            hostname: process.env.HOSTNAME || 'unknown',
            pid: process.pid,
            nodeEnv: process.env.NODE_ENV || 'development'
        });

        lockAcquired = true;
        logInfo('✓ Scraper lock acquired');
        logInfo(`Lock expires at: ${new Date(expiresAt).toISOString()}`);

        return true;  // Lock acquired

    } catch (error) {
        logError('Failed to acquire lock', error);
        throw error;
    }
}

/**
 * Release lock on clean exit
 */
export async function releaseLock() {
    if (!db || !lockAcquired) {
        return;
    }

    try {
        const lockRef = db.collection(LOCK_COLLECTION).doc(LOCK_DOC_ID);
        await lockRef.delete();
        lockAcquired = false;
        logInfo('✓ Scraper lock released');
    } catch (error) {
        logError('Failed to release lock', error);
        // Don't throw - releasing lock failure shouldn't crash
    }
}

/**
 * Setup lock release on process exit
 */
export function setupLockCleanup() {
    // Clean exit
    process.on('exit', () => {
        if (lockAcquired) {
            logInfo('Process exiting - lock will auto-expire');
        }
    });

    // SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
        logInfo('Received SIGINT - releasing lock');
        await releaseLock();
        process.exit(0);
    });

    // SIGTERM (kill)
    process.on('SIGTERM', async () => {
        logInfo('Received SIGTERM - releasing lock');
        await releaseLock();
        process.exit(0);
    });

    // Uncaught exception
    process.on('uncaughtException', async (error) => {
        logError('Uncaught exception - releasing lock', error);
        await releaseLock();
        process.exit(1);
    });

    // Unhandled rejection
    process.on('unhandledRejection', async (reason) => {
        logError('Unhandled rejection - releasing lock', reason);
        await releaseLock();
        process.exit(1);
    });
}
