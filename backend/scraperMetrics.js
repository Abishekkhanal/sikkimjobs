/**
 * Scraper Run Metrics - STEP 4 REQUIRED
 * 
 * Every scraper run must store a summary in Firestore.
 * This enables monitoring and alerting.
 */

import admin from 'firebase-admin';
import { logInfo, logError } from './logger.js';

let db;

export function setFirestoreDb(firestoreDb) {
    db = firestoreDb;
}

/**
 * Log scraper run summary to Firestore
 * 
 * MANDATORY: Must be called at end of every scraper run
 */
export async function logScraperRun(metrics) {
    if (!db) {
        throw new Error('Firestore not initialized - call setFirestoreDb() first');
    }

    const runSummary = {
        runAt: admin.firestore.FieldValue.serverTimestamp(),
        jobsFound: metrics.jobsFound || 0,
        jobsSaved: metrics.jobsSaved || 0,
        completeJobs: metrics.completeJobs || 0,
        incompleteJobs: metrics.incompleteJobs || 0,
        networkErrors: metrics.networkErrors || 0,
        parseErrors: metrics.parseErrors || 0,
        structureErrors: metrics.structureErrors || 0,
        firestoreErrors: metrics.firestoreErrors || 0,
        status: metrics.status || 'UNKNOWN',  // SUCCESS | PARTIAL | FAILED
        duration: metrics.duration || 0,
        errors: metrics.errors || []
    };

    try {
        await db.collection('scraper_runs').add(runSummary);
        logInfo('Scraper run logged to Firestore');
    } catch (error) {
        logError('Failed to log scraper run', error);
        // Don't throw - logging failure shouldn't crash scraper
    }

    return runSummary;
}

/**
 * Get last N scraper runs
 */
export async function getRecentRuns(limit = 10) {
    if (!db) {
        throw new Error('Firestore not initialized');
    }

    const snapshot = await db
        .collection('scraper_runs')
        .orderBy('runAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Check if last N runs had zero jobs
 * Used for alerting
 */
export async function checkConsecutiveZeroJobRuns(count = 2) {
    const recentRuns = await getRecentRuns(count);

    if (recentRuns.length < count) {
        return false;  // Not enough data
    }

    return recentRuns.every(run => run.jobsFound === 0);
}

/**
 * Calculate run status based on metrics
 */
export function calculateRunStatus(metrics) {
    // FAILED: Scraper crashed or structure changed
    if (metrics.structureErrors > 0 || metrics.scraperCrashed) {
        return 'FAILED';
    }

    // FAILED: No jobs found unexpectedly
    if (metrics.jobsFound === 0 && !metrics.expectedZeroJobs) {
        return 'FAILED';
    }

    // PARTIAL: Some jobs saved, but with errors
    if (metrics.jobsSaved > 0 && (metrics.networkErrors > 0 || metrics.parseErrors > 0)) {
        return 'PARTIAL';
    }

    // SUCCESS: Jobs saved without critical errors
    if (metrics.jobsSaved > 0) {
        return 'SUCCESS';
    }

    // FAILED: No jobs saved
    return 'FAILED';
}
