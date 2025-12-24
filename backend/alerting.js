/**
 * Alerting System - STEP 4
 * 
 * NO SPAM: Alerts only when human action is required
 */

import { logError, logWarning } from './logger.js';

/**
 * Send alert (implementation depends on deployment)
 * 
 * Options:
 * - Email (via GitHub Actions)
 * - Slack webhook
 * - Firebase Cloud Messaging to admin
 * - Console error (for now)
 */
export async function sendAlert(alert) {
    const alertMessage = {
        timestamp: new Date().toISOString(),
        severity: alert.severity || 'HIGH',
        title: alert.title,
        message: alert.message,
        context: alert.context || {}
    };

    // Log alert
    logError(`🚨 ALERT: ${alert.title}`, alertMessage);

    // TODO: Implement actual alerting mechanism
    // For now, just log to console
    console.error('\n' + '='.repeat(80));
    console.error('🚨 PRODUCTION ALERT');
    console.error('='.repeat(80));
    console.error(`Severity: ${alertMessage.severity}`);
    console.error(`Title: ${alertMessage.title}`);
    console.error(`Message: ${alertMessage.message}`);
    console.error(`Time: ${alertMessage.timestamp}`);
    if (Object.keys(alertMessage.context).length > 0) {
        console.error(`Context: ${JSON.stringify(alertMessage.context, null, 2)}`);
    }
    console.error('='.repeat(80) + '\n');

    // In production, send via:
    // - process.env.ALERT_EMAIL
    // - process.env.SLACK_WEBHOOK
    // - Firebase Admin SDK to send FCM to admin device
}

/**
 * Alert: Website structure changed
 */
export async function alertStructureChange(context) {
    await sendAlert({
        severity: 'CRITICAL',
        title: 'SPSC Website Structure Changed',
        message: 'Job scraper cannot find job listings. Website may have been redesigned. Human intervention required.',
        context: {
            url: context.url,
            selectorsAttempted: context.selectorsAttempted,
            lastSuccessfulRun: context.lastSuccessfulRun
        }
    });
}

/**
 * Alert: Consecutive zero job runs
 */
export async function alertConsecutiveZeroJobs(runCount) {
    await sendAlert({
        severity: 'HIGH',
        title: `${runCount} Consecutive Runs with Zero Jobs`,
        message: `Scraper has found 0 jobs for ${runCount} consecutive runs. This may indicate a problem with the website or scraper.`,
        context: {
            consecutiveRuns: runCount,
            action: 'Check SPSC website manually: https://spsc.sikkim.gov.in/Notifications.html'
        }
    });
}

/**
 * Alert: Firestore errors after retries
 */
export async function alertFirestoreFailure(error, context) {
    await sendAlert({
        severity: 'HIGH',
        title: 'Firestore Write Failed After Retries',
        message: 'Unable to save jobs to Firestore after multiple retries. Data may be lost.',
        context: {
            error: error.message,
            retriesAttempted: context.retriesAttempted,
            jobsAffected: context.jobsAffected
        }
    });
}

/**
 * Alert: Scraper crashed mid-run
 */
export async function alertScraperCrash(error, context) {
    await sendAlert({
        severity: 'CRITICAL',
        title: 'Scraper Crashed Mid-Run',
        message: 'Job scraper encountered a fatal error and could not complete.',
        context: {
            error: error.message,
            stack: error.stack,
            jobsProcessed: context.jobsProcessed,
            totalJobs: context.totalJobs
        }
    });
}

/**
 * DO NOT ALERT FOR (explicitly documented)
 */
export const NO_ALERT_CONDITIONS = {
    scannedPdfs: 'Scanned PDFs are expected - marked dataComplete=false',
    dataCompleteFalse: 'Individual jobs with incomplete data are expected',
    individualJobFailures: 'Single job failures are logged but not alerted',
    singleNetworkErrors: 'Transient network errors are retried automatically',
    parseErrors: 'PDF parsing failures are expected for scanned documents'
};
